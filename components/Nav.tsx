"use client";

import Link from "next/link";
import { ScanLine } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScanLine className="h-5 w-5" />
          </span>
          <span className="text-lg tracking-tight">Label Check</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
