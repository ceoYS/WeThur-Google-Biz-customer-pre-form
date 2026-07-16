const MAX_FILE_BYTES = 15 * 1024 * 1024;

const fileTypes = {
  ".jpg": { mime: "image/jpeg", signature: isJpeg },
  ".jpeg": { mime: "image/jpeg", signature: isJpeg },
  ".png": { mime: "image/png", signature: isPng },
  ".webp": { mime: "image/webp", signature: isWebp },
  ".pdf": { mime: "application/pdf", signature: isPdf },
} as const;

export type AllowedEvidenceMime =
  (typeof fileTypes)[keyof typeof fileTypes]["mime"];

export type ValidatedEvidenceFile = {
  originalFilename: string;
  storageFilename: string;
  mimeType: AllowedEvidenceMime;
  sizeBytes: number;
};

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileValidationError";
  }
}

export function validateEvidenceFile(input: {
  name: string;
  declaredMime: string;
  sizeBytes: number;
  firstBytes: Uint8Array;
}): ValidatedEvidenceFile {
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_FILE_BYTES) {
    throw new FileValidationError("파일은 15 MB 이하만 업로드할 수 있습니다.");
  }

  const originalFilename = sanitizeOriginalFilename(input.name);
  const extension = getExtension(originalFilename);
  const specification = fileTypes[extension as keyof typeof fileTypes];
  if (!specification || input.declaredMime !== specification.mime) {
    throw new FileValidationError(
      "JPG, PNG, WebP 또는 PDF 파일만 업로드할 수 있습니다.",
    );
  }
  if (!specification.signature(input.firstBytes)) {
    throw new FileValidationError("파일 형식과 실제 내용이 일치하지 않습니다.");
  }

  const base = originalFilename.slice(0, -extension.length);
  const asciiBase = base
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return {
    originalFilename,
    storageFilename: `${asciiBase || "evidence"}${extension}`,
    mimeType: specification.mime,
    sizeBytes: input.sizeBytes,
  };
}

export function sanitizeOriginalFilename(name: string): string {
  const leaf = name.split(/[\\/]/).pop() ?? "";
  const sanitized = leaf
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 200);
  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new FileValidationError("파일 이름을 확인해주세요.");
  }
  return sanitized;
}

function getExtension(name: string): string {
  const position = name.lastIndexOf(".");
  return position >= 0 ? name.slice(position).toLowerCase() : "";
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes: Uint8Array): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return signature.every((byte, index) => bytes[index] === byte);
}

function isWebp(bytes: Uint8Array): boolean {
  return (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}

function isPdf(bytes: Uint8Array): boolean {
  return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
}
