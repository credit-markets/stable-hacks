"use client";

import { use } from "react";
import KybReviewDetail from "./KybReviewDetail";

export default function KybReviewPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="space-y-6">
      <KybReviewDetail id={id} />
    </div>
  );
}
