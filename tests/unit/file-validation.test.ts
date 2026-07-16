import { describe, expect, it } from "vitest";

import {
  FileValidationError,
  sanitizeOriginalFilename,
  validateEvidenceFile,
} from "@/lib/file-validation";

describe("evidence filename and signature validation", () => {
  it("accepts a matching PNG and creates an ASCII storage filename", () => {
    const result = validateEvidenceFile({
      name: "../강남 간판 사진.png",
      declaredMime: "image/png",
      sizeBytes: 512,
      firstBytes: new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]),
    });
    expect(result.originalFilename).toBe("강남 간판 사진.png");
    expect(result.storageFilename).toBe("evidence.png");
  });

  it("rejects extension, MIME, and signature mismatches", () => {
    expect(() =>
      validateEvidenceFile({
        name: "document.pdf",
        declaredMime: "application/pdf",
        sizeBytes: 100,
        firstBytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      }),
    ).toThrow(FileValidationError);
    expect(() =>
      validateEvidenceFile({
        name: "image.exe",
        declaredMime: "application/octet-stream",
        sizeBytes: 100,
        firstBytes: new Uint8Array([0x4d, 0x5a]),
      }),
    ).toThrow(FileValidationError);
  });

  it("enforces the file size and strips path/control characters", () => {
    expect(sanitizeOriginalFilename("C:\\fakepath\\safe\u0000name.jpg")).toBe(
      "safename.jpg",
    );
    expect(() =>
      validateEvidenceFile({
        name: "large.jpg",
        declaredMime: "image/jpeg",
        sizeBytes: 15 * 1024 * 1024 + 1,
        firstBytes: new Uint8Array([0xff, 0xd8, 0xff]),
      }),
    ).toThrow("15 MB");
  });
});
