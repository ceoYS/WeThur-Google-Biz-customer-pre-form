import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Regression guard for the Next.js Server Action export contract.
 *
 * A file whose FIRST statement is the `"use server"` directive may only export
 * async functions. Exporting a runtime value (object, array, const, class,
 * default object) throws at module evaluation:
 *
 *   A "use server" file can only export async functions, found object.
 *
 * `initialLoginActionState` (an object) once lived in `admin/login/actions.ts`
 * and triggered exactly that error. This test walks every file-level
 * `"use server"` module and asserts it exports nothing but async functions.
 * Type-only exports (`export type` / `export interface`) are compile-time and
 * therefore allowed.
 */
const srcRoot = fileURLToPath(new URL("../../src", import.meta.url));

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function isFileLevelUseServer(source: string): boolean {
  // The directive must be the first non-empty, non-comment line of the file.
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("//")) continue;
    return /^["']use server["'];?$/.test(line);
  }
  return false;
}

const useServerFiles = collectSourceFiles(srcRoot).filter((file) =>
  isFileLevelUseServer(readFileSync(file, "utf8")),
);

describe('"use server" export contract', () => {
  it("finds the known Server Action module (guards the walker itself)", () => {
    expect(
      useServerFiles.some((file) => file.endsWith("admin/login/actions.ts")),
    ).toBe(true);
  });

  it("exports only async functions from every use-server module", () => {
    const offenders: string[] = [];

    for (const file of useServerFiles) {
      const source = readFileSync(file, "utf8");
      const lines = source.split(/\r?\n/);

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        // Type-only exports are erased at compile time; ignore them.
        if (/^export\s+(type|interface)\b/.test(trimmed)) return;

        const runtimeValueExport =
          /^export\s+(const|let|var|class|enum)\b/.test(trimmed) ||
          // `export default <expr>` and non-async `export function`.
          /^export\s+default\b/.test(trimmed) ||
          /^export\s+function\b/.test(trimmed);

        if (runtimeValueExport) {
          offenders.push(`${file}:${index + 1}: ${trimmed}`);
        }
      });
    }

    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
