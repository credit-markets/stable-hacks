import {
  MOCK_FILES,
  createMockFile,
  mockImageAPI,
} from "@/__tests__/fixtures/file.fixtures";
import { toast } from "react-hot-toast";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type DocumentValidationOptions,
  type ImageValidationOptions,
  getDocumentSizeLimitsText,
  getImageSizeLimitsText,
  validateCoverImage,
  validateDocument,
  validateImage,
  validateManagerImage,
  validatePoolImage,
} from "../../../utils/fileValidation";

// Mock toast
vi.mock("react-hot-toast", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("validateImage", () => {
  let cleanupImageAPI: (() => void) | undefined;

  afterEach(() => {
    if (cleanupImageAPI) {
      cleanupImageAPI();
      cleanupImageAPI = undefined;
    }
    vi.clearAllMocks();
  });

  describe("MIME type validation", () => {
    it("should validate valid JPEG image", async () => {
      cleanupImageAPI = mockImageAPI(300, 300);
      const file = MOCK_FILES.IMAGE_JPG;
      const result = await validateImage(file, {
        maxSizeMB: 5,
        allowedTypes: ["image/jpeg"],
      });
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should validate valid PNG image", async () => {
      cleanupImageAPI = mockImageAPI(300, 300);
      const file = MOCK_FILES.IMAGE_PNG;
      const result = await validateImage(file, {
        maxSizeMB: 5,
        allowedTypes: ["image/png"],
      });
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should validate WebP image when allowed", async () => {
      cleanupImageAPI = mockImageAPI(300, 300);
      const file = createMockFile("test.webp", "image/webp", 50 * 1024);
      const result = await validateImage(file, {
        allowedTypes: ["image/webp"],
      });
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should validate GIF image when allowed", async () => {
      cleanupImageAPI = mockImageAPI(300, 300);
      const file = createMockFile("test.gif", "image/gif", 50 * 1024);
      const result = await validateImage(file, {
        allowedTypes: ["image/gif"],
      });
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should reject invalid MIME type", async () => {
      const file = MOCK_FILES.INVALID_TYPE;
      const result = await validateImage(file, {
        allowedTypes: ["image/jpeg", "image/png"],
      });
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Please upload"),
      );
    });

    it("should reject SVG when not in allowed types", async () => {
      const file = MOCK_FILES.IMAGE_SVG;
      const result = await validateImage(file, {
        allowedTypes: ["image/jpeg", "image/png"],
      });
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Please upload JPEG, PNG images only"),
      );
    });
  });

  describe("file size validation", () => {
    it("should accept file under size limit", async () => {
      cleanupImageAPI = mockImageAPI(300, 300);
      const file = MOCK_FILES.IMAGE_PNG; // 50KB
      const result = await validateImage(file, {
        maxSizeMB: 5,
      });
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should reject file exceeding size limit", async () => {
      const file = createMockFile("large.png", "image/png", 6 * 1024 * 1024); // 6MB
      const result = await validateImage(file, {
        maxSizeMB: 5,
      });
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Image size must be less than 5MB"),
      );
    });

    it("should display actual file size in error message", async () => {
      const file = createMockFile("huge.png", "image/png", 7 * 1024 * 1024); // 7MB
      const result = await validateImage(file, {
        maxSizeMB: 5,
      });
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("7.00MB"),
      );
    });

    it("should reject empty file", async () => {
      const file = MOCK_FILES.EMPTY_FILE;
      // Empty file will fail to load as an image
      cleanupImageAPI = mockImageAPI(0, 0);
      const result = await validateImage(file, {
        maxSizeMB: 5,
        minDimensions: { width: 1, height: 1 },
      });
      expect(result).toBe(false); // Empty file fails dimension check
    });
  });

  describe("dimension validation", () => {
    it("should accept image with sufficient dimensions", async () => {
      cleanupImageAPI = mockImageAPI(300, 300);
      const file = MOCK_FILES.IMAGE_PNG;
      const result = await validateImage(file, {
        minDimensions: { width: 200, height: 200 },
      });
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should reject image below minimum width", async () => {
      cleanupImageAPI = mockImageAPI(150, 300);
      const file = MOCK_FILES.IMAGE_PNG;
      const result = await validateImage(file, {
        minDimensions: { width: 200, height: 200 },
      });
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Image must be at least 200x200 pixels"),
      );
    });

    it("should reject image below minimum height", async () => {
      cleanupImageAPI = mockImageAPI(300, 150);
      const file = MOCK_FILES.IMAGE_PNG;
      const result = await validateImage(file, {
        minDimensions: { width: 200, height: 200 },
      });
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Image must be at least 200x200 pixels"),
      );
    });

    it("should use default minimum dimensions if not specified", async () => {
      // validateImage has default minDimensions of 200x200, so it will load image
      cleanupImageAPI = mockImageAPI(250, 250);
      const file = MOCK_FILES.IMAGE_PNG;
      const result = await validateImage(file, {
        maxSizeMB: 5,
        // minDimensions defaults to { width: 200, height: 200 }
      });
      expect(result).toBe(true);
    });
  });

  describe("square image validation", () => {
    it("should accept perfectly square image", async () => {
      cleanupImageAPI = mockImageAPI(300, 300);
      const file = MOCK_FILES.IMAGE_PNG;
      const result = await validateImage(file, {
        requireSquare: true,
        minDimensions: { width: 200, height: 200 },
      });
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should accept nearly square image within tolerance", async () => {
      cleanupImageAPI = mockImageAPI(300, 295); // ~1.02 aspect ratio
      const file = MOCK_FILES.IMAGE_PNG;
      const result = await validateImage(file, {
        requireSquare: true,
        minDimensions: { width: 200, height: 200 },
      });
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should reject non-square image when square required", async () => {
      cleanupImageAPI = mockImageAPI(400, 200); // 2:1 aspect ratio
      const file = MOCK_FILES.IMAGE_PNG;
      const result = await validateImage(file, {
        requireSquare: true,
      });
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Please upload a square image"),
      );
    });

    it("should accept non-square image when square not required", async () => {
      cleanupImageAPI = mockImageAPI(800, 400); // 2:1 aspect ratio
      const file = MOCK_FILES.IMAGE_PNG;
      const result = await validateImage(file, {
        requireSquare: false,
        minDimensions: { width: 400, height: 200 },
      });
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe("image loading errors", () => {
    it("should handle image loading failure", async () => {
      // Mock image that fails to load
      const originalImage = global.Image;
      class FailingMockImage {
        onload: (() => void) | null = null;
        onerror: ((error: Error) => void) | null = null;
        src = "";
        constructor() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error("Failed to load"));
            }
          }, 0);
        }
      }
      (global as any).Image = FailingMockImage;

      const file = MOCK_FILES.IMAGE_PNG;
      const result = await validateImage(file, {
        minDimensions: { width: 200, height: 200 },
      });

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith("Failed to load image");

      global.Image = originalImage;
    });
  });
});

