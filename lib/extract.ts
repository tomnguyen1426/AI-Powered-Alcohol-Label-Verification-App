import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { LabelExtractionSchema, type LabelExtraction } from "./schema";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are assisting a federal alcohol beverage label compliance reviewer. You will be shown a photo of a bottle/label. Transcribe exactly what is printed on the label — do not infer, correct, or "fix" anything, even if it looks like a typo. Preserve original capitalization and punctuation in every field except where a field description says otherwise.

For the government warning statement, transcribe it verbatim, and separately judge two independent formatting facts, per 27 CFR 16.21: (1) whether the words "GOVERNMENT WARNING:" are rendered in all capital letters AND in bold/heavier-weight type than the surrounding text, and (2) whether the text AFTER that heading is ALSO bold — which is a violation, since only the heading is permitted to be bold. These are separate judgments: a label can have a correctly bold heading with a correctly non-bold body (compliant), or a heading and body that are both bold (a violation you should catch).

If the photo is angled, glared, blurry, or otherwise hard to read, do your best and note the issue in image_quality_issues rather than refusing. If a field is genuinely not visible anywhere on the label, return null for it rather than guessing — the one exception is beverage_type, which always wants your best classification (spirits/wine/beer) even when it has to be inferred from the class/type wording rather than stated outright.`;

export interface ExtractOptions {
  imageBuffer: Buffer;
  mediaType: "image/png" | "image/jpeg" | "image/webp";
}

export async function extractLabelFields({
  imageBuffer,
  mediaType,
}: ExtractOptions): Promise<LabelExtraction> {
  const response = await client.messages.parse({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    output_config: {
      format: zodOutputFormat(LabelExtractionSchema),
      effort: "low",
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBuffer.toString("base64"),
            },
          },
          {
            type: "text",
            text: "Extract every required TTB label field from this image.",
          },
        ],
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Claude did not return a parseable extraction for this label.");
  }

  return response.parsed_output;
}
