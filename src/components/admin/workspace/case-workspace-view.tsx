import { DiagnosisControls } from "@/components/admin/workspace/diagnosis-controls";
import { EvidenceList } from "@/components/admin/workspace/evidence-list";
import { FactReviewList } from "@/components/admin/workspace/fact-review-list";
import { FollowUpWorkspace } from "@/components/admin/workspace/follow-up-workspace";
import { ProfileComparisonMatrix } from "@/components/admin/workspace/profile-comparison-matrix";
import { TimelineWorkspace } from "@/components/admin/workspace/timeline-workspace";
import type { CaseWorkspace } from "@/lib/case-workspace";

export const workspaceTabs = [
  ["summary", "사건 요약"],
  ["current-business", "현재 사업장"],
  ["history", "과거 이력"],
  ["profiles", "현재 프로필 비교"],
  ["third-parties", "계정·대행사 이력"],
  ["diagnosis", "원인 가설"],
  ["evidence", "증빙 자료"],
  ["missing", "부족한 정보"],
  ["follow-ups", "고객 추가 질문"],
  ["next-path", "다음 경로 결정"],
  ["activity", "진행 기록"],
  ["export", "내보내기"],
] as const;

export type WorkspaceTab = (typeof workspaceTabs)[number][0];

export function isWorkspaceTab(
  value: string | undefined,
): value is WorkspaceTab {
  return workspaceTabs.some(([key]) => key === value);
}

export function CaseWorkspaceView({
  workspace,
  tab,
}: {
  workspace: CaseWorkspace;
  tab: WorkspaceTab;
}) {
  switch (tab) {
    case "current-business":
      return <CurrentBusinessTab workspace={workspace} />;
    case "history":
      return <HistoryTab workspace={workspace} />;
    case "profiles":
      return <ProfilesTab workspace={workspace} />;
    case "third-parties":
      return <ThirdPartiesTab workspace={workspace} />;
    case "diagnosis":
      return <DiagnosisTab workspace={workspace} />;
    case "evidence":
      return <EvidenceTab workspace={workspace} />;
    case "missing":
      return <MissingTab workspace={workspace} />;
    case "follow-ups":
      return <FollowUpsTab workspace={workspace} />;
    case "next-path":
      return <NextPathTab workspace={workspace} />;
    case "activity":
      return <ActivityTab workspace={workspace} />;
    case "export":
      return <ExportTab workspace={workspace} />;
    default:
      return <SummaryTab workspace={workspace} />;
  }
}

