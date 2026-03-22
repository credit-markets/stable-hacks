"use client";

import { cx, styles } from "@/lib/styleClasses";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/modal";
import { useState } from "react";

interface AmountInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => unknown | Promise<unknown>;
  title: string;
  isLoading: boolean;
  maxAmount?: number;
  balanceLabel?: string;
  tokenSymbol?: string;
}

export function AmountInputModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  isLoading,
  maxAmount,
  balanceLabel,
  tokenSymbol = "USDC",
}: AmountInputModalProps) {
  const [amount, setAmount] = useState("");

  const numericAmount = Number(amount);
  const isValid =
    amount !== "" &&
    numericAmount > 0 &&
    (maxAmount == null || numericAmount <= maxAmount);

  const handleConfirm = async () => {
    if (!isValid) return;
    try {
      await onConfirm(numericAmount);
      // Close modal immediately — the action bar button shows loading until webhook confirms
      setAmount("");
      onClose();
    } catch {
      // Error already shown via toast in signAndSend — keep modal open for retry
    }
  };

  const handleClose = () => {
    setAmount("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      isDismissable
      hideCloseButton={false}
      classNames={{
        base: "bg-surface-card border border-subtle shadow-modal sm:rounded-lg",
      }}
    >
      <ModalContent>
        <ModalHeader className="border-b border-subtle">
          <h3 className={styles.headingMd}>{title}</h3>
        </ModalHeader>

        <ModalBody className="py-6">
          {balanceLabel && (
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[11px] text-text-muted">
                {balanceLabel}
              </span>
              {maxAmount != null && (
                <span className="text-[11px] text-text-secondary">
                  {`${maxAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${tokenSymbol}`}
                </span>
              )}
            </div>
          )}
          <div className="relative">
            <Input
              label={!balanceLabel ? "Amount" : undefined}
              labelPlacement="outside"
              placeholder="0.00"
              type="number"
              variant="bordered"
              startContent={
                <span className="text-text-muted text-sm">{tokenSymbol}</span>
              }
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              classNames={{
                inputWrapper: "border-1 rounded-lg pr-14",
                input: "text-right",
                label: "text-xs font-medium",
              }}
            />
            {maxAmount != null && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 border border-border-default rounded bg-surface-hover text-text-secondary hover:bg-surface-page transition-colors"
                onClick={() => setAmount(maxAmount.toString())}
              >
                Max
              </button>
            )}
          </div>
        </ModalBody>

        <ModalFooter className="border-t border-subtle gap-2">
          <Button
            className={cx(styles.btnBase, styles.btnSecondary, styles.btnMd)}
            onPress={handleClose}
          >
            Cancel
          </Button>
          <Button
            className={cx(styles.btnBase, styles.btnPrimary, styles.btnMd)}
            isDisabled={!isValid}
            isLoading={isLoading}
            onPress={handleConfirm}
          >
            Confirm
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
