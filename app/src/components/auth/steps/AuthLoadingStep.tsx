"use client";

import { GoogleIcon } from "@/components/icons/google";
import { SolanaIcon } from "@/components/icons/solana";
import { Spinner } from "@nextui-org/spinner";

interface AuthLoadingStepProps {
  provider: "google" | "wallet" | "email" | null;
  walletState: "creating" | "created" | null;
}

function getProviderIcon(provider: string | null) {
  if (provider === "google") return <GoogleIcon size={64} />;
  if (provider === "wallet") return <SolanaIcon size={72} />;
  return null;
}

function getStatusMessage(
  walletState: "creating" | "created" | null,
  provider: string | null,
): string | null {
  if (walletState === "creating") return "We are setting up your account";
  if (walletState === "created") return "Account created successfully";
  if (!walletState && provider === "google")
    return "Authenticating with Google…";
  if (!walletState && provider === "wallet")
    return "Connecting to Solana wallet…";
  return null;
}

export function AuthLoadingStep({
  provider,
  walletState,
}: AuthLoadingStepProps) {
  const showSpinner = !walletState || walletState === "creating";
  const statusMessage = getStatusMessage(walletState, provider);

  return (
    <div className="flex w-full max-w-[378px] min-h-[200px] flex-col items-center justify-center gap-5">
      <div className="flex items-center justify-center">
        {getProviderIcon(provider)}
      </div>

      {showSpinner && (
        <Spinner
          size="sm"
          classNames={{
            circle1: "border-3 border-b-strategic-blue",
            circle2: "border-3 border-strategic-blue/30",
          }}
        />
      )}

      {statusMessage && (
        <p className="text-center text-sm text-white/70">{statusMessage}</p>
      )}
    </div>
  );
}
