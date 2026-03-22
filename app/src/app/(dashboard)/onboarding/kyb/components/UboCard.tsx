"use client";

import { useUpdateUbo } from "@/hooks/kyb";
import { cx, styles } from "@/lib/styleClasses";
import type { KybDocument, KybUbo, UboRole } from "@/types/kyb";
import { Button } from "@nextui-org/button";
import { Checkbox } from "@nextui-org/checkbox";
import { Input } from "@nextui-org/input";
import { Select, SelectItem } from "@nextui-org/select";
import { useState } from "react";
import toast from "react-hot-toast";
import KybDocumentUpload from "./KybDocumentUpload";

const UBO_ROLES = [
  { value: "ubo", label: "UBO" },
  { value: "director", label: "Director" },
  { value: "signatory", label: "Signatory" },
  { value: "trustee", label: "Trustee" },
  { value: "gp", label: "General Partner" },
  { value: "protector", label: "Protector" },
] as const;

interface UboCardProps {
  submissionId: string;
  ubo: KybUbo;
  documents: KybDocument[];
  onRemove: () => void;
}

export default function UboCard({
  submissionId,
  ubo,
  documents,
  onRemove,
}: UboCardProps) {
  const updateUbo = useUpdateUbo();

  const [fullName, setFullName] = useState(ubo.full_name || "");
  const [dateOfBirth, setDateOfBirth] = useState(ubo.date_of_birth || "");
  const [nationality, setNationality] = useState(ubo.nationality || "");
  const [countryOfResidence, setCountryOfResidence] = useState(
    ubo.country_of_residence || "",
  );
  const [role, setRole] = useState<string>(ubo.role || "ubo");
  const [ownershipPct, setOwnershipPct] = useState<string>(
    ubo.ownership_percentage?.toString() ?? "",
  );
  const [sourceOfWealth, setSourceOfWealth] = useState(
    ubo.source_of_wealth || "",
  );
  const [isPep, setIsPep] = useState(ubo.is_pep ?? false);
  const [pepDetails, setPepDetails] = useState(ubo.pep_details || "");

  async function saveField(data: Record<string, unknown>) {
    try {
      await updateUbo.mutateAsync({
        id: submissionId,
        uboId: ubo.id,
        data,
      });
    } catch {
      toast.error("Failed to save UBO changes");
    }
  }

  const uboDocuments = documents.filter(
    (d) => d.ubo_id === ubo.id && d.category === "ubo_id_document",
  );

  return (
    <div className={cx(styles.card, styles.cardPadding, "space-y-4")}>
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold">{fullName || "New Person"}</h4>
        <Button size="sm" color="danger" variant="light" onPress={onRemove}>
          Remove
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Full Name"
          isRequired
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          onBlur={() => saveField({ full_name: fullName })}
        />
        <Input
          label="Date of Birth"
          isRequired
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          onBlur={() => saveField({ date_of_birth: dateOfBirth })}
        />
        <Input
          label="Nationality"
          isRequired
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
          onBlur={() => saveField({ nationality })}
        />
        <Input
          label="Country of Residence"
          isRequired
          value={countryOfResidence}
          onChange={(e) => setCountryOfResidence(e.target.value)}
          onBlur={() => saveField({ country_of_residence: countryOfResidence })}
        />
        <Select
          label="Role"
          isRequired
          selectedKeys={role ? [role] : []}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0] as string;
            setRole(val);
            saveField({ role: val as UboRole });
          }}
        >
          {UBO_ROLES.map((r) => (
            <SelectItem key={r.value}>{r.label}</SelectItem>
          ))}
        </Select>
        <Input
          label="Ownership %"
          type="number"
          value={ownershipPct}
          onChange={(e) => setOwnershipPct(e.target.value)}
          onBlur={() =>
            saveField({
              ownership_percentage:
                ownershipPct === "" ? null : Number(ownershipPct),
            })
          }
        />
        <Input
          label="Source of Wealth"
          className="md:col-span-2"
          value={sourceOfWealth}
          onChange={(e) => setSourceOfWealth(e.target.value)}
          onBlur={() => saveField({ source_of_wealth: sourceOfWealth })}
        />
      </div>

      <Checkbox
        isSelected={isPep}
        onValueChange={(val) => {
          setIsPep(val);
          saveField({ is_pep: val });
        }}
      >
        This person is a Politically Exposed Person (PEP)
      </Checkbox>

      {isPep && (
        <Input
          label="PEP Details"
          placeholder="Position, country, and relationship"
          value={pepDetails}
          onChange={(e) => setPepDetails(e.target.value)}
          onBlur={() => saveField({ pep_details: pepDetails })}
        />
      )}

      <KybDocumentUpload
        submissionId={submissionId}
        category="ubo_id_document"
        uboId={ubo.id}
        existingDocs={uboDocuments}
      />
    </div>
  );
}
