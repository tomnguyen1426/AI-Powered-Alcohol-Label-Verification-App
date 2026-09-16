/**
 * Generates a handful of synthetic bourbon/gin/vodka label images used as demo
 * fixtures for the prototype (no real brands). Run with `npm run gen:labels`.
 *
 * These intentionally cover the judgment calls called out in stakeholder
 * interviews: a harmless case-only brand name difference, a strict warning
 * formatting failure, and a real ABV mismatch — alongside a couple of clean
 * passes — so the matching logic has something real to demonstrate against.
 */
import { createCanvas, SKRSContext2D } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";

const OUT_DIR = path.resolve(__dirname, "../public/sample-labels");
fs.mkdirSync(OUT_DIR, { recursive: true });

const WIDTH = 900;
const HEIGHT = 1200;

const STANDARD_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

interface LabelSpec {
  fileName: string;
  brand: string;
  classType: string;
  abvText: string;
  netContents: string;
  producer: string;
  country?: string;
  warningHeading: string; // rendered heading text
  warningHeadingBold: boolean;
  warningBodyBold?: boolean; // violation: only the heading may be bold per 27 CFR 16.21
  warningBody: string; // full warning text including heading, as rendered
  accent: string;
  paper: string;
  noise?: "glare" | "angle";
}

function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawLabel(spec: LabelSpec) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background "shelf" behind the bottle label
  ctx.fillStyle = "#e9e4da";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Label card
  const pad = 60;
  ctx.fillStyle = spec.paper;
  ctx.fillRect(pad, pad, WIDTH - pad * 2, HEIGHT - pad * 2);
  ctx.strokeStyle = spec.accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(pad + 10, pad + 10, WIDTH - pad * 2 - 20, HEIGHT - pad * 2 - 20);

  let y = pad + 90;
  const centerX = WIDTH / 2;

  ctx.fillStyle = spec.accent;
  ctx.textAlign = "center";
  ctx.font = "bold 30px Georgia";
  ctx.fillText("ESTABLISHED 1892", centerX, y);
  y += 60;

  ctx.fillStyle = "#1c1c1c";
  ctx.font = "bold 64px Georgia";
  for (const line of wrapText(ctx, spec.brand, WIDTH - pad * 2 - 140)) {
    ctx.fillText(line, centerX, y);
    y += 70;
  }
  y += 10;

  ctx.font = "italic 32px Georgia";
  ctx.fillStyle = "#3a3a3a";
  for (const line of wrapText(ctx, spec.classType, WIDTH - pad * 2 - 160)) {
    ctx.fillText(line, centerX, y);
    y += 42;
  }
  y += 30;

  ctx.strokeStyle = spec.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 160, y);
  ctx.lineTo(centerX + 160, y);
  ctx.stroke();
  y += 50;

  ctx.font = "28px Georgia";
  ctx.fillStyle = "#1c1c1c";
  ctx.fillText(spec.abvText, centerX, y);
  y += 42;
  ctx.fillText(spec.netContents, centerX, y);
  y += 55;

  ctx.font = "20px Georgia";
  ctx.fillStyle = "#3a3a3a";
  for (const line of wrapText(ctx, spec.producer, WIDTH - pad * 2 - 160)) {
    ctx.fillText(line, centerX, y);
    y += 26;
  }
  if (spec.country) {
    y += 6;
    ctx.fillText(spec.country, centerX, y);
    y += 26;
  }

  // Warning box, anchored near the bottom
  const boxTop = HEIGHT - pad - 230;
  const boxHeight = 190;
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pad + 40, boxTop, WIDTH - pad * 2 - 80, boxHeight);

  ctx.textAlign = "left";
  const textX = pad + 56;
  const textMaxWidth = WIDTH - pad * 2 - 112;
  let wy = boxTop + 34;

  ctx.font = spec.warningHeadingBold ? "bold 19px Arial" : "19px Arial";
  ctx.fillStyle = "#1c1c1c";
  ctx.fillText(spec.warningHeading, textX, wy);
  wy += 26;

  ctx.font = spec.warningBodyBold ? "bold 16px Arial" : "16px Arial";
  const bodyOnly = spec.warningBody.replace(spec.warningHeading, "").trim();
  for (const line of wrapText(ctx, bodyOnly, textMaxWidth)) {
    ctx.fillText(line, textX, wy);
    wy += 22;
  }

  // Simulated capture artifacts for the "imperfect photo" scenario
  if (spec.noise === "glare") {
    const grad = ctx.createLinearGradient(0, HEIGHT * 0.55, 0, HEIGHT * 0.75);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, HEIGHT * 0.55, WIDTH, HEIGHT * 0.2);
  }

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(OUT_DIR, spec.fileName), buffer);
  console.log("Wrote", spec.fileName);
}

