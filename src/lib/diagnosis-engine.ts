import type { ValidatedIntakePayload } from "@/lib/schemas/intake";

export const DIAGNOSIS_ENGINE_VERSION = "1.1.0";

export type DiagnosisConfidence =
  | "단서 적음"
  | "가능성 있음"
  | "우선 확인 필요";

export type DiagnosisCategory =
  | "duplicate_entity_fragmentation"
  | "business_name_inconsistency"
  | "address_floor_pin_inconsistency"
  | "phone_website_inconsistency"
  | "category_inconsistency"
  | "ownership_control_uncertainty"
  | "account_appeal_conflict"
  | "insufficient_physical_evidence"
  | "repeated_recreation_pattern"
  | "independent_business_ambiguity"
  | "verification_process_mismatch"
  | "rebranding_moved_location_confusion"
  | "third_party_management_conflict";

export type DiagnosisHypothesis = {
  category: DiagnosisCategory;
  title: string;
  score: number;
  confidence: DiagnosisConfidence;
  supportingFacts: string[];
  contradictingFacts: string[];
  unknownInformation: string[];
  evidenceNeeded: string[];
  safeNextAction: string;
  mustNotConclude: string;
};

export type DiagnosisScores = {
  duplicateEntity: number;
  nameConsistency: number;
  addressFloorPin: number;
  phoneWebsite: number;
  categoryConsistency: number;
  ownershipControl: number;
  accountAppeal: number;
  physicalEvidence: number;
  repeatedRecreation: number;
  independentBusinessAmbiguity: number;
};

export type DiagnosisResult = {
  engineVersion: string;
  disclaimer: string;
  scores: DiagnosisScores;
  hypotheses: DiagnosisHypothesis[];
  suggestedPaths: Array<{
    path: string;
    reason: string;
    requiresAdminDecision: true;
  }>;
};

export type DiagnosisInput = {
  payload: ValidatedIntakePayload;
  evidenceCategories: string[];
};

type MutableHypothesis = Omit<DiagnosisHypothesis, "score" | "confidence"> & {
  points: number;
};

const unknown = "제출된 정보만으로는 확인되지 않았습니다.";

