"use client";

import type { FileSubType, FileType } from "@/constants/fileTypes";
import {
  ACCEPTED_DOCUMENT_EXTENSIONS_STRING,
  ACCEPTED_IMAGE_EXTENSIONS,
  FILE_SIZE_LIMITS,
} from "@/constants/fileUpload";
import {
  type UseFileUploadOptions,
  useFileUpload,
} from "@/hooks/useFileUpload";
import { useDocumentUrl, useImageUrl } from "@/hooks/useFileUrl";
import { logger } from "@/lib/logger";
import type { ImageValidationOptions } from "@/utils/fileValidation";
import {
  getDocumentSizeLimitsText,
  getImageSizeLimitsText,
} from "@/utils/fileValidation";
import { Button } from "@nextui-org/button";
import { FileText, Plus } from "lucide-react";
import { memo, useRef } from "react";
import { toast } from "react-hot-toast";
import { DocumentItem } from "./DocumentItem";
import { ImageUploadLayout } from "./ImageUploadLayout";

/**
 * Props for FileUpload component
 */
interface FileUploadProps {
  /** Current file path (empty string for no file) */
  value?: string;
  /** Callback when file is uploaded with new file path */
  onChange?: (path: string) => void;
  /** Label text displayed above component */
  label: string;
  /** Type of file being uploaded (image or document) */
  fileType: FileType;
  /** Specific subtype for additional validation (cover_image, logo, profile_photo, pool_document) */
  subType: FileSubType;
  /** Image validation options (dimensions, aspect ratio, size) */
  validation?: ImageValidationOptions;
  /** Maximum file size in megabytes */
  maxSizeMB?: number;
  /** Additional CSS classes */
  className?: string;
  /** Component size variant: sm (80px), md (128px), lg (384px) */
  size?: "sm" | "md" | "lg";
  /** Array of documents for multi-document upload mode */
  documents?: Array<{ title: string; path: string }>;
  /** Callback when new document is added (multi-document mode) */
  onAddDocument?: (document: { title: string; path: string }) => void;
  /** Callback when document is removed (multi-document mode) */
  onRemoveDocument?: (index: number) => void;
}

/**
 * Internal configuration for upload behavior
 */
interface UploadConfig {
  /** CSS class for image sizing */
  sizeClass: string;
  /** Help text describing size limits and requirements */
  helpText: string;
  /** Accepted MIME types for file input */
  acceptTypes: string;
}

const SIZE_CLASSES = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-auto max-w-full max-h-60",
} as const;

/**
 * Generates upload configuration based on file type and size
 *
 * @param fileType - Whether uploading image or document
 * @param size - Component size variant
 * @param validation - Image validation constraints
 * @param maxSizeMB - Maximum file size override
 * @returns Configuration object with size class, help text, and accepted types
 */
function getUploadConfig(
  fileType: FileType,
  size: "sm" | "md" | "lg",
  validation: ImageValidationOptions,
  maxSizeMB?: number,
): UploadConfig {
  const helpText =
    fileType === "image"
      ? getImageSizeLimitsText(
          validation.maxSizeMB || FILE_SIZE_LIMITS.IMAGE_MB,
          validation.requireSquare || false,
          validation.minDimensions || { width: 200, height: 200 },
        )
      : getDocumentSizeLimitsText(maxSizeMB || FILE_SIZE_LIMITS.DOCUMENT_MB);

  const acceptTypes =
    fileType === "image"
      ? ACCEPTED_IMAGE_EXTENSIONS
      : ACCEPTED_DOCUMENT_EXTENSIONS_STRING;

  return {
    sizeClass: SIZE_CLASSES[size],
    helpText,
    acceptTypes,
  };
}

