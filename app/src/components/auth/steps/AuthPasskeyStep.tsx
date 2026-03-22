"use client";

import { Button } from "@nextui-org/button";

interface AuthPasskeyStepProps {
  onRegisterPasskey: () => void;
}

export function AuthPasskeyStep({ onRegisterPasskey }: AuthPasskeyStepProps) {
  return (
    <div className="flex w-full max-w-[378px] flex-col items-center gap-8 lg:gap-12">
      <p className="text-center">
        Failed to create passkey automatically. Please try again.
      </p>
      <Button
        variant="solid"
        color="secondary"
        size="md"
        className="mt-6 w-full rounded-full"
        onClick={onRegisterPasskey}
      >
        Create Passkey
      </Button>
    </div>
  );
}
