import type { ApplicationData } from "./schema";

export interface SampleLabel {
  fileName: string;
  imageUrl: string;
  description: string;
  applicationData: ApplicationData;
}

// Application data as it would appear on the COLA filing — intentionally
// mismatched from the label artwork in a few cases (see `description`) to
// exercise the fuzzy/strict matching rules.
export const SAMPLE_LABELS: SampleLabel[] = [
  {
    fileName: "old-tom-bourbon-clean.png",
    imageUrl: "/sample-labels/old-tom-bourbon-clean.png",
    description: "Clean match — every field on file agrees with the label.",
    applicationData: {
      brand_name: "OLD TOM DISTILLERY",
      class_type: "Kentucky Straight Bourbon Whiskey",
      beverage_type: "distilled_spirits",
      alcohol_content_percent: 45,
      net_contents: "750 mL",
      producer_name_address: "Bottled by Old Tom Distillery, Bardstown, KY",
      country_of_origin: "",
      is_import: false,
    },
  },
  {
    fileName: "stones-throw-gin-case-diff.png",
    imageUrl: "/sample-labels/stones-throw-gin-case-diff.png",
    description:
      "Brand name on file is in all caps, label uses title case — same brand, should not be auto-rejected.",
    applicationData: {
      brand_name: "STONE'S THROW",
      class_type: "London Dry Gin",
      beverage_type: "distilled_spirits",
      alcohol_content_percent: 47,
      net_contents: "750 mL",
      producer_name_address: "Distilled by Stone's Throw Distilling Co., Portland, OR",
      country_of_origin: "",
      is_import: false,
    },
  },
  {
    fileName: "harbor-vodka-warning-titlecase.png",
    imageUrl: "/sample-labels/harbor-vodka-warning-titlecase.png",
    description:
      "Government warning heading is 'Government Warning:' in title case, not bold — fails the strict formatting rule.",
    applicationData: {
      brand_name: "HARBOR LIGHT VODKA",
      class_type: "Vodka Distilled from Grain",
      beverage_type: "distilled_spirits",
      alcohol_content_percent: 40,
      net_contents: "1 L",
      producer_name_address: "Harbor Light Spirits Co., Seattle, WA",
      country_of_origin: "",
      is_import: false,
    },
  },
  {
    fileName: "summit-rum-abv-mismatch.png",
    imageUrl: "/sample-labels/summit-rum-abv-mismatch.png",
    description: "Application states 40% ABV but the label prints 35% — a genuine mismatch.",
    applicationData: {
      brand_name: "SUMMIT RIDGE RUM",
      class_type: "Gold Rum",
      beverage_type: "distilled_spirits",
      alcohol_content_percent: 40,
      net_contents: "750 mL",
      producer_name_address: "Summit Ridge Distillers, Denver, CO",
      country_of_origin: "",
      is_import: false,
    },
  },
  {
    fileName: "blue-ridge-whiskey-glare.png",
    imageUrl: "/sample-labels/blue-ridge-whiskey-glare.png",
    description: "Photo has a glare band across the middle — tests reading a lower-quality image.",
    applicationData: {
      brand_name: "BLUE RIDGE RESERVE",
      class_type: "Tennessee Whiskey",
      beverage_type: "distilled_spirits",
      alcohol_content_percent: 43,
      net_contents: "750 mL",
      producer_name_address: "Blue Ridge Reserve Distilling, Lynchburg, TN",
      country_of_origin: "",
      is_import: false,
    },
  },
  {
    fileName: "cedar-creek-whiskey-warning-allbold.png",
    imageUrl: "/sample-labels/cedar-creek-whiskey-warning-allbold.png",
    description:
      "The whole warning statement is bold, not just the heading — 27 CFR 16.21 only permits the 'GOVERNMENT WARNING:' heading itself to be bold.",
    applicationData: {
      brand_name: "CEDAR CREEK RESERVE",
      class_type: "Straight Rye Whiskey",
      beverage_type: "distilled_spirits",
      alcohol_content_percent: 46,
      net_contents: "750 mL",
      producer_name_address: "Cedar Creek Distilling Co., Louisville, KY",
      country_of_origin: "",
      is_import: false,
    },
  },
  {
    fileName: "castaway-import-rum.png",
    imageUrl: "/sample-labels/castaway-import-rum.png",
    description: "Imported product — country of origin is required and present.",
    applicationData: {
      brand_name: "CASTAWAY GOLD",
      class_type: "Rum",
      beverage_type: "distilled_spirits",
      alcohol_content_percent: 40,
      net_contents: "750 mL",
      producer_name_address: "Imported by Castaway Spirits Importers, Miami, FL",
      country_of_origin: "Product of Jamaica",
      is_import: true,
    },
  },
];