/**
 * FileUpload - Flexible file upload component with preview support.
 *
 * Supports three size variants with different layouts and behaviors:
 *
 * **Size Variants**:
 * - `sm` (Small): 80×80px profile photo with compact layout
 * - `md` (Medium): 128×128px logo with side-by-side layout
 * - `lg` (Large): 384×384px cover image with full drag-and-drop overlay
 *
 * **Operating Modes**:
 * 1. **Single Image Mode**: Upload and preview a single image (cover, logo, profile)
 * 2. **Multi-Document Mode**: Upload multiple documents with list view
 *
 * **Features**:
 * - Drag-and-drop support with visual feedback
 * - File type validation (MIME type checking via backend)
 * - Size limit enforcement with user-friendly errors
 * - Real-time upload progress tracking with percentage display
 * - Image preview generation for visual files
 * - Document download for PDFs and non-image files
 * - Comprehensive error handling with toast notifications
 * - Accessibility: Full keyboard navigation and screen reader support
 *
 * @example
 * ```tsx
 * // Large cover image for pool
 * <FileUpload
 *   value={pool.coverImagePath}
 *   onChange={(path) => updatePool({ coverImagePath: path })}
 *   label="Cover Image"
 *   fileType="image"
 *   subType="cover_image"
 *   validation={{
 *     minDimensions: { width: 1200, height: 630 },
 *     maxSizeMB: 5,
 *     requireSquare: false
 *   }}
 *   size="lg"
 *   className="mb-6"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Medium company logo with transparency
 * <FileUpload
 *   value={company.logoPath}
 *   onChange={(path) => updateCompany({ logoPath: path })}
 *   label="Company Logo"
 *   fileType="image"
 *   subType="logo"
 *   validation={{
 *     requireSquare: true,
 *     minDimensions: { width: 400, height: 400 },
 *     maxSizeMB: 2
 *   }}
 *   size="md"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Small team member profile photo
 * <FileUpload
 *   value={member.photoPath}
 *   onChange={(path) => updateMember({ photoPath: path })}
 *   label="Profile Photo"
 *   fileType="image"
 *   subType="profile_photo"
 *   validation={{ requireSquare: true, maxSizeMB: 1 }}
 *   size="sm"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Multi-document upload for pool documents
 * <FileUpload
 *   label="Pool Documents"
 *   fileType="document"
 *   subType="pool_document"
 *   maxSizeMB={10}
 *   documents={pool.documents}
 *   onAddDocument={(doc) => addDocument(doc)}
 *   onRemoveDocument={(index) => removeDocument(index)}
 * />
 * ```
 *
 * @remarks
 * **Dual-Mode Operation**:
 * The component automatically switches between two rendering modes:
 * 1. **Single Image Mode**: When `value` and `onChange` are provided
 * 2. **Multi-Document Mode**: When `documents`, `onAddDocument`, and `onRemoveDocument` are provided
 *
 * **Environment-Aware Storage**:
 * - Production: Google Cloud Storage (GCS) with authenticated URLs
 * - Development: Local filesystem (`/uploads` directory)
 *
 * **Security Features**:
 * - MIME type validation (not just extension checking) performed on backend
 * - Path traversal prevention (filename sanitization)
 * - Size limit enforcement before upload starts
 * - Rate limiting on backend to prevent abuse
 * - Secure file URLs with authentication headers in production
 *
 * **Supported File Types**:
 * - Images: JPEG, PNG, WebP, AVIF, GIF
 * - Documents: PDF
 *
 * **Upload Process**:
 * 1. User selects file via click or drag-and-drop
 * 2. Client-side size validation
 * 3. Upload to backend with progress tracking
 * 4. Backend validates MIME type and saves to storage
 * 5. Backend returns file path
 * 6. `onChange` or `onAddDocument` called with path
 * 7. Component fetches and displays preview
 *
 * **Error Handling**:
 * - File too large: Toast with size limit
 * - Invalid file type: Toast with accepted types
 * - Network error: Toast with retry suggestion
 * - Post-upload processing error: Toast with recovery instructions
 *
 * **Accessibility**:
 * - `aria-label` on all interactive elements
 * - `aria-live` regions for upload progress announcements
 * - Full keyboard navigation support (Tab, Enter, Space)
 * - Screen reader announcements for state changes
 * - Focus management during upload
 *
 * **Performance**:
 * - Component wrapped in `React.memo` to prevent unnecessary re-renders
 * - Image URLs fetched on-demand via `useImageUrl` and `useDocumentUrl` hooks
 * - File input value cleared after upload to allow re-uploading same file
 *
 * @param props - Component props
 * @returns Rendered file upload component
 *
 * @see {@link ImageUploadLayout} for unified image upload layout
 * @see {@link useFileUpload} for upload logic hook
 * @see {@link useImageUrl} for image URL fetching
 * @see {@link useDocumentUrl} for document URL fetching
 */
