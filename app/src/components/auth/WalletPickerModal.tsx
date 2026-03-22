"use client";

import { SolanaIcon } from "@/components/icons/solana";
import type { WalletOption } from "@/hooks/auth/useWalletConnection";
import { Button } from "@nextui-org/button";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@nextui-org/modal";
import { Wallet } from "lucide-react";
import Image from "next/image";

interface WalletPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletOption[];
  onSelectWallet: (walletKey: string) => void;
}

function WalletIcon({ wallet }: { wallet: WalletOption }) {
  if (wallet.iconUrl) {
    return (
      <Image
        src={wallet.iconUrl}
        alt={wallet.name}
        width={24}
        height={24}
        className="rounded-md"
        unoptimized
      />
    );
  }
  return <Wallet className="h-5 w-5 text-white/70" />;
}

export function WalletPickerModal({
  isOpen,
  onClose,
  wallets,
  onSelectWallet,
}: WalletPickerModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      classNames={{
        base: "bg-dimensional-gray border border-white/10",
        header: "border-b border-white/10",
        closeButton: "text-white/60 hover:text-white",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-3">
          <SolanaIcon size={24} />
          <span className="text-white font-semibold">Connect a Wallet</span>
        </ModalHeader>
        <ModalBody className="py-4 gap-2">
          {wallets.map((wallet) => (
            <Button
              key={wallet.key}
              fullWidth
              variant="bordered"
              startContent={<WalletIcon wallet={wallet} />}
              className="justify-start bg-white/5 border-white/10 hover:bg-white/10 text-white transition-all"
              onClick={() => onSelectWallet(wallet.key)}
            >
              {wallet.name}
            </Button>
          ))}

          {wallets.length === 0 && (
            <p className="text-white/50 text-sm text-center py-4">
              No Solana wallets detected. Please install a wallet extension.
            </p>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
