import Link from "next/link";
import { ScanLine, Zap, Layers, ShieldCheck, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Seconds, not minutes",
    body: "Each label is read and cross-checked in a few seconds, so it fits into how agents already work instead of replacing it.",
  },
  {
    icon: Layers,
    title: "Batch-ready",
    body: "Upload a whole shipment of label photos with a CSV of application data and process the entire stack in one pass.",
  },
  {
    icon: ShieldCheck,
    title: "Exact where it must be",
    body: "The Government Warning statement is checked word-for-word and for bold/all-caps formatting. Brand names get room for harmless formatting differences, not real mismatches.",
  },
];

const steps = [
  {
    step: "1",
    title: "Enter what's on file",
    body: "Type or paste the brand name, class/type, ABV, net contents, and other fields from the application.",
  },
  {
    step: "2",
    title: "Upload the label photo",
    body: "Drop in a photo of the bottle or can label — angled or glare-heavy shots are fine, the tool will flag quality issues rather than fail silently.",
  },
  {
    step: "3",
    title: "Get a field-by-field readout",
    body: "Each required field is marked Match, Review, or Mismatch, with a plain-language overall Pass / Needs Review / Fail result.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="border-b border-border bg-gradient-to-b from-blue-50 to-background">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <ScanLine className="h-7 w-7" />
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Label review, at a glance
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted sm:text-lg">
            A prototype that reads an alcohol label photo and checks it against the application on
            file — brand name, class/type, ABV, net contents, and the Government Warning statement —
            so agents can spend their time on judgment calls instead of manual matching.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/verify"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-blue-900"
            >
              Check a single label
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/batch"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:bg-slate-50"
            >
              Check a batch of labels
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <f.icon className="h-6 w-6 text-accent" />
              <h3 className="mt-3 text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-semibold text-foreground">How it works</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {s.step}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
