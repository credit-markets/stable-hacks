import { vi } from "vitest";

/**
 * Creates a mock File object for testing file uploads.
 *
 * @param name - File name
 * @param type - MIME type (e.g., 'application/pdf', 'image/png')
 * @param size - File size in bytes
 * @returns A mock File object
 *
 * @example
 * const pdfFile = createMockFile('test.pdf', 'application/pdf', 1024);
 */
export function createMockFile(name: string, type: string, size: number): File {
  const blob = new Blob(["x".repeat(size)], { type });
  return new File([blob], name, { type });
}

/**
 * Pre-configured mock files for common test scenarios.
 */
export const MOCK_FILES = {
  // PDF files
  PDF_SMALL: createMockFile("document.pdf", "application/pdf", 1024), // 1KB
  PDF_LARGE: createMockFile(
    "large-doc.pdf",
    "application/pdf",
    5 * 1024 * 1024,
  ), // 5MB
  PDF_TOO_LARGE: createMockFile(
    "huge-doc.pdf",
    "application/pdf",
    15 * 1024 * 1024,
  ), // 15MB (exceeds typical 10MB limit)

  // Image files
  IMAGE_PNG: createMockFile("logo.png", "image/png", 50 * 1024), // 50KB
  IMAGE_JPG: createMockFile("photo.jpg", "image/jpeg", 100 * 1024), // 100KB
  IMAGE_SVG: createMockFile("icon.svg", "image/svg+xml", 5 * 1024), // 5KB

  // Invalid files
  INVALID_TYPE: createMockFile("script.exe", "application/x-msdownload", 1024),
  INVALID_EXTENSION: createMockFile(
    "file.xyz",
    "application/octet-stream",
    1024,
  ),

  // Edge cases
  EMPTY_FILE: createMockFile("empty.pdf", "application/pdf", 0),
  NO_EXTENSION: createMockFile("file", "application/pdf", 1024),
} as const;

/**
 * Mocks the global Image constructor for testing image loading.
 * Useful when testing components that preload images.
 *
 * @param width - Mock image width
 * @param height - Mock image height
 * @returns Cleanup function to restore the original Image constructor
 *
 * @example
 * beforeEach(() => {
 *   mockImageAPI(100, 100);
 * });
 */
export function mockImageAPI(width: number, height: number): () => void {
  const originalImage = global.Image;

  class MockImage {
    onload: (() => void) | null = null;
    onerror: ((error: Error) => void) | null = null;
    src = "";
    width = width;
    height = height;

    constructor() {
      setTimeout(() => {
        if (this.onload) {
          this.onload();
        }
      }, 0);
    }
  }

  (global as any).Image = MockImage;

  // Return cleanup function
  return () => {
    global.Image = originalImage;
  };
}

/**
 * Mocks the FileReader API for testing file reading operations.
 * Simulates successful file reading with a mock result.
 *
 * @param mockResult - The result to return when reading a file (default: base64 data URL)
 * @returns Cleanup function to restore the original FileReader
 *
 * @example
 * beforeEach(() => {
 *   const cleanup = mockFileReader('data:image/png;base64,iVBORw0KG...');
 *   return cleanup;
 * });
 */
export function mockFileReader(
  mockResult = "data:application/pdf;base64,JVBERi0xLjQK",
): () => void {
  const originalFileReader = global.FileReader;

  class MockFileReader {
    onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
    onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
    onprogress: ((event: ProgressEvent<FileReader>) => void) | null = null;
    result: string | ArrayBuffer | null = null;
    error: DOMException | null = null;
    readyState = 0;

    EMPTY = 0 as const;
    LOADING = 1 as const;
    DONE = 2 as const;

    readAsDataURL(_blob: Blob): void {
      this.readyState = this.LOADING;
      setTimeout(() => {
        this.result = mockResult;
        this.readyState = this.DONE;
        if (this.onload) {
          this.onload({
            target: this,
          } as unknown as ProgressEvent<FileReader>);
        }
      }, 0);
    }

    readAsText(_blob: Blob): void {
      this.readyState = this.LOADING;
      setTimeout(() => {
        this.result = "mock file content";
        this.readyState = this.DONE;
        if (this.onload) {
          this.onload({
            target: this,
          } as unknown as ProgressEvent<FileReader>);
        }
      }, 0);
    }

    readAsArrayBuffer(_blob: Blob): void {
      this.readyState = this.LOADING;
      setTimeout(() => {
        this.result = new ArrayBuffer(8);
        this.readyState = this.DONE;
        if (this.onload) {
          this.onload({
            target: this,
          } as unknown as ProgressEvent<FileReader>);
        }
      }, 0);
    }

    abort(): void {
      this.readyState = this.DONE;
    }

    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    dispatchEvent = vi.fn(() => true);
  }

  (global as any).FileReader = MockFileReader;

  // Return cleanup function
  return () => {
    global.FileReader = originalFileReader;
  };
}
