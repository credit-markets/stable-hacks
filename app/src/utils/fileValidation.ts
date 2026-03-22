import { toast } from "react-hot-toast";

export interface ImageValidationOptions {
  maxSizeMB?: number;
  requireSquare?: boolean;
  minDimensions?: {
    width: number;
    height: number;
  };
  allowedTypes?: readonly string[];
}

export interface DocumentValidationOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
}

/**
 * Validates an image file based on the provided options
 */
export const validateImage = (
  file: File,
  options: ImageValidationOptions = {},
): Promise<boolean> => {
  const {
    maxSizeMB = 5,
    requireSquare = false,
    minDimensions = { width: 200, height: 200 },
    allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"],
  } = options;

  return new Promise((resolve) => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      const typesList = allowedTypes
        .map((type) => type.replace("image/", "").toUpperCase())
        .join(", ");
      toast.error(`Please upload ${typesList} images only`);
      resolve(false);
      return;
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(
        `Image size must be less than ${maxSizeMB}MB (${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
      );
      resolve(false);
      return;
    }

    // If dimension validation is needed, load the image
    if (requireSquare || minDimensions) {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        // Clean up the object URL to prevent memory leak
        URL.revokeObjectURL(objectUrl);

        // Check minimum dimensions
        if (
          img.width < minDimensions.width ||
          img.height < minDimensions.height
        ) {
          toast.error(
            `Image must be at least ${minDimensions.width}x${minDimensions.height} pixels`,
          );
          resolve(false);
          return;
        }

        // Check if image is square (allowing small tolerance)
        if (requireSquare) {
          const aspectRatio = img.width / img.height;
          const isSquare = aspectRatio >= 0.95 && aspectRatio <= 1.05;

          if (!isSquare) {
            toast.error("Please upload a square image (1:1 aspect ratio)");
            resolve(false);
            return;
          }
        }

        resolve(true);
      };

      img.onerror = () => {
        // Clean up the object URL on error as well
        URL.revokeObjectURL(objectUrl);
        toast.error("Failed to load image");
        resolve(false);
      };

      img.src = objectUrl;
    } else {
      // No dimension validation needed, file is valid
      resolve(true);
    }
  });
};

/**
 * Validates a document file based on the provided options
 */
export const validateDocument = (
  file: File,
  options: DocumentValidationOptions = {},
): boolean => {
  const {
    maxSizeMB = 20,
    allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
    ],
  } = options;

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    toast.error(
      "Please upload PDF, DOC, DOCX, XLS, XLSX, TXT, or CSV files only",
    );
    return false;
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    toast.error(
      `File size exceeds ${maxSizeMB}MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
    );
    return false;
  }

  return true;
};

/**
 * Specific validation for manager images (square requirement)
 */
export const validateManagerImage = (file: File): Promise<boolean> => {
  return validateImage(file, {
    maxSizeMB: 5,
    requireSquare: true,
    minDimensions: { width: 200, height: 200 },
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  });
};

/**
 * Specific validation for pool images (no square requirement)
 */
export const validatePoolImage = (file: File): Promise<boolean> => {
  return validateImage(file, {
    maxSizeMB: 5,
    requireSquare: false,
    minDimensions: { width: 200, height: 200 },
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });
};

/**
 * Specific validation for cover images (no square requirement, larger allowed)
 */
export const validateCoverImage = (file: File): Promise<boolean> => {
  return validateImage(file, {
    maxSizeMB: 5,
    requireSquare: false,
    minDimensions: { width: 400, height: 200 },
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });
};

/**
 * Get user-friendly file size limits text
 */
export const getImageSizeLimitsText = (
  maxSizeMB = 5,
  requireSquare = false,
  minDimensions = { width: 200, height: 200 },
): string => {
  const aspectText = requireSquare ? "Square image (1:1)" : "Any aspect ratio";
  return `${aspectText} • PNG, JPG, WebP • Max ${maxSizeMB}MB • Min ${minDimensions.width}x${minDimensions.height}px`;
};

export const getDocumentSizeLimitsText = (maxSizeMB = 20): string => {
  return `PDF, DOC, DOCX, XLS, XLSX, TXT, CSV • Max ${maxSizeMB}MB`;
};