describe("validateDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MIME type validation", () => {
    it("should validate PDF document", () => {
      const file = MOCK_FILES.PDF_SMALL;
      const result = validateDocument(file, {
        allowedTypes: ["application/pdf"],
      });
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should validate Word documents", () => {
      const docFile = createMockFile(
        "test.doc",
        "application/msword",
        1024 * 1024,
      );
      const result = validateDocument(docFile);
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should validate Excel spreadsheets", () => {
      const xlsFile = createMockFile(
        "test.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        1024 * 1024,
      );
      const result = validateDocument(xlsFile);
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should validate CSV files", () => {
      const csvFile = createMockFile("data.csv", "text/csv", 1024);
      const result = validateDocument(csvFile);
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should reject invalid document types", () => {
      const file = MOCK_FILES.INVALID_TYPE;
      const result = validateDocument(file);
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Please upload PDF, DOC, DOCX"),
      );
    });

    it("should reject executable files", () => {
      const exeFile = createMockFile(
        "malware.exe",
        "application/x-msdownload",
        1024,
      );
      const result = validateDocument(exeFile);
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe("file size validation", () => {
    it("should accept document under size limit", () => {
      const file = MOCK_FILES.PDF_LARGE; // 5MB
      const result = validateDocument(file, {
        maxSizeMB: 20,
      });
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should reject document exceeding size limit", () => {
      const file = MOCK_FILES.PDF_TOO_LARGE; // 15MB
      const result = validateDocument(file, {
        maxSizeMB: 10,
      });
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("File size exceeds 10MB limit"),
      );
    });

    it("should display actual file size in error message", () => {
      const file = MOCK_FILES.PDF_TOO_LARGE; // 15MB
      const result = validateDocument(file, {
        maxSizeMB: 10,
      });
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("15.00MB"),
      );
    });
  });

  describe("default options", () => {
    it("should use default max size of 20MB", () => {
      const file = MOCK_FILES.PDF_TOO_LARGE; // 15MB
      const result = validateDocument(file); // No options
      expect(result).toBe(true); // 15MB < 20MB default
    });

    it("should use default allowed types", () => {
      const pdfFile = MOCK_FILES.PDF_SMALL;
      const result = validateDocument(pdfFile); // No options
      expect(result).toBe(true);
    });
  });
});

