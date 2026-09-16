import { BEVERAGE_TYPE_LABELS, STANDARD_GOVERNMENT_WARNING } from "./constants";
import type { FieldComparison, LabelExtraction } from "./schema";

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function presenceCheck(field: string, label: string, value: string | null): FieldComparison {
  const trimmed = value?.trim() || null;
  if (!trimmed) {
    return { field, label, applicationValue: null, labelValue: null, status: "mismatch", note: "Not found on label" };
  }
  return { field, label, applicationValue: null, labelValue: trimmed, status: "match" };
}

function abvSelfCheck(extraction: LabelExtraction): FieldComparison {
  const field = "alcohol_content_percent";
  const label = "Alcohol Content (ABV)";
  const display = extraction.alcohol_content_text ?? (extraction.alcohol_content_percent != null ? `${extraction.alcohol_content_percent}%` : null);

  if (extraction.alcohol_content_percent === null) {
    return {
      field,
      label,
      applicationValue: null,
      labelValue: display,
      status: "review",
      note: "Not found — confirm this beverage type is exempt from stating ABV",
    };
  }
  if (extraction.alcohol_content_percent <= 0 || extraction.alcohol_content_percent > 95) {
    return {
      field,
      label,
      applicationValue: null,
      labelValue: display,
      status: "mismatch",
      note: "Value is outside a plausible range for a beverage label",
    };
  }
  return { field, label, applicationValue: null, labelValue: display, status: "match" };
}

function netContentsSelfCheck(extraction: LabelExtraction): FieldComparison {
  const field = "net_contents";
  const label = "Net Contents";
  const value = extraction.net_contents?.trim() || null;

  if (!value) {
    return { field, label, applicationValue: null, labelValue: null, status: "mismatch", note: "Not found on label" };
  }
  const recognized = /[\d.]+\s*(ml|milliliters?|l|liters?|liter|oz|fl\.?\s*oz\.?)/i.test(value);
  if (!recognized) {
    return {
      field,
      label,
      applicationValue: null,
      labelValue: value,
      status: "review",
      note: "Format not recognized as a standard volume unit",
    };
  }
  return { field, label, applicationValue: null, labelValue: value, status: "match" };
}

function warningSelfCheck(extraction: LabelExtraction): FieldComparison {
  const field = "government_warning";
  const label = "Government Warning Statement";
  const value = extraction.government_warning_text;

  if (!extraction.government_warning_present || !value) {
    return {
      field,
      label,
      applicationValue: null,
      labelValue: null,
      status: "mismatch",
      note: "Warning statement not found on label",
    };
  }

  const exact = normalizeWhitespace(value) === normalizeWhitespace(STANDARD_GOVERNMENT_WARNING);
  const headingOk = extraction.warning_heading_all_caps_bold;
  const bodyOk = !extraction.warning_body_is_bold;

  if (exact && headingOk && bodyOk) {
    return { field, label, applicationValue: null, labelValue: value, status: "match" };
  }

  const notes: string[] = [];
  if (!exact) notes.push("Wording does not match the required statement exactly");
  if (!headingOk) notes.push("'GOVERNMENT WARNING:' heading must be all-caps and bold");
  if (!bodyOk) notes.push("Only the heading may be bold — the rest of the statement must not be");

  return { field, label, applicationValue: null, labelValue: value, status: "mismatch", note: notes.join("; ") };
}

// Validates a label against its own required-format rules, with no application
// data to compare against — used for batch mode, where typing in expected
// values for dozens of labels isn't realistic. Catches missing/malformed
// required fields; it cannot catch a label that simply doesn't match what was
// actually applied for, since there's nothing here to match it against.
export function selfCheckLabel(extraction: LabelExtraction): FieldComparison[] {
  const checks: FieldComparison[] = [
    presenceCheck("brand_name", "Brand Name", extraction.brand_name),
    {
      field: "beverage_type",
      label: "Beverage Type",
      applicationValue: null,
      labelValue: BEVERAGE_TYPE_LABELS[extraction.beverage_type],
      status: "match",
      note: "Auto-detected from label",
    },
    presenceCheck("class_type", "Class/Type Designation", extraction.class_type),
    abvSelfCheck(extraction),
    netContentsSelfCheck(extraction),
    warningSelfCheck(extraction),
  ];

  if (!extraction.producer_name_address?.trim()) {
    checks.push({
      field: "producer_name_address",
      label: "Name & Address of Producer/Bottler",
      applicationValue: null,
      labelValue: null,
      status: "review",
      note: "Not found — confirm this is legitimately absent",
    });
  } else {
    checks.push({
      field: "producer_name_address",
      label: "Name & Address of Producer/Bottler",
      applicationValue: null,
      labelValue: extraction.producer_name_address.trim(),
      status: "match",
    });
  }

  if (extraction.image_quality_issues.length > 0) {
    checks.push({
      field: "image_quality",
      label: "Image Quality",
      applicationValue: null,
      labelValue: extraction.image_quality_issues.join("; "),
      status: "review",
      note: "Photo quality may have limited how much could be read reliably",
    });
  }

  return checks;
}
