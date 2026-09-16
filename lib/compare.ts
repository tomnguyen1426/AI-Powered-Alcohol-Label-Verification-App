import { ABV_TOLERANCE_PERCENT, STANDARD_GOVERNMENT_WARNING } from "./constants";
import type {
  ApplicationData,
  FieldComparison,
  FieldStatus,
  LabelExtraction,
  OverallStatus,
} from "./schema";

function normalizeLoose(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

// Normalized Levenshtein similarity in [0, 1], 1 = identical.
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j++) dist[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1,
        dist[i][j - 1] + 1,
        dist[i - 1][j - 1] + cost,
      );
    }
  }

  const maxLen = Math.max(a.length, b.length);
  return 1 - dist[rows - 1][cols - 1] / maxLen;
}

// Text fields where near matches (OCR noise, formatting/case differences, minor
// punctuation) should be flagged for a human rather than auto-failed — this is
// the "STONE'S THROW" vs "Stone's Throw" judgment call compliance agents make.
const REVIEW_THRESHOLD = 0.85;

function compareText(
  field: string,
  label: string,
  applicationValueRaw: string | null | undefined,
  labelValueRaw: string | null | undefined,
  required = true,
): FieldComparison {
  const applicationValue = applicationValueRaw?.trim() || null;
  const labelValue = labelValueRaw?.trim() || null;

  if (!applicationValue && !required) {
    // Nothing was provided to check this field against — there's nothing to
    // flag as wrong, so show what the label itself says rather than a blank.
    return {
      field,
      label,
      applicationValue: labelValue,
      labelValue,
      status: "not_applicable",
      note: labelValue ? "No expected value provided — showing what's on the label" : undefined,
    };
  }
  if (!labelValue) {
    return {
      field,
      label,
      applicationValue,
      labelValue,
      status: "mismatch",
      note: "Not found on label",
    };
  }
  if (!applicationValue) {
    return {
      field,
      label,
      applicationValue,
      labelValue,
      status: "mismatch",
      note: "No value on file to compare against",
    };
  }

  const normA = normalizeLoose(applicationValue);
  const normB = normalizeLoose(labelValue);

  if (normA === normB) {
    return { field, label, applicationValue, labelValue, status: "match" };
  }

  const sim = similarity(normA, normB);
  if (sim >= REVIEW_THRESHOLD) {
    return {
      field,
      label,
      applicationValue,
      labelValue,
      status: "review",
      note: "Close but not identical — verify by eye",
    };
  }

  return { field, label, applicationValue, labelValue, status: "mismatch" };
}

