"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  Sparkles,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import ImageDropzone from "@/components/ImageDropzone";
import ApplicationForm from "@/components/ApplicationForm";
import ResultPanel from "@/components/ResultPanel";
import { OverallStatusBadge } from "@/components/StatusBadge";
import Queue, { addToQueue } from "@/components/Queue";
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

const BATCH_CONCURRENCY = 4;
const MAX_BATCH_SIZE = 100;
const MAX_RATE_LIMIT_RETRIES = 3;

interface BatchItem {
  index: number;
  fileName: string;
  result?: VerificationResult;
  error?: string;
}

async function verifyOne(
  fileName: string,
  image: File,
  applicationData: ApplicationData | null,
  onWaiting: (seconds: number) => void,
  attempt = 1,
): Promise<{ result?: VerificationResult; error?: string }> {
  let res: Response;
  try {
    const formData = new FormData();
    formData.set("image", image);
    if (applicationData) formData.set("applicationData", JSON.stringify(applicationData));
    res = await fetch("/api/verify", { method: "POST", body: formData });
  } catch {
    return { error: "Network error — could not reach the server." };
  }

  if (res.status === 429) {
    if (attempt >= MAX_RATE_LIMIT_RETRIES) {
      return { error: "Rate limited — try this one again in a few minutes." };
    }
    const retryAfter = Number(res.headers.get("Retry-After") ?? "30");
    onWaiting(retryAfter);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return verifyOne(fileName, image, applicationData, onWaiting, attempt + 1);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { error: "The server returned an unreadable response." };
  }

  if (!res.ok) {
    const message = typeof data === "object" && data && "error" in data ? String((data as { error: unknown }).error) : "Verification failed.";
    return { error: message };
  }
  return { result: data as VerificationResult };
}