export function diagnoseCase(input: DiagnosisInput): DiagnosisResult {
  const { payload } = input;
  const answers = payload.answers;
  const history = payload.historyEvents;
  const profiles = payload.profileCandidates;
  const thirdParties = payload.thirdParties;
  const evidence = new Set(input.evidenceCategories);

  const historyNames = distinct(history.map((event) => event.profileName));
  const currentNames = distinct(
    profiles.map((profile) => profile.displayedName),
  );
  const officialNames = distinct([
    textAnswer(answers, "sign_name"),
    textAnswer(answers, "registration_name"),
    textAnswer(answers, "permit_name"),
    textAnswer(answers, "desired_standard_name"),
  ]);
  const addresses = distinct([
    textAnswer(answers, "official_address"),
    ...history.map((event) => event.address),
    ...profiles.map((profile) => profile.displayedAddress),
  ]);
  const floors = distinct([
    textAnswer(answers, "floor_structure"),
    ...history.map((event) => event.floor),
    ...profiles.map((profile) => profile.displayedFloor),
  ]);
  const phones = distinct([
    textAnswer(answers, "official_phone"),
    ...history.map((event) => event.phone),
    ...profiles.map((profile) => profile.displayedPhone),
  ]);
  const websites = distinct([
    textAnswer(answers, "official_website"),
    ...history.map((event) => event.website),
    ...profiles.map((profile) => profile.displayedWebsite),
  ]);
  const categories = distinct([
    textAnswer(answers, "primary_activity"),
    ...history.map((event) => event.primaryCategory),
    ...profiles.map((profile) => profile.displayedCategory),
  ]);
  const creationAttempts =
    numberAnswer(answers, "creation_attempt_count") ?? history.length;
  const suspensionCount =
    numberAnswer(answers, "suspension_count") ??
    history.filter((event) => /suspend|정지|disappear|사라/i.test(event.result))
      .length;

  const hypotheses: MutableHypothesis[] = [
    duplicateHypothesis(
      profiles.length,
      historyNames,
      currentNames,
      addresses,
      floors,
      phones,
      creationAttempts,
    ),
    nameHypothesis(officialNames, historyNames, currentNames),
    addressHypothesis(addresses, floors, profiles),
    contactHypothesis(phones, websites),
    categoryHypothesis(categories),
    ownershipHypothesis(profiles, thirdParties),
    appealHypothesis(answers, history),
    physicalEvidenceHypothesis(evidence),
    recreationHypothesis(creationAttempts, suspensionCount, history),
    independenceHypothesis(answers, profiles),
    verificationHypothesis(answers, history),
    rebrandMoveHypothesis(answers, officialNames, addresses),
    thirdPartyHypothesis(
      thirdParties,
      numberAnswer(answers, "third_party_count"),
    ),
  ];

  const finalized = hypotheses
    .map(finalizeHypothesis)
    .toSorted(
      (left, right) =>
        right.score - left.score || left.category.localeCompare(right.category),
    );
  const byCategory = new Map(
    finalized.map((item) => [item.category, item.score]),
  );
  const scores: DiagnosisScores = {
    duplicateEntity: byCategory.get("duplicate_entity_fragmentation") ?? 0,
    nameConsistency: byCategory.get("business_name_inconsistency") ?? 0,
    addressFloorPin: byCategory.get("address_floor_pin_inconsistency") ?? 0,
    phoneWebsite: byCategory.get("phone_website_inconsistency") ?? 0,
    categoryConsistency: byCategory.get("category_inconsistency") ?? 0,
    ownershipControl: byCategory.get("ownership_control_uncertainty") ?? 0,
    accountAppeal: byCategory.get("account_appeal_conflict") ?? 0,
    physicalEvidence: byCategory.get("insufficient_physical_evidence") ?? 0,
    repeatedRecreation: byCategory.get("repeated_recreation_pattern") ?? 0,
    independentBusinessAmbiguity:
      byCategory.get("independent_business_ambiguity") ?? 0,
  };

  return {
    engineVersion: DIAGNOSIS_ENGINE_VERSION,
    disclaimer:
      "제출된 사실을 정리한 가설이며 Google의 비공개 집행 로직이나 최종 결정을 의미하지 않습니다.",
    scores,
    hypotheses: finalized,
    suggestedPaths: suggestPaths(finalized, answers),
  };
}

function duplicateHypothesis(
  profileCount: number,
  historyNames: string[],
  currentNames: string[],
  addresses: string[],
  floors: string[],
  phones: string[],
  creationAttempts: number,
): MutableHypothesis {
  const support: string[] = [];
  let points = 0;
  if (profileCount > 1) {
    points += 25;
    support.push(`현재 관련 프로필 후보가 ${profileCount}개입니다.`);
  }
  if (historyNames.length + currentNames.length > 2) {
    points += 15;
    support.push("과거와 현재 프로필에 여러 이름이 사용됐습니다.");
  }
  if (addresses.length > 1) {
    points += 15;
    support.push("프로필별 주소 표기가 서로 다릅니다.");
  }
  if (floors.length > 1) {
    points += 15;
    support.push("프로필별 층 정보가 서로 다릅니다.");
  }
  if (phones.length > 1) {
    points += 10;
    support.push("여러 전화번호가 사용됐습니다.");
  }
  if (creationAttempts >= 2) {
    points += 20;
    support.push(`등록 시도가 약 ${creationAttempts}회입니다.`);
  }
  return base(
    "duplicate_entity_fragmentation",
    "동일 사업체가 여러 이름·전화번호·층수로 분산 인식됐을 가능성",
    points,
    support,
    profileCount <= 1 ? ["현재 확인된 프로필 후보는 한 개입니다."] : [],
    ["각 프로필의 ID와 실제 소유 계정", "각 프로필이 독립 사업체인지 여부"],
    ["각 프로필 관리 화면", "상시 간판과 출입구 사진"],
    "기존 계정과 프로필 ID를 먼저 확인하고, 새 프로필을 추가로 만들기 전에 관련 후보를 비교합니다.",
    "여러 후보가 보인다는 사실만으로 중복 또는 위반이라고 단정하면 안 됩니다.",
  );
}

