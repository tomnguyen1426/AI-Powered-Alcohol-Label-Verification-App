import type { ReviewLogEntry } from "./review-log";

// Nine permanent example cases: two each for Approved / Rejected / Flagged,
// and three Pending — including one whose own verdict is "Flagged" rather
// than a plain Failed (Meadowbrook) and one that's a self-check result
// rather than a comparison (Ironclad), so the Next Application flow and the
// self-check display both have a realistic example to walk through, not
// only the comparison/outright-failure path. Marked `isExample: true` in
// lib/review-log-store.ts, which keeps them present for every user by
// default; hiding one or deciding on it is a per-device override rather
// than a real delete — they're reference material, not real data, so they
// should never just be "there the first time" and then gone for everyone.
// The first two (Old Tom, Harbor Light) are real Claude extraction
// output captured during testing; the rest are constructed directly from
// what's actually printed on their label images (this project generates its
// own sample labels, so that's known ground truth) — some landing on their
// label's natural outcome (Stone's Throw's case-only difference normalizes
// to a clean Pass; Cedar Creek's whole-bold warning is a real Fail; Ironclad
// legitimately states no ABV, a real beer exemption, not a mismatch), others
// with a deliberately introduced near-miss (a one-word producer-address
// difference) to land in the Review band. All nine run through the same
// deterministic comparison/self-check logic the app uses live — no live API
// call, so this costs nothing. loggedAt is set in the past so they read as
// pre-existing rather than "just now".
export const REVIEW_LOG_SEED: ReviewLogEntry[] = [
  {
    loggedAt: Date.now() - 4 * 60 * 60 * 1000,
    decision: "approved",
    isExample: true,
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
    loggedAt: Date.now() - 3.5 * 60 * 60 * 1000,
    decision: "approved",
    isExample: true,
    result: {
      id: "seed-stones-throw-gin-case-diff",
      fileName: "stones-throw-gin-case-diff.png",
      mode: "comparison",
      extraction: {
        brand_name: "Stone's Throw",
        class_type: "London Dry Gin",
        beverage_type: "distilled_spirits",
        alcohol_content_text: "47% Alc./Vol. (94 Proof)",
        alcohol_content_percent: 47,
        net_contents: "750 mL",
        producer_name_address: "Distilled by Stone's Throw Distilling Co., Portland, OR",
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
        { field: "brand_name", label: "Brand Name", applicationValue: "STONE'S THROW", labelValue: "Stone's Throw", status: "match" },
        { field: "beverage_type", label: "Beverage Type", applicationValue: "Distilled Spirits", labelValue: "Distilled Spirits", status: "match" },
        { field: "class_type", label: "Class/Type Designation", applicationValue: "London Dry Gin", labelValue: "London Dry Gin", status: "match" },
        { field: "alcohol_content_percent", label: "Alcohol Content (ABV)", applicationValue: "47%", labelValue: "47% Alc./Vol. (94 Proof)", status: "match" },
        { field: "net_contents", label: "Net Contents", applicationValue: "750 mL", labelValue: "750 mL", status: "match" },
        { field: "producer_name_address", label: "Name & Address of Producer/Bottler", applicationValue: "Distilled by Stone's Throw Distilling Co., Portland, OR", labelValue: "Distilled by Stone's Throw Distilling Co., Portland, OR", status: "match" },
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
      processingTimeMs: 3900,
      imageDataUrl: "/sample-labels/stones-throw-gin-case-diff.png",
    },
  },
  {
    loggedAt: Date.now() - 3 * 60 * 60 * 1000,
    decision: "rejected",
    isExample: true,
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
  {
    loggedAt: Date.now() - 2.5 * 60 * 60 * 1000,
    decision: "rejected",
    isExample: true,
    result: {
      id: "seed-cedar-creek-whiskey-warning-allbold",
      fileName: "cedar-creek-whiskey-warning-allbold.png",
      mode: "comparison",
      extraction: {
        brand_name: "CEDAR CREEK RESERVE",
        class_type: "Straight Rye Whiskey",
        beverage_type: "distilled_spirits",
        alcohol_content_text: "46% Alc./Vol. (92 Proof)",
        alcohol_content_percent: 46,
        net_contents: "750 mL",
        producer_name_address: "Cedar Creek Distilling Co., Louisville, KY",
        country_of_origin: null,
        government_warning_present: true,
        government_warning_text:
          "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
        warning_heading_all_caps_bold: true,
        warning_body_is_bold: true,
        image_quality_issues: [],
        extraction_confidence: "high",
        notes: null,
      },
      comparisons: [
        { field: "brand_name", label: "Brand Name", applicationValue: "CEDAR CREEK RESERVE", labelValue: "CEDAR CREEK RESERVE", status: "match" },
        { field: "beverage_type", label: "Beverage Type", applicationValue: "Distilled Spirits", labelValue: "Distilled Spirits", status: "match" },
        { field: "class_type", label: "Class/Type Designation", applicationValue: "Straight Rye Whiskey", labelValue: "Straight Rye Whiskey", status: "match" },
        { field: "alcohol_content_percent", label: "Alcohol Content (ABV)", applicationValue: "46%", labelValue: "46% Alc./Vol. (92 Proof)", status: "match" },
        { field: "net_contents", label: "Net Contents", applicationValue: "750 mL", labelValue: "750 mL", status: "match" },
        { field: "producer_name_address", label: "Name & Address of Producer/Bottler", applicationValue: "Cedar Creek Distilling Co., Louisville, KY", labelValue: "Cedar Creek Distilling Co., Louisville, KY", status: "match" },
        { field: "country_of_origin", label: "Country of Origin", applicationValue: null, labelValue: null, status: "not_applicable" },
        {
          field: "government_warning",
          label: "Government Warning Statement",
          applicationValue:
            "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
          labelValue:
            "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
          status: "mismatch",
          note: "Only the heading may be bold — the rest of the statement must not be",
        },
      ],
      overallStatus: "fail",
      processingTimeMs: 4600,
      imageDataUrl: "/sample-labels/cedar-creek-whiskey-warning-allbold.png",
    },
  },
  {
    loggedAt: Date.now() - 90 * 60 * 1000,
    decision: "flagged",
    isExample: true,
    result: {
      id: "seed-castaway-import-rum",
      fileName: "castaway-import-rum.png",
      mode: "comparison",
      extraction: {
        brand_name: "CASTAWAY GOLD",
        class_type: "Rum",
        beverage_type: "distilled_spirits",
        alcohol_content_text: "40% Alc./Vol. (80 Proof)",
        alcohol_content_percent: 40,
        net_contents: "750 mL",
        producer_name_address: "Imported by Castaway Spirit Importers, Miami, FL",
        country_of_origin: "Product of Jamaica",
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
        { field: "brand_name", label: "Brand Name", applicationValue: "CASTAWAY GOLD", labelValue: "CASTAWAY GOLD", status: "match" },
        { field: "beverage_type", label: "Beverage Type", applicationValue: "Distilled Spirits", labelValue: "Distilled Spirits", status: "match" },
        { field: "class_type", label: "Class/Type Designation", applicationValue: "Rum", labelValue: "Rum", status: "match" },
        { field: "alcohol_content_percent", label: "Alcohol Content (ABV)", applicationValue: "40%", labelValue: "40% Alc./Vol. (80 Proof)", status: "match" },
        { field: "net_contents", label: "Net Contents", applicationValue: "750 mL", labelValue: "750 mL", status: "match" },
        {
          field: "producer_name_address",
          label: "Name & Address of Producer/Bottler",
          applicationValue: "Imported by Castaway Spirits Importers, Miami, FL",
          labelValue: "Imported by Castaway Spirit Importers, Miami, FL",
          status: "review",
          note: "Close but not identical — verify by eye",
        },
        { field: "country_of_origin", label: "Country of Origin", applicationValue: "Product of Jamaica", labelValue: "Product of Jamaica", status: "match" },
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
      overallStatus: "review",
      processingTimeMs: 4500,
      imageDataUrl: "/sample-labels/castaway-import-rum.png",
    },
  },
  {
    loggedAt: Date.now() - 70 * 60 * 1000,
    decision: "flagged",
    isExample: true,
    result: {
      id: "seed-blue-ridge-whiskey-glare",
      fileName: "blue-ridge-whiskey-glare.png",
      mode: "comparison",
      extraction: {
        brand_name: "BLUE RIDGE RESERVE",
        class_type: "Tennessee Whiskey",
        beverage_type: "distilled_spirits",
        alcohol_content_text: "43% Alc./Vol. (86 Proof)",
        alcohol_content_percent: 43,
        net_contents: "750 mL",
        producer_name_address: "Blue Ridge Reserve Distillery, Lynchburg, TN",
        country_of_origin: null,
        government_warning_present: true,
        government_warning_text:
          "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
        warning_heading_all_caps_bold: true,
        warning_body_is_bold: false,
        image_quality_issues: ["glare across lower third"],
        extraction_confidence: "medium",
        notes: null,
      },
      comparisons: [
        { field: "brand_name", label: "Brand Name", applicationValue: "BLUE RIDGE RESERVE", labelValue: "BLUE RIDGE RESERVE", status: "match" },
        { field: "beverage_type", label: "Beverage Type", applicationValue: "Distilled Spirits", labelValue: "Distilled Spirits", status: "match" },
        { field: "class_type", label: "Class/Type Designation", applicationValue: "Tennessee Whiskey", labelValue: "Tennessee Whiskey", status: "match" },
        { field: "alcohol_content_percent", label: "Alcohol Content (ABV)", applicationValue: "43%", labelValue: "43% Alc./Vol. (86 Proof)", status: "match" },
        { field: "net_contents", label: "Net Contents", applicationValue: "750 mL", labelValue: "750 mL", status: "match" },
        {
          field: "producer_name_address",
          label: "Name & Address of Producer/Bottler",
          applicationValue: "Blue Ridge Reserve Distilling, Lynchburg, TN",
          labelValue: "Blue Ridge Reserve Distillery, Lynchburg, TN",
          status: "review",
          note: "Close but not identical — verify by eye",
        },
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
      overallStatus: "review",
      processingTimeMs: 4300,
      imageDataUrl: "/sample-labels/blue-ridge-whiskey-glare.png",
    },
  },
  {
    loggedAt: Date.now() - 30 * 60 * 1000,
    decision: "pending",
    isExample: true,
    result: {
      id: "seed-summit-rum-abv-mismatch",
      fileName: "summit-rum-abv-mismatch.png",
      mode: "comparison",
      extraction: {
        brand_name: "SUMMIT RIDGE RUM",
        class_type: "Gold Rum",
        beverage_type: "distilled_spirits",
        alcohol_content_text: "35% Alc./Vol. (70 Proof)",
        alcohol_content_percent: 35,
        net_contents: "750 mL",
        producer_name_address: "Summit Ridge Distillers, Denver, CO",
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
        { field: "brand_name", label: "Brand Name", applicationValue: "SUMMIT RIDGE RUM", labelValue: "SUMMIT RIDGE RUM", status: "match" },
        { field: "beverage_type", label: "Beverage Type", applicationValue: "Distilled Spirits", labelValue: "Distilled Spirits", status: "match" },
        { field: "class_type", label: "Class/Type Designation", applicationValue: "Gold Rum", labelValue: "Gold Rum", status: "match" },
        {
          field: "alcohol_content_percent",
          label: "Alcohol Content (ABV)",
          applicationValue: "40%",
          labelValue: "35% Alc./Vol. (70 Proof)",
          status: "mismatch",
          note: "Differs by 5.00 percentage points",
        },
        { field: "net_contents", label: "Net Contents", applicationValue: "750 mL", labelValue: "750 mL", status: "match" },
        { field: "producer_name_address", label: "Name & Address of Producer/Bottler", applicationValue: "Summit Ridge Distillers, Denver, CO", labelValue: "Summit Ridge Distillers, Denver, CO", status: "match" },
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
      overallStatus: "fail",
      processingTimeMs: 4100,
      imageDataUrl: "/sample-labels/summit-rum-abv-mismatch.png",
    },
  },
  {
    loggedAt: Date.now() - 20 * 60 * 1000,
    decision: "pending",
    isExample: true,
    result: {
      id: "seed-meadowbrook-chardonnay",
      fileName: "meadowbrook-chardonnay.png",
      mode: "comparison",
      extraction: {
        brand_name: "MEADOWBROOK CELLARS",
        class_type: "Chardonnay",
        beverage_type: "wine",
        alcohol_content_text: "13% Alc./Vol.",
        alcohol_content_percent: 13,
        net_contents: "750 mL",
        producer_name_address: "Meadowbrook Cellar, Napa, CA",
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
        { field: "brand_name", label: "Brand Name", applicationValue: "MEADOWBROOK CELLARS", labelValue: "MEADOWBROOK CELLARS", status: "match" },
        { field: "beverage_type", label: "Beverage Type", applicationValue: "Wine", labelValue: "Wine", status: "match" },
        { field: "class_type", label: "Class/Type Designation", applicationValue: "Chardonnay", labelValue: "Chardonnay", status: "match" },
        { field: "alcohol_content_percent", label: "Alcohol Content (ABV)", applicationValue: "13%", labelValue: "13% Alc./Vol.", status: "match" },
        { field: "net_contents", label: "Net Contents", applicationValue: "750 mL", labelValue: "750 mL", status: "match" },
        {
          field: "producer_name_address",
          label: "Name & Address of Producer/Bottler",
          applicationValue: "Meadowbrook Cellars, Napa, CA",
          labelValue: "Meadowbrook Cellar, Napa, CA",
          status: "review",
          note: "Close but not identical — verify by eye",
        },
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
      overallStatus: "review",
      processingTimeMs: 4400,
      imageDataUrl: "/sample-labels/meadowbrook-chardonnay.png",
    },
  },
  {
    loggedAt: Date.now() - 10 * 60 * 1000,
    decision: "pending",
    isExample: true,
    result: {
      id: "seed-ironclad-brewing-ipa",
      fileName: "ironclad-brewing-ipa.png",
      mode: "self_check",
      extraction: {
        brand_name: "Ironclad Brewing Co.",
        class_type: "India Pale Ale",
        beverage_type: "beer",
        alcohol_content_text: null,
        alcohol_content_percent: null,
        net_contents: "12 FL OZ",
        producer_name_address: "Ironclad Brewing Co., Denver, CO",
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
        { field: "brand_name", label: "Brand Name", applicationValue: null, labelValue: "Ironclad Brewing Co.", status: "match" },
        { field: "beverage_type", label: "Beverage Type", applicationValue: null, labelValue: "Beer / Malt Beverage", status: "match", note: "Auto-detected from label" },
        { field: "class_type", label: "Class/Type Designation", applicationValue: null, labelValue: "India Pale Ale", status: "match" },
        {
          field: "alcohol_content_percent",
          label: "Alcohol Content (ABV)",
          applicationValue: null,
          labelValue: null,
          status: "review",
          note: "Not found — confirm this beverage type is exempt from stating ABV",
        },
        { field: "net_contents", label: "Net Contents", applicationValue: null, labelValue: "12 FL OZ", status: "match" },
        {
          field: "government_warning",
          label: "Government Warning Statement",
          applicationValue: null,
          labelValue:
            "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
          status: "match",
        },
        { field: "producer_name_address", label: "Name & Address of Producer/Bottler", applicationValue: null, labelValue: "Ironclad Brewing Co., Denver, CO", status: "match" },
      ],
      overallStatus: "review",
      processingTimeMs: 3700,
      imageDataUrl: "/sample-labels/ironclad-brewing-ipa.png",
    },
  },
];
