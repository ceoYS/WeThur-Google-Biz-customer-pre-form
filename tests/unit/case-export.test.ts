import { describe, expect, it } from "vitest";

import { buildCaseJsonExport, recordsToCsv } from "@/lib/case-export";
import type { CaseWorkspace } from "@/lib/case-workspace";

describe("case exports", () => {
  it("neutralizes spreadsheet formula cells", () => {
    const csv = recordsToCsv([{ value: '=HYPERLINK("bad")' }]);
    expect(csv).toContain("'=HYPERLINK");
  });

  it("omits case UUIDs and evidence associations from JSON", () => {
    const workspace = {
      case: { id: "case-uuid", case_code: "WTH-TEST" },
      moduleTitles: [],
      currentBusiness: null,
      historySummary: null,
      historyEvents: [],
      profiles: [],
      thirdParties: [],
      evidence: [
        {
          id: "evidence-id",
          history_event_id: "history-id",
          current_profile_candidate_id: null,
          original_filename: "safe.png",
        },
      ],
      diagnosis: null,
      facts: [],
      followUps: [],
      notes: [],
      activity: [],
    } as unknown as CaseWorkspace;
    const exported = JSON.stringify(buildCaseJsonExport(workspace));
    expect(exported).not.toContain("case-uuid");
    expect(exported).not.toContain("evidence-id");
    expect(exported).not.toContain("history-id");
    expect(exported).toContain("safe.png");
  });
});