function nameHypothesis(
  official: string[],
  historical: string[],
  current: string[],
): MutableHypothesis {
  const all = distinct([...official, ...historical, ...current]);
  const points = Math.min(100, Math.max(0, (all.length - 1) * 25));
  return base(
    "business_name_inconsistency",
    "실제 간판명과 등록·프로필 이름이 일치하지 않았을 가능성",
    points,
    all.length > 1
      ? [`확인된 이름이 ${all.length}개입니다: ${all.join(", ")}`]
      : [],
    all.length === 1 ? ["현재 확인된 이름은 하나입니다."] : [],
    ["각 시점의 상시 간판명", "상호 변경 시기와 증빙"],
    ["상시 간판 사진", "사업자등록증", "영업허가증"],
    "실제 상시 간판과 공식 문서에 맞는 하나의 기준 이름을 확인합니다.",
    "이름이 다르다는 이유만으로 허위 등록이나 의도적 키워드 사용을 단정하면 안 됩니다.",
  );
}

function addressHypothesis(
  addresses: string[],
  floors: string[],
  profiles: DiagnosisInput["payload"]["profileCandidates"],
): MutableHypothesis {
  const pinNotes = profiles.filter((profile) =>
    profile.mapPinNotes.trim(),
  ).length;
  const points = clamp(
    (addresses.length - 1) * 25 +
      (floors.length - 1) * 25 +
      (pinNotes > 0 ? 20 : 0),
  );
  return base(
    "address_floor_pin_inconsistency",
    "주소·층수·지도 핀이 실제 고객 출입구와 다르게 인식됐을 가능성",
    points,
    [
      addresses.length > 1 ? `주소 표기가 ${addresses.length}가지입니다.` : "",
      floors.length > 1 ? `층 표기가 ${floors.length}가지입니다.` : "",
      pinNotes > 0 ? "지도 핀 차이에 대한 메모가 있습니다." : "",
    ].filter(Boolean),
    [],
    ["고객이 사용하는 실제 출입구", "각 프로필의 지도 핀 좌표"],
    ["도로명·건물번호 사진", "출입구 사진", "층별 안내 표지"],
    "실제 고객 출입구를 기준으로 주소, 층, 핀을 나란히 확인합니다.",
    "표기 차이만으로 어느 프로필이 잘못됐다고 단정하면 안 됩니다.",
  );
}

function contactHypothesis(
  phones: string[],
  websites: string[],
): MutableHypothesis {
  const points = clamp((phones.length - 1) * 30 + (websites.length - 1) * 30);
  return base(
    "phone_website_inconsistency",
    "전화번호 또는 웹사이트가 여러 관리 주체로 나뉘었을 가능성",
    points,
    [
      phones.length > 1 ? `전화번호가 ${phones.length}개입니다.` : "",
      websites.length > 1 ? `웹사이트가 ${websites.length}개입니다.` : "",
    ].filter(Boolean),
    phones.length <= 1 && websites.length <= 1
      ? ["현재 확인된 공식 연락 정보는 한 세트입니다."]
      : [],
    ["각 번호와 사이트의 실제 관리 주체"],
    ["전화 수신 관리 화면", "도메인 또는 웹사이트 관리 증빙"],
    "사업장이 직접 관리하는 전화와 웹사이트를 하나의 기준으로 확인합니다.",
    "다른 연락처가 보인다는 이유만으로 제3자 탈취를 단정하면 안 됩니다.",
  );
}

