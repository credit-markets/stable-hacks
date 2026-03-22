"use client";

import { Logo } from "@/components/icons/ina";
import Link from "next/link";

const FOOTER_LINKS = [
  {
    name: "Privacy Policy",
    href: "https://docs.credit.markets/legal-and-compliance/ina-protocol-terms-of-services/privacy-policy",
    external: true,
  },
  {
    name: "Terms of Service",
    href: "https://docs.credit.markets/legal-and-compliance/ina-protocol-terms-of-services/terms-and-conditions",
    external: true,
  },
  {
    name: "Docs",
    href: "https://docs.credit.markets/",
    external: true,
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-b from-[#2E2E2E] to-[#262626]">
      <div className="absolute top-0 left-0 right-0 h-[2px] opacity-30 bg-[linear-gradient(90deg,transparent_5%,#79c2ff_50%,transparent_95%)]" />
      <div className="mx-auto max-w-[1400px] px-4 lg:px-12 py-4">
        <div className="relative flex items-center">
          {/* Logo - left */}
          <Link
            href="/"
            className="hover:opacity-80 transition-opacity shrink-0"
          >
            <span className="opacity-50">
              <Logo size={20} color="#FFFFFF" />
            </span>
          </Link>

          {/* Links - absolute centered */}
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-x-5">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Copyright - right */}
          <span className="text-[10px] text-[rgba(255,255,255,0.25)] shrink-0 ml-auto">
            &copy; {currentYear} Credit Markets. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
