"use client";

import { useAddUbo, useDeleteUbo, useUpdateKyb } from "@/hooks/kyb";
import { cx, styles } from "@/lib/styleClasses";
import {
  companyInfoSchema,
  sourceOfFundsSchema,
} from "@/lib/validations/kybSchema";
import type { KybDocumentCategory, KybSubmission } from "@/types/kyb";
import { Accordion, AccordionItem } from "@nextui-org/accordion";
import { Button } from "@nextui-org/button";
import { Checkbox } from "@nextui-org/checkbox";
import { Input } from "@nextui-org/input";
import { useState } from "react";
import toast from "react-hot-toast";
import KybDocumentUpload from "../components/KybDocumentUpload";
import UboCard from "../components/UboCard";

const ENTITY_DOC_CATEGORIES: {
  category: KybDocumentCategory;
  label: string;
}[] = [
  {
    category: "certificate_of_incorporation",
    label: "Certificate of Incorporation",
  },
  { category: "register_of_directors", label: "Register of Directors" },
  { category: "register_of_shareholders", label: "Register of Shareholders" },
  { category: "proof_of_address", label: "Proof of Address" },
  { category: "financial_statements", label: "Financial Statements" },
  { category: "regulatory_license", label: "Regulatory License" },
  { category: "source_of_funds_evidence", label: "Source of Funds Evidence" },
  { category: "authority_evidence", label: "Authority Evidence" },
];

interface CompanyOwnershipStepProps {
  submission: KybSubmission;
  onNext: () => void;
  onBack: () => void;
}

