"use client";

import { useDocumentUrl } from "@/hooks/useFileUrl";
import { ExternalLink, FileText, Trash2 } from "lucide-react";
import { memo } from "react";

interface DocumentItemProps {
  document: { title: string; path: string };
  onRemove: () => void;
}

export const DocumentItem = memo(function DocumentItem({
  document,
  onRemove,
}: DocumentItemProps) {
  const { url, isLoadingUrl, urlError } = useDocumentUrl(document.path);

  function handleDownload(): void {
    if (url) {
      window.open(url, "_blank");
    }
  }

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-500/10 p-2 rounded-lg">
      <FileText size={16} className="text-default-500 flex-shrink-0" />
      <span className="text-sm truncate max-w-[200px]">{document.title}</span>
      {url && (
        <button
          type="button"
          onClick={handleDownload}
          className="text-blue-400 hover:text-blue-900 transition-colors"
          title="Open document"
          aria-label={`Open document: ${document.title}`}
        >
          <ExternalLink size={16} />
        </button>
      )}
      {isLoadingUrl && (
        <span className="text-xs text-default-400">Loading…</span>
      )}
      {urlError && (
        <span className="text-xs text-red-400" title={urlError.message}>
          Error
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="text-danger hover:text-danger/80 transition-colors"
        aria-label={`Remove document: ${document.title}`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
});