const labels: LabelSpec[] = [
  {
    fileName: "old-tom-bourbon-clean.png",
    brand: "OLD TOM DISTILLERY",
    classType: "Kentucky Straight Bourbon Whiskey",
    abvText: "45% Alc./Vol. (90 Proof)",
    netContents: "750 mL",
    producer: "Bottled by Old Tom Distillery, Bardstown, KY",
    warningHeading: "GOVERNMENT WARNING:",
    warningHeadingBold: true,
    warningBody: STANDARD_WARNING,
    accent: "#7a1f1f",
    paper: "#f7f1e3",
  },
  {
    fileName: "stones-throw-gin-case-diff.png",
    brand: "Stone's Throw",
    classType: "London Dry Gin",
    abvText: "47% Alc./Vol. (94 Proof)",
    netContents: "750 mL",
    producer: "Distilled by Stone's Throw Distilling Co., Portland, OR",
    warningHeading: "GOVERNMENT WARNING:",
    warningHeadingBold: true,
    warningBody: STANDARD_WARNING,
    accent: "#1f3d5c",
    paper: "#f2f4f6",
  },
  {
    fileName: "harbor-vodka-warning-titlecase.png",
    brand: "HARBOR LIGHT VODKA",
    classType: "Vodka Distilled from Grain",
    abvText: "40% Alc./Vol. (80 Proof)",
    netContents: "1 L",
    producer: "Harbor Light Spirits Co., Seattle, WA",
    warningHeading: "Government Warning:",
    warningHeadingBold: false,
    warningBody: STANDARD_WARNING.replace("GOVERNMENT WARNING:", "Government Warning:"),
    accent: "#0f4c5c",
    paper: "#eef6f7",
  },
  {
    fileName: "summit-rum-abv-mismatch.png",
    brand: "SUMMIT RIDGE RUM",
    classType: "Gold Rum",
    abvText: "35% Alc./Vol. (70 Proof)",
    netContents: "750 mL",
    producer: "Summit Ridge Distillers, Denver, CO",
    warningHeading: "GOVERNMENT WARNING:",
    warningHeadingBold: true,
    warningBody: STANDARD_WARNING,
    accent: "#8a5a12",
    paper: "#faf3e6",
  },
  {
    fileName: "blue-ridge-whiskey-glare.png",
    brand: "BLUE RIDGE RESERVE",
    classType: "Tennessee Whiskey",
    abvText: "43% Alc./Vol. (86 Proof)",
    netContents: "750 mL",
    producer: "Blue Ridge Reserve Distilling, Lynchburg, TN",
    warningHeading: "GOVERNMENT WARNING:",
    warningHeadingBold: true,
    warningBody: STANDARD_WARNING,
    accent: "#264d1f",
    paper: "#f5f2e8",
    noise: "glare",
  },
  {
    fileName: "cedar-creek-whiskey-warning-allbold.png",
    brand: "CEDAR CREEK RESERVE",
    classType: "Straight Rye Whiskey",
    abvText: "46% Alc./Vol. (92 Proof)",
    netContents: "750 mL",
    producer: "Cedar Creek Distilling Co., Louisville, KY",
    warningHeading: "GOVERNMENT WARNING:",
    warningHeadingBold: true,
    warningBodyBold: true,
    warningBody: STANDARD_WARNING,
    accent: "#4a2e1f",
    paper: "#f6f0e4",
  },
  {
    fileName: "castaway-import-rum.png",
    brand: "CASTAWAY GOLD",
    classType: "Rum",
    abvText: "40% Alc./Vol. (80 Proof)",
    netContents: "750 mL",
    producer: "Imported by Castaway Spirits Importers, Miami, FL",
    country: "Product of Jamaica",
    warningHeading: "GOVERNMENT WARNING:",
    warningHeadingBold: true,
    warningBody: STANDARD_WARNING,
    accent: "#0e6b5c",
    paper: "#eef7f3",
  },
];

for (const label of labels) drawLabel(label);

console.log(`\nGenerated ${labels.length} sample labels in ${OUT_DIR}`);