describe("specific validation functions", () => {
  let cleanupImageAPI: (() => void) | undefined;

  afterEach(() => {
    if (cleanupImageAPI) {
      cleanupImageAPI();
      cleanupImageAPI = undefined;
    }
    vi.clearAllMocks();
  });

  describe("validateManagerImage", () => {
    it("should validate square manager logo", async () => {
      cleanupImageAPI = mockImageAPI(300, 300);
      const file = MOCK_FILES.IMAGE_PNG;
      const result = await validateManagerImage(file);
      expect(result).toBe(true);
    });

    it("should reject non-square manager logo", async () => {
      cleanupImageAPI = mockImageAPI(400, 200);
      const file = MOCK_FILES.IMAGE_PNG;
      const result = await validateManagerImage(file);
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("square image"),
      );
    });

    it("should reject GIF for manager logo", async () => {
      const gifFile = createMockFile("logo.gif", "image/gif", 50 * 1024);
      const result = await validateManagerImage(gifFile);
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe("validatePoolImage", () => {
    it("should validate pool logo without square requirement", async () => {
      cleanupImageAPI = mockImageAPI(400, 300);
      const file = MOCK_FILES.IMAGE_PNG;
      const result = await validatePoolImage(file);
      expect(result).toBe(true);
    });

    it("should accept GIF for pool image", async () => {
      cleanupImageAPI = mockImageAPI(300, 300);
      const gifFile = createMockFile("pool.gif", "image/gif", 50 * 1024);
      const result = await validatePoolImage(gifFile);
      expect(result).toBe(true);
    });
  });

  describe("validateCoverImage", () => {
    it("should validate wide cover image", async () => {
      cleanupImageAPI = mockImageAPI(800, 400);
      const file = MOCK_FILES.IMAGE_PNG;
      const result = await validateCoverImage(file);
      expect(result).toBe(true);
    });

    it("should reject cover image below minimum dimensions", async () => {
      cleanupImageAPI = mockImageAPI(300, 150);
      const file = MOCK_FILES.IMAGE_PNG;
      const result = await validateCoverImage(file);
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("400x200 pixels"),
      );
    });
  });
});

describe("helper text functions", () => {
  describe("getImageSizeLimitsText", () => {
    it("should return correct text for square images", () => {
      const text = getImageSizeLimitsText(5, true, { width: 200, height: 200 });
      expect(text).toContain("Square image (1:1)");
      expect(text).toContain("Max 5MB");
      expect(text).toContain("Min 200x200px");
    });

    it("should return correct text for non-square images", () => {
      const text = getImageSizeLimitsText(5, false, {
        width: 400,
        height: 200,
      });
      expect(text).toContain("Any aspect ratio");
      expect(text).toContain("Max 5MB");
      expect(text).toContain("Min 400x200px");
    });

    it("should use default values", () => {
      const text = getImageSizeLimitsText();
      expect(text).toContain("Any aspect ratio");
      expect(text).toContain("Max 5MB");
      expect(text).toContain("Min 200x200px");
    });
  });

  describe("getDocumentSizeLimitsText", () => {
    it("should return correct text for documents", () => {
      const text = getDocumentSizeLimitsText(20);
      expect(text).toContain("PDF, DOC, DOCX");
      expect(text).toContain("Max 20MB");
    });

    it("should use default value of 20MB", () => {
      const text = getDocumentSizeLimitsText();
      expect(text).toContain("Max 20MB");
    });
  });
});
