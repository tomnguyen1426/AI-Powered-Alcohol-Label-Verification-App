"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, ImageIcon, X } from "lucide-react";
import clsx from "clsx";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/constants";

interface ImageDropzoneProps {
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
  hint?: string;
}

export default function ImageDropzone({
  multiple = false,
  files,
  onChange,
  label = "Upload label photo",
  hint = "PNG, JPEG, or WEBP — up to 4 MB",
}: ImageDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const valid = Array.from(incoming).filter((f) => ACCEPTED_IMAGE_TYPES.includes(f.type));
      onChange(multiple ? [...files, ...valid] : valid.slice(0, 1));
    },
    [files, multiple, onChange],
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={clsx(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragActive ? "border-accent bg-surface-hover" : "border-border bg-surface hover:bg-surface-hover",
        )}
      >
        <UploadCloud className="h-8 w-8 text-accent" />
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted">Click to browse or drag and drop {multiple && "one or more images"}</p>
        <p className="text-xs text-muted">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          multiple={multiple}
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
            >
              <ImageIcon className="h-3.5 w-3.5 text-muted" />
              <span className="max-w-[160px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="text-muted hover:text-rose-600 dark:hover:text-rose-400"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
