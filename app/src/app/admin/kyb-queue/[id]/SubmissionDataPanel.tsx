"use client";

import { cx, styles } from "@/lib/styleClasses";
import { kybService } from "@/services/kybService";
import type { KybDocument, KybSubmission, KybUbo } from "@/types/kyb";
import { formatDate } from "@/utils/formatDate";

import { Accordion, AccordionItem } from "@nextui-org/accordion";
import { Button } from "@nextui-org/button";
import { Chip } from "@nextui-org/chip";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/modal";
import { Spinner } from "@nextui-org/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/table";
import {
  Building2,
  CheckCircle,
  Download,
  Eye,
  FileText,
  Globe,
  Landmark,
  Scale,
  Shield,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import type { Key } from "react";
import toast from "react-hot-toast";

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-subtle last:border-0">
      <span className={cx(styles.labelPrimary, "shrink-0 mr-4")}>{label}</span>
      <span className={cx(styles.tableCellValue, "text-right")}>{value}</span>
    </div>
  );
}

function BoolField({ label, value }: { label: string; value: boolean | null }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-subtle last:border-0">
      <span className={styles.labelPrimary}>{label}</span>
      {value ? (
        <CheckCircle className="w-4 h-4 text-success" />
      ) : (
        <XCircle className="w-4 h-4 text-text-muted" />
      )}
    </div>
  );
}

const ACCORDION_ITEM_CLASSES = {
  base: "px-4 bg-background shadow-sm border border-subtle rounded-lg",
  title: "text-sm font-semibold text-text-primary",
  trigger: "py-3",
  content: "pb-4 pt-0",
  indicator: "text-text-muted",
};

function AccordionTitle({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-text-muted" />
      <span>{label}</span>
    </div>
  );
}

function isPreviewableImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

function isPreviewablePdf(mimeType: string) {
  return mimeType === "application/pdf";
}

