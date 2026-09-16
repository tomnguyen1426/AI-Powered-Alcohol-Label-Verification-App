import { z } from "zod";
import { BEVERAGE_TYPES } from "./constants";

// What the compliance agent enters/pulls from the COLA application form —
// the "source of truth" the label artwork is checked against.
// Brand name and beverage type are the only fields always required to submit
// a check; country of origin becomes required too when is_import is set.
// Everything else, including class/type designation, can be left blank — a
// gap there just shows up as a mismatch in the comparison instead of
// blocking submission. Enforced here (not just in the form) since this is
// the actual authority — the UI check is just for an immediate error message.
export const ApplicationDataSchema = z
  .object({
    brand_name: z.string().min(1, "Brand name is required"),
    class_type: z.string().optional().default(""),
    beverage_type: z.enum(BEVERAGE_TYPES),
    alcohol_content_percent: z.coerce.number().min(0).max(100).nullable(),
    net_contents: z.string().optional().default(""),
    producer_name_address: z.string().optional().default(""),
    country_of_origin: z.string().optional().default(""),
    is_import: z.coerce.boolean().default(false),
  })
  .refine((data) => !data.is_import || data.country_of_origin.trim().length > 0, {
    message: "Country of origin is required for imported products",
    path: ["country_of_origin"],
  });
export type ApplicationData = z.infer<typeof ApplicationDataSchema>;

// What we ask Claude to read off the label artwork itself.
export const LabelExtractionSchema = z.object({
  brand_name: z.string().nullable(),
  class_type: z.string().nullable(),
  alcohol_content_text: z
    .string()
    .nullable()
    .describe("The alcohol content exactly as printed, e.g. '45% Alc./Vol. (90 Proof)'"),
  alcohol_content_percent: z
    .number()
    .nullable()
    .describe("The ABV parsed to a plain percentage number, e.g. 45"),
  net_contents: z.string().nullable(),
  producer_name_address: z.string().nullable(),
  country_of_origin: z.string().nullable(),
  government_warning_present: z.boolean(),
  government_warning_text: z
    .string()
    .nullable()
    .describe("Verbatim transcription of the full warning statement including the heading, preserving original capitalization"),
  warning_heading_all_caps_bold: z
    .boolean()
    .describe("True only if the words 'GOVERNMENT WARNING:' appear in all capital letters AND in bold/emphasized type"),
  warning_body_is_bold: z
    .boolean()
    .describe(
      "True if any part of the warning text AFTER the 'GOVERNMENT WARNING:' heading is also bold/emphasized. Per 27 CFR 16.21, only the heading may be bold — the rest of the statement must NOT be bold. This should be true only when the body itself is bold, not just the heading.",
    ),
  image_quality_issues: z
    .array(z.string())
    .describe("Any issues that limited reading the label, e.g. 'glare across lower third', 'shot at an angle', 'low resolution'. Empty array if none."),
  extraction_confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().nullable().describe("Any other observation useful to a human reviewer"),
});
export type LabelExtraction = z.infer<typeof LabelExtractionSchema>;

export type FieldStatus = "match" | "review" | "mismatch" | "not_applicable";

export interface FieldComparison {
  field: string;
  label: string;
  applicationValue: string | null;
  labelValue: string | null;
  status: FieldStatus;
  note?: string;
}

export type OverallStatus = "pass" | "review" | "fail";

// "comparison": checked field-by-field against application data the user supplied.
// "self_check": no application data available — each field is validated against
// its own required format instead (used for batch mode, see lib/self-check.ts).
export type CheckMode = "comparison" | "self_check";

export interface VerificationResult {
  id: string;
  fileName: string;
  mode: CheckMode;
  extraction: LabelExtraction;
  comparisons: FieldComparison[];
  overallStatus: OverallStatus;
  processingTimeMs: number;
  imageDataUrl?: string;
}