export default function CheckPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [application, setApplication] = useState<ApplicationData>(emptyApplication);
  const [loading, setLoading] = useState(false);
  const [progressNote, setProgressNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [singleResult, setSingleResult] = useState<VerificationResult | null>(null);
  const [batchItems, setBatchItems] = useState<BatchItem[] | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<"all" | "ok" | "review" | "flagged" | "error">("all");

  const isBatch = files.length > 1;

  function resetOutputs() {
    setSingleResult(null);
    setBatchItems(null);
    setError(null);
  }

  function handleFilesChange(newFiles: File[]) {
    setFiles(newFiles);
    setApplication(emptyApplication);
    resetOutputs();
  }

  function handleStartOver() {
    setFiles([]);
    setApplication(emptyApplication);
    resetOutputs();
  }

  async function loadSample(index: number) {
    const sample = SAMPLE_LABELS[index];
    const res = await fetch(sample.imageUrl);
    const blob = await res.blob();
    const file = new File([blob], sample.fileName, { type: blob.type });
    setFiles([file]);
    setApplication(sample.applicationData);
    resetOutputs();
  }

  async function loadSampleBatch() {
    resetOutputs();
    const blobs = await Promise.all(SAMPLE_LABELS.map((s) => fetch(s.imageUrl).then((r) => r.blob())));
    const sampleFiles = SAMPLE_LABELS.map((s, i) => new File([blobs[i]], s.fileName, { type: blobs[i].type }));
    setFiles(sampleFiles);
    setApplication(emptyApplication);
  }

  async function handleVerifySingle() {
    setError(null);
    setLoading(true);
    setSingleResult(null);
    try {
      const outcome = await verifyOne(files[0].name, files[0], application, () => {});
      if (outcome.error) {
        setError(outcome.error);
      } else if (outcome.result) {
        setSingleResult(outcome.result);
        addToQueue(outcome.result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyBatch() {
    if (files.length > MAX_BATCH_SIZE) {
      setError(`Please check ${MAX_BATCH_SIZE} labels or fewer at a time on this demo.`);
      return;
    }

    setError(null);
    setLoading(true);
    const initial: BatchItem[] = files.map((f, index) => ({ index, fileName: f.name }));
    setBatchItems(initial);

    let completed = 0;
    const total = files.length;
    setProgressNote(`Processing 0 of ${total}…`);

    const queue = files.map((file, index) => ({ file, index }));
    let cursor = 0;

    async function worker() {
      while (cursor < queue.length) {
        const item = queue[cursor++];
        const outcome = await verifyOne(item.file.name, item.file, null, (seconds) =>
          setProgressNote(`Shared demo rate limit hit — resuming in ${seconds}s (${completed}/${total} done)…`),
        );
        completed += 1;
        setProgressNote(`Processing ${completed} of ${total}…`);
        if (outcome.result) addToQueue(outcome.result);
        setBatchItems((prev) => {
          const next = [...(prev ?? [])];
          next[item.index] = { index: item.index, fileName: item.file.name, ...outcome };
          return next;
        });
      }
    }

    try {
      await Promise.all(Array.from({ length: Math.min(BATCH_CONCURRENCY, queue.length) }, worker));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The batch run hit an unexpected error partway through.");
    } finally {
      setLoading(false);
      setProgressNote(null);
    }
  }

  function handleVerify() {
    if (files.length === 0) {
      setError("Upload at least one label photo first.");
      return;
    }
    if (isBatch) {
      handleVerifyBatch();
      return;
    }
    if (!application.brand_name.trim() || !application.class_type.trim()) {
      setError("Brand Name and Class/Type Designation are required to check against.");
      return;
    }
    handleVerifySingle();
  }

  function toggleExpand(index: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const summary = useMemo(() => {
    if (!batchItems) return null;
    const ok = batchItems.filter((r) => r.result?.overallStatus === "pass").length;
    const review = batchItems.filter((r) => r.result?.overallStatus === "review").length;
    const flagged = batchItems.filter((r) => r.result?.overallStatus === "fail").length;
    const errored = batchItems.filter((r) => r.error).length;
    const times = batchItems.filter((r) => r.result).map((r) => r.result!.processingTimeMs);
    const avgMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    return { total: batchItems.length, ok, review, flagged, errored, avgMs };
  }, [batchItems]);

  const visibleBatchItems = useMemo(() => {
    if (!batchItems) return [];
    if (filter === "all") return batchItems;
    if (filter === "error") return batchItems.filter((r) => r.error);
    const statusMap = { ok: "pass", review: "review", flagged: "fail" } as const;
    return batchItems.filter((r) => r.result?.overallStatus === statusMap[filter as "ok" | "review" | "flagged"]);
  }, [batchItems, filter]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Label Check</h1>
          <p className="mt-1 text-sm text-muted">
            Upload one label photo with the application data to check it against, or drop in several at
            once for a quick self-check — no application data or spreadsheet needed.
          </p>
        </div>
        {(files.length > 0 || singleResult || batchItems) && (
          <button
            type="button"
            onClick={handleStartOver}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Start Over
          </button>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-accent" />
          Try it with sample labels
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_LABELS.map((s, i) => (
            <button
              key={s.fileName}
              type="button"
              onClick={() => loadSample(i)}
              title={s.description}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent hover:bg-surface-hover"
            >
              {s.fileName.replace(/\.png$/, "").replace(/-/g, " ")}
            </button>
          ))}
          <button
            type="button"
            onClick={loadSampleBatch}
            className="rounded-full border border-dashed border-accent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover"
          >
            load all 6 as a batch
          </button>
        </div>
      </div>

      <div className="space-y-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <ImageDropzone
          multiple
          files={files}
          onChange={handleFilesChange}
          label="Upload label photo(s)"
          hint="One photo = full comparison against application data. Multiple = quick self-check, no data entry."
        />

        {!isBatch && files.length === 1 && <ApplicationForm value={application} onChange={setApplication} />}

        {isBatch && (
          <p className="text-sm text-muted">
            {files.length} photos ready — each will be checked against its own required fields (Government
            Warning wording/formatting, ABV, net contents, brand name, class/type). Remove down to one photo
            if you&apos;d rather compare a single label against application data instead.
          </p>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleVerify}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isBatch ? progressNote : "Verifying label… (usually under 5 seconds)"}
            </>
          ) : isBatch ? (
            `Check ${files.length} Labels`
          ) : (
            "Verify Label"
          )}
        </button>
      </div>

      {singleResult && (
        <div className="mt-8">
          <ResultPanel result={singleResult} />
        </div>
      )}

      {summary && (
        <div className="mt-8">
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <SummaryCard label="Total" value={summary.total} />
            <SummaryCard label="OK" value={summary.ok} tone="text-emerald-700 dark:text-emerald-400" />
            <SummaryCard label="Review" value={summary.review} tone="text-amber-700 dark:text-amber-400" />
            <SummaryCard label="Flagged" value={summary.flagged} tone="text-rose-700 dark:text-rose-400" />
            <SummaryCard label="Avg time" value={`${(summary.avgMs / 1000).toFixed(1)}s`} />
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {(["all", "ok", "review", "flagged", "error"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted hover:bg-surface"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {visibleBatchItems.map((item) => (
              <div key={item.index} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleExpand(item.index)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <BatchStatusIcon item={item} />
                    <span className="text-sm font-medium text-foreground">{item.fileName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.result && <OverallStatusBadge status={item.result.overallStatus} mode={item.result.mode} size="sm" />}
                    {item.error && <span className="text-xs text-rose-700 dark:text-rose-400">{item.error}</span>}
                    {expanded.has(item.index) ? (
                      <ChevronUp className="h-4 w-4 text-muted" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted" />
                    )}
                  </div>
                </button>
                {expanded.has(item.index) && item.result && (
                  <div className="border-t border-border p-3">
                    <ResultPanel result={item.result} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Queue />
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

function BatchStatusIcon({ item }: { item: BatchItem }) {
  if (item.error) return <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
  if (item.result?.overallStatus === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  if (item.result?.overallStatus === "review") return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
  if (item.result?.overallStatus === "fail") return <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
  return <Loader2 className="h-4 w-4 animate-spin text-muted" />;
}
