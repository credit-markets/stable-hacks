"use client";

import { GoogleIcon } from "@/components/icons/google";
import { SolanaIcon } from "@/components/icons/solana";
import { ICON_SIZES } from "@/lib/styleClasses";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { CircleArrowRight } from "lucide-react";

interface AuthStartStepProps {
  email: string;
  onEmailChange: (email: string) => void;
  onConnectEmail: () => void;
  onConnectGoogle: () => void;
  onConnectSolana: () => void;
}

export function AuthStartStep({
  email,
  onEmailChange,
  onConnectEmail,
  onConnectGoogle,
  onConnectSolana,
}: AuthStartStepProps) {
  return (
    <div className="flex w-full max-w-[378px] min-h-[200px] flex-col items-center justify-center gap-6">
      <Button
        fullWidth
        variant="bordered"
        startContent={<GoogleIcon />}
        className="bg-white border-white/20 hover:bg-white/95 text-text-primary shadow-sm hover:shadow-md transition-all focus-visible:ring-2 focus-visible:ring-chart-blue-400 focus-visible:ring-offset-2"
        onClick={onConnectGoogle}
      >
        Continue with Google
      </Button>

      <Button
        fullWidth
        variant="bordered"
        startContent={<SolanaIcon />}
        className="bg-white border-white/20 hover:bg-white/95 text-text-primary shadow-sm hover:shadow-md transition-all focus-visible:ring-2 focus-visible:ring-chart-blue-400 focus-visible:ring-offset-2"
        onClick={onConnectSolana}
      >
        Continue with Solana
      </Button>

      <span className="text-white/70 text-sm">or</span>

      <Input
        placeholder="Enter your e-mail"
        type="email"
        variant="bordered"
        classNames={{
          inputWrapper:
            "bg-white border-white/20 shadow-sm focus-within:ring-2 focus-within:ring-chart-blue-400 focus-within:ring-offset-2",
          input: "text-text-primary placeholder:text-text-secondary",
        }}
        endContent={
          <Button
            isIconOnly
            variant="light"
            size="sm"
            className="h-10 w-10 text-text-primary hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-chart-blue-400 rounded-sm"
            onClick={onConnectEmail}
          >
            <CircleArrowRight className={ICON_SIZES.button.md} />
          </Button>
        }
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onConnectEmail();
          }
        }}
      />
    </div>
  );
}
