"use client";

import { ContentWrapper } from "@/components/HeroSection";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ICON_SIZES } from "@/lib/styleClasses";
import { cx, styles } from "@/lib/styleClasses";
import { type User, api } from "@/services/api";
import { EXPLORER_URL } from "@/utils/constants";
import { formatAddress } from "@/utils/formatAddress";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Link as NextUILink } from "@nextui-org/link";
import { Switch } from "@nextui-org/switch";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export function AccountContent() {
  const [referralLink, setReferralLink] = useState("");

  const { data: userData, refetch } = useCurrentUser();

  const updateUser = useMutation({
    mutationKey: ["update-user"],
    mutationFn: async (data: Partial<User>) => {
      if (!userData) return;

      await api.patch(`/users/${userData.id}`, data);

      await refetch();
    },
  });

  useEffect(() => {
    if (window && userData) {
      setReferralLink(`${window.location.origin}/?ref=${userData.referral_id}`);
    }
  }, [userData]);

  return (
    <ContentWrapper className="py-4 sm:py-8">
      <main className="flex flex-col gap-6 sm:gap-8">
        {/* Page Header */}
        <h1 className={styles.displayMd}>Account</h1>

        {/* Account Info Card */}
        <div className={cx(styles.card, "p-4 sm:p-6")}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
            <div className="flex flex-col gap-1">
              <p className={styles.label}>Your CM Account</p>
              <div className="flex items-center gap-2">
                {userData?.account ? (
                  <>
                    <button
                      type="button"
                      className="font-mono text-text-primary hover:underline"
                      onClick={() => {
                        toast.success("Copied");
                        navigator.clipboard.writeText(userData?.account);
                      }}
                    >
                      {formatAddress(userData?.account)}
                    </button>
                    <NextUILink
                      isExternal
                      href={`${EXPLORER_URL}/address/${userData?.account}`}
                      className="inline-block"
                    >
                      <ExternalLink
                        className={`${ICON_SIZES.button.sm} text-text-muted hover:text-text-primary`}
                      />
                    </NextUILink>
                  </>
                ) : (
                  <span className="text-text-muted">-</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <p className={styles.label}>KYC Status</p>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">Not Verified</span>
                <Button
                  size="sm"
                  className={cx(
                    styles.btnBase,
                    styles.btnSecondary,
                    "h-7 px-3 opacity-50 cursor-not-allowed",
                  )}
                  disabled
                >
                  Verify now
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <p className={styles.label}>Attestation</p>
              <div className="flex items-center gap-2">
                {userData?.kyc_attestation ? (
                  <>
                    <span className="font-mono text-text-primary">
                      {formatAddress(`${userData?.kyc_attestation}`)}
                    </span>
                    <NextUILink
                      isExternal
                      href={`${EXPLORER_URL}/tx/${userData?.kyc_attestation}`}
                      className="inline-block"
                    >
                      <ExternalLink
                        className={`${ICON_SIZES.button.sm} text-text-muted hover:text-text-primary`}
                      />
                    </NextUILink>
                  </>
                ) : (
                  <span className="text-text-muted">-</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Refer & Settings Row */}
        <section className="flex w-full gap-6 sm:gap-8 max-md:flex-col">
          {/* Refer Card */}
          <div className="flex w-full flex-col gap-4">
            <h2 className={styles.sectionTitle}>Refer</h2>
            <div
              className={cx(styles.card, "p-4 sm:p-6 min-h-0 sm:min-h-[190px]")}
            >
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex items-end justify-between gap-4 sm:gap-8 max-md:flex-col">
                  <Input
                    label="Your referral link"
                    labelPlacement="outside"
                    value={referralLink}
                    readOnly
                    size="sm"
                    classNames={{
                      inputWrapper:
                        "!rounded-md h-[32px] border border-subtle !bg-surface-card shadow-none",
                      input: "!text-text-secondary font-mono text-sm",
                      label: styles.label,
                    }}
                  />
                  <Button
                    className={cx(
                      styles.btnBase,
                      styles.btnPrimary,
                      styles.btnSm,
                    )}
                    onClick={() => {
                      navigator.clipboard.writeText(referralLink);
                      toast.success("Copied");
                    }}
                  >
                    Copy link
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-text-secondary md:flex-col md:justify-center">
                  <span>or share on social media</span>
                  <div className="flex gap-2">
                    <Link
                      target="_blank"
                      href={`https://twitter.com/intent/tweet?url=${referralLink}`}
                      className="rounded-full bg-surface-hover p-2 hover:bg-border-subtle transition-colors"
                      rel="noreferrer"
                    >
                      <svg
                        width="14"
                        height="13"
                        viewBox="0 0 14 13"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M0.838861 0.0631104L5.74784 6.75147L0.807922 12.1894H1.91979L6.24478 7.4283L9.73912 12.1894H13.5226L8.33728 5.12493L12.9354 0.0631104H11.8235L7.84056 4.44787L4.62232 0.0631104H0.838861ZM2.47391 0.897578H4.21201L11.8873 11.355H10.1492L2.47391 0.897578Z"
                          fill="currentColor"
                          className="text-text-primary"
                        />
                      </svg>
                    </Link>
                    <Link
                      target="_blank"
                      href={`https://t.me/share/url?url=${referralLink}`}
                      className="rounded-full bg-surface-hover p-2 hover:bg-border-subtle transition-colors"
                      rel="noreferrer"
                    >
                      <svg
                        width="13"
                        height="11"
                        viewBox="0 0 13 11"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12.2725 1.74374L10.4444 10.3651C10.3065 10.9736 9.94682 11.1251 9.4357 10.8384L6.65024 8.78581L5.30619 10.0785C5.15745 10.2272 5.03305 10.3516 4.74639 10.3516L4.94651 7.51478L10.1091 2.84981C10.3335 2.64969 10.0604 2.53882 9.76022 2.73894L3.378 6.75757L0.630408 5.89759C0.0327521 5.71099 0.0219347 5.29993 0.754807 5.01327L11.5018 0.87295C11.9994 0.686352 12.4348 0.983828 12.2725 1.74374V1.74374Z"
                          fill="currentColor"
                          className="text-text-primary"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings Card */}
          <div className="flex w-full flex-col gap-4">
            <h2 className={styles.sectionTitle}>Notification Settings</h2>
            <div
              className={cx(styles.card, "p-4 sm:p-6 min-h-0 sm:min-h-[190px]")}
            >
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex items-center justify-between">
                  <p className={styles.bodyMd}>Transaction notifications</p>
                  <Switch
                    defaultSelected
                    isSelected={userData?.notifications?.transactions}
                    color="secondary"
                    size="sm"
                    classNames={{ wrapper: "p-[2px] h-[20px] w-[35px]" }}
                    onValueChange={(value) =>
                      updateUser.mutate({
                        notifications: {
                          ...userData?.notifications,
                          transactions: value,
                        } as User["notifications"],
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className={styles.bodyMd}>Investment pool notifications</p>
                  <Switch
                    defaultSelected
                    isSelected={userData?.notifications?.opportunities}
                    color="secondary"
                    size="sm"
                    classNames={{ wrapper: "p-[2px] h-[20px] w-[35px]" }}
                    onValueChange={(value) =>
                      updateUser.mutate({
                        notifications: {
                          ...userData?.notifications,
                          opportunities: value,
                        } as User["notifications"],
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className={styles.bodyMd}>Credit.Markets News</p>
                  <Switch
                    defaultSelected
                    isSelected={userData?.notifications?.news}
                    color="secondary"
                    size="sm"
                    classNames={{ wrapper: "p-[2px] h-[20px] w-[35px]" }}
                    onValueChange={(value) =>
                      updateUser.mutate({
                        notifications: {
                          ...userData?.notifications,
                          news: value,
                        } as User["notifications"],
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </ContentWrapper>
  );
}
