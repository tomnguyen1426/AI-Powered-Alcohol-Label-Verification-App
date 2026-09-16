import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ApplicationDataSchema } from "@/lib/schema";
import { extractLabelFields } from "@/lib/extract";
import { compareLabelToApplication, overallStatusFrom } from "@/lib/compare";
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
  if (typeof applicationDataRaw !== "string") {
    return NextResponse.json({ error: "Missing application data." }, { status: 400 });
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

  let applicationData;
  try {
    applicationData = ApplicationDataSchema.parse(JSON.parse(applicationDataRaw));
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid application data: ${err instanceof Error ? err.message : String(err)}` },
      { status: 400 },
    );
  }

  try {
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const extraction = await extractLabelFields({
      imageBuffer,
      mediaType: image.type as "image/png" | "image/jpeg" | "image/webp",
    });
    const comparisons = compareLabelToApplication(extraction, applicationData);
    const overallStatus = overallStatusFrom(comparisons);

    return NextResponse.json({
      id: randomUUID(),
      fileName: image.name,
      extraction,
      comparisons,
      overallStatus,
      processingTimeMs: Date.now() - startedAt,
      imageDataUrl: `data:${image.type};base64,${imageBuffer.toString("base64")}`,
    });
  } catch (err) {
    console.error("Verification failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed." },
      { status: 502 },
    );
  }
}
