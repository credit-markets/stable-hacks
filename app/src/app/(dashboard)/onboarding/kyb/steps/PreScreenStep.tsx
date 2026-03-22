"use client";

import { useUpdateKyb } from "@/hooks/kyb";
import { cx, styles } from "@/lib/styleClasses";
import { preScreenSchema } from "@/lib/validations/kybSchema";
import type { EntityType, KybSubmission } from "@/types/kyb";
import { Button } from "@nextui-org/button";
import { Checkbox } from "@nextui-org/checkbox";
import { Input } from "@nextui-org/input";
import { Select, SelectItem } from "@nextui-org/select";
import { useState } from "react";
import toast from "react-hot-toast";

const ENTITY_TYPES = [
  { value: "company", label: "Company" },
  { value: "fund", label: "Fund" },
  { value: "trust", label: "Trust" },
  { value: "foundation", label: "Foundation" },
] as const;

interface PreScreenStepProps {
  submission: KybSubmission;
  onNext: () => void;
}

export default function PreScreenStep({
  submission,
  onNext,
}: PreScreenStepProps) {
  const updateKyb = useUpdateKyb();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [entityType, setEntityType] = useState(submission.entity_type ?? "");
  const [jurisdiction, setJurisdiction] = useState(
    submission.jurisdiction ?? "",
  );
  const [isRegulated, setIsRegulated] = useState(
    submission.is_regulated ?? false,
  );
  const [regulatorName, setRegulatorName] = useState(
    submission.regulator_name ?? "",
  );
  const [licenseNumber, setLicenseNumber] = useState(
    submission.license_number ?? "",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const values = {
      entity_type: entityType as EntityType,
      jurisdiction,
      is_regulated: isRegulated,
      regulator_name: regulatorName || null,
      license_number: licenseNumber || null,
    };

    const result = preScreenSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      await updateKyb.mutateAsync({
        id: submission.id,
        data: { ...values, step_completed: 1 },
      });
      toast.success("Pre-screening saved");
      onNext();
    } catch {
      toast.error("Failed to save pre-screening");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className={styles.bodyMd}>
        Tell us about your entity type and regulatory status.
      </p>

      <div className="space-y-4">
        <Select
          label="Entity Type"
          isRequired
          selectedKeys={entityType ? [entityType] : []}
          onSelectionChange={(keys) => {
            setEntityType(Array.from(keys)[0] as string);
          }}
          isInvalid={!!errors.entity_type}
          errorMessage={errors.entity_type}
        >
          {ENTITY_TYPES.map((t) => (
            <SelectItem key={t.value}>{t.label}</SelectItem>
          ))}
        </Select>

        <Input
          label="Jurisdiction"
          isRequired
          placeholder="e.g. Cayman Islands"
          value={jurisdiction}
          onChange={(e) => setJurisdiction(e.target.value)}
          isInvalid={!!errors.jurisdiction}
          errorMessage={errors.jurisdiction}
        />

        <Checkbox isSelected={isRegulated} onValueChange={setIsRegulated}>
          This entity is regulated
        </Checkbox>

        {isRegulated && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
            <Input
              label="Regulator Name"
              placeholder="e.g. CIMA"
              value={regulatorName}
              onChange={(e) => setRegulatorName(e.target.value)}
            />
            <Input
              label="License Number"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          className={cx(styles.btnBase, styles.btnPrimary, styles.btnMd)}
          isLoading={saving}
        >
          Save & Continue
        </Button>
      </div>
    </form>
  );
}