function DocumentCard({
  doc,
  submissionId,
  onPreview,
}: {
  doc: KybDocument;
  submissionId: string;
  onPreview: (doc: KybDocument) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const canPreview =
    isPreviewableImage(doc.mime_type) || isPreviewablePdf(doc.mime_type);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { url } = await kybService.getDocumentDownload(
        submissionId,
        doc.id,
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.file_name;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("Failed to download document");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-md border border-subtle bg-surface-hover/50 group">
      <FileText className="w-5 h-5 text-text-muted shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{doc.file_name}</p>
        <p className="text-xs text-text-muted">
          {doc.category.replace(/_/g, " ")}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {canPreview && (
          <Button
            size="sm"
            variant="light"
            isIconOnly
            aria-label="Preview document"
            onPress={() => onPreview(doc)}
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label="Download document"
          isLoading={downloading}
          onPress={handleDownload}
        >
          {!downloading && <Download className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

function DocumentPreviewModal({
  doc,
  submissionId,
  isOpen,
  onClose,
}: {
  doc: KybDocument | null;
  submissionId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!doc) return;
    setLoading(true);
    setError(false);
    setPreviewUrl(null);
    try {
      const { url } = await kybService.getDocumentPreview(submissionId, doc.id);
      setPreviewUrl(url);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [doc, submissionId]);

  // Load preview when modal opens
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && doc) {
        loadPreview();
      } else {
        setPreviewUrl(null);
        onClose();
      }
    },
    [doc, loadPreview, onClose],
  );

  // Trigger load on mount if open
  if (isOpen && !previewUrl && !loading && !error && doc) {
    loadPreview();
  }

  const isImage = doc ? isPreviewableImage(doc.mime_type) : false;
  const isPdf = doc ? isPreviewablePdf(doc.mime_type) : false;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      size="4xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader>
          <span className={styles.headingSm}>
            {doc?.file_name || "Document Preview"}
          </span>
        </ModalHeader>
        <ModalBody>
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center py-16">
              <p className={styles.bodyMd}>Failed to load preview</p>
            </div>
          )}
          {previewUrl && isImage && (
            <div className="flex items-center justify-center">
              <Image
                src={previewUrl}
                alt={doc?.file_name || "Document"}
                width={800}
                height={600}
                unoptimized
                className="max-w-full max-h-[70vh] object-contain rounded-md"
              />
            </div>
          )}
          {previewUrl && isPdf && (
            <iframe
              src={previewUrl}
              title={doc?.file_name || "PDF Preview"}
              className="w-full h-[70vh] rounded-md border border-subtle"
            />
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Close
          </Button>
          {previewUrl && (
            <Button
              variant="flat"
              startContent={<Download className="w-4 h-4" />}
              onPress={() => {
                if (previewUrl) {
                  window.open(previewUrl, "_blank");
                }
              }}
            >
              Open in New Tab
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function UboCard({
  ubo,
  documents,
  submissionId,
  onPreviewDoc,
}: {
  ubo: KybUbo;
  documents: KybDocument[];
  submissionId: string;
  onPreviewDoc: (doc: KybDocument) => void;
}) {
  const uboDocuments = documents.filter((d) => d.ubo_id === ubo.id);

  return (
    <div className={cx(styles.card, styles.cardPadding, "space-y-2")}>
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-text-muted" />
        <span className={styles.headingSm}>{ubo.full_name}</span>
        <Chip size="sm" variant="flat">
          {ubo.role}
        </Chip>
      </div>
      <FieldRow label="DATE OF BIRTH" value={formatDate(ubo.date_of_birth)} />
      <FieldRow label="NATIONALITY" value={ubo.nationality} />
      <FieldRow label="COUNTRY OF RESIDENCE" value={ubo.country_of_residence} />
      <FieldRow
        label="OWNERSHIP %"
        value={
          ubo.ownership_percentage !== null
            ? `${ubo.ownership_percentage}%`
            : "N/A"
        }
      />
      <FieldRow label="SOURCE OF WEALTH" value={ubo.source_of_wealth} />
      <BoolField label="IS PEP" value={ubo.is_pep} />
      {ubo.is_pep && ubo.pep_details && (
        <FieldRow label="PEP DETAILS" value={ubo.pep_details} />
      )}
      {uboDocuments.length > 0 && (
        <div className="pt-2">
          <span className={cx(styles.labelPrimary, "block mb-1")}>
            LINKED DOCUMENTS
          </span>
          <div className="space-y-1">
            {uboDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                submissionId={submissionId}
                onPreview={onPreviewDoc}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubmissionDataPanel({
  submission,
}: {
  submission: KybSubmission;
}) {
  const [previewDoc, setPreviewDoc] = useState<KybDocument | null>(null);
  const entityDocuments = submission.documents.filter((d) => !d.ubo_id);

  return (
    <div className="space-y-3">
      <Accordion
        variant="splitted"
        selectionMode="multiple"
        defaultExpandedKeys={["pre-screen", "company", "ubos", "entity-docs"]}
        itemClasses={ACCORDION_ITEM_CLASSES}
      >
        <AccordionItem
          key="pre-screen"
          title={<AccordionTitle icon={Globe} label="Pre-Screen" />}
        >
          <div className="space-y-1">
            <FieldRow
              label="ENTITY TYPE"
              value={
                submission.entity_type
                  ? submission.entity_type.charAt(0).toUpperCase() +
                    submission.entity_type.slice(1)
                  : null
              }
            />
            <FieldRow label="JURISDICTION" value={submission.jurisdiction} />
            <BoolField label="IS REGULATED" value={submission.is_regulated} />
            {submission.is_regulated && (
              <>
                <FieldRow
                  label="REGULATOR NAME"
                  value={submission.regulator_name}
                />
                <FieldRow
                  label="LICENSE NUMBER"
                  value={submission.license_number}
                />
              </>
            )}
          </div>
        </AccordionItem>

        <AccordionItem
          key="company"
          title={
            <AccordionTitle icon={Building2} label="Company Information" />
          }
        >
          <div className="space-y-1">
            <FieldRow label="LEGAL NAME" value={submission.legal_name} />
            <FieldRow label="TRADING NAME" value={submission.trading_name} />
            <FieldRow
              label="REGISTRATION NUMBER"
              value={submission.registration_number}
            />
            <FieldRow
              label="DATE OF INCORPORATION"
              value={
                submission.date_of_incorporation
                  ? formatDate(submission.date_of_incorporation)
                  : null
              }
            />
            <FieldRow
              label="REGISTERED ADDRESS"
              value={submission.registered_address}
            />
            <FieldRow
              label="BUSINESS ACTIVITY"
              value={submission.business_activity}
            />
            <FieldRow label="WEBSITE" value={submission.website} />
          </div>
        </AccordionItem>

        <AccordionItem
          key="ubos"
          title={
            <AccordionTitle
              icon={User}
              label={`Ownership & UBOs (${submission.ubos.length})`}
            />
          }
        >
          <div className="space-y-3">
            {submission.ubos.length === 0 ? (
              <p className={styles.bodySm}>No UBOs declared.</p>
            ) : (
              submission.ubos.map((ubo) => (
                <UboCard
                  key={ubo.id}
                  ubo={ubo}
                  documents={submission.documents}
                  submissionId={submission.id}
                  onPreviewDoc={setPreviewDoc}
                />
              ))
            )}
          </div>
        </AccordionItem>

        <AccordionItem
          key="source-of-funds"
          title={<AccordionTitle icon={Landmark} label="Source of Funds" />}
        >
          <div className="space-y-1">
            <FieldRow
              label="SOURCE OF FUNDS"
              value={submission.source_of_funds}
            />
            <FieldRow
              label="SOURCE OF WEALTH"
              value={submission.source_of_wealth}
            />
            <FieldRow
              label="OWNERSHIP STRUCTURE"
              value={submission.ownership_structure_description}
            />
          </div>
        </AccordionItem>

        <AccordionItem
          key="pep-rca"
          title={<AccordionTitle icon={Shield} label="PEP / RCA" />}
        >
          <div className="space-y-1">
            <BoolField label="HAS PEP" value={submission.has_pep} />
            {submission.has_pep && (
              <FieldRow label="PEP DETAILS" value={submission.pep_details} />
            )}
            <BoolField label="HAS RCA" value={submission.has_rca} />
            {submission.has_rca && (
              <FieldRow label="RCA DETAILS" value={submission.rca_details} />
            )}
          </div>
        </AccordionItem>

        <AccordionItem
          key="declarations"
          title={<AccordionTitle icon={Scale} label="Declarations" />}
        >
          <div className="space-y-1">
            <BoolField
              label="SANCTIONS DECLARATION"
              value={submission.sanctions_declaration}
            />
            <BoolField
              label="ADVERSE MEDIA DECLARATION"
              value={submission.adverse_media_declaration}
            />
          </div>
        </AccordionItem>

        <AccordionItem
          key="funding-route"
          title={<AccordionTitle icon={Landmark} label="Funding Route" />}
        >
          <div className="space-y-1">
            <FieldRow
              label="FUNDING ROUTE"
              value={submission.funding_route_declaration}
            />
          </div>
        </AccordionItem>

        <AccordionItem
          key="wallets"
          title={
            <AccordionTitle
              icon={Wallet}
              label={`Wallets (${submission.wallets.length})`}
            />
          }
        >
          {submission.wallets.length === 0 ? (
            <p className={styles.bodySm}>No wallets declared.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table
                aria-label="Wallet declarations"
                classNames={{ table: "min-w-[500px]" }}
                removeWrapper
              >
                <TableHeader>
                  <TableColumn key="wallet_label">LABEL</TableColumn>
                  <TableColumn key="wallet_address">ADDRESS</TableColumn>
                  <TableColumn key="source_description">SOURCE</TableColumn>
                  <TableColumn key="declared_at">DECLARED</TableColumn>
                </TableHeader>
                <TableBody items={submission.wallets}>
                  {(wallet) => (
                    <TableRow key={wallet.id}>
                      {(columnKey: Key) => (
                        <TableCell>
                          {columnKey === "wallet_address" ? (
                            <span className="font-mono text-xs">
                              {wallet.wallet_address}
                            </span>
                          ) : columnKey === "declared_at" ? (
                            <span className={styles.tableCellMuted}>
                              {formatDate(wallet.declared_at)}
                            </span>
                          ) : (
                            <span className={styles.tableCell}>
                              {wallet[columnKey as keyof typeof wallet]}
                            </span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </AccordionItem>

        <AccordionItem
          key="entity-docs"
          title={
            <AccordionTitle
              icon={FileText}
              label={`Entity Documents (${entityDocuments.length})`}
            />
          }
        >
          {entityDocuments.length === 0 ? (
            <p className={styles.bodySm}>No entity documents uploaded.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {entityDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  submissionId={submission.id}
                  onPreview={setPreviewDoc}
                />
              ))}
            </div>
          )}
        </AccordionItem>

        <AccordionItem
          key="representations"
          title={<AccordionTitle icon={CheckCircle} label="Representations" />}
        >
          <div className="space-y-1">
            <BoolField
              label="AUTHORIZED SIGNATORY"
              value={submission.authorized_signatory_declaration}
            />
            <BoolField
              label="ACCURACY DECLARATION"
              value={submission.accuracy_declaration}
            />
            <BoolField
              label="ONGOING REPORTING"
              value={submission.ongoing_reporting_declaration}
            />
          </div>
        </AccordionItem>
      </Accordion>

      <DocumentPreviewModal
        doc={previewDoc}
        submissionId={submission.id}
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}
