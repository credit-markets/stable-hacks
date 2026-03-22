"use client";

import { FileUpload } from "@/components/FileUpload";
import { BaseModal } from "@/components/modals";
import { API_URL } from "@/constants/api";
import { FILE_SUB_TYPES, FILE_TYPES } from "@/constants/fileTypes";
import {
  ACCEPTED_IMAGE_TYPES_WITH_GIF,
  DIMENSION_PRESETS,
  FILE_SIZE_LIMITS,
} from "@/constants/fileUpload";
import { SUPPORTED_MINTS } from "@/constants/poolOptions";
import { useAdminManagers } from "@/hooks/admin/useAdminManagers";
import { usePipelineKeysQuery } from "@/hooks/admin/usePipelineKeysQuery";
import { useSolanaTransaction } from "@/hooks/pools/useSolanaTransaction";
import { api } from "@/services/api";

import { Button } from "@nextui-org/button";
import { Select, SelectItem } from "@nextui-org/select";
import { Spinner } from "@nextui-org/spinner";
import { Rocket } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

interface CreatePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DeployStep = "idle" | "activating" | "deploying" | "done";

export default function CreatePoolModal({
  isOpen,
  onClose,
}: CreatePoolModalProps) {
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [selectedManagerAddress, setSelectedManagerAddress] =
    useState<string>("");
  const [selectedMint, setSelectedMint] = useState<string>("");
  const [deployStep, setDeployStep] = useState<DeployStep>("idle");
  const [logoPath, setLogoPath] = useState<string>("");

  const { data: pipelineKeys = [], isLoading: keysLoading } =
    usePipelineKeysQuery();
  const { data: managersResponse, isLoading: managersLoading } =
    useAdminManagers(1, 100);
  const { signAndSend, status: txStatus } = useSolanaTransaction();

  const managers = managersResponse?.data || [];

  const handleDeploy = async () => {
    if (!selectedKey || !selectedManagerAddress || !selectedMint) {
      toast.error("Please select a pipeline key, manager, and asset mint");
      return;
    }

    try {
      setDeployStep("activating");

      const { data: activated } = await api.post("/pools/admin/activate", {
        pipeline_key: selectedKey,
        manager_address: selectedManagerAddress,
        asset_mint: selectedMint,
      });

      setDeployStep("deploying");

      await signAndSend(
        `${API_URL}/pools/${activated.id}/deploy/build-tx`,
        {},
        {
          successEvent: "pool.deployed",
          successMessage: "Pool deployed successfully",
          invalidateKeys: [
            ["adminPools"],
            ["pools"],
            ["manager-pools"],
            ["pipelineKeys"],
          ],
        },
      );

      setDeployStep("done");

      // Set pool logo if uploaded
      if (logoPath) {
        try {
          await api.patch(`/pools/by-id/${activated.id}`, {
            logo_path: logoPath,
          });
        } catch {
          toast.error(
            "Pool deployed but logo upload failed. You can set it later.",
          );
        }
      }

      setSelectedKey("");
      setSelectedManagerAddress("");
      setSelectedMint("");
      setLogoPath("");
      onClose();
    } catch {
      setDeployStep("idle");
      // Error toast is already handled by useSolanaTransaction
    }
  };

  const handleClose = () => {
    if (deployStep !== "idle" && deployStep !== "done") return;
    setSelectedKey("");
    setSelectedManagerAddress("");
    setSelectedMint("");
    setLogoPath("");
    setDeployStep("idle");
    onClose();
  };

  const isDeploying = deployStep === "activating" || deployStep === "deploying";

  const renderFooter = () => (
    <div className="flex items-center justify-between w-full">
      <div className="text-sm text-default-500">
        {deployStep === "activating" && (
          <span className="flex items-center gap-2">
            <Spinner size="sm" /> Activating pool...
          </span>
        )}
        {deployStep === "deploying" && (
          <span className="flex items-center gap-2">
            <Spinner size="sm" /> Deploying on-chain ({txStatus})...
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="flat" onPress={handleClose} isDisabled={isDeploying}>
          Cancel
        </Button>
        <Button
          color="primary"
          onPress={handleDeploy}
          isDisabled={
            !selectedKey ||
            !selectedManagerAddress ||
            !selectedMint ||
            isDeploying
          }
          isLoading={isDeploying}
          startContent={
            !isDeploying ? <Rocket className="h-4 w-4" /> : undefined
          }
        >
          {"Confirm & Deploy"}
        </Button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Pool"
      subtitle="Activate and deploy a new pool on-chain"
      size="2xl"
      scrollBehavior="outside"
      footer={renderFooter()}
      showCloseButton={false}
    >
      <div className="space-y-5">
        <div>
          <Select
            label="Pipeline Key"
            placeholder="Select a pipeline key"
            selectedKeys={selectedKey ? [selectedKey] : []}
            onSelectionChange={(keys) =>
              setSelectedKey((Array.from(keys)[0] as string) || "")
            }
            isLoading={keysLoading}
            isDisabled={isDeploying}
          >
            {pipelineKeys.map((pk) => (
              <SelectItem key={pk.key} textValue={pk.key}>
                <div className="flex justify-between items-center">
                  <span>{pk.key}</span>
                  <span className="text-xs text-default-400">
                    {pk.pool_type.toUpperCase()}
                  </span>
                </div>
              </SelectItem>
            ))}
          </Select>
        </div>

        <div>
          <Select
            label="Manager"
            placeholder="Select a manager"
            selectedKeys={
              selectedManagerAddress ? [selectedManagerAddress] : []
            }
            onSelectionChange={(keys) =>
              setSelectedManagerAddress((Array.from(keys)[0] as string) || "")
            }
            isLoading={managersLoading}
            isDisabled={isDeploying}
          >
            {managers.map((m) => (
              <SelectItem key={m.owner_address} textValue={m.company_name}>
                <div className="flex flex-col">
                  <span>{m.company_name}</span>
                  <span className="text-xs text-default-400">
                    {m.owner_address.slice(0, 6)}...
                    {m.owner_address.slice(-4)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </Select>
        </div>

        <div>
          <Select
            label="Asset Mint"
            placeholder="Select asset mint"
            selectedKeys={selectedMint ? [selectedMint] : []}
            onSelectionChange={(keys) =>
              setSelectedMint((Array.from(keys)[0] as string) || "")
            }
            isDisabled={isDeploying}
          >
            {SUPPORTED_MINTS.map((token) => (
              <SelectItem key={token.address} textValue={token.symbol}>
                <div className="flex flex-col">
                  <span>{token.symbol}</span>
                  <span className="text-xs text-default-400">
                    {token.address.slice(0, 6)}...{token.address.slice(-4)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </Select>
        </div>

        <FileUpload
          label="Pool Logo (optional)"
          value={logoPath}
          onChange={setLogoPath}
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
      </div>
    </BaseModal>
  );
}
