"use client";

import { FileUpload } from "@/components/FileUpload";
import { BaseModal, DetailSection } from "@/components/modals";
import { FILE_SUB_TYPES, FILE_TYPES } from "@/constants/fileTypes";
import {
  ACCEPTED_IMAGE_TYPES_WITH_GIF,
  DIMENSION_PRESETS,
  FILE_SIZE_LIMITS,
} from "@/constants/fileUpload";
import { styles } from "@/lib/styleClasses";
import { calculatePoolTvl, formatTvlCompact } from "@/lib/utils/tvl";
import { api } from "@/services/api";
import type { Pool } from "@/services/api";
import { formatAddress } from "@/utils/formatAddress";
import { formatDate } from "@/utils/formatDate";
import { Button } from "@nextui-org/button";
import { Chip } from "@nextui-org/chip";
import { useQueryClient } from "@tanstack/react-query";
import { Blocks, Copy, Info } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

interface PoolDetailModalProps {
  pool: Pool;
  isOpen: boolean;
  onClose: () => void;
}

function CopyableAddress({
  label,
  address,
}: { label: string; address: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied");
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={styles.labelSecondary}>{label}</p>
        <p className={styles.bodyMd}>{formatAddress(address)}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="p-1 rounded hover:bg-surface-hover transition-colors"
        aria-label={`Copy ${label}`}
      >
        <Copy className="h-3.5 w-3.5 text-text-muted" />
      </button>
    </div>
  );
}

function OnChainSection({ pool }: { pool: Pool }) {
  if (!pool.onChainData) return null;

  const { onChainData } = pool;

  return (
    <DetailSection title="On-chain State" icon={Blocks}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className={styles.labelSecondary}>TVL</p>
          <p className={styles.valueMd}>
            {formatTvlCompact(
              calculatePoolTvl(
                onChainData.totalShares,
                onChainData.pricePerShare,
              ),
            )}
          </p>
        </div>
        <div>
          <p className={styles.labelSecondary}>Total Shares</p>
          <p className={styles.valueMd}>
            {Number(onChainData.totalShares).toLocaleString()}
          </p>
        </div>
        <div>
          <p className={styles.labelSecondary}>Price Per Share</p>
          <p className={styles.valueMd}>
            {onChainData.pricePerShare != null
              ? onChainData.pricePerShare.toFixed(4)
              : "\u2014"}
          </p>
        </div>
        <div>
          <p className={styles.labelSecondary}>Window</p>
          <Chip
            size="sm"
            variant="flat"
            color={onChainData.investmentWindowOpen ? "success" : "default"}
          >
            {onChainData.investmentWindowOpen ? "Open" : "Closed"}
          </Chip>
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <p className={styles.headingSm}>Addresses</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pool.on_chain_address && (
            <CopyableAddress label="Vault" address={pool.on_chain_address} />
          )}
          {onChainData.manager && (
            <CopyableAddress label="Manager" address={onChainData.manager} />
          )}
          {onChainData.attester && (
            <CopyableAddress label="Attester" address={onChainData.attester} />
          )}
          {onChainData.assetMint && (
            <CopyableAddress
              label="Asset Mint"
              address={onChainData.assetMint}
            />
          )}
        </div>
      </div>
    </DetailSection>
  );
}

function PoolInfoSection({ pool }: { pool: Pool }) {
  return (
    <DetailSection title="Pool Info" icon={Info}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <p className={styles.labelSecondary}>Status</p>
          <p className={styles.bodyMd}>
            {pool.on_chain_address ? "Deployed" : "Not Deployed"}
          </p>
        </div>
        <div>
          <p className={styles.labelSecondary}>Pool Type</p>
          <p className={styles.bodyMd}>
            {(pool.pool_type || "").toUpperCase()}
          </p>
        </div>
        <div>
          <p className={styles.labelSecondary}>Pipeline Key</p>
          <p className={styles.bodyMd}>{pool.pipeline_key || "\u2014"}</p>
        </div>
        <div>
          <p className={styles.labelSecondary}>Created</p>
          <p className={styles.bodyMd}>{formatDate(pool.created_at)}</p>
        </div>
        <div>
          <p className={styles.labelSecondary}>Deployed</p>
          <p className={styles.bodyMd}>
            {pool.deployed_at ? formatDate(pool.deployed_at) : "\u2014"}
          </p>
        </div>
        <div>
          <p className={styles.labelSecondary}>Fund Size</p>
          <p className={styles.bodyMd}>
            {pool.fund_size
              ? `$${(pool.fund_size / 1e6).toFixed(2)}M`
              : "\u2014"}
          </p>
        </div>
        <div>
          <p className={styles.labelSecondary}>Minimum Investment</p>
          <p className={styles.bodyMd}>
            {pool.minimum_investment
              ? `$${pool.minimum_investment.toLocaleString()}`
              : "\u2014"}
          </p>
        </div>
      </div>
    </DetailSection>
  );
}

function PoolLogoSection({ pool }: { pool: Pool }) {
  const [logoPath, setLogoPath] = useState(pool.logo_path || "");
  const queryClient = useQueryClient();

  const handleLogoChange = async (path: string) => {
    setLogoPath(path);
    try {
      await api.patch(`/pools/by-id/${pool.id}`, { logo_path: path });
      queryClient.invalidateQueries({ queryKey: ["adminPools"] });
      queryClient.invalidateQueries({ queryKey: ["pools"] });
      toast.success(path ? "Logo updated" : "Logo removed");
    } catch {
      toast.error("Failed to update logo");
      setLogoPath(pool.logo_path || "");
    }
  };

  return (
    <FileUpload
      label="Pool Logo"
      value={logoPath}
      onChange={handleLogoChange}
      fileType={FILE_TYPES.IMAGE}
      subType={FILE_SUB_TYPES.POOL_LOGO}
      validation={{
        maxSizeMB: FILE_SIZE_LIMITS.IMAGE_MB,
        requireSquare: false,
        minDimensions: DIMENSION_PRESETS.POOL_LOGO,
        allowedTypes: ACCEPTED_IMAGE_TYPES_WITH_GIF,
      }}
      size="md"
    />
  );
}

export default function PoolDetailModal({
  pool,
  isOpen,
  onClose,
}: PoolDetailModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={pool.title}
      subtitle={`ID: ${pool.id}`}
      status={
        pool.on_chain_address
          ? { label: "Deployed", color: "success" }
          : { label: "Not Deployed", color: "default" }
      }
      size="4xl"
      scrollBehavior="inside"
      footer={
        <Button variant="flat" onPress={onClose}>
          Close
        </Button>
      }
      showCloseButton={false}
    >
      <div className="space-y-6">
        <PoolLogoSection pool={pool} />
        <OnChainSection pool={pool} />
        <PoolInfoSection pool={pool} />
      </div>
    </BaseModal>
  );
}
