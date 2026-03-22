"use client";

import { useDeleteKybDocument, useUploadKybDocument } from "@/hooks/kyb";
import { cx, styles } from "@/lib/styleClasses";
import type { KybDocument, KybDocumentCategory } from "@/types/kyb";
import { Check, FileText, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ".pdf,.png,.jpg,.jpeg";

interface KybDocumentUploadProps {
  submissionId: string;
  category: KybDocumentCategory;
  uboId?: string;
  existingDocs: KybDocument[];
  onDocumentChange?: () => void;
}

export default function KybDocumentUpload({
  submissionId,
  category,
  uboId,
  existingDocs,
  onDocumentChange,
}: KybDocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const uploadDoc = useUploadKybDocument();
  const deleteDoc = useDeleteKybDocument();

  const categoryDocs = existingDocs.filter(
    (d) =>
      d.category === category &&
      (uboId ? d.ubo_id === uboId : d.ubo_id === null),
  );

  const hasDoc = categoryDocs.length > 0;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      if (uboId) formData.append("ubo_id", uboId);

      await uploadDoc.mutateAsync({ id: submissionId, formData });
      toast.success("Document uploaded");
      onDocumentChange?.();
    } catch {
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete(docId: string) {
    try {
      await deleteDoc.mutateAsync({ id: submissionId, docId });
      toast.success("Document removed");
      onDocumentChange?.();
    } catch {
      toast.error("Failed to remove document");
    }
  }

  const label = category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const firstDoc = categoryDocs[0];

  return (
    <div
      className={cx(
        "rounded-lg border px-3 py-3 transition-colors",
        hasDoc
          ? "border-terminal-green/30 bg-terminal-green/[0.03]"
          : "border-dashed border-subtle hover:border-strategic-blue/40 hover:bg-strategic-blue/[0.02] cursor-pointer",
      )}
      onClick={!hasDoc ? () => fileInputRef.current?.click() : undefined}
      onKeyDown={
        !hasDoc
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }
          : undefined
      }
      role={!hasDoc ? "button" : undefined}
      tabIndex={!hasDoc ? 0 : undefined}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Row 1: Status icon + label + action */}
      <div className="flex items-center gap-2">
        <div
          className={cx(
            "flex items-center justify-center w-5 h-5 rounded-full shrink-0",
            hasDoc ? "bg-terminal-green/20" : "bg-strategic-blue/10",
          )}
        >
          {hasDoc ? (
            <Check className="w-3 h-3 text-terminal-green" />
          ) : (
            <UploadCloud className="w-3 h-3 text-strategic-blue" />
          )}
        </div>
        <span className="text-xs font-medium text-text-primary flex-1 truncate">
          {label}
        </span>
        {hasDoc ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-text-muted hover:text-text-secondary transition-colors p-0.5"
              aria-label={`Replace ${label}`}
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            {firstDoc && (
              <button
                type="button"
                onClick={() => handleDelete(firstDoc.id)}
                disabled={deleteDoc.isPending}
                className="text-text-muted hover:text-red-500 transition-colors p-0.5"
                aria-label={`Remove ${label}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-[10px] uppercase tracking-wider text-text-muted shrink-0">
            Required
          </span>
        )}
      </div>

      {/* Row 2: File name or upload hint */}
      <div className="mt-1.5 pl-7">
        {firstDoc ? (
          <span className="text-xs text-text-secondary truncate block">
            {firstDoc.file_name}
          </span>
        ) : (
          <span className="text-[11px] text-text-muted">
            {uploading ? "Uploading..." : "PDF, PNG, or JPG — max 10MB"}
          </span>
        )}
      </div>
    </div>
  );
}