function categoryHypothesis(categories: string[]): MutableHypothesis {
  const points = clamp((categories.length - 1) * 30);
  return base(
    "category_inconsistency",
    "실제 주된 영업과 프로필 카테고리가 일관되지 않았을 가능성",
    points,
    categories.length > 1
      ? [`확인된 업종·카테고리 표현이 ${categories.length}가지입니다.`]
      : [],
    categories.length === 1 ? ["현재 확인된 카테고리 표현은 하나입니다."] : [],
    ["각 시점의 실제 주된 영업", "주 카테고리 변경 이력"],
    ["영업허가증", "공식 서비스 안내"],
    "현재 실제 주된 영업을 기준으로 가장 구체적인 카테고리를 검토합니다.",
    "카테고리 차이만으로 정지 원인이라고 단정하면 안 됩니다.",
  );
}

function ownershipHypothesis(
  profiles: DiagnosisInput["payload"]["profileCandidates"],
  thirdParties: DiagnosisInput["payload"]["thirdParties"],
): MutableHypothesis {
  const uncertain = profiles.filter(
    (profile) =>
      !profile.customerControlsProfile ||
      /no|unknown|needs/.test(profile.customerControlsProfile),
  ).length;
  const points = clamp(uncertain * 25 + (thirdParties.length > 0 ? 20 : 0));
  return base(
    "ownership_control_uncertainty",
    "프로필 소유권과 실제 사업장 관리 권한이 분리됐을 가능성",
    points,
    [
      uncertain ? `관리 여부가 불명확한 프로필이 ${uncertain}개입니다.` : "",
      thirdParties.length
        ? `외부 담당자 이력이 ${thirdParties.length}건입니다.`
        : "",
    ].filter(Boolean),
    uncertain === 0 && profiles.length > 0
      ? ["제출 내용상 현재 후보를 관리할 수 있습니다."]
      : [],
    ["각 프로필의 소유자·관리자 목록", "이전 관리 계정 접근 가능 여부"],
    ["프로필 사용자 및 액세스 화면"],
    "기존 프로필에서 소유권 요청이 가능한지 먼저 확인합니다.",
    "고객이 현재 관리하지 못한다는 사실만으로 무단 소유라고 단정하면 안 됩니다.",
  );
}

function appealHypothesis(
  answers: Record<string, unknown>,
  history: DiagnosisInput["payload"]["historyEvents"],
): MutableHypothesis {
  const appeal = textAnswer(answers, "appeal_status");
  const access = textAnswer(answers, "old_account_access_status");
  const recreated = textAnswer(answers, "recreated_during_appeal");
  let points = 0;
  const support: string[] = [];
  if (!appeal || /모르|unknown|진행/.test(appeal)) {
    points += 30;
    support.push("이의신청 상태가 진행 중이거나 미확인입니다.");
  }
  if (!access || /없|몰라|확인|unknown/.test(access)) {
    points += 25;
    support.push("이전 관리 계정 접근이 불확실합니다.");
  }
  if (
    /있|yes/.test(recreated) ||
    history.some((event) => event.appealPendingWhenRecreated === "yes")
  ) {
    points += 35;
    support.push("이의신청 대기 중 재등록 단서가 있습니다.");
  }
  return base(
    "account_appeal_conflict",
    "Google 계정 제한 또는 진행 중인 이의신청과 충돌했을 가능성",
    points,
    support,
    [],
    ["이전 계정의 현재 로그인 가능 여부", "진행 중인 이의신청 접수 상태"],
    ["과거 Google 이메일", "이의신청 상태 화면"],
    "이전 계정의 Google 메일과 이의신청 상태를 확인하고 진행 중이면 재생성을 멈춥니다.",
    "계정 접근 문제만으로 Google 계정 자체가 제한됐다고 단정하면 안 됩니다.",
  );
}

