import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Regression guard for the Korean hero typography fix.
 *
 * The homepage renders as a Server Component, so instead of mounting it we
 * assert on the source that every Korean heading which forces a manual line
 * break (`<br />`) also opts into `break-keep` (word-break: keep-all). Without
 * it, CJK text breaks between arbitrary syllables ("만들지" -> "만" / "들지"),
 * which is the exact defect this test protects against.
 */
const pagePath = fileURLToPath(
  new URL("../../src/app/page.tsx", import.meta.url),
);
const source = readFileSync(pagePath, "utf8");

describe("homepage hero typography", () => {
  it("keeps the primary hero heading from breaking mid-syllable", () => {
    const hero = source.match(/<h1[^>]*className="([^"]*)"/);
    expect(hero, "hero <h1> should exist").not.toBeNull();
    const className = hero![1];
    expect(className).toContain("break-keep");
    expect(className).toContain("text-balance");
  });

  it("does not let the hero heading grow to the original oversized clamp", () => {
    // The 120px (7.5rem) maximum caused the narrow grid column to wrap the
    // title into five mid-syllable lines. Guard against reintroducing it.
    expect(source).not.toContain("clamp(3rem,8vw,7.5rem)");
  });

  it("applies keep-all to every Korean heading that uses a manual <br />", () => {
    const headings = source.match(/<h[12][^>]*>[\s\S]*?<\/h[12]>/g) ?? [];
    const brokenHeadings = headings.filter(
      (heading) =>
        /<br\s*\/>/.test(heading) &&
        /[가-힣]/.test(heading) &&
        !/break-keep/.test(heading),
    );
    expect(brokenHeadings).toEqual([]);
  });
});
