"use client";

import { styles } from "@/lib/styleClasses";
import Link from "next/link";
import type { ReactNode } from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.label} className="flex items-center gap-2">
            {i > 0 && (
              <span className="text-text-muted/50 text-xs select-none">/</span>
            )}
            {isLast || !item.href ? (
              <span className={styles.labelPrimary}>{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="text-[11px] font-mono uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