function physicalEvidenceHypothesis(evidence: Set<string>): MutableHypothesis {
  const required = [
    "exterior_photo",
    "permanent_sign_photo",
    "entrance_photo",
    "operating_permit",
  ];
  const missing = required.filter((item) => !evidence.has(item));
  const points = missing.length * 20;
  return base(
    "insufficient_physical_evidence",
    "실제 사업장과 관리 권한을 보여주는 현장 자료가 부족할 가능성",
    points,
    missing.length
      ? [`핵심 현장 자료 ${missing.length}종이 아직 없습니다.`]
      : [],
    missing.length === 0
      ? ["외관, 간판, 출입구, 허가 자료가 제출됐습니다."]
      : [],
    missing.map((item) => evidenceLabel(item)),
    missing.map((item) => evidenceLabel(item)),
    "민감정보를 가린 뒤 실제 현장을 보여주는 자료를 우선 정리합니다.",
    "자료가 부족하다는 사실만으로 사업장 실재 여부를 단정하면 안 됩니다.",
  );
}

function recreationHypothesis(
  attempts: number,
  suspensions: number,
  history: DiagnosisInput["payload"]["historyEvents"],
): MutableHypothesis {
  const points = clamp(
    (attempts >= 2 ? 35 : 0) +
      Math.min(30, suspensions * 15) +
      (history.length >= 3 ? 25 : 0),
  );
  return base(
    "repeated_recreation_pattern",
    "정지·사라짐 이후 반복 생성 흐름이 누적됐을 가능성",
    points,
    [
      attempts >= 2 ? `등록 시도가 약 ${attempts}회입니다.` : "",
      suspensions ? `정지·사라짐이 약 ${suspensions}회입니다.` : "",
      history.length >= 3 ? `과거 이력이 ${history.length}건입니다.` : "",
    ].filter(Boolean),
    attempts <= 1 && suspensions === 0 ? ["반복 생성 단서가 적습니다."] : [],
    ["각 시도의 프로필 ID", "각 시도의 사용 계정과 이의신청 상태"],
    ["과거 프로필 화면", "Google 안내 이메일"],
    "새 등록을 멈추고 기존 프로필·계정·이의신청을 시간순으로 연결합니다.",
    "반복 시도만으로 정책 회피 의도를 단정하면 안 됩니다.",
  );
}

function independenceHypothesis(
  answers: Record<string, unknown>,
  profiles: DiagnosisInput["payload"]["profileCandidates"],
): MutableHypothesis {
  const floor =
    textAnswer(answers, "floor_separation") ||
    textAnswer(answers, "floor_structure");
  const signals = profiles.flatMap((profile) =>
    Object.values(profile.independentBusinessSignals),
  );
  const uncertain = signals.filter(
    (value) => value === "unknown" || value === "needs_confirmation",
  ).length;
  const points = clamp(
    (/별도|브랜드|모르/.test(floor) ? 35 : 0) +
      Math.min(45, uncertain * 8) +
      (profiles.length > 1 ? 20 : 0),
  );
  return base(
    "independent_business_ambiguity",
    "같은 주소·여러 층의 사업체 독립성이 불명확할 가능성",
    points,
    [
      floor ? `층 운영 설명: ${floor}` : "",
      uncertain ? `독립 운영 신호 ${uncertain}개가 미확인입니다.` : "",
    ].filter(Boolean),
    [],
    ["층별 별도 출입구·간판·직원·계산대", "층별 영업허가와 전화"],
    ["층별 간판·출입구 사진", "층별 영업허가"],
    "층별 독립 운영 신호를 표로 확인한 뒤 하나의 사업장인지 별도 사업장인지 판단합니다.",
    "한 주소에 여러 프로필이 있다는 사실만으로 중복이라고 단정하면 안 됩니다.",
  );
}

