"use client";

import { Button } from "@nextui-org/button";

interface AuthRecoveryCodesStepProps {
  recoveryCodes: string[];
  onAcknowledge: () => void;
}

export function AuthRecoveryCodesStep({
  recoveryCodes,
  onAcknowledge,
}: AuthRecoveryCodesStepProps) {
  return (
    <div className="flex w-full max-w-[378px] flex-col items-center gap-8 lg:gap-12">
      <div className="flex flex-col items-center gap-2">
        <h2 className="font-semibold text-xl">Save Your Recovery Codes</h2>
        <p className="text-center text-sm text-default-600">
          Save these codes in a secure place. You'll need them if you lose
          access to your passkey.
        </p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg w-full">
        <div className="grid grid-cols-2 gap-2">
          {recoveryCodes.map((code, index) => (
            <div
              key={index}
              className="font-mono text-sm bg-white p-2 rounded text-center"
            >
              {code}
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="solid"
        color="secondary"
        size="md"
        className="w-full rounded-full"
        onClick={onAcknowledge}
      >
        I've Saved My Recovery Codes
      </Button>
    </div>
  );
}
