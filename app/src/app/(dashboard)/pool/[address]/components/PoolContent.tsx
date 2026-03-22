"use client";

import { Logo } from "@/components/icons/ina";
import { PoolTabContent } from "@/components/pool";
import { HedgeInfo } from "@/components/pool/detail/HedgeInfo";
import { NavPriceChart } from "@/components/pool/detail/NavPriceChart";
import { NotaFiscalItemsTab } from "@/components/pool/detail/NotaFiscalItemsTab";
import { ResponsibilityChain } from "@/components/pool/detail/ResponsibilityChain";
import { TermSheet } from "@/components/pool/detail/TermSheet";
import { RiskTab } from "@/components/pool/detail/risk/RiskTab";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { IconText } from "@/components/ui/IconText";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useInvest } from "@/hooks/pools/useInvest";
import { useInvestorBalanceStates } from "@/hooks/pools/useInvestorBalanceStates";
import { usePoolLive } from "@/hooks/pools/usePoolLive";
import { useRedeem } from "@/hooks/pools/useRedeem";
import { useRiskScore } from "@/hooks/risk/useRiskData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useImageUrl } from "@/hooks/useFileUrl";
import { useMyInvestmentRequests } from "@/hooks/useMyInvestmentRequests";
import { useMyRedemptionRequests } from "@/hooks/useMyRedemptionRequests";
import { usePoolTabs } from "@/hooks/usePoolTabs";
import { cx, styles } from "@/lib/styleClasses";
import {
  calculatePoolTvl,
  formatTvlCompact,
  getPoolTokenSymbol,
} from "@/lib/utils/tvl";
import type { Pool } from "@/services/api";
import type { FidcRiskScore, TidcRiskScore } from "@/types/risk";
import { EXPLORER_URL } from "@/utils/constants";
import PAGES from "@/utils/pages";
import { Button } from "@nextui-org/button";
import { Card, CardBody } from "@nextui-org/card";
import { Image } from "@nextui-org/image";
import { Input } from "@nextui-org/input";
import { Link } from "@nextui-org/link";
import { ExternalLink } from "lucide-react";
import NextLink from "next/link";
import { useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   Dark Terminal Strip — Bloomberg-style metrics bar
   ═══════════════════════════════════════════════════════════════════════════ */

function DarkStrip({ data }: { data: Pool }) {
  const { data: score, isLoading } = useRiskScore(data.pipeline_key);

  const tokenSymbol = getPoolTokenSymbol(data.currency, data.asset_mint);
  const tvl = formatTvlCompact(
    calculatePoolTvl(
      data.onChainData?.totalShares,
      data.onChainData?.pricePerShare,
    ),
    tokenSymbol,
  );

  const returnValue = score
    ? score.pool_type === "fidc"
      ? ((score as FidcRiskScore).mean_rentab * 12).toFixed(1)
      : ((score as TidcRiskScore).effective_yield ?? 0).toFixed(1)
    : null;

  const creditScore =
    score?.score_risco != null ? Math.round(score.score_risco * 100) : null;

  return (
    <div className={cx(styles.terminalStripDark, styles.terminalStripDarkBg)}>
      <div className={styles.terminalStripDarkAccent} />
      <div
        className={cx(styles.terminalStripMetrics, "w-full justify-between")}
      >
        {/* TVL */}
        <div className="flex flex-col gap-1">
          <span className={styles.terminalStripDarkLabel}>TVL</span>
          {isLoading ? (
            <div className={cx(styles.sk.dark, "h-5 w-16")} />
          ) : (
            <span className={styles.terminalStripDarkValue}>{tvl}</span>
          )}
        </div>

        <span className={styles.terminalStripDarkSeparator}>|</span>

        {/* LTM Net Return */}
        <div className="flex flex-col gap-1">
          <span className={styles.terminalStripDarkLabel}>LTM Net Return</span>
          {isLoading ? (
            <div className={cx(styles.sk.dark, "h-5 w-20")} />
          ) : (
            <span className={styles.terminalStripDarkValue}>
              {returnValue != null ? `${returnValue}% p.a.` : "—"}
            </span>
          )}
        </div>

        <span className={styles.terminalStripDarkSeparator}>|</span>

        {/* Credit Score */}
        <div className="flex flex-col gap-1">
          <span className={styles.terminalStripDarkLabel}>Credit Score</span>
          {isLoading ? (
            <div className={cx(styles.sk.dark, "h-5 w-16")} />
          ) : (
            <span className={styles.terminalStripDarkValue}>
              {creditScore != null ? `${creditScore} / 100` : "—"}
            </span>
          )}
        </div>

        <span className={styles.terminalStripDarkSeparator}>|</span>

        {/* Rating */}
        <div className="flex flex-col gap-1">
          <span className={styles.terminalStripDarkLabel}>Rating</span>
          {isLoading ? (
            <div className={cx(styles.sk.dark, "h-5 w-14")} />
          ) : (
            <span className={styles.terminalStripDarkValue}>
              {score?.confidence_tier != null
                ? `Tier ${score.confidence_tier}`
                : "—"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   InvestCard — Tabbed Invest / Redeem
   ═══════════════════════════════════════════════════════════════════════════ */

function InvestCard({ data }: { data: Pool }) {
  const [activeTab, setActiveTab] = useState<"invest" | "redeem">("invest");
  const [amount, setAmount] = useState<number | "">("");
  const [shares, setShares] = useState<number | "">("");

  const { data: userData } = useCurrentUser();

  const isOnSale = data.investment_window_open ?? false;
  const {
    requestDeposit,
    status: investStatus,
    isLoading: investLoading,
  } = useInvest(data.id, data.asset_mint);
  const {
    requestRedeem,
    status: redeemStatus,
    isLoading: redeemLoading,
  } = useRedeem(data.id);
  const { data: balanceStates } = useInvestorBalanceStates(data.id);

  // Verification gate
  const isAuthenticated = !!userData;
  const isVerified = !!userData?.kyc_attestation;

  // NAV per share for share estimation
  const pricePerShare = data.onChainData?.pricePerShare
    ? Number(data.onChainData.pricePerShare)
    : data.price_per_share
      ? Number(data.price_per_share)
      : 1;

  const estimatedShares =
    typeof amount === "number" && amount > 0 && pricePerShare > 0
      ? (amount / pricePerShare).toFixed(2)
      : "0.00";

  const estimatedAmount =
    typeof shares === "number" && shares > 0 && pricePerShare > 0
      ? (shares * pricePerShare).toFixed(2)
      : "0.00";

  const handleInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof amount !== "number" || amount <= 0) return;
    await requestDeposit(amount);
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof shares !== "number" || shares <= 0) return;
    await requestRedeem(shares);
  };

  return (
    <Card
      shadow="none"
      className="rounded-lg shadow-card border border-subtle overflow-hidden"
      radius="none"
      id="invest"
    >
      {/* Tab navigation */}
      <div className="flex border-b border-subtle">
        <button
          type="button"
          onClick={() => setActiveTab("invest")}
          className={cx(
            "flex-1 py-2.5 text-center text-[13px] font-semibold border-b-2 transition-colors duration-150",
            activeTab === "invest"
              ? "text-text-primary border-text-primary"
              : "text-text-muted border-transparent hover:text-text-secondary",
          )}
        >
          Invest
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("redeem")}
          className={cx(
            "flex-1 py-2.5 text-center text-[13px] font-semibold border-b-2 transition-colors duration-150",
            activeTab === "redeem"
              ? "text-text-primary border-text-primary"
              : "text-text-muted border-transparent hover:text-text-secondary",
          )}
        >
          Redeem
        </button>
      </div>

      <CardBody className="p-4 sm:p-5 flex flex-col gap-4">
        {/* Qualification Gate */}
        {!isAuthenticated ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="text-center">
              <p className={cx(styles.headingSm, "mb-1")}>Connect Wallet</p>
              <p className={styles.bodySm}>
                Connect your wallet to{" "}
                {activeTab === "invest" ? "invest in" : "redeem from"} this
                pool.
              </p>
            </div>
            <NextLink
              href="/"
              className={cx(
                styles.btnBase,
                styles.btnPrimary,
                styles.btnMd,
                "w-full justify-center",
              )}
            >
              Connect Wallet
            </NextLink>
          </div>
        ) : !isVerified ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center">
              <span className="text-text-muted text-lg">✓</span>
            </div>
            <div className="text-center">
              <p className={cx(styles.headingSm, "mb-1")}>
                Verification Required
              </p>
              <p className={styles.bodySm}>
                Complete your business verification to access credit facilities.
              </p>
            </div>
            <NextLink
              href="/onboarding/kyb"
              className={cx(
                styles.btnBase,
                styles.btnPrimary,
                styles.btnMd,
                "w-full justify-center",
              )}
            >
              Start Verification →
            </NextLink>
          </div>
        ) : activeTab === "invest" ? (
          /* ── Invest Tab ── */
          <form onSubmit={handleInvest} className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-baseline">
                <label htmlFor="invest-amount" className={styles.labelPrimary}>
                  Amount (USDC)
                </label>
                <span className="text-[11px] text-text-secondary">
                  Balance:{" "}
                  <span className="font-medium text-text-primary">
                    {balanceStates?.usdcBalance
                      ? `${(Number(balanceStates.usdcBalance) / 1_000_000).toLocaleString()} USDC`
                      : "—"}
                  </span>
                </span>
              </div>

              <div className="relative">
                <Input
                  id="invest-amount"
                  name="amount"
                  value={amount === "" ? "" : amount.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAmount(val === "" ? "" : +val);
                  }}
                  placeholder="0.00"
                  type="number"
                  variant="bordered"
                  size="sm"
                  classNames={{
                    inputWrapper: "border-1 rounded-lg pr-14",
                    input: "text-right tabular-nums font-medium",
                  }}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 border border-border-default rounded bg-surface-hover text-text-secondary hover:bg-surface-page transition-colors"
                  onClick={() => {
                    if (balanceStates?.usdcBalance) {
                      setAmount(Number(balanceStates.usdcBalance) / 1_000_000);
                    }
                  }}
                >
                  Max
                </button>
              </div>

              <div className="flex justify-between text-text-secondary text-xs">
                <span>Est. Shares</span>
                <span className="font-medium text-text-primary tabular-nums">
                  {estimatedShares}
                </span>
              </div>
            </div>

            <Button
              radius="md"
              size="md"
              isDisabled={
                !isOnSale || typeof amount !== "number" || amount <= 0
              }
              type="submit"
              isLoading={investLoading}
              className="font-medium bg-dimensional-gray text-white hover:bg-dimensional-gray-hover"
            >
              {investLoading ? investStatus : "Invest"}
            </Button>
          </form>
        ) : (
          /* ── Redeem Tab ── */
          <form onSubmit={handleRedeem} className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-baseline">
                <label htmlFor="redeem-shares" className={styles.labelPrimary}>
                  Shares
                </label>
                <span className="text-[11px] text-text-secondary">
                  Your Shares:{" "}
                  <span className="font-medium text-text-primary">
                    {balanceStates?.freeShares
                      ? `${(Number(balanceStates.freeShares) / 1_000_000).toLocaleString()}`
                      : "—"}
                  </span>
                </span>
              </div>

              <div className="relative">
                <Input
                  id="redeem-shares"
                  name="shares"
                  value={shares === "" ? "" : shares.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setShares(val === "" ? "" : +val);
                  }}
                  placeholder="0.00"
                  type="number"
                  variant="bordered"
                  size="sm"
                  classNames={{
                    inputWrapper: "border-1 rounded-lg pr-14",
                    input: "text-right tabular-nums font-medium",
                  }}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 border border-border-default rounded bg-surface-hover text-text-secondary hover:bg-surface-page transition-colors"
                  onClick={() => {
                    if (balanceStates?.freeShares) {
                      setShares(Number(balanceStates.freeShares) / 1_000_000);
                    }
                  }}
                >
                  Max
                </button>
              </div>

              <div className="flex justify-between text-text-secondary text-xs">
                <span>Est. Amount (USDC)</span>
                <span className="font-medium text-text-primary tabular-nums">
                  ${estimatedAmount}
                </span>
              </div>
            </div>

            <Button
              radius="md"
              size="md"
              isDisabled={typeof shares !== "number" || shares <= 0}
              type="submit"
              isLoading={redeemLoading}
              className="font-medium bg-dimensional-gray text-white hover:bg-dimensional-gray-hover"
            >
              {redeemLoading ? redeemStatus : "Request Redemption"}
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Investment Queue — unified deposit + redeem requests
   ═══════════════════════════════════════════════════════════════════════════ */

function InvestmentQueue({ poolId }: { poolId: string }) {
  const { data: investments, isLoading: investLoading } =
    useMyInvestmentRequests();
  const { data: redemptions, isLoading: redeemLoading } =
    useMyRedemptionRequests();
  const {
    claimRedemption,
    cancelRedeem,
    isLoading: redeemActionLoading,
  } = useRedeem(poolId);
  const {
    cancelDeposit,
    claimDeposit,
    isLoading: investActionLoading,
  } = useInvest(poolId);

  const isLoading = investLoading || redeemLoading;

  type QueueItem = {
    id: string;
    type: "deposit" | "redeem";
    amount: string;
    latestEvent: string;
    createdAt: string;
  };

  const items: QueueItem[] = [];

  // Only show requests for THIS pool
  if (investments) {
    for (const inv of investments) {
      if (inv.poolId !== poolId) continue;
      items.push({
        id: inv.correlationId,
        type: "deposit",
        amount: `${inv.amount.toLocaleString()} USDC`,
        latestEvent: inv.latestEvent,
        createdAt: inv.createdAt,
      });
    }
  }

  if (redemptions) {
    for (const red of redemptions) {
      if (red.poolId !== poolId) continue;
      items.push({
        id: red.correlationId,
        type: "redeem",
        amount: `${red.shares.toLocaleString()} shares`,
        latestEvent: red.latestEvent,
        createdAt: red.createdAt,
      });
    }
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const actionLoading = redeemActionLoading || investActionLoading;

  const getStatusDisplay = (item: QueueItem) => {
    // Settled deposit → Claim (primary button)
    if (item.type === "deposit" && item.latestEvent === "investment.settled") {
      return (
        <Button
          size="sm"
          radius="md"
          color="primary"
          isDisabled={actionLoading}
          isLoading={investActionLoading}
          className="font-medium text-[11px] px-3 py-1 h-auto min-h-0"
          onPress={() => claimDeposit()}
        >
          Claim
        </Button>
      );
    }
    // Settled redemption → Claim (primary button)
    if (item.type === "redeem" && item.latestEvent === "withdrawal.settled") {
      return (
        <Button
          size="sm"
          radius="md"
          color="primary"
          isDisabled={actionLoading}
          isLoading={redeemActionLoading}
          className="font-medium text-[11px] px-3 py-1 h-auto min-h-0"
          onPress={() => claimRedemption()}
        >
          Claim
        </Button>
      );
    }
    // Pending → Cancel
    if (
      (item.type === "deposit" &&
        item.latestEvent === "investment.requested") ||
      (item.type === "redeem" && item.latestEvent === "withdrawal.requested")
    ) {
      return (
        <Button
          size="sm"
          radius="md"
          color="default"
          variant="bordered"
          isDisabled={actionLoading}
          isLoading={
            item.type === "deposit" ? investActionLoading : redeemActionLoading
          }
          className="font-medium text-[11px] px-3 py-1 h-auto min-h-0 transition-colors cursor-pointer"
          onPress={() =>
            item.type === "deposit" ? cancelDeposit() : cancelRedeem()
          }
        >
          Cancel
        </Button>
      );
    }
    return (
      <span className={cx(styles.chipBase, styles.chipPending, "text-[9px]")}>
        Pending
      </span>
    );
  };

  if (isLoading) {
    return (
      <Card
        shadow="none"
        className="rounded-lg shadow-card border border-subtle"
        radius="none"
      >
        <CardBody className="p-4 sm:p-5">
          <div className="flex justify-between items-center mb-3">
            <span className={styles.headingSm}>Queue</span>
            <div className={cx(styles.sk.base, "h-5 w-16")} />
          </div>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className={cx(styles.sk.base, "h-8 w-full")} />
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card
      shadow="none"
      className="rounded-lg shadow-card border border-subtle"
      radius="none"
    >
      <CardBody className="p-4 sm:p-5">
        <div className="flex justify-between items-center mb-3">
          <span className={styles.headingSm}>Queue</span>
          {items.length > 0 && (
            <span className="text-[11px] font-medium text-text-muted bg-surface-hover px-2 py-0.5 rounded">
              {items.length} request{items.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {items.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th
                  className={cx(
                    styles.tableHeader,
                    "text-left pb-2 border-b border-subtle",
                  )}
                >
                  Type
                </th>
                <th
                  className={cx(
                    styles.tableHeader,
                    "text-right pb-2 border-b border-subtle",
                  )}
                >
                  Amount
                </th>
                <th
                  className={cx(
                    styles.tableHeader,
                    "text-right pb-2 border-b border-subtle",
                  )}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border-default/20 last:border-b-0"
                >
                  <td className="py-2 text-xs text-text-secondary">
                    {item.type === "deposit" ? "Deposit" : "Redeem"}
                  </td>
                  <td className="py-2 text-right text-xs font-medium text-text-primary tabular-nums">
                    {item.amount}
                  </td>
                  <td className="py-2 text-right">{getStatusDisplay(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={cx(styles.bodySm, "text-center py-4 text-text-muted")}>
            No requests yet
          </p>
        )}
      </CardBody>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Header
   ═══════════════════════════════════════════════════════════════════════════ */

function Header({
  data,
  isPoolManager: _isPoolManager,
}: { data: Pool; isPoolManager: boolean }) {
  const { url: logoUrl } = useImageUrl(data.logo_path);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {data.logo_path ? (
          <Image
            width={64}
            height={64}
            src={logoUrl || ""}
            alt={data.title}
            className="rounded-lg flex-shrink-0 transition-opacity duration-200 w-12 h-12 sm:w-16 sm:h-16"
          />
        ) : (
          <Logo size={48} />
        )}
        <div className="flex flex-col min-w-0">
          <SectionTitle level="section" className="!mb-0 truncate">
            {data.title}
          </SectionTitle>
          <p className="text-sm truncate">
            Managed by{" "}
            {data.manager_address ? (
              <Link
                href={PAGES.MANAGER.PROFILE.BY_ADDRESS(data.manager_address)}
                className="font-bold text-brand-medium-blue hover:underline"
              >
                {data.manager_name || data.manager_address}
              </Link>
            ) : (
              <span className="font-bold">
                {data.manager_name || "Unknown"}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {/* TODO: Manager on-chain actions will be added here */}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Program Info — On-chain addresses
   ═══════════════════════════════════════════════════════════════════════════ */

function AddressRow({
  label,
  value,
}: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border-default/30 last:border-b-0">
      <span className={styles.bodySm}>{label}</span>
      <span className={cx(styles.valueXs, "font-mono text-[11px]")}>
        {value ? (
          <Link
            href={`${EXPLORER_URL}/address/${value}`}
            className="font-mono text-xs hover:underline"
            isExternal
          >
            <IconText icon={<ExternalLink className="w-3 h-3" />} size="sm">
              {value.slice(0, 6)}...{value.slice(-4)}
            </IconText>
          </Link>
        ) : (
          "—"
        )}
      </span>
    </div>
  );
}

function ProgramInfo({ data }: { data: Pool }) {
  return (
    <div className={cx(styles.card, "p-5")}>
      <h3 className={cx(styles.headingSm, "mb-3")}>On-Chain Program</h3>
      <div>
        <AddressRow label="Program Address" value={data.on_chain_address} />
        <AddressRow label="Asset Mint" value={data.asset_mint} />
        <AddressRow label="NAV Oracle" value={data.nav_oracle_address} />
        <AddressRow label="Authority" value={data.authority_address} />
        <AddressRow label="Manager" value={data.manager_address} />
        <AddressRow label="Attester" value={data.attester_address} />
        <div className="flex justify-between items-center py-2">
          <span className={styles.bodySm}>Vault ID</span>
          <span className={styles.valueXs}>{data.vault_id ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PoolContent — Main Page
   ═══════════════════════════════════════════════════════════════════════════ */

export function PoolContent({ data: serverData }: { data: Pool }) {
  const data = usePoolLive(serverData);
  const { data: userData } = useCurrentUser();

  // Use account address for comparison (Solana base58 is case-sensitive)
  const currentUserAccount = userData?.account;
  const poolManagerAddress = data.manager_address;
  const isPoolManager =
    currentUserAccount &&
    poolManagerAddress &&
    currentUserAccount === poolManagerAddress;
  const isVerified = !!userData?.kyc_attestation;
  const tokenSymbol = getPoolTokenSymbol(data.currency, data.asset_mint);

  // Tab navigation state (sections removed — tabs only from documents now)
  const { tabs, activeTab, setActiveTab, currentTab } = usePoolTabs({
    sections: undefined,
    hasDocs: Boolean(data.documents?.length),
    hasAssetPurchaseRules: false,
  });

  return (
    <main className="flex min-h-screen flex-col gap-4 sm:gap-6 md:gap-8 mx-auto max-w-[1280px] px-4 md:px-8 lg:px-16 py-4 sm:py-6">
      {/* Back Link */}
      <Breadcrumb
        items={[
          { label: "Marketplace", href: "/" },
          { label: data.title || "Pool" },
        ]}
      />

      {/* Header */}
      <Header data={data} isPoolManager={!!isPoolManager} />

      {/* Dark Terminal Strip */}
      <DarkStrip data={data} />

      {/* Main Content */}
      <div className="flex gap-4 sm:gap-6 md:gap-8 max-lg:flex-col">
        {/* Left Column - Main Content */}
        <div className="flex flex-col gap-6 lg:w-2/3 min-w-0">
          {/* NAV Price Chart */}
          <div className={cx(styles.card, "p-5")}>
            <NavPriceChart poolId={data.id} symbol={tokenSymbol} />
          </div>

          {/* Invest Card - mobile only */}
          <div className="lg:hidden space-y-4">
            <InvestCard data={data} />
            {isVerified && <InvestmentQueue poolId={data.id} />}
          </div>

          {/* Term Sheet */}
          <div className={cx(styles.card, "p-5")}>
            <TermSheet pool={data} />
          </div>

          {/* FX Hedge — only if hedge data exists */}
          {data.hedge_mechanism && data.hedge_mechanism !== "none" && (
            <div className={cx(styles.card, "p-5")}>
              <HedgeInfo pool={data} />
            </div>
          )}

          {/* Responsibility Chain */}
          <div className={cx(styles.card, "p-5")}>
            <ResponsibilityChain chain={data.pool_responsibilities} />
          </div>

          {/* Risk Analysis section */}
          <h2 className={cx(styles.sectionTitle, "mt-4")}>Risk Analysis</h2>

          {/* Risk Analytics — pool-type-aware */}
          {data.pipeline_key && (
            <RiskTab
              pipelineKey={data.pipeline_key}
              poolType={data.pool_type as "fidc" | "tidc"}
            />
          )}

          {/* Receivables Tab — only for TIDC pools with nota fiscal items */}
          {data.pool_type === "tidc" && data.pipeline_key && (
            <NotaFiscalItemsTab
              poolId={data.id}
              pipelineKey={data.pipeline_key}
            />
          )}

          {/* Program section */}
          <h2 className={cx(styles.sectionTitle, "mt-4")}>Program</h2>

          {/* On-Chain Program */}
          <ProgramInfo data={data} />

          {/* Legacy Tab Navigation - for pools with sections/documents */}
          {tabs.length > 0 && (
            <div className="bg-surface-card border border-subtle rounded-lg overflow-hidden">
              {/* Tabs row - proper ARIA tablist pattern */}
              <div
                role="tablist"
                aria-label="Pool sections"
                className="flex items-center gap-4 sm:gap-6 sm:justify-center px-5 pt-4 overflow-x-auto scrollbar-hide sm:overflow-visible"
              >
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`tabpanel-${tab.id}`}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setActiveTab(tab.id)}
                      className={cx(
                        styles.navTab,
                        "whitespace-nowrap sm:whitespace-normal",
                        isActive ? styles.navTabActive : styles.navTabInactive,
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Faded separator line */}
              <div className="mx-5 h-px bg-gradient-to-r from-transparent via-border-default to-transparent mt-2" />

              {/* Content */}
              <div className="p-3 sm:p-5">
                <PoolTabContent data={data} currentTab={currentTab} />
              </div>
            </div>
          )}
        </div>

        {/* Right Column — Always visible */}
        <div className="hidden lg:block lg:w-1/3">
          <div className="lg:sticky lg:top-24 space-y-4">
            <InvestCard data={data} />
            {isVerified && <InvestmentQueue poolId={data.id} />}
          </div>
        </div>
      </div>
    </main>
  );
}
