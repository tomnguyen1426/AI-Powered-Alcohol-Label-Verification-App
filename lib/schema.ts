import { z } from "zod";
import { BEVERAGE_TYPES } from "./constants";

// What the compliance agent enters/pulls from the COLA application form —
// the "source of truth" the label artwork is checked against.
export const ApplicationDataSchema = z.object({
  brand_name: z.string().min(1, "Brand name is required"),
  class_type: z.string().min(1, "Class/type designation is required"),
  beverage_type: z.enum(BEVERAGE_TYPES),
  alcohol_content_percent: z.coerce.number().min(0).max(100).nullable(),
  net_contents: z.string().min(1, "Net contents is required"),
  producer_name_address: z.string().optional().default(""),
  country_of_origin: z.string().optional().default(""),
  is_import: z.coerce.boolean().default(false),
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

export interface VerificationResult {
  id: string;
  fileName: string;
  extraction: LabelExtraction;
  comparisons: FieldComparison[];
  overallStatus: OverallStatus;
  processingTimeMs: number;
  imageDataUrl?: string;
}
