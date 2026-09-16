"use client";

import { useState } from "react";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import ImageDropzone from "@/components/ImageDropzone";
import ApplicationForm from "@/components/ApplicationForm";
import ResultPanel from "@/components/ResultPanel";
import { SAMPLE_LABELS } from "@/lib/sample-data";
import type { ApplicationData, VerificationResult } from "@/lib/schema";

const emptyApplication: ApplicationData = {
  brand_name: "",
  class_type: "",
  beverage_type: "distilled_spirits",
  alcohol_content_percent: null,
  net_contents: "",
  producer_name_address: "",
  country_of_origin: "",
  is_import: false,
};

export default function VerifyPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [application, setApplication] = useState<ApplicationData>(emptyApplication);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);

  async function loadSample(index: number) {
    const sample = SAMPLE_LABELS[index];
    const res = await fetch(sample.imageUrl);
    const blob = await res.blob();
    const file = new File([blob], sample.fileName, { type: blob.type });
    setFiles([file]);
    setApplication(sample.applicationData);
    setResult(null);
    setError(null);
  }

  async function handleSubmit() {
    if (files.length === 0) {
      setError("Upload a label image first.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.set("image", files[0]);
      formData.set("applicationData", JSON.stringify(application));
      const res = await fetch("/api/verify", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed.");
      setResult(data as VerificationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Single Label Check</h1>
        <p className="mt-1 text-sm text-muted">
          Upload one label photo, enter what&apos;s on the application, and verify in a few seconds.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-accent" />
          Try a sample label
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_LABELS.map((s, i) => (
            <button
              key={s.fileName}
              type="button"
              onClick={() => loadSample(i)}
              title={s.description}
              className="rounded-full border border-border bg-slate-50 px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent hover:bg-blue-50"
            >
              {s.fileName.replace(/\.png$/, "").replace(/-/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <ImageDropzone files={files} onChange={setFiles} />
        <ApplicationForm value={application} onChange={setApplication} />

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying label… (usually under 5 seconds)
            </>
          ) : (
            "Verify Label"
          )}
        </button>
      </div>

      {result && (
        <div className="mt-8">
          <ResultPanel result={result} />
        </div>
      )}
    </div>
  );
}