export default function CompanyOwnershipStep({
  submission,
  onNext,
  onBack,
}: CompanyOwnershipStepProps) {
  const updateKyb = useUpdateKyb();
  const addUbo = useAddUbo();
  const deleteUbo = useDeleteUbo();
  const [saving, setSaving] = useState(false);

  // Company info
  const [legalName, setLegalName] = useState(submission.legal_name ?? "");
  const [tradingName, setTradingName] = useState(submission.trading_name ?? "");
  const [regNumber, setRegNumber] = useState(
    submission.registration_number ?? "",
  );
  const [dateOfIncorp, setDateOfIncorp] = useState(
    submission.date_of_incorporation ?? "",
  );
  const [regAddress, setRegAddress] = useState(
    submission.registered_address ?? "",
  );
  const [bizActivity, setBizActivity] = useState(
    submission.business_activity ?? "",
  );
  const [website, setWebsite] = useState(submission.website ?? "");

  // Source of funds
  const [ownershipDesc, setOwnershipDesc] = useState(
    submission.ownership_structure_description ?? "",
  );
  const [sourceOfFunds, setSourceOfFunds] = useState(
    submission.source_of_funds ?? "",
  );
  const [sourceOfWealth, setSourceOfWealth] = useState(
    submission.source_of_wealth ?? "",
  );

  // PEP/RCA
  const [hasPep, setHasPep] = useState(submission.has_pep ?? false);
  const [pepDetails, setPepDetails] = useState(submission.pep_details ?? "");
  const [hasRca, setHasRca] = useState(submission.has_rca ?? false);
  const [rcaDetails, setRcaDetails] = useState(submission.rca_details ?? "");

  // Declarations
  const [sanctionsDecl, setSanctionsDecl] = useState(
    submission.sanctions_declaration ?? false,
  );
  const [adverseMediaDecl, setAdverseMediaDecl] = useState(
    submission.adverse_media_declaration ?? false,
  );

  async function autoSave(data: Record<string, unknown>) {
    try {
      await updateKyb.mutateAsync({ id: submission.id, data });
    } catch {
      toast.error("Failed to auto-save");
    }
  }

  async function handleAddUbo() {
    try {
      await addUbo.mutateAsync({
        id: submission.id,
        data: {
          full_name: "",
          date_of_birth: "2000-01-01",
          nationality: "",
          country_of_residence: "",
          role: "ubo",
          source_of_wealth: "",
          is_pep: false,
        },
      });
      toast.success("Person added");
    } catch {
      toast.error("Failed to add person");
    }
  }

  async function handleRemoveUbo(uboId: string) {
    try {
      await deleteUbo.mutateAsync({ id: submission.id, uboId });
      toast.success("Person removed");
    } catch {
      toast.error("Failed to remove person");
    }
  }

  async function handleNext() {
    const companyValues = {
      legal_name: legalName,
      trading_name: tradingName || null,
      registration_number: regNumber,
      date_of_incorporation: dateOfIncorp,
      registered_address: regAddress,
      business_activity: bizActivity,
      website: website || null,
    };
    const sofValues = {
      ownership_structure_description: ownershipDesc,
      source_of_funds: sourceOfFunds,
      source_of_wealth: sourceOfWealth,
    };

    const companyResult = companyInfoSchema.safeParse(companyValues);
    const sofResult = sourceOfFundsSchema.safeParse(sofValues);

    if (!companyResult.success || !sofResult.success) {
      const issues = [
        ...(companyResult.error?.issues ?? []),
        ...(sofResult.error?.issues ?? []),
      ];
      const firstIssue =
        issues[0]?.message ?? "Please fill in all required fields";
      toast.error(firstIssue);
      return;
    }

    setSaving(true);
    try {
      await updateKyb.mutateAsync({
        id: submission.id,
        data: {
          ...companyValues,
          ...sofValues,
          has_pep: hasPep,
          pep_details: pepDetails || null,
          has_rca: hasRca,
          rca_details: rcaDetails || null,
          sanctions_declaration: sanctionsDecl,
          adverse_media_declaration: adverseMediaDecl,
          step_completed: 2,
        },
      });
      toast.success("Company & ownership saved");
      onNext();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className={styles.bodyMd}>
        Provide your company details, ownership structure, and compliance
        declarations.
      </p>

      <Accordion selectionMode="multiple" defaultExpandedKeys={["company"]}>
        <AccordionItem key="company" title="Company Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
            <Input
              label="Legal Name"
              isRequired
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              onBlur={() => autoSave({ legal_name: legalName })}
            />
            <Input
              label="Trading Name"
              value={tradingName}
              onChange={(e) => setTradingName(e.target.value)}
              onBlur={() => autoSave({ trading_name: tradingName || null })}
            />
            <Input
              label="Registration Number"
              isRequired
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              onBlur={() => autoSave({ registration_number: regNumber })}
            />
            <Input
              label="Date of Incorporation"
              isRequired
              type="date"
              value={dateOfIncorp}
              onChange={(e) => setDateOfIncorp(e.target.value)}
              onBlur={() => autoSave({ date_of_incorporation: dateOfIncorp })}
            />
            <Input
              label="Registered Address"
              isRequired
              className="md:col-span-2"
              value={regAddress}
              onChange={(e) => setRegAddress(e.target.value)}
              onBlur={() => autoSave({ registered_address: regAddress })}
            />
            <Input
              label="Business Activity"
              isRequired
              className="md:col-span-2"
              value={bizActivity}
              onChange={(e) => setBizActivity(e.target.value)}
              onBlur={() => autoSave({ business_activity: bizActivity })}
            />
            <Input
              label="Website"
              placeholder="https://"
              className="md:col-span-2"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              onBlur={() => autoSave({ website: website || null })}
            />
          </div>
        </AccordionItem>

        <AccordionItem key="ubos" title="Beneficial Owners & Key Persons">
          <div className="space-y-4 pb-4">
            {submission.ubos.map((ubo) => (
              <UboCard
                key={ubo.id}
                submissionId={submission.id}
                ubo={ubo}
                documents={submission.documents}
                onRemove={() => handleRemoveUbo(ubo.id)}
              />
            ))}
            <Button
              variant="bordered"
              onPress={handleAddUbo}
              isLoading={addUbo.isPending}
            >
              + Add Person
            </Button>
          </div>
        </AccordionItem>

        <AccordionItem key="sof" title="Source of Funds">
          <div className="space-y-4 pb-4">
            <Input
              label="Ownership Structure Description"
              isRequired
              value={ownershipDesc}
              onChange={(e) => setOwnershipDesc(e.target.value)}
              onBlur={() =>
                autoSave({ ownership_structure_description: ownershipDesc })
              }
            />
            <Input
              label="Source of Funds"
              isRequired
              value={sourceOfFunds}
              onChange={(e) => setSourceOfFunds(e.target.value)}
              onBlur={() => autoSave({ source_of_funds: sourceOfFunds })}
            />
            <Input
              label="Source of Wealth"
              isRequired
              value={sourceOfWealth}
              onChange={(e) => setSourceOfWealth(e.target.value)}
              onBlur={() => autoSave({ source_of_wealth: sourceOfWealth })}
            />
          </div>
        </AccordionItem>

        <AccordionItem key="pep" title="PEP & RCA Declarations">
          <div className="space-y-4 pb-4">
            <Checkbox
              isSelected={hasPep}
              onValueChange={(val) => {
                setHasPep(val);
                autoSave({ has_pep: val });
              }}
            >
              The entity or its beneficial owners include Politically Exposed
              Persons (PEP)
            </Checkbox>
            {hasPep && (
              <Input
                label="PEP Details"
                placeholder="Provide details of PEP status"
                value={pepDetails}
                onChange={(e) => setPepDetails(e.target.value)}
                onBlur={() => autoSave({ pep_details: pepDetails || null })}
              />
            )}
            <Checkbox
              isSelected={hasRca}
              onValueChange={(val) => {
                setHasRca(val);
                autoSave({ has_rca: val });
              }}
            >
              The entity or its beneficial owners include Relatives or Close
              Associates (RCA) of PEPs
            </Checkbox>
            {hasRca && (
              <Input
                label="RCA Details"
                placeholder="Provide details of RCA relationship"
                value={rcaDetails}
                onChange={(e) => setRcaDetails(e.target.value)}
                onBlur={() => autoSave({ rca_details: rcaDetails || null })}
              />
            )}
          </div>
        </AccordionItem>

        <AccordionItem key="sanctions" title="Sanctions Declaration">
          <div className="space-y-2 pb-4">
            <Checkbox
              isSelected={sanctionsDecl}
              onValueChange={(val) => {
                setSanctionsDecl(val);
                autoSave({ sanctions_declaration: val });
              }}
            >
              I confirm that the entity and its beneficial owners are not
              subject to any sanctions imposed by the UN, EU, OFAC, or other
              relevant authorities.
            </Checkbox>
          </div>
        </AccordionItem>

        <AccordionItem key="adverse" title="Adverse Media Declaration">
          <div className="space-y-2 pb-4">
            <Checkbox
              isSelected={adverseMediaDecl}
              onValueChange={(val) => {
                setAdverseMediaDecl(val);
                autoSave({ adverse_media_declaration: val });
              }}
            >
              I confirm that, to the best of my knowledge, neither the entity
              nor its beneficial owners have been the subject of adverse media
              coverage relating to financial crime, fraud, or regulatory action.
            </Checkbox>
          </div>
        </AccordionItem>
      </Accordion>

      <div className="space-y-4">
        <h3 className="text-base font-semibold">Entity Documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ENTITY_DOC_CATEGORIES.map(({ category }) => (
            <KybDocumentUpload
              key={category}
              submissionId={submission.id}
              category={category}
              existingDocs={submission.documents}
            />
          ))}
        </div>
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