function verificationHypothesis(
  answers: Record<string, unknown>,
  history: DiagnosisInput["payload"]["historyEvents"],
): MutableHypothesis {
  const attempted = history.filter((event) => event.verificationMethod.trim());
  const failed = history.filter((event) =>
    /fail|reject|실패|거절/.test(`${event.approvalStatus} ${event.result}`),
  ).length;
  const methods = distinct([
    ...attempted.map((event) => event.verificationMethod),
    ...stringArrayAnswer(answers, "verification_methods_used"),
  ]);
  const notice = textAnswer(answers, "google_notice_type");
  const points = clamp(
    failed * 25 +
      (methods.length > 1 ? 20 : 0) +
      (/인증 실패|추가 인증/.test(notice) ? 20 : 0),
  );
  return base(
    "verification_process_mismatch",
    "요청된 인증 방식과 실제 현장·권한 조건이 맞지 않았을 가능성",
    points,
    [
      failed ? `인증 실패 또는 거절 단서가 ${failed}건입니다.` : "",
      methods.length > 1
        ? `여러 인증 방식이 사용됐습니다: ${methods.join(", ")}`
        : "",
      notice ? `고객이 확인한 Google 안내 유형: ${notice}` : "",
    ].filter(Boolean),
    [],
    ["각 인증에서 Google이 요청한 정확한 단계", "인증 당시 간판·출입 권한"],
    ["인증 실패 화면", "현장 동선과 간판 자료"],
    "가장 최근 인증 요청과 실제 현장 조건을 먼저 비교합니다.",
    "인증 실패만으로 사업장이 자격이 없다고 단정하면 안 됩니다.",
  );
}

function rebrandMoveHypothesis(
  answers: Record<string, unknown>,
  names: string[],
  addresses: string[],
): MutableHypothesis {
  const rebrand = textAnswer(answers, "rebrand_timeline");
  const move = textAnswer(answers, "move_timeline");
  const points = clamp(
    (rebrand ? 35 : 0) +
      (move ? 35 : 0) +
      (names.length > 1 ? 15 : 0) +
      (addresses.length > 1 ? 15 : 0),
  );
  return base(
    "rebranding_moved_location_confusion",
    "상호 변경 또는 이전 전후 정보가 한 프로필 흐름으로 연결되지 않았을 가능성",
    points,
    [
      rebrand ? "상호 변경 이력이 제출됐습니다." : "",
      move ? "주소 이전 이력이 제출됐습니다." : "",
    ].filter(Boolean),
    [],
    ["변경 전후 운영 종료·시작 시점", "변경 전 프로필 ID"],
    ["상호 변경 문서", "이전 전후 간판·주소 자료"],
    "변경 전후 프로필과 공식 문서의 시점을 하나의 타임라인으로 맞춥니다.",
    "이름이나 주소 변경만으로 새 프로필이 필요하다고 단정하면 안 됩니다.",
  );
}

function thirdPartyHypothesis(
  thirdParties: DiagnosisInput["payload"]["thirdParties"],
  statedCount: number | null,
): MutableHypothesis {
  const count = Math.max(thirdParties.length, statedCount ?? 0);
  const owners = thirdParties.filter(
    (party) =>
      party.accountAccessLevel === "owner" ||
      party.accountAccessLevel === "manager",
  ).length;
  const points = clamp(Math.min(50, count * 15) + Math.min(40, owners * 20));
  return base(
    "third_party_management_conflict",
    "여러 대행사·직원·마케터의 계정 관리가 겹쳤을 가능성",
    points,
    [
      count ? `외부 또는 내부 담당자 단서가 ${count}건입니다.` : "",
      owners ? `소유자·관리자 접근 단서가 ${owners}건입니다.` : "",
    ].filter(Boolean),
    count === 0 ? ["제출된 외부 담당자 이력이 없습니다."] : [],
    ["각 담당자가 사용한 Google 계정", "현재 남아 있는 관리자 권한"],
    ["프로필 사용자 및 액세스 화면", "대행 업무 요청 내역"],
    "담당자별 계정, 역할, 변경 내용을 분리해 현재 권한을 정리합니다.",
    "외부 담당자가 있었다는 사실만으로 잘못된 관리를 단정하면 안 됩니다.",
  );
}

