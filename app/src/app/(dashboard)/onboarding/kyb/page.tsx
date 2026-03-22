"use client";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import KybForm from "./KybForm";

export default function KybPage() {
  return (
    <div className="max-w-[1280px] mx-auto py-8 px-4 md:px-8 lg:px-16">
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/" },
            { label: "KYB Verification" },
          ]}
        />
        <KybForm />
      </div>
    </div>
  );
}
