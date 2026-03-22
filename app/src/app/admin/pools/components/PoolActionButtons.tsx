"use client";

import type { Pool } from "@/services/api";
import { Button } from "@nextui-org/button";
import { Eye } from "lucide-react";

interface PoolActionButtonsProps {
  pool: Pool;
  onViewDetails: (pool: Pool) => void;
}

export default function PoolActionButtons({
  pool,
  onViewDetails,
}: PoolActionButtonsProps) {
  return (
    <div className="flex justify-end items-center gap-2">
      <Button
        size="sm"
        variant="flat"
        startContent={<Eye className="w-4 h-4" />}
        onPress={() => onViewDetails(pool)}
      >
        View
      </Button>
    </div>
  );
}