function base(
  category: DiagnosisCategory,
  title: string,
  points: number,
  supportingFacts: string[],
  contradictingFacts: string[],
  unknownInformation: string[],
  evidenceNeeded: string[],
  safeNextAction: string,
  mustNotConclude: string,
): MutableHypothesis {
  return {
    category,
    title,
    points,
    supportingFacts,
    contradictingFacts,
    unknownInformation: unknownInformation.length
      ? unknownInformation
      : [unknown],
    evidenceNeeded,
    safeNextAction,
    mustNotConclude,
  };
}

function finalizeHypothesis(item: MutableHypothesis): DiagnosisHypothesis {
  const score = clamp(item.points);
  return {
    category: item.category,
    title: item.title,
    score,
    confidence:
      score >= 60
        ? "우선 확인 필요"
        : score >= 30
          ? "가능성 있음"
          : "단서 적음",
    supportingFacts: item.supportingFacts,
    contradictingFacts: item.contradictingFacts,
    unknownInformation: item.unknownInformation,
    evidenceNeeded: item.evidenceNeeded,
    safeNextAction: item.safeNextAction,
    mustNotConclude: item.mustNotConclude,
  };
}

function suggestPaths(
  hypotheses: DiagnosisHypothesis[],
  answers: Record<string, unknown>,
): DiagnosisResult["suggestedPaths"] {
  const paths: DiagnosisResult["suggestedPaths"] = [];
  const top = hypotheses[0];
  if (textAnswer(answers, "old_account_access_status").includes("로그인"))
    paths.push({
      path: "A",
      reason: "이전 관리 계정 접근 가능성을 먼저 확인할 수 있습니다.",
      requiresAdminDecision: true,
    });
  if (
    (hypotheses.find(
      (item) => item.category === "ownership_control_uncertainty",
    )?.score ?? 0) >= 30
  )
    paths.push({
      path: "B",
      reason: "현재 프로필의 관리 권한 확인이 우선입니다.",
      requiresAdminDecision: true,
    });
  if (
    (hypotheses.find(
      (item) => item.category === "duplicate_entity_fragmentation",
    )?.score ?? 0) >= 30
  )
    paths.push({
      path: "C",
      reason: "관련 프로필과 정보 분산을 먼저 비교해야 합니다.",
      requiresAdminDecision: true,
    });
  if (
    (hypotheses.find((item) => item.category === "account_appeal_conflict")
      ?.score ?? 0) >= 30
  )
    paths.push({
      path: "D",
      reason: "진행 중인 공식 절차와 과거 안내 확인이 필요합니다.",
      requiresAdminDecision: true,
    });
  if (!top || top.score < 30)
    paths.push({
      path: "G",
      reason: "결정 전에 추가 자료 확인이 필요합니다.",
      requiresAdminDecision: true,
    });
  return paths;
}

function textAnswer(answers: Record<string, unknown>, key: string): string {
  const value = answers[key];
  return typeof value === "string" ? value.trim() : "";
}

function numberAnswer(
  answers: Record<string, unknown>,
  key: string,
): number | null {
  const value = answers[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArrayAnswer(
  answers: Record<string, unknown>,
  key: string,
): string[] {
  const value = answers[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function distinct(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function evidenceLabel(key: string): string {
  const labels: Record<string, string> = {
    exterior_photo: "건물 외관 사진",
    permanent_sign_photo: "상시 간판 사진",
    entrance_photo: "고객 출입구 사진",
    operating_permit: "영업허가증 또는 신고증",
  };
  return labels[key] ?? key;
}
