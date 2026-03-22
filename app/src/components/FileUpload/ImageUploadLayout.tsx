"use client";

import { logger } from "@/lib/logger";
import { Button } from "@nextui-org/button";
import { Spinner } from "@nextui-org/spinner";
import { ImagePlus } from "lucide-react";
import { memo } from "react";

interface ImageUploadLayoutProps {
  value?: string;
  fileUrl: string | null | undefined;
  isLoadingUrl: boolean;
  label: string;
  imageSize: string;
  isUploading: boolean;
  uploadProgress: { percentage: number };
  acceptTypes: string;
  helpText?: string;
  onRemove: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  size: "sm" | "md" | "lg";
  shape: "circle" | "rounded";
  layout: "stacked" | "inline";
}

export const ImageUploadLayout = memo(function ImageUploadLayout({
  value,
  fileUrl,
  isLoadingUrl,
  label,
  imageSize,
  isUploading,
  uploadProgress,
  acceptTypes,
  helpText,
  onRemove,
  onChange,
  fileInputRef,
  size,
  shape,
}: ImageUploadLayoutProps) {
  const handleRemove = () => {
    if (!onRemove) {
      logger.error("onRemove handler is undefined", undefined, {
        component: "ImageUploadLayout",
        label,
      });
      return;
    }
    onRemove();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onChange) {
      logger.error("onChange handler is undefined", undefined, {
        component: "ImageUploadLayout",
        label,
      });
      return;
    }
    onChange(e);
  };

  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-lg";
  const previewSizeClass =
    size === "sm" ? "h-12 w-12" : size === "md" ? "h-16 w-16" : "h-24 w-24";

  const renderPreview = () => {
    if (value && isLoadingUrl) {
      return (
        <div
          className={`${previewSizeClass} border border-dashed border-subtle ${shapeClass} flex items-center justify-center bg-surface`}
        >
          <Spinner size="sm" />
        </div>
      );
    }

    if (value && fileUrl) {
      return (
        // biome-ignore lint/nursery/noImgElement: blob URLs from file uploads are not compatible with next/image
        <img
          src={fileUrl}
          alt={label || "Upload preview"}
          className={`${previewSizeClass} ${shapeClass} border border-subtle object-contain`}
        />
      );
    }

    return (
      <div
        className={`${previewSizeClass} border border-dashed border-subtle ${shapeClass} flex items-center justify-center`}
      >
        <ImagePlus className="h-5 w-5 text-text-muted" />
      </div>
    );
  };

  const buttonText = isUploading
    ? `Uploading… ${uploadProgress.percentage}%`
    : value
      ? "Change"
      : "Upload";

  return (
    <div className="flex items-center gap-4">
      {renderPreview()}

      <div className="flex flex-col gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          className="hidden"
          onChange={handleChange}
          disabled={isUploading}
          aria-label={`Upload ${label}`}
        />
        <Button
          size="sm"
          color="primary"
          variant="flat"
          isLoading={isUploading}
          onPress={() => fileInputRef.current?.click()}
          className="text-xs w-fit"
        >
          {buttonText}
        </Button>
        {helpText && (
          <span className="text-[10px] text-text-muted">{helpText}</span>
        )}
        {value && !isUploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-[10px] text-text-muted hover:text-text-secondary underline text-left"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
});
