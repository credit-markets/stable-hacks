"use client";

import { useAddWallet, useDeleteWallet, useUpdateKyb } from "@/hooks/kyb";
import { cx, styles } from "@/lib/styleClasses";
import { walletSchema } from "@/lib/validations/kybSchema";
import type { KybSubmission } from "@/types/kyb";
import { Button } from "@nextui-org/button";
import { Checkbox } from "@nextui-org/checkbox";
import { Input, Textarea } from "@nextui-org/input";
import { useState } from "react";
import toast from "react-hot-toast";
import WalletDeclarationRow from "../components/WalletDeclarationRow";

interface RepresentationsStepProps {
  submission: KybSubmission;
  onNext: () => void;
  onBack: () => void;
}

export default function RepresentationsStep({
  submission,
  onNext,
  onBack,
}: RepresentationsStepProps) {
  const updateKyb = useUpdateKyb();
  const addWallet = useAddWallet();
  const deleteWallet = useDeleteWallet();
  const [saving, setSaving] = useState(false);

  // Wallet form
  const [walletAddress, setWalletAddress] = useState("");
  const [walletLabel, setWalletLabel] = useState("");
  const [walletSource, setWalletSource] = useState("");
  const [walletErrors, setWalletErrors] = useState<Record<string, string>>({});

  // Funding route
  const [fundingRoute, setFundingRoute] = useState(
    submission.funding_route_declaration ?? "",
  );

  // Declarations
  const [authSignatory, setAuthSignatory] = useState(
    submission.authorized_signatory_declaration ?? false,
  );
  const [accuracy, setAccuracy] = useState(
    submission.accuracy_declaration ?? false,
  );
  const [ongoingReporting, setOngoingReporting] = useState(
    submission.ongoing_reporting_declaration ?? false,
  );

  async function handleAddWallet() {
    const values = {
      wallet_address: walletAddress,
      wallet_label: walletLabel,
      source_description: walletSource,
    };
    const result = walletSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setWalletErrors(fieldErrors);
      return;
    }
    setWalletErrors({});

    try {
      await addWallet.mutateAsync({ id: submission.id, data: values });
      setWalletAddress("");
      setWalletLabel("");
      setWalletSource("");
      toast.success("Wallet added");
    } catch {
      toast.error("Failed to add wallet");
    }
  }

  async function handleRemoveWallet(walletId: string) {
    try {
      await deleteWallet.mutateAsync({ id: submission.id, walletId });
      toast.success("Wallet removed");
    } catch {
      toast.error("Failed to remove wallet");
    }
  }

  async function handleNext() {
    if (!authSignatory || !accuracy || !ongoingReporting) {
      toast.error("Please confirm all declarations before continuing");
      return;
    }

    setSaving(true);
    try {
      await updateKyb.mutateAsync({
        id: submission.id,
        data: {
          funding_route_declaration: fundingRoute,
          authorized_signatory_declaration: authSignatory,
          accuracy_declaration: accuracy,
          ongoing_reporting_declaration: ongoingReporting,
          step_completed: 3,
        },
      });
      toast.success("Representations saved");
      onNext();
    } catch {
      toast.error("Failed to save representations");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className={styles.bodyMd}>
        Declare your wallet addresses and confirm the required representations.
      </p>

      <div className="space-y-4">
        <h3 className="text-base font-semibold">Wallet Declarations</h3>
        {submission.wallets.length > 0 && (
          <div className="space-y-2">
            {submission.wallets.map((w) => (
              <WalletDeclarationRow
                key={w.id}
                submissionId={submission.id}
                wallet={w}
                onRemove={() => handleRemoveWallet(w.id)}
              />
            ))}
          </div>
        )}

        <div className={cx(styles.card, styles.cardPadding, "space-y-3")}>
          <p className="text-sm text-gray-600">Add a new wallet</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Wallet Address"
              isRequired
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              isInvalid={!!walletErrors.wallet_address}
              errorMessage={walletErrors.wallet_address}
            />
            <Input
              label="Label"
              isRequired
              placeholder="e.g. Treasury"
              value={walletLabel}
              onChange={(e) => setWalletLabel(e.target.value)}
              isInvalid={!!walletErrors.wallet_label}
              errorMessage={walletErrors.wallet_label}
            />
            <Input
              label="Source Description"
              isRequired
              value={walletSource}
              onChange={(e) => setWalletSource(e.target.value)}
              isInvalid={!!walletErrors.source_description}
              errorMessage={walletErrors.source_description}
            />
          </div>
          <Button
            variant="bordered"
            size="sm"
            onPress={handleAddWallet}
            isLoading={addWallet.isPending}
          >
            + Add Wallet
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-base font-semibold">Funding Route</h3>
        <Textarea
          value={fundingRoute}
          onChange={(e) => setFundingRoute(e.target.value)}
          placeholder="Describe the anticipated funding route (e.g. bank wire from X account to Y)"
          minRows={3}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-base font-semibold">Declarations</h3>

        <Checkbox isSelected={authSignatory} onValueChange={setAuthSignatory}>
          I confirm that I am an authorized signatory of the entity and have the
          authority to submit this application on behalf of the entity.
        </Checkbox>

        <Checkbox isSelected={accuracy} onValueChange={setAccuracy}>
          I declare that all information provided in this application is true,
          accurate, and complete to the best of my knowledge.
        </Checkbox>

        <Checkbox
          isSelected={ongoingReporting}
          onValueChange={setOngoingReporting}
        >
          I undertake to promptly notify of any material changes to the
          information provided and to cooperate with any ongoing reporting or
          compliance requirements.
        </Checkbox>
      </div>

      <div className="flex justify-between">
        <Button variant="bordered" onPress={onBack}>
          Back
        </Button>
        <Button
          className={cx(styles.btnBase, styles.btnPrimary, styles.btnMd)}
          onPress={handleNext}
          isLoading={saving}
        >
          Save & Continue
        </Button>
      </div>
    </div>
  );
}
