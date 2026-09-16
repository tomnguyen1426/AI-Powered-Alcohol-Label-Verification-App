import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ApplicationDataSchema } from "@/lib/schema";
import { extractLabelFields } from "@/lib/extract";
import { compareLabelToApplication, overallStatusFrom } from "@/lib/compare";
import { selfCheckLabel } from "@/lib/self-check";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const startedAt = Date.now();

  const rateLimit = checkRateLimit(getClientIp(req));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "This demo is rate-limited to keep API costs in check. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const image = formData.get("image");
  const applicationDataRaw = formData.get("applicationData");

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Missing label image." }, { status: 400 });
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(image.type)) {
    return NextResponse.json(
      { error: `Unsupported image type "${image.type}". Use PNG, JPEG, or WEBP.` },
      { status: 400 },
    );
  }
  if (image.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image is too large (4 MB max)." }, { status: 400 });
  }

  // Application data is optional — when it's missing (batch mode), the label
  // is validated against its own required format instead of a comparison.
  let applicationData = null;
  if (typeof applicationDataRaw === "string" && applicationDataRaw.length > 0) {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(applicationDataRaw);
    } catch {
      return NextResponse.json({ error: "Application data was not valid JSON." }, { status: 400 });
    }
    const parsed = ApplicationDataSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid application data: ${parsed.error.issues.map((i) => i.message).join("; ")}` },
        { status: 400 },
      );
    }
    applicationData = parsed.data;
  }

  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(await image.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Could not read the uploaded image." }, { status: 400 });
  }

  try {
    const extraction = await extractLabelFields({
      imageBuffer,
      mediaType: image.type as "image/png" | "image/jpeg" | "image/webp",
    });

    const mode = applicationData ? "comparison" : "self_check";
    const comparisons = applicationData
      ? compareLabelToApplication(extraction, applicationData)
      : selfCheckLabel(extraction);
    const overallStatus = overallStatusFrom(comparisons);

    return NextResponse.json({
      id: randomUUID(),
      fileName: image.name,
      mode,
      extraction,
      comparisons,
      overallStatus,
      processingTimeMs: Date.now() - startedAt,
      imageDataUrl: `data:${image.type};base64,${imageBuffer.toString("base64")}`,
    });
  } catch (err) {
    console.error("Verification failed:", err);
    const message =
      err instanceof Error
        ? /timeout|timed out/i.test(err.message)
          ? "The label extraction took too long and timed out. Please try again."
          : err.message
        : "Verification failed unexpectedly. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
