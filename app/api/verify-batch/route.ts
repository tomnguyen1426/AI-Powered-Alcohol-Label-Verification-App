import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ApplicationDataSchema } from "@/lib/schema";
import { extractLabelFields } from "@/lib/extract";
import { compareLabelToApplication, overallStatusFrom } from "@/lib/compare";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 300;

const CONCURRENCY = 5;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const current = next++;
      results[current] = await fn(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const count = Number(formData.get("count"));
  if (!Number.isInteger(count) || count <= 0) {
    return NextResponse.json({ error: "No label/application pairs provided." }, { status: 400 });
  }
  if (count > 300) {
    return NextResponse.json({ error: "Batch limit is 300 labels per run." }, { status: 400 });
  }

  interface Item {
    index: number;
    image: File;
    applicationDataRaw: string;
  }
  const items: Item[] = [];
  const upfrontErrors: { index: number; fileName: string; error: string }[] = [];

  for (let i = 0; i < count; i++) {
    const image = formData.get(`image_${i}`);
    const applicationDataRaw = formData.get(`applicationData_${i}`);
    if (!(image instanceof File) || typeof applicationDataRaw !== "string") {
      upfrontErrors.push({ index: i, fileName: "unknown", error: "Missing image or application data." });
      continue;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(image.type)) {
      upfrontErrors.push({ index: i, fileName: image.name, error: `Unsupported image type "${image.type}".` });
      continue;
    }
    if (image.size > MAX_UPLOAD_BYTES) {
      upfrontErrors.push({ index: i, fileName: image.name, error: "Image exceeds 10 MB limit." });
      continue;
    }
    items.push({ index: i, image, applicationDataRaw });
  }

  const processed = await mapWithConcurrency(items, CONCURRENCY, async (item) => {
    const startedAt = Date.now();
    try {
      const applicationData = ApplicationDataSchema.parse(JSON.parse(item.applicationDataRaw));
      const imageBuffer = Buffer.from(await item.image.arrayBuffer());
      const extraction = await extractLabelFields({
        imageBuffer,
        mediaType: item.image.type as "image/png" | "image/jpeg" | "image/webp",
      });
      const comparisons = compareLabelToApplication(extraction, applicationData);
      const overallStatus = overallStatusFrom(comparisons);

      return {
        index: item.index,
        id: randomUUID(),
        fileName: item.image.name,
        extraction,
        comparisons,
        overallStatus,
        processingTimeMs: Date.now() - startedAt,
        imageDataUrl: `data:${item.image.type};base64,${imageBuffer.toString("base64")}`,
      };
    } catch (err) {
      return {
        index: item.index,
        id: randomUUID(),
        fileName: item.image.name,
        error: err instanceof Error ? err.message : "Verification failed.",
        processingTimeMs: Date.now() - startedAt,
      };
    }
  });

  const results = [...processed, ...upfrontErrors].sort((a, b) => a.index - b.index);

  return NextResponse.json({ results });
}
