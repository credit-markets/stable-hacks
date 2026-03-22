"use client";
import Image from "next/image";
import type { PropsWithChildren } from "react";

const VALUE_PROPOSITIONS = [
  {
    title: "Real-World Credit",
    description:
      "Short-duration receivables backed by regulated local enforcement.",
  },
  {
    title: "Disciplined Structure",
    description:
      "Conservative pooling, transparent reporting, predictable settlement.",
  },
  {
    title: "Institutional Platform",
    description:
      "Built for allocators seeking infrastructure-grade credit access.",
  },
];

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen w-full flex">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-2/3 min-h-screen flex items-center justify-center bg-surface-page geometric-pattern px-6 py-12">
        {children}
      </div>

      {/* Right Panel - Marketing Content (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/3 min-h-screen flex-col bg-dimensional-gray relative overflow-hidden">
        {/* Top accent line */}
        <div className="h-1 w-full bg-strategic-blue" />

        {/* Content */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-8 lg:px-12 xl:px-16">
          {/* Header */}
          <div className="mb-12 text-right">
            <h2 className="text-clean-white text-2xl xl:text-3xl font-semibold leading-tight tracking-tight mb-3">
              Global Access to Emerging Credit
            </h2>
            <div className="inline-flex items-center gap-2">
              <span className="text-depth-gray text-sm">by</span>
              <Image
                src="/assets/credit-markets/full-logo-horizontal.svg"
                alt="Credit Markets"
                width={160}
                height={28}
                className="brightness-0 invert"
              />
            </div>
          </div>

          {/* Value Propositions - Neo-Geometric style */}
          <div className="space-y-4">
            {VALUE_PROPOSITIONS.map((prop) => (
              <div
                key={prop.title}
                className="bg-dimensional-gray/50 p-5 border-l-2 border-strategic-blue"
              >
                <h3 className="text-clean-white font-semibold text-base mb-1.5 uppercase tracking-wide">
                  {prop.title}
                </h3>
                <p className="text-clean-white/70 text-sm leading-relaxed">
                  {prop.description}
                </p>
              </div>
            ))}
          </div>

          {/* Decorative geometric element */}
          <div className="mt-12 flex items-center gap-3">
            <div className="h-px flex-1 bg-depth-gray/30" />
            <div className="w-2 h-2 bg-strategic-blue rotate-45" />
            <div className="h-px w-12 bg-strategic-blue/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
