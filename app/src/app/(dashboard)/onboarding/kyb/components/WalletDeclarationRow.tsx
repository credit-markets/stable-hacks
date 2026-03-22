"use client";

import type { KybWalletDeclaration } from "@/types/kyb";
import { Button } from "@nextui-org/button";

interface WalletDeclarationRowProps {
  submissionId: string;
  wallet: KybWalletDeclaration;
  onRemove: () => void;
}

export default function WalletDeclarationRow({
  wallet,
  onRemove,
}: WalletDeclarationRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded border border-subtle px-4 py-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {wallet.wallet_label}
          </span>
        </div>
        <p className="text-xs text-text-muted font-mono truncate">
          {wallet.wallet_address}
        </p>
        <p className="text-xs text-text-secondary">
          {wallet.source_description}
        </p>
      </div>
      <Button size="sm" color="danger" variant="light" onPress={onRemove}>
        Remove
      </Button>
    </div>
  );
}
