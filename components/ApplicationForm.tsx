"use client";

import type { ApplicationData } from "@/lib/schema";
import { BEVERAGE_TYPES } from "@/lib/constants";

const beverageLabels: Record<(typeof BEVERAGE_TYPES)[number], string> = {
  distilled_spirits: "Distilled Spirits",
  wine: "Wine",
  beer: "Beer / Malt Beverage",
};

interface ApplicationFormProps {
  value: ApplicationData;
  onChange: (value: ApplicationData) => void;
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-rose-600 dark:text-rose-400"> *</span>}
      </span>
      {children}
    </label>
  );
}

const inputClasses =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export default function ApplicationForm({ value, onChange }: ApplicationFormProps) {
  const set = <K extends keyof ApplicationData>(key: K, v: ApplicationData[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Brand Name" required>
        <input
          className={inputClasses}
          value={value.brand_name}
          placeholder="e.g. OLD TOM DISTILLERY"
          onChange={(e) => set("brand_name", e.target.value)}
        />
      </Field>

      <Field label="Beverage Type" required>
        <select
          className={inputClasses}
          value={value.beverage_type}
          onChange={(e) => set("beverage_type", e.target.value as ApplicationData["beverage_type"])}
        >
          {BEVERAGE_TYPES.map((t) => (
            <option key={t} value={t}>
              {beverageLabels[t]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Class/Type Designation">
        <input
          className={inputClasses}
          value={value.class_type}
          placeholder="e.g. Kentucky Straight Bourbon Whiskey"
          onChange={(e) => set("class_type", e.target.value)}
        />
      </Field>

      <Field label="Alcohol Content (% ABV)">
        <input
          type="number"
          step="0.1"
          min={0}
          max={100}
          className={inputClasses}
          value={value.alcohol_content_percent ?? ""}
          placeholder="Leave blank if exempt"
          onChange={(e) => set("alcohol_content_percent", e.target.value === "" ? null : Number(e.target.value))}
        />
      </Field>

      <Field label="Net Contents">
        <input
          className={inputClasses}
          value={value.net_contents}
          placeholder="e.g. 750 mL"
          onChange={(e) => set("net_contents", e.target.value)}
        />
      </Field>

      <Field label="Producer / Bottler Name & Address">
        <input
          className={inputClasses}
          value={value.producer_name_address}
          placeholder="e.g. Bottled by Old Tom Distillery, Bardstown, KY"
          onChange={(e) => set("producer_name_address", e.target.value)}
        />
      </Field>

      <Field label="Country of Origin">
        <input
          className={inputClasses}
          value={value.country_of_origin}
          placeholder="Required for imports"
          onChange={(e) => set("country_of_origin", e.target.value)}
        />
      </Field>

      <label className="mt-6 flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={value.is_import}
          onChange={(e) => set("is_import", e.target.checked)}
          className="h-4 w-4 rounded border-border accent-accent"
        />
        This is an imported product
      </label>
    </div>
  );
}
