"use client";

import { AUTH_CONFIG } from "@/types/auth";
import { Button } from "@nextui-org/button";
import { OTPInput, type SlotProps } from "input-otp";
import { twMerge } from "tailwind-merge";

interface AuthOtpStepProps {
  email: string;
  otp: string;
  onOtpChange: (otp: string) => void;
  onVerifyOtp: (otp: string) => void;
  onResendCode: () => void;
  isVerifyingOTP: boolean;
  isResendingCode: boolean;
}

export function AuthOtpStep({
  email,
  otp,
  onOtpChange,
  onVerifyOtp,
  onResendCode,
  isVerifyingOTP,
  isResendingCode,
}: AuthOtpStepProps) {
  return (
    <div className="flex w-full max-w-[378px] flex-col items-center gap-8 lg:gap-12">
      <p className="text-center text-primary leading-5">
        We&#39;ve sent a verification code to <br />
        <strong className="font-medium">{email}</strong>
      </p>
      <OTPInput
        value={otp}
        onChange={(value) => {
          onOtpChange(value);
          if (value.length === AUTH_CONFIG.OTP_LENGTH) {
            onVerifyOtp(value);
          }
        }}
        maxLength={AUTH_CONFIG.OTP_LENGTH}
        disabled={isVerifyingOTP}
        inputMode="numeric"
        autoComplete="one-time-code"
        containerClassName="group w-full max-w-[328px] flex items-center has-[:disabled]:opacity-30"
        render={({ slots }) => (
          <div className="flex w-full justify-between">
            {slots.map((slot, idx) => (
              <Slot key={idx} {...slot} />
            ))}
          </div>
        )}
      />
      {isVerifyingOTP && (
        <p className="text-sm text-default-500">Verifying code...</p>
      )}
      <div className="flex flex-col items-center gap-2">
        <p className="text-default-600 text-sm leading-[18px]">
          Did not receive your code yet?
        </p>
        <Button
          color="secondary"
          variant="light"
          size="sm"
          onClick={onResendCode}
          isLoading={isResendingCode}
        >
          Re-send code
        </Button>
      </div>
    </div>
  );
}

function Slot(props: SlotProps) {
  return (
    <div
      className={twMerge(
        "relative h-10 w-10 sm:h-12 sm:w-12 font-bold text-lg text-primary",
        "flex items-center justify-center",
        "transition-all duration-300",
        "rounded border-2 border-white",
        "outline outline-0 outline-accent-foreground/20",
        props.isActive && "border-neutral-light-gray",
      )}
    >
      {props.char !== null && <div>{props.char}</div>}
    </div>
  );
}
