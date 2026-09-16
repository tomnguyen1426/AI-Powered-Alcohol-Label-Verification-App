"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  Sparkles,
  AlertCircle,
  Download,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import ImageDropzone from "@/components/ImageDropzone";
import ResultPanel from "@/components/ResultPanel";
import { OverallStatusBadge } from "@/components/StatusBadge";
import { parseApplicationsCsv, applicationsCsvTemplate, type CsvRow } from "@/lib/csv";
import { SAMPLE_LABELS } from "@/lib/sample-data";
import type {
  ApplicationData,
  FieldComparison,
  LabelExtraction,
  OverallStatus,
  VerificationResult,
} from "@/lib/schema";

interface BatchApiItem {
  index: number;
  id?: string;
  fileName: string;
  error?: string;
  extraction?: LabelExtraction;
  comparisons?: FieldComparison[];
  overallStatus?: OverallStatus;
  processingTimeMs?: number;
  imageDataUrl?: string;
}

interface MatchedRow {
  fileName: string;
  image: File | null;
  applicationData: ApplicationData | null;
  error: string | null;
}

const BATCH_CONCURRENCY = 4;
const MAX_BATCH_SIZE = 100;
const MAX_RATE_LIMIT_RETRIES = 3;

async function verifyOne(
  fileName: string,
  image: File,
  applicationData: ApplicationData,
  onWaiting: (seconds: number) => void,
  attempt = 1,
): Promise<Omit<BatchApiItem, "index">> {
  const formData = new FormData();
  formData.set("image", image);
  formData.set("applicationData", JSON.stringify(applicationData));

  const res = await fetch("/api/verify", { method: "POST", body: formData });

  if (res.status === 429) {
    if (attempt >= MAX_RATE_LIMIT_RETRIES) {
      return { fileName, error: "Rate limited — try this one again in a few minutes." };
    }
    const retryAfter = Number(res.headers.get("Retry-After") ?? "30");
    onWaiting(retryAfter);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return verifyOne(fileName, image, applicationData, onWaiting, attempt + 1);
  }

  const data = await res.json();
  if (!res.ok) {
    return { fileName, error: data.error || "Verification failed." };
  }
  return data as Omit<BatchApiItem, "index">;
}

