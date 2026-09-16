import type { ReviewLogEntry } from "./review-log";

// A couple of pre-computed examples shown the first time someone opens the
// Review Log with nothing in it yet, so it's not just an empty page. These
// are real Claude extraction output for the bundled sample labels (captured
// during testing, then run through the same deterministic comparison logic
// the app uses live) — not fabricated, but not a live API call either, so
// seeding costs nothing. loggedAt is set in the past so they read as
// pre-existing rather than "just now".
export const REVIEW_LOG_SEED: ReviewLogEntry[] = [
  {
    loggedAt: Date.now() - 2 * 60 * 60 * 1000,
    decision: "pending",
    result: {
      id: "seed-old-tom-bourbon-clean",
      fileName: "old-tom-bourbon-clean.png",
      mode: "comparison",
      extraction: {
        brand_name: "Old Tom Distillery",
        class_type: "Kentucky Straight Bourbon Whiskey",
        beverage_type: "distilled_spirits",
        alcohol_content_text: "45% Alc./Vol. (90 Proof)",
        alcohol_content_percent: 45,
        net_contents: "750 mL",
        producer_name_address: "Bottled by Old Tom Distillery, Bardstown, KY",
        country_of_origin: null,
        government_warning_present: true,
        government_warning_text:
          "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
        warning_heading_all_caps_bold: true,
        warning_body_is_bold: false,
        image_quality_issues: [],
        extraction_confidence: "high",
        notes: null,
      },
      comparisons: [
        { field: "brand_name", label: "Brand Name", applicationValue: "OLD TOM DISTILLERY", labelValue: "Old Tom Distillery", status: "match" },
        { field: "beverage_type", label: "Beverage Type", applicationValue: "Distilled Spirits", labelValue: "Distilled Spirits", status: "match" },
        { field: "class_type", label: "Class/Type Designation", applicationValue: "Kentucky Straight Bourbon Whiskey", labelValue: "Kentucky Straight Bourbon Whiskey", status: "match" },
        { field: "alcohol_content_percent", label: "Alcohol Content (ABV)", applicationValue: "45%", labelValue: "45% Alc./Vol. (90 Proof)", status: "match" },
        { field: "net_contents", label: "Net Contents", applicationValue: "750 mL", labelValue: "750 mL", status: "match" },
        { field: "producer_name_address", label: "Name & Address of Producer/Bottler", applicationValue: "Bottled by Old Tom Distillery, Bardstown, KY", labelValue: "Bottled by Old Tom Distillery, Bardstown, KY", status: "match" },
        { field: "country_of_origin", label: "Country of Origin", applicationValue: null, labelValue: null, status: "not_applicable" },
        {
          field: "government_warning",
          label: "Government Warning Statement",
          applicationValue:
            "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
          labelValue:
            "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
          status: "match",
        },
      ],
      overallStatus: "pass",
      processingTimeMs: 4200,
      imageDataUrl: "/sample-labels/old-tom-bourbon-clean.png",
    },
  },
  {
    loggedAt: Date.now() - 60 * 60 * 1000,
    decision: "pending",
    result: {
      id: "seed-harbor-vodka-warning-titlecase",
      fileName: "harbor-vodka-warning-titlecase.png",
      mode: "comparison",
      extraction: {
        brand_name: "Harbor Light Vodka",
        class_type: "Vodka Distilled from Grain",
        beverage_type: "distilled_spirits",
        alcohol_content_text: "40% Alc./Vol. (80 Proof)",
        alcohol_content_percent: 40,
        net_contents: "1 L",
        producer_name_address: "Harbor Light Spirits Co., Seattle, WA",
        country_of_origin: null,
        government_warning_present: true,
        government_warning_text:
          "Government Warning: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
        warning_heading_all_caps_bold: false,
        warning_body_is_bold: false,
        image_quality_issues: [],
        extraction_confidence: "high",
        notes: "The heading 'Government Warning:' is not in all capital letters and is not bold.",
      },
      comparisons: [
        { field: "brand_name", label: "Brand Name", applicationValue: "HARBOR LIGHT VODKA", labelValue: "Harbor Light Vodka", status: "match" },
        { field: "beverage_type", label: "Beverage Type", applicationValue: "Distilled Spirits", labelValue: "Distilled Spirits", status: "match" },
        { field: "class_type", label: "Class/Type Designation", applicationValue: "Vodka Distilled from Grain", labelValue: "Vodka Distilled from Grain", status: "match" },
        { field: "alcohol_content_percent", label: "Alcohol Content (ABV)", applicationValue: "40%", labelValue: "40% Alc./Vol. (80 Proof)", status: "match" },
        { field: "net_contents", label: "Net Contents", applicationValue: "1 L", labelValue: "1 L", status: "match" },
        { field: "producer_name_address", label: "Name & Address of Producer/Bottler", applicationValue: "Harbor Light Spirits Co., Seattle, WA", labelValue: "Harbor Light Spirits Co., Seattle, WA", status: "match" },
        { field: "country_of_origin", label: "Country of Origin", applicationValue: null, labelValue: null, status: "not_applicable" },
        {
          field: "government_warning",
          label: "Government Warning Statement",
          applicationValue:
            "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
          labelValue:
            "Government Warning: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
          status: "mismatch",
          note: "Wording does not match the required statement exactly; 'GOVERNMENT WARNING:' heading must be all-caps and bold",
        },
      ],
      overallStatus: "fail",
      processingTimeMs: 4800,
      imageDataUrl: "/sample-labels/harbor-vodka-warning-titlecase.png",
    },
  },
];