function SummaryTab({ workspace }: { workspace: CaseWorkspace }) {
  const current = workspace.currentBusiness;
  const history = workspace.historySummary;
  const missing = asRecordArray(workspace.diagnosis?.missing_information);
  return (
    <div>
      <SectionHeading
        eyebrow="Operational summary"
        title="사건 요약"
        description="고객 답변을 실제 검토에 필요한 구조로 압축한 화면입니다."
      />
      <div className="grid gap-px bg-[var(--navy-300)] sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="과거 등록 시도"
          value={history?.creation_attempt_count ?? "미확인"}
        />
        <Metric
          label="정지·사라짐"
          value={history?.suspension_count ?? "미확인"}
        />
        <Metric label="현재 프로필 후보" value={workspace.profiles.length} />
        <Metric label="증빙 자료" value={workspace.evidence.length} />
      </div>
      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <KeyValueList
          title="현재 공식 정보"
          items={[
            ["권한 상태", current?.authority_status],
            ["상시 간판명", current?.sign_name],
            ["사업자등록 상호", current?.registration_name],
            ["영업허가명", current?.permit_name],
            ["주소", current?.official_address],
            ["층 구조", current?.floor_structure],
            ["공식 전화", current?.official_phone],
            ["공식 웹사이트", current?.official_website],
          ]}
        />
        <KeyValueList
          title="과거 흐름 요약"
          items={[
            ["첫 등록 시기", history?.first_registration_period],
            ["Google 계정 수", history?.account_count],
            ["외부 담당자 수", history?.third_party_count],
            ["이전 계정 접근", history?.old_account_access_status],
            ["이의신청 상태", history?.appeal_status],
            ["대기 중 재등록", history?.recreated_during_appeal],
          ]}
        />
      </div>
      <div className="mt-12">
        <div>
          <h3 className="text-lg font-black">우선 확인할 부족 정보</h3>
          {missing.length ? (
            <ul className="mt-4 space-y-3">
              {missing.slice(0, 5).map((item, index) => (
                <li
                  key={index}
                  className="border-l-2 border-[var(--navy-300)] pl-4 text-sm leading-6"
                >
                  {recordTitle(item)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-[var(--navy-700)]">
              진단 엔진 실행 후 표시됩니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CurrentBusinessTab({ workspace }: { workspace: CaseWorkspace }) {
  const current = workspace.currentBusiness;
  return (
    <div>
      <SectionHeading
        eyebrow="Physical operation"
        title="현재 사업장"
        description="실제 현장과 공식 기준 정보를 함께 확인합니다."
      />
      {current ? (
        <KeyValueList
          title="고객 제출 정보"
          items={Object.entries(current).map(([key, value]) => [
            friendlyKey(key),
            formatUnknown(value),
          ])}
        />
      ) : (
        <Empty text="고객이 현재 사업장 정보를 아직 제출하지 않았습니다." />
      )}
    </div>
  );
}

function HistoryTab({ workspace }: { workspace: CaseWorkspace }) {
  return (
    <div>
      <SectionHeading
        eyebrow="Chronology"
        title="과거 이력"
        description="원본 응답을 보존한 채 시간순으로 정리된 등록 사건입니다."
      />
      <TimelineWorkspace
        key={workspace.historyEvents
          .map((event) => `${event.id}:${event.sort_order}`)
          .join("|")}
        caseId={workspace.case.id}
        initialEvents={workspace.historyEvents}
      />
    </div>
  );
}

function ProfilesTab({ workspace }: { workspace: CaseWorkspace }) {
  return (
    <div>
      <SectionHeading
        eyebrow="Comparison"
        title="현재 프로필 비교"
        description="현재 관련 프로필 후보를 중립적으로 비교합니다."
      />
      <ProfileComparisonMatrix
        current={workspace.currentBusiness}
        historySummary={workspace.historySummary}
        historyEvents={workspace.historyEvents}
        profiles={workspace.profiles}
        evidence={workspace.evidence}
      />
    </div>
  );
}

function ThirdPartiesTab({ workspace }: { workspace: CaseWorkspace }) {
  return (
    <div>
      <SectionHeading
        eyebrow="Access history"
        title="계정·대행사 이력"
        description="책임을 단정하지 않고 역할, 시기, 계정 접근 수준을 구분합니다."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {workspace.thirdParties.map((party) => (
          <article
            key={party.id}
            className="border border-[var(--navy-300)] p-5"
          >
            <p className="text-xs font-bold text-[var(--navy-700)]">
              {party.party_type ?? "유형 미확인"} ·{" "}
              {party.approximate_period ?? "시기 미확인"}
            </p>
            <h3 className="mt-3 text-lg font-black">
              {party.party_name ?? "담당자 미확인"}
            </h3>
            <p className="mt-4 text-sm leading-6 text-[var(--navy-700)]">
              {party.work_requested ?? "요청 작업 미입력"}
            </p>
            <p className="mt-3 text-xs">
              계정 접근: {party.account_access_level ?? "미확인"}
            </p>
          </article>
        ))}
        {workspace.thirdParties.length === 0 ? (
          <Empty text="등록된 외부 담당자 이력이 없습니다." />
        ) : null}
      </div>
    </div>
  );
}

function DiagnosisTab({ workspace }: { workspace: CaseWorkspace }) {
  const hypotheses = asRecordArray(workspace.diagnosis?.hypotheses);
  const scores = workspace.diagnosis
    ? [
        ["프로필 분산", workspace.diagnosis.duplicate_entity_score],
        ["이름 일관성", workspace.diagnosis.name_consistency_score],
        ["주소·층·핀", workspace.diagnosis.address_floor_pin_score],
        ["전화·웹사이트", workspace.diagnosis.phone_website_score],
        ["카테고리", workspace.diagnosis.category_consistency_score],
        ["소유권·관리", workspace.diagnosis.ownership_control_score],
        ["계정·이의신청", workspace.diagnosis.account_appeal_score],
        ["현장 증빙 부족", workspace.diagnosis.physical_evidence_score],
        ["반복 생성", workspace.diagnosis.repeated_recreation_score],
        [
          "독립 사업장 모호성",
          workspace.diagnosis.independent_business_ambiguity_score,
        ],
      ]
    : [];
  return (
    <div>
      <SectionHeading
        eyebrow="Hypotheses, not verdicts"
        title="원인 가설"
        description="제출된 사실을 기준으로 생성한 가설이며 Google의 비공개 판단 로직을 안다고 주장하지 않습니다."
      />
      {scores.length ? (
        <div className="mb-10 grid gap-px bg-[var(--navy-300)] sm:grid-cols-2 lg:grid-cols-5">
          {scores.map(([label, score]) => (
            <Metric
              key={String(label)}
              label={String(label)}
              value={Number(score)}
            />
          ))}
        </div>
      ) : null}
      {hypotheses.length ? (
        <div className="space-y-5">
          {hypotheses.map((item, index) => (
            <article
              key={index}
              className="border border-[var(--navy-300)] bg-[var(--neutral-50)] p-5 sm:p-7"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-[var(--navy-700)]">
                    {formatUnknown(item.confidence) || "단서 적음"} · SCORE{" "}
                    {formatUnknown(item.score)}
                  </p>
                  <h3 className="mt-2 text-xl font-black">
                    {recordTitle(item)}
                  </h3>
                </div>
                <span className="border border-[var(--navy-300)] px-3 py-2 text-xs font-bold">
                  가설 {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <HypothesisList
                  title="근거가 된 사실"
                  value={item.supportingFacts}
                  empty="직접적인 단서가 적습니다."
                />
                <HypothesisList
                  title="반대 단서"
                  value={item.contradictingFacts}
                  empty="확인된 반대 단서가 없습니다."
                />
                <HypothesisList
                  title="아직 모르는 정보"
                  value={item.unknownInformation}
                  empty="추가 확인 항목이 없습니다."
                />
                <HypothesisList
                  title="필요한 증빙"
                  value={item.evidenceNeeded}
                  empty="추가 증빙 제안이 없습니다."
                />
              </div>
              <div className="mt-6 grid gap-4 border-t border-[var(--navy-300)] pt-5 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-black text-[var(--navy-700)]">
                    안전한 다음 행동
                  </p>
                  <p className="mt-2 text-sm leading-6">
                    {formatUnknown(item.safeNextAction)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black text-[var(--navy-700)]">
                    아직 단정하면 안 되는 점
                  </p>
                  <p className="mt-2 text-sm leading-6">
                    {formatUnknown(item.mustNotConclude)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty text="고객 제출 후 진단 엔진이 실행되면 투명한 원인 가설이 표시됩니다." />
      )}
      <DiagnosisControls
        caseId={workspace.case.id}
        decisionPath={workspace.diagnosis?.admin_decision_path ?? null}
        conclusion={workspace.diagnosis?.admin_conclusion ?? null}
      />
    </div>
  );
}

function EvidenceTab({ workspace }: { workspace: CaseWorkspace }) {
  return (
    <div>
      <SectionHeading
        eyebrow="Private files"
        title="증빙 자료"
        description="첨부 자료는 짧은 만료 링크로만 확인합니다."
      />
      <EvidenceList caseId={workspace.case.id} evidence={workspace.evidence} />
    </div>
  );
}

function MissingTab({ workspace }: { workspace: CaseWorkspace }) {
  const missing = asRecordArray(workspace.diagnosis?.missing_information);
  return (
    <div>
      <SectionHeading
        eyebrow="Confirmation order"
        title="부족한 정보"
        description="확인되지 않은 사실, 상충 정보와 필요한 자료를 순서대로 봅니다."
      />
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h3 className="font-black">자동 생성 확인 항목</h3>
          {missing.length ? (
            <ul className="mt-4 space-y-3">
              {missing.map((item, index) => (
                <li
                  key={index}
                  className="border-l-2 border-[var(--navy-300)] pl-4 text-sm leading-6"
                >
                  <strong>
                    {String(index + 1).padStart(2, "0")}. {recordTitle(item)}
                  </strong>
                  <p className="mt-1 text-[var(--navy-700)]">
                    {formatUnknown(item.reason)}
                  </p>
                  <p className="mt-1">
                    다음 확인: {formatUnknown(item.recommendedAction)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="아직 생성된 부족 정보가 없습니다." />
          )}
        </div>
        <FactReviewList caseId={workspace.case.id} facts={workspace.facts} />
      </div>
    </div>
  );
}

function FollowUpsTab({ workspace }: { workspace: CaseWorkspace }) {
  return (
    <div>
      <SectionHeading
        eyebrow="Customer-friendly questions"
        title="고객 추가 질문"
        description="복사해 보내기 쉬운 말로 부족한 내용을 확인합니다."
      />
      <FollowUpWorkspace
        caseId={workspace.case.id}
        suggestedQuestions={workspace.diagnosis?.suggested_questions}
        followUps={workspace.followUps}
      />
    </div>
  );
}

const decisionPaths = [
  ["A", "기존 프로필 복구"],
  ["B", "기존 프로필 소유권 요청"],
  ["C", "중복 및 정보 정리"],
  ["D", "공식 이의신청 또는 재검토"],
  ["E", "등록정보 수정"],
  ["F", "정책상 가능한 경우 신규 등록"],
  ["G", "추가 자료 확인 후 보류"],
  ["H", "지원 범위 외 또는 진행 중단"],
] as const;

const decisionPathDetails: Record<
  (typeof decisionPaths)[number][0],
  {
    conditions: string[];
    evidence: string[];
    risks: string[];
    included: string;
    excluded: string;
  }
> = {
  A: {
    conditions: [
      "복구 대상 기존 프로필 식별",
      "이전 소유·관리 계정 또는 공식 복구 수단 확인",
    ],
    evidence: [
      "과거 프로필 ID 또는 화면",
      "Google 안내 이메일",
      "현재 사업장 공식 자료",
    ],
    risks: ["계정 접근 불가", "진행 중인 이의신청과 작업 충돌"],
    included: "기존 프로필과 계정 흐름 확인, 가능한 공식 복구 단계 준비",
    excluded: "승인 보장, 계정 보안정보 수집, 반복 재생성",
  },
  B: {
    conditions: [
      "소유권 요청 대상 프로필 식별",
      "고객의 공식 사업장 관리 권한 확인",
    ],
    evidence: [
      "프로필 링크",
      "사업자·영업허가 자료",
      "상시 간판과 연락처 통제 자료",
    ],
    risks: ["현재 소유자 응답 지연", "동일 사업체 여부 불명확"],
    included: "공식 소유권 요청 가능성 검토와 요청 자료 정리",
    excluded: "강제 소유권 이전 또는 처리 기한 보장",
  },
  C: {
    conditions: [
      "관련 프로필 후보 간 관계 확인",
      "공식 기준 이름·주소·전화 확정",
    ],
    evidence: ["프로필 비교표", "프로필 ID", "층별 독립 운영 자료"],
    risks: ["서로 독립된 사업체를 잘못 묶을 위험", "리뷰·프로필 이력 영향"],
    included: "중복 가능성과 불일치 정보 정리, 공식 문의 자료 준비",
    excluded: "검증 전 삭제·중복 단정",
  },
  D: {
    conditions: [
      "Google의 공식 결정 또는 현재 절차 확인",
      "사실과 증빙의 일관성 확보",
    ],
    evidence: [
      "정지·거절 안내 원문",
      "이의신청 상태",
      "사업장 자격과 현장 자료",
    ],
    risks: ["기한 또는 제출 횟수 제한", "불완전한 자료로 인한 추가 지연"],
    included: "공식 이의신청·재검토를 위한 사실 및 증빙 정리",
    excluded: "Google 결정 변경 보장",
  },
  E: {
    conditions: ["관리 가능한 프로필 확인", "변경할 하나의 공식 기준값 확정"],
    evidence: ["공식 상호·주소·전화·카테고리 자료", "변경 전후 비교"],
    risks: ["변경 후 재인증 요청", "여러 필드 동시 변경의 검토 영향"],
    included: "검증된 등록정보 수정 계획",
    excluded: "검색 순위 또는 노출 보장",
  },
  F: {
    conditions: [
      "복구·소유권·정리할 기존 프로필이 없음",
      "정책상 신규 자격과 실제 운영 확인",
    ],
    evidence: [
      "현재 현장과 상시 간판",
      "사업 공식 문서",
      "기존 프로필·이의신청 검색 결과",
    ],
    risks: ["기존 엔티티와 중복 인식", "진행 중인 절차와 충돌"],
    included: "다른 공식 경로가 없을 때 신규 등록 자격 검토",
    excluded: "정지 결정을 우회하기 위한 재생성",
  },
  G: {
    conditions: ["결정에 필요한 핵심 사실 또는 증빙이 부족함"],
    evidence: ["누락 정보 탭의 우선순위 자료"],
    risks: ["확인 지연", "추측에 의한 잘못된 경로 선택"],
    included: "추가 확인 순서와 고객 질문 정리",
    excluded: "자료 없이 경로 확정",
  },
  H: {
    conditions: ["권한·적격성·사실 확인 불가 또는 계약 범위 밖"],
    evidence: ["중단 사유와 고객 안내 기록"],
    risks: ["범위 오해", "추가 사업장을 현재 사건에 혼합"],
    included: "중단 사유와 가능한 외부 안내 정리",
    excluded: "정책 우회, 허위 자료, 무제한 지원",
  },
};

function NextPathTab({ workspace }: { workspace: CaseWorkspace }) {
  const missingCount = asRecordArray(
    workspace.diagnosis?.missing_information,
  ).length;
  return (
    <div>
      <SectionHeading
        eyebrow="Administrator decision"
        title="다음 경로 결정"
        description="점수만으로 자동 결정하지 않습니다. 필수 조건과 위험을 검토한 뒤 담당자가 최종 선택합니다."
      />
      <div className="space-y-5">
        {decisionPaths.map(([key, title]) => {
          const detail = decisionPathDetails[key];
          const assessment = assessPath(key, workspace, missingCount);
          return (
            <article
              key={key}
              className={`break-inside-avoid border bg-[var(--neutral-50)] p-5 sm:p-7 ${workspace.diagnosis?.admin_decision_path === key ? "border-4 border-[var(--navy-950)]" : "border-[var(--navy-300)]"}`}
            >
              <p className="text-xs font-black text-[var(--navy-700)]">
                PATH {key}
              </p>
              <h3 className="mt-2 text-xl font-black">{title}</h3>
              <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                <PathList title="필수 조건" items={detail.conditions} />
                <PathList
                  title="현재 충족"
                  items={assessment.met}
                  empty="아직 확인된 충족 조건이 없습니다."
                />
                <PathList
                  title="차단 요소"
                  items={assessment.blockers}
                  empty="현재 확인된 차단 요소가 없습니다."
                />
                <PathList title="필요 증빙" items={detail.evidence} />
                <PathList title="알려진 위험" items={detail.risks} />
                <div className="text-sm leading-6">
                  <p className="text-xs font-black text-[var(--navy-700)]">
                    서비스 범위
                  </p>
                  <p className="mt-2">
                    <strong>포함:</strong> {detail.included}
                  </p>
                  <p className="mt-2 text-[var(--navy-700)]">
                    <strong>제외:</strong> {detail.excluded}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-6 text-sm leading-6 text-[var(--navy-700)]">
        현재 관리자 결정:{" "}
        {workspace.diagnosis?.admin_decision_path ?? "아직 결정하지 않음"}
      </p>
    </div>
  );
}

function assessPath(
  key: (typeof decisionPaths)[number][0],
  workspace: CaseWorkspace,
  missingCount: number,
) {
  const current = workspace.currentBusiness;
  const history = workspace.historySummary;
  const met: string[] = [];
  const blockers: string[] = [];
  if (current?.authority_status === "confirmed")
    met.push("고객의 공식 관리 권한이 확인됨");
  else blockers.push("고객 관리 권한이 아직 확인되지 않음");
  if (workspace.evidence.length > 0)
    met.push(`증빙 ${workspace.evidence.length}개 제출됨`);
  if (missingCount > 0)
    blockers.push(`우선 확인할 부족 정보 ${missingCount}개`);

  if (key === "A") {
    if (history?.old_account_access_status === "accessible")
      met.push("이전 계정 접근 가능");
    else blockers.push("이전 계정 접근 또는 대상 프로필 ID 미확인");
  }
  if (["B", "C", "E"].includes(key)) {
    if (workspace.profiles.length > 0)
      met.push(`현재 프로필 후보 ${workspace.profiles.length}개 확인됨`);
    else blockers.push("검토할 현재 프로필 후보가 없음");
  }
  if (key === "C" && workspace.profiles.length < 2)
    blockers.push("여러 프로필의 관계를 비교할 단서가 적음");
  if (key === "D") {
    if (history?.appeal_status && history.appeal_status !== "unknown")
      met.push(`이의신청 상태: ${history.appeal_status}`);
    else blockers.push("공식 이의신청 상태 미확인");
  }
  if (key === "E" && current?.desired_standard_name)
    met.push("공식 기준 이름이 제출됨");
  if (key === "F") {
    if (workspace.profiles.length === 0)
      met.push("현재 확인된 프로필 후보가 없음");
    else blockers.push("기존 관련 프로필 후보가 있어 우선 검토 필요");
    if (history?.appeal_status === "in_progress")
      blockers.push("진행 중인 이의신청과 충돌 가능");
  }
  if (key === "G" && missingCount > 0)
    met.push("추가 확인이 필요한 상태에 해당함");
  if (key === "H") met.push("최종 지원 범위 판단은 관리자가 기록할 수 있음");
  return { met: [...new Set(met)], blockers: [...new Set(blockers)] };
}

function PathList({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty?: string;
}) {
  return (
    <div>
      <p className="text-xs font-black text-[var(--navy-700)]">{title}</p>
      {items.length ? (
        <ul className="mt-2 space-y-2 text-sm leading-6">
          {items.map((item) => (
            <li key={item} className="border-l-2 border-[var(--navy-300)] pl-3">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[var(--navy-700)]">{empty}</p>
      )}
    </div>
  );
}

function ActivityTab({ workspace }: { workspace: CaseWorkspace }) {
  return (
    <div>
      <SectionHeading
        eyebrow="Audit trail"
        title="진행 기록"
        description="관리자 메모와 주요 시스템 활동을 시간순으로 확인합니다."
      />
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <h3 className="font-black">관리자 메모</h3>
          <div className="mt-4 space-y-3">
            {workspace.notes.map((note) => (
              <article
                key={note.id}
                className="border-l-2 border-[var(--navy-300)] pl-4"
              >
                <p className="text-xs font-bold text-[var(--navy-700)]">
                  {note.note_type} · {formatDateTime(note.created_at)}
                </p>
                <p className="mt-2 text-sm leading-6 whitespace-pre-line">
                  {note.content}
                </p>
              </article>
            ))}
            {workspace.notes.length === 0 ? (
              <Empty text="아직 관리자 메모가 없습니다." />
            ) : null}
          </div>
        </div>
        <div>
          <h3 className="font-black">활동 기록</h3>
          <div className="mt-4 divide-y divide-[var(--navy-300)] border-y border-[var(--navy-300)]">
            {workspace.activity.map((item) => (
              <div key={item.id} className="py-3 text-sm">
                <strong>{activityLabel(item.action)}</strong>
                <p className="mt-1 text-xs text-[var(--navy-700)]">
                  {item.actor_type} · {formatDateTime(item.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportTab({ workspace }: { workspace: CaseWorkspace }) {
  const exports = [
    ["인쇄용 사건 요약", `/admin/cases/${workspace.case.id}/print`],
    ["전체 JSON", `/api/admin/cases/${workspace.case.id}/export?type=json`],
    ["사건 요약 CSV", `/api/admin/cases/${workspace.case.id}/export?type=case`],
    [
      "과거 이력 CSV",
      `/api/admin/cases/${workspace.case.id}/export?type=history`,
    ],
    [
      "프로필 비교 CSV",
      `/api/admin/cases/${workspace.case.id}/export?type=profiles`,
    ],
    [
      "첨부 목록 CSV",
      `/api/admin/cases/${workspace.case.id}/export?type=evidence`,
    ],
  ] as const;
  return (
    <div>
      <SectionHeading
        eyebrow="Portable case brief"
        title="내보내기"
        description="고객 토큰과 비공개 링크를 제외한 사건 자료를 목적별로 내보냅니다."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exports.map(([label, href]) => (
          <a
            key={label}
            href={href}
            className="group border border-[var(--navy-300)] p-5 hover:border-[var(--navy-950)]"
          >
            <h3 className="font-black">{label}</h3>
            <p className="mt-3 text-xs leading-5 text-[var(--navy-700)]">
              고객 토큰, 비공개 저장 경로, 서명 URL은 포함하지 않습니다.
            </p>
            <span className="mt-5 block text-sm font-black group-hover:underline">
              생성하기 →
            </span>
          </a>
        ))}
      </div>
      <p className="mt-8 text-sm">사건 코드: {workspace.case.case_code}</p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-10">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--navy-700)] uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] sm:text-5xl">
        {title}
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--navy-700)]">
        {description}
      </p>
    </header>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[var(--neutral-50)] p-5">
      <p className="text-xs font-bold text-[var(--navy-700)]">{label}</p>
      <p className="mt-5 text-3xl font-black tracking-[-0.05em]">{value}</p>
    </div>
  );
}

function KeyValueList({
  title,
  items,
}: {
  title: string;
  items: Array<[string, unknown]>;
}) {
  return (
    <div>
      <h3 className="text-lg font-black">{title}</h3>
      <dl className="mt-4 divide-y divide-[var(--navy-300)] border-y border-[var(--navy-300)]">
        {items.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-2 py-4 text-sm sm:grid-cols-[9rem_1fr]"
          >
            <dt className="font-bold">{label}</dt>
            <dd className="break-words text-[var(--navy-700)]">
              {formatUnknown(value) || "미확인"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="mt-4 border-l-2 border-[var(--navy-300)] pl-4 text-sm leading-6 text-[var(--navy-700)]">
      {text}
    </p>
  );
}

function HypothesisList({
  title,
  value,
  empty,
}: {
  title: string;
  value: unknown;
  empty: string;
}) {
  const items = Array.isArray(value)
    ? value.map(formatUnknown).filter(Boolean)
    : [];
  return (
    <div>
      <h4 className="text-xs font-black text-[var(--navy-700)]">{title}</h4>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-6">
          {items.map((item, index) => (
            <li
              key={index}
              className="border-l-2 border-[var(--navy-300)] pl-3"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[var(--navy-700)]">{empty}</p>
      )}
    </div>
  );
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function recordTitle(value: Record<string, unknown>): string {
  return (
    formatUnknown(value.title ?? value.label ?? value.question ?? value.key) ||
    "확인이 필요한 항목"
  );
}

function formatUnknown(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return String(value);
  if (Array.isArray(value))
    return value.map(formatUnknown).filter(Boolean).join(", ");
  return JSON.stringify(value);
}

function friendlyKey(value: string): string {
  return value.replaceAll("_", " ");
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function activityLabel(action: string): string {
  const labels: Record<string, string> = {
    case_created: "사건 생성",
    customer_draft_saved: "고객 임시 저장",
    evidence_uploaded: "증빙 업로드",
    evidence_deleted_before_submission: "제출 전 증빙 삭제",
    customer_submission_received: "고객 최종 제출",
    case_status_changed: "사건 상태 변경",
    admin_note_added: "관리자 메모 추가",
    customer_intake_reopened: "고객 작성 다시 열기",
    evidence_accessed: "증빙 자료 열람",
    evidence_deleted_by_admin: "관리자 증빙 삭제",
    diagnosis_regenerated: "원인 가설 다시 생성",
    diagnosis_decision_updated: "최종 경로 결정 변경",
    fact_review_updated: "사실 검증 상태 변경",
    follow_up_created: "추가 질문 생성",
    follow_up_status_changed: "추가 질문 상태 변경",
    history_event_added: "과거 이력 추가",
    history_event_normalized: "과거 이력 정규화",
    history_events_reordered: "과거 이력 순서 변경",
    retention_review_scheduled: "보관 검토일 설정",
    diagnosis_generation_failed: "자동 원인 가설 생성 실패",
  };
  return labels[action] ?? action;
}