function parseNetContentsToMl(raw: string): number | null {
  const s = raw.toLowerCase().replace(/,/g, "").trim();
  const match = s.match(/([\d.]+)\s*(ml|milliliters?|l|liters?|liter|oz|fl\.?\s*oz\.?)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return null;
  const unit = match[2];
  if (unit.startsWith("ml") || unit.startsWith("milliliter")) return value;
  if (unit.startsWith("l")) return value * 1000;
  if (unit.includes("oz")) return value * 29.5735;
  return null;
}

function compareNetContents(
  applicationValueRaw: string | null | undefined,
  labelValueRaw: string | null | undefined,
  required = true,
): FieldComparison {
  const field = "net_contents";
  const label = "Net Contents";
  const applicationValue = applicationValueRaw?.trim() || null;
  const labelValue = labelValueRaw?.trim() || null;

  if (!applicationValue && !required) {
    return {
      field,
      label,
      applicationValue: labelValue,
      labelValue,
      status: "not_applicable",
      note: labelValue ? "No expected value provided — showing what's on the label" : undefined,
    };
  }
  if (!labelValue) {
    return { field, label, applicationValue, labelValue, status: "mismatch", note: "Not found on label" };
  }
  if (!applicationValue) {
    return { field, label, applicationValue, labelValue, status: "mismatch", note: "No value on file to compare against" };
  }

  const mlA = parseNetContentsToMl(applicationValue);
  const mlB = parseNetContentsToMl(labelValue);

  if (mlA === null || mlB === null) {
    // Fall back to fuzzy text comparison if units couldn't be parsed.
    return compareText(field, label, applicationValue, labelValue);
  }

  const diff = Math.abs(mlA - mlB);
  if (diff < 0.5) {
    return { field, label, applicationValue, labelValue, status: "match" };
  }
  if (diff / mlA < 0.02) {
    return { field, label, applicationValue, labelValue, status: "review", note: "Within ~2% — likely a rounding/unit formatting difference" };
  }
  return { field, label, applicationValue, labelValue, status: "mismatch" };
}

function compareAbv(
  applicationValue: number | null,
  extraction: LabelExtraction,
): FieldComparison {
  const field = "alcohol_content_percent";
  const label = "Alcohol Content (ABV)";
  const labelValueDisplay = extraction.alcohol_content_text ?? (extraction.alcohol_content_percent != null ? `${extraction.alcohol_content_percent}%` : null);

  if (applicationValue === null) {
    // Some wine/beer categories are exempt from stating ABV.
    return {
      field,
      label,
      applicationValue: null,
      labelValue: labelValueDisplay,
      status: "not_applicable",
      note: "No ABV on file (exempt category)",
    };
  }

  if (extraction.alcohol_content_percent === null) {
    return {
      field,
      label,
      applicationValue: `${applicationValue}%`,
      labelValue: labelValueDisplay,
      status: "mismatch",
      note: "Not found on label",
    };
  }

  const diff = Math.abs(applicationValue - extraction.alcohol_content_percent);
  const status: FieldStatus = diff <= ABV_TOLERANCE_PERCENT ? "match" : "mismatch";
  return {
    field,
    label,
    applicationValue: `${applicationValue}%`,
    labelValue: labelValueDisplay,
    status,
    note: status === "mismatch" ? `Differs by ${diff.toFixed(2)} percentage points` : undefined,
  };
}

function compareWarning(extraction: LabelExtraction): FieldComparison {
  const field = "government_warning";
  const label = "Government Warning Statement";
  const labelValue = extraction.government_warning_text;

  if (!extraction.government_warning_present || !labelValue) {
    return {
      field,
      label,
      applicationValue: STANDARD_GOVERNMENT_WARNING,
      labelValue: null,
      status: "mismatch",
      note: "Warning statement not found on label",
    };
  }

  // Word-for-word required — case-sensitive, only whitespace is normalized.
  const exact = normalizeWhitespace(labelValue) === normalizeWhitespace(STANDARD_GOVERNMENT_WARNING);
  const headingOk = extraction.warning_heading_all_caps_bold;
  const bodyOk = !extraction.warning_body_is_bold;

  if (exact && headingOk && bodyOk) {
    return { field, label, applicationValue: STANDARD_GOVERNMENT_WARNING, labelValue, status: "match" };
  }

  const notes: string[] = [];
  if (!exact) notes.push("Wording does not match the required statement exactly");
  if (!headingOk) notes.push("'GOVERNMENT WARNING:' heading must be all-caps and bold");
  if (!bodyOk) notes.push("Only the heading may be bold — the rest of the statement must not be");

  return {
    field,
    label,
    applicationValue: STANDARD_GOVERNMENT_WARNING,
    labelValue,
    status: "mismatch",
    note: notes.join("; "),
  };
}

export function compareLabelToApplication(
  extraction: LabelExtraction,
  application: ApplicationData,
): FieldComparison[] {
  const comparisons: FieldComparison[] = [
    compareText("brand_name", "Brand Name", application.brand_name, extraction.brand_name),
    compareText(
      "class_type",
      "Class/Type Designation",
      application.class_type,
      extraction.class_type,
      false,
    ),
    compareAbv(application.alcohol_content_percent, extraction),
    compareNetContents(application.net_contents, extraction.net_contents, false),
    compareText(
      "producer_name_address",
      "Name & Address of Producer/Bottler",
      application.producer_name_address,
      extraction.producer_name_address,
      false,
    ),
    compareText(
      "country_of_origin",
      "Country of Origin",
      application.country_of_origin,
      extraction.country_of_origin,
      application.is_import,
    ),
    compareWarning(extraction),
  ];

  return comparisons;
}

export function overallStatusFrom(comparisons: FieldComparison[]): OverallStatus {
  if (comparisons.some((c) => c.status === "mismatch")) return "fail";
  if (comparisons.some((c) => c.status === "review")) return "review";
  return "pass";
}
