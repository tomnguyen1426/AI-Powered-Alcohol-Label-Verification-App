"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanLine } from "lucide-react";
import clsx from "clsx";
import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "/", label: "Single Check" },
  { href: "/batch", label: "Batch Check" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScanLine className="h-5 w-5" />
          </span>
          <span className="text-lg tracking-tight">Label Check</span>
        </Link>
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted hover:bg-surface hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