function downloadTemplate() {
  const blob = new Blob([applicationsCsvTemplate()], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "application-data-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function BatchPage() {
  const [images, setImages] = useState<File[]>([]);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressNote, setProgressNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BatchApiItem[] | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<"all" | OverallStatus | "error">("all");

  const matchedRows: MatchedRow[] = useMemo(() => {
    if (csvRows.length === 0) return [];
    return csvRows.map((row) => {
      const image = images.find((f) => f.name.toLowerCase() === row.fileName.toLowerCase()) ?? null;
      if (row.error) return { fileName: row.fileName, image, applicationData: null, error: row.error };
      if (!image) return { fileName: row.fileName, image: null, applicationData: row.data, error: "No matching uploaded image" };
      return { fileName: row.fileName, image, applicationData: row.data, error: null };
    });
  }, [csvRows, images]);

  const readyRows = matchedRows.filter((r) => r.image && r.applicationData);

  async function handleCsvUpload(file: File) {
    const text = await file.text();
    setCsvRows(parseApplicationsCsv(text));
    setCsvFileName(file.name);
    setResults(null);
    setError(null);
  }

  async function loadSampleBatch() {
    setError(null);
    setResults(null);
    const [csvText, ...blobs] = await Promise.all([
      fetch("/sample-data/applications.csv").then((r) => r.text()),
      ...SAMPLE_LABELS.map((s) => fetch(s.imageUrl).then((r) => r.blob())),
    ]);
    const files = SAMPLE_LABELS.map((s, i) => new File([blobs[i]], s.fileName, { type: blobs[i].type }));
    setImages(files);
    setCsvRows(parseApplicationsCsv(csvText));
    setCsvFileName("applications.csv (sample)");
  }

  async function handleProcessBatch() {
    if (readyRows.length === 0) {
      setError("No fully matched rows to process — upload images and a matching CSV first.");
      return;
    }
    if (readyRows.length > MAX_BATCH_SIZE) {
      setError(`Please process ${MAX_BATCH_SIZE} labels or fewer at a time on this demo.`);
      return;
    }

    setLoading(true);
    setError(null);
    setResults(readyRows.map((row, index) => ({ index, fileName: row.fileName })));

    let completed = 0;
    const total = readyRows.length;
    setProgressNote(`Processing 0 of ${total}…`);

    const queue = readyRows.map((row, index) => ({ ...row, index }));
    let cursor = 0;

    async function worker() {
      while (cursor < queue.length) {
        const row = queue[cursor++];
        const outcome = await verifyOne(
          row.fileName,
          row.image as File,
          row.applicationData as ApplicationData,
          (seconds) => setProgressNote(`Shared demo rate limit hit — resuming in ${seconds}s (${completed}/${total} done)…`),
        );
        completed += 1;
        setProgressNote(`Processing ${completed} of ${total}…`);
        setResults((prev) => {
          const next = [...(prev ?? [])];
          next[row.index] = { ...outcome, index: row.index };
          return next;
        });
      }
    }

    await Promise.all(Array.from({ length: Math.min(BATCH_CONCURRENCY, queue.length) }, worker));

    setLoading(false);
    setProgressNote(null);
  }

  const summary = useMemo(() => {
    if (!results) return null;
    const pass = results.filter((r) => r.overallStatus === "pass").length;
    const review = results.filter((r) => r.overallStatus === "review").length;
    const fail = results.filter((r) => r.overallStatus === "fail").length;
    const errored = results.filter((r) => r.error).length;
    const times = results.filter((r) => r.processingTimeMs).map((r) => r.processingTimeMs as number);
    const avgMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    return { total: results.length, pass, review, fail, errored, avgMs };
  }, [results]);

  const visibleResults = useMemo(() => {
    if (!results) return [];
    if (filter === "all") return results;
    if (filter === "error") return results.filter((r) => r.error);
    return results.filter((r) => r.overallStatus === filter);
  }, [results, filter]);

  function toggleExpand(index: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Batch Label Check</h1>
        <p className="mt-1 text-sm text-muted">
          Drop in a stack of label photos plus a CSV of the matching application data — process the whole
          shipment at once instead of one at a time.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
        <button
          type="button"
          onClick={loadSampleBatch}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-slate-50 px-3 py-1.5 text-xs font-medium hover:border-accent hover:bg-blue-50"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Load sample batch (6 labels)
        </button>
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-slate-50 px-3 py-1.5 text-xs font-medium hover:border-accent hover:bg-blue-50"
        >
          <Download className="h-3.5 w-3.5 text-accent" />
          Download CSV template
        </button>
      </div>

      <div className="space-y-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-foreground">1. Label photos</h2>
          <ImageDropzone multiple files={images} onChange={setImages} label="Upload label photos" hint={`Multiple files supported — up to ${MAX_BATCH_SIZE} per run, 4 MB each`} />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-foreground">2. Application data (CSV)</h2>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-slate-50 px-4 py-3 text-sm hover:bg-slate-100">
            <FileSpreadsheet className="h-5 w-5 text-accent" />
            <span>{csvFileName ?? "Click to upload a CSV (file_name column must match your image file names)"}</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleCsvUpload(e.target.files[0])}
            />
          </label>
        </div>

        {matchedRows.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-foreground">3. Review matches</h2>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2">Brand on file</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {matchedRows.map((row) => (
                    <tr key={row.fileName}>
                      <td className="px-3 py-2 font-medium text-foreground">{row.fileName}</td>
                      <td className="px-3 py-2 text-muted">{row.applicationData?.brand_name ?? "—"}</td>
                      <td className="px-3 py-2">
                        {row.error ? (
                          <span className="inline-flex items-center gap-1 text-rose-700">
                            <AlertCircle className="h-3.5 w-3.5" /> {row.error}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleProcessBatch}
          disabled={loading || readyRows.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {progressNote}
            </>
          ) : (
            `Process Batch (${readyRows.length} ready)`
          )}
        </button>
      </div>

      {summary && (
        <div className="mt-8">
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <SummaryCard label="Total" value={summary.total} />
            <SummaryCard label="Pass" value={summary.pass} tone="text-emerald-700" />
            <SummaryCard label="Review" value={summary.review} tone="text-amber-700" />
            <SummaryCard label="Fail" value={summary.fail} tone="text-rose-700" />
            <SummaryCard label="Avg time" value={`${(summary.avgMs / 1000).toFixed(1)}s`} />
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {(["all", "pass", "review", "fail", "error"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-white text-muted hover:bg-slate-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {visibleResults.map((item) => (
              <div key={item.index} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleExpand(item.index)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon item={item} />
                    <span className="text-sm font-medium text-foreground">{item.fileName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.overallStatus && <OverallStatusBadge status={item.overallStatus} size="sm" />}
                    {item.error && <span className="text-xs text-rose-700">{item.error}</span>}
                    {expanded.has(item.index) ? (
                      <ChevronUp className="h-4 w-4 text-muted" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted" />
                    )}
                  </div>
                </button>
                {expanded.has(item.index) && item.extraction && item.comparisons && item.overallStatus && (
                  <div className="border-t border-border p-3">
                    <ResultPanel result={item as unknown as VerificationResult} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

function StatusIcon({ item }: { item: BatchApiItem }) {
  if (item.error) return <XCircle className="h-4 w-4 text-rose-600" />;
  if (item.overallStatus === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (item.overallStatus === "review") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  if (item.overallStatus === "fail") return <XCircle className="h-4 w-4 text-rose-600" />;
  return <Loader2 className="h-4 w-4 animate-spin text-muted" />;
}
