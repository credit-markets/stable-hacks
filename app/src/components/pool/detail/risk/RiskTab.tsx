"use client";

import { CollectionYieldPanel } from "@/components/pool/detail/risk/CollectionYieldPanel";
import { ConcentrationPanel } from "@/components/pool/detail/risk/ConcentrationPanel";
import { DelinquencyPipelinePanel } from "@/components/pool/detail/risk/DelinquencyPipelinePanel";
import { PddForecastPanel } from "@/components/pool/detail/risk/PddForecastPanel";
import { PerformancePanel } from "@/components/pool/detail/risk/PerformancePanel";
import { PortfolioStructurePanel } from "@/components/pool/detail/risk/PortfolioStructurePanel";
import { RiskScorePanel } from "@/components/pool/detail/risk/RiskScorePanel";
import { useRiskMonthly, useRiskScore } from "@/hooks/risk/useRiskData";
import { styles } from "@/lib/styleClasses";
import type {
  FidcMonthly,
  FidcRiskScore,
  TidcMonthly,
  TidcRiskScore,
} from "@/types/risk";

interface RiskTabProps {
  pipelineKey: string;
  poolType: "fidc" | "tidc";
}

export function RiskTab({ pipelineKey, poolType }: RiskTabProps) {
  const { data: score } = useRiskScore(pipelineKey);
  const { data: monthly } = useRiskMonthly(pipelineKey);

  // Monthly data arrives sorted DESC (newest first) — latest is [0]
  // But child panels that sort ascending may have it reversed — use last element as safety
  const latestMonthly = monthly?.[0];
  const inadEarly =
    (latestMonthly as FidcMonthly | TidcMonthly | undefined)
      ?.inad_early_ratio ?? null;
  const inadMid =
    (latestMonthly as FidcMonthly | TidcMonthly | undefined)?.inad_mid_ratio ??
    null;
  const inadSevere =
    (latestMonthly as FidcMonthly | TidcMonthly | undefined)
      ?.inad_severe_ratio ?? null;
  const defaultRatio =
    score?.pool_type === "fidc"
      ? (score as FidcRiskScore).default_stock_ratio
      : score?.pool_type === "tidc"
        ? (score as TidcRiskScore).default_ratio
        : null;

  return (
    <div className="space-y-4">
      {/* Shared panels */}
      <RiskScorePanel score={score} />
      <DelinquencyPipelinePanel
        inadEarly={inadEarly}
        inadMid={inadMid}
        inadSevere={inadSevere}
        defaultRatio={defaultRatio ?? null}
      />
      <PerformancePanel score={score} monthly={monthly} poolType={poolType} />

      {/* FIDC-specific panels */}
      {poolType === "fidc" && score?.pool_type === "fidc" && (
        <>
          <PddForecastPanel score={score} />
          <PortfolioStructurePanel
            monthly={monthly as FidcMonthly[] | undefined}
          />
        </>
      )}

      {/* TIDC-specific panels */}
      {poolType === "tidc" && score?.pool_type === "tidc" && (
        <>
          <CollectionYieldPanel score={score} />
          <ConcentrationPanel
            score={score}
            monthly={monthly as TidcMonthly[] | undefined}
          />
        </>
      )}
    </div>
  );
}
