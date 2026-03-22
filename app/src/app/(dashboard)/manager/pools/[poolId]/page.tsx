"use client";

import { use } from "react";
import { PoolManagerContent } from "./components/PoolManagerContent";

export default function PoolManagerPage({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const { poolId } = use(params);
  return <PoolManagerContent poolId={poolId} />;
}