export const FileUpload = memo(function FileUpload({
  value,
  onChange,
  label,
  fileType,
  subType,
  validation = {},
  maxSizeMB,
  className = "",
  size = "md",
  documents,
  onAddDocument,
  onRemoveDocument,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { url: fileUrl, isLoadingUrl } =
    fileType === "image" ? useImageUrl(value) : useDocumentUrl(value);

  const uploadOptions: UseFileUploadOptions = {
    fileType,
    subType,
    validation,
    maxSizeMB,
  };

  const {
    mutate: uploadFile,
    isPending: isUploading,
    uploadProgress,
  } = useFileUpload(uploadOptions);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadFile(file, {
      onSuccess: (result) => {
        try {
          if (fileType === "document" && onAddDocument) {
            onAddDocument({ title: file.name, path: result.path });
          } else if (onChange) {
            onChange(result.path);
          }
        } catch (error) {
          logger.error("Post-upload processing failed", error, {
            fileName: file.name,
            fileType,
            subType,
            uploadedPath: result.path,
            handlerType: fileType === "document" ? "onAddDocument" : "onChange",
          });
          toast.error(
            "File uploaded successfully, but failed to update the form. Please refresh the page.",
            { duration: 8000 },
          );
          logger.info("Uploaded file path for manual recovery", {
            path: result.path,
          });
        }
      },
      onSettled: () => {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    });
  }

  const config = getUploadConfig(fileType, size, validation, maxSizeMB);
  const { sizeClass: imageSize, helpText, acceptTypes } = config;

  function handleRemove(): void {
    onChange?.("");
  }

  // Common props shared by all layout components
  const layoutProps = {
    value,
    fileUrl,
    isLoadingUrl,
    label,
    imageSize,
    isUploading,
    uploadProgress,
    acceptTypes,
    onRemove: handleRemove,
    onChange: handleFileChange,
    fileInputRef,
  };

  // Document list rendering
  if (fileType === "document" && documents && onRemoveDocument) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="block text-sm font-medium text-default-700">
          {label}
        </div>

        <div className="flex flex-wrap gap-2">
          {documents.map((doc, index) => (
            <DocumentItem
              key={index}
              document={doc}
              onRemove={() => onRemoveDocument(index)}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-default-500">
            <FileText size={14} />
            <span>{helpText}</span>
          </div>

          <Button
            as="label"
            color="primary"
            variant="solid"
            startContent={<Plus size={16} />}
            isLoading={isUploading}
            className="flex w-max flex-row items-center text-sm font-medium gap-4 py-2 px-4 rounded-lg"
          >
            {isUploading ? `Uploading… ${uploadProgress.percentage}%` : label}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept={acceptTypes}
              disabled={isUploading}
              aria-label={`Upload document for ${label}`}
            />
          </Button>
        </div>
      </div>
    );
  }

  // Single file (image) rendering
  // Determine shape and layout based on size
  const shape = size === "sm" ? "circle" : "rounded";
  const layout = size === "sm" ? "stacked" : "inline";

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <div className="block text-sm font-medium text-default-700">
          {label}
        </div>
      )}

      <ImageUploadLayout
        {...layoutProps}
        helpText={helpText}
        size={size}
        shape={shape}
        layout={layout}
      />
    </div>
  );
});
