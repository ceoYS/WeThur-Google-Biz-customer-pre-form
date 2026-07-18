import type { DiagnosisResult } from "@/lib/diagnosis-engine";
import type { ValidatedIntakePayload } from "@/lib/schemas/intake";

export const MISSING_INFORMATION_ENGINE_VERSION = "1.1.0";

export type MissingInformationItem = {
  key: string;
  category: "fact" | "contradiction" | "evidence" | "control";
  priority: number;
  title: string;
  reason: string;
  recommendedAction: string;
  evidenceCategory?: string;
};

export type SuggestedQuestion = {
  key: string;
  title: string;
  message: string;
  requestedItems: string[];
};

export type MissingInformationResult = {
  engineVersion: string;
  items: MissingInformationItem[];
  suggestedQuestions: SuggestedQuestion[];
};

export function generateMissingInformation(input: {
  payload: ValidatedIntakePayload;
  diagnosis: DiagnosisResult;
  evidenceCategories: string[];
}): MissingInformationResult {
  const { payload } = input;
  const answers = payload.answers;
  const evidence = new Set(input.evidenceCategories);
  const items: MissingInformationItem[] = [];
  const questions: SuggestedQuestion[] = [];

  for (const field of [
    [
      "authority_status",
      "사업장 관리 권한",
      "대표님 또는 공식 담당자의 관리 권한 확인이 먼저 필요합니다.",
    ],
    [
      "sign_name",
      "상시 간판 이름",
      "실제 현장과 프로필 이름을 비교하는 기준입니다.",
    ],
    [
      "registration_name",
      "사업자등록 상호",
      "공식 문서 이름과 프로필 이름을 비교하는 기준입니다.",
    ],
    [
      "official_address",
      "실제 고객 방문 주소",
      "주소·층·지도 핀을 비교하는 기준입니다.",
    ],
    [
      "official_phone",
      "사업장이 관리하는 공식 전화",
      "제3자 연락처와 구분하는 기준입니다.",
    ],
  ] as const) {
    if (isUnknown(answers[field[0]])) {
      addItem(items, {
        key: `missing_${field[0]}`,
        category: "fact",
        priority: 20,
        title: `${field[1]} 확인 필요`,
        reason: field[2],
        recommendedAction:
          "기억나는 범위에서 확인하고, 모르면 관련 문서나 현장 자료로 확인합니다.",
      });
    }
  }

  if (isUnknown(answers.old_account_access_status)) {
    addItem(items, {
      key: "old_account_access",
      category: "control",
      priority: 1,
      title: "이전 Google 계정 접근 가능 여부",
      reason: "기존 프로필 복구와 진행 중인 공식 절차 확인의 출발점입니다.",
      recommendedAction:
        "과거 등록을 진행한 계정 중 현재 로그인 가능한 계정이 있는지만 먼저 확인합니다.",
    });
    addQuestion(questions, {
      key: "old_account_access",
      title: "이전 Google 계정 확인",
      message:
        "대표님, 예전에 사용했던 Google 계정 중 지금도 로그인 가능한 계정이 있는지만 먼저 확인 부탁드려도 될까요? 비밀번호나 인증번호는 보내지 않으셔도 됩니다.",
      requestedItems: ["로그인 가능한 계정이 있는지 여부"],
    });
  }

  if (isUnknown(answers.appeal_status)) {
    addItem(items, {
      key: "appeal_status",
      category: "control",
      priority: 2,
      title: "이의신청 또는 재검토 상태",
      reason:
        "진행 중인 공식 절차와 새 작업이 충돌하지 않도록 확인해야 합니다.",
      recommendedAction:
        "이전 계정의 Google 이메일과 이의신청 상태 화면을 확인합니다.",
    });
    addQuestion(questions, {
      key: "appeal_status",
      title: "과거 Google 안내 확인",
      message:
        "과거 정지 안내나 이의신청 관련 이메일이 남아 있다면, 비밀번호나 인증번호는 가리고 현재 상태가 보이는 화면만 전달 부탁드립니다.",
      requestedItems: ["과거 Google 안내 이메일", "이의신청 상태 화면"],
    });
  }

  if (isUnknown(answers.verification_methods_used)) {
    addItem(items, {
      key: "verification_methods_used",
      category: "fact",
      priority: 9,
      title: "과거 인증 방식 확인",
      reason: "인증 요청과 실제 현장·권한 조건을 비교하는 기준입니다.",
      recommendedAction:
        "영상, 전화·문자, 이메일, 우편 중 기억나는 방식만 확인합니다.",
    });
  }

  if (isUnknown(answers.google_notice_type)) {
    addItem(items, {
      key: "google_notice_type",
      category: "fact",
      priority: 8,
      title: "Google 안내 유형 확인",
      reason: "정지·삭제 원인을 고객의 추측이 아닌 실제 안내로 좁힙니다.",
      recommendedAction:
        "과거 이메일이나 정지 화면에서 안내 유형과 현재 상태를 확인합니다.",
    });
  }

  const uncontrolled = payload.profileCandidates.filter((profile) =>
    isUnknown(profile.customerControlsProfile),
  );
  if (uncontrolled.length > 0) {
    addItem(items, {
      key: "profile_control",
      category: "control",
      priority: 3,
      title: "현재 프로필 관리 가능 여부",
      reason: `${uncontrolled.length}개 후보의 관리 권한이 확인되지 않았습니다.`,
      recommendedAction:
        "각 프로필에서 소유권 요청 또는 사용자 및 액세스 화면을 확인합니다.",
    });
    addQuestion(questions, {
      key: "profile_control",
      title: "현재 프로필 관리 여부 확인",
      message:
        "현재 지도에 보이는 관련 프로필 중 대표님이 직접 관리하거나 소유권 요청을 할 수 있는 프로필이 있는지 확인 부탁드립니다.",
      requestedItems: ["관리 가능한 프로필", "소유권 요청 가능 여부"],
    });
  }

  const coreEvidence = [
    ["permanent_sign_photo", "상시 간판 사진", 4],
    ["entrance_photo", "고객 출입구 사진", 5],
    ["operating_permit", "영업허가증 또는 신고증", 6],
    ["business_registration", "사업자등록증", 7],
  ] as const;
  for (const [category, label, priority] of coreEvidence) {
    if (!evidence.has(category)) {
      addItem(items, {
        key: `evidence_${category}`,
        category: "evidence",
        priority,
        title: `${label} 미제출`,
        reason:
          "실제 사업장 이름, 주소, 운영 형태를 확인하는 데 도움이 됩니다.",
        recommendedAction:
          "불필요한 개인정보를 가린 뒤 필요한 부분만 준비합니다.",
        evidenceCategory: category,
      });
    }
  }

  const variants = [
    ["names", "이름", collectNames(payload)],
    [
      "phones",
      "전화번호",
      collect(payload, "phone", "displayedPhone", "official_phone"),
    ],
    [
      "floors",
      "층 표기",
      collect(payload, "floor", "displayedFloor", "floor_structure"),
    ],
    [
      "categories",
      "업종·카테고리",
      collect(
        payload,
        "primaryCategory",
        "displayedCategory",
        "primary_activity",
      ),
    ],
  ] as const;
  for (const [key, label, values] of variants) {
    if (values.length > 1) {
      addItem(items, {
        key: `contradictory_${key}`,
        category: "contradiction",
        priority: 10,
        title: `${label} 기준값 확인 필요`,
        reason: `제출 내용에서 ${values.length}개의 서로 다른 값이 확인됐습니다: ${values.join(", ")}`,
        recommendedAction:
          "현재 실제 사업장이 직접 관리하는 하나의 공식 기준을 확인합니다.",
      });
    }
  }

  if (
    payload.historyEvents.length > 0 &&
    !evidence.has("past_google_email") &&
    !evidence.has("past_suspension_email")
  ) {
    addItem(items, {
      key: "past_google_message",
      category: "evidence",
      priority: 8,
      title: "과거 Google 안내 원문 확인",
      reason:
        "정지, 인증, 이의신청 흐름을 추측이 아닌 실제 안내로 확인할 수 있습니다.",
      recommendedAction:
        "계정 보안 정보는 가리고 발신자, 날짜, 안내 내용만 확인합니다.",
      evidenceCategory: "past_google_email",
    });
  }

  const highPriorityUnknowns = input.diagnosis.hypotheses
    .filter((hypothesis) => hypothesis.confidence === "우선 확인 필요")
    .flatMap((hypothesis) => hypothesis.unknownInformation)
    .slice(0, 5);
  for (const [index, detail] of highPriorityUnknowns.entries()) {
    addItem(items, {
      key: `diagnosis_unknown_${index}_${stableKey(detail)}`,
      category: "fact",
      priority: 30 + index,
      title: detail,
      reason: "우선 확인이 필요한 원인 가설에서 아직 확인되지 않은 정보입니다.",
      recommendedAction: "관련 계정, 문서, 현장 자료 순서로 확인합니다.",
    });
  }

  if (items.some((item) => item.category === "evidence")) {
    addQuestion(questions, {
      key: "core_evidence",
      title: "현장 및 공식 자료 확인",
      message:
        "대표님, 실제 운영 상태를 확인할 수 있는 간판·출입구 사진이나 공식 문서가 있다면 불필요한 개인정보를 가린 뒤 준비 부탁드립니다.",
      requestedItems: items
        .filter((item) => item.category === "evidence")
        .map((item) => item.title),
    });
  }

  return {
    engineVersion: MISSING_INFORMATION_ENGINE_VERSION,
    items: items.toSorted(
      (left, right) =>
        left.priority - right.priority || left.key.localeCompare(right.key),
    ),
    suggestedQuestions: questions,
  };
}

function collectNames(payload: ValidatedIntakePayload) {
  return distinct([
    text(payload.answers.sign_name),
    text(payload.answers.registration_name),
    text(payload.answers.permit_name),
    ...payload.historyEvents.map((item) => item.profileName),
    ...payload.profileCandidates.map((item) => item.displayedName),
  ]);
}

function collect(
  payload: ValidatedIntakePayload,
  historyKey: "phone" | "floor" | "primaryCategory",
  profileKey: "displayedPhone" | "displayedFloor" | "displayedCategory",
  answerKey: string,
) {
  return distinct([
    text(payload.answers[answerKey]),
    ...payload.historyEvents.map((item) => item[historyKey]),
    ...payload.profileCandidates.map((item) => item[profileKey]),
  ]);
}

function isUnknown(value: unknown) {
  const normalized = (
    Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === "string")
          .join(" ")
      : text(value)
  ).toLocaleLowerCase("ko-KR");
  return (
    !normalized ||
    /모르|몰라|기억나지|확인.*필요|unknown|needs_confirmation/.test(normalized)
  );
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function distinct(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function addItem(
  items: MissingInformationItem[],
  item: MissingInformationItem,
) {
  if (!items.some((existing) => existing.key === item.key)) items.push(item);
}

function addQuestion(
  questions: SuggestedQuestion[],
  question: SuggestedQuestion,
) {
  if (!questions.some((existing) => existing.key === question.key))
    questions.push(question);
}

function stableKey(value: string) {
  let hash = 0;
  for (const character of value)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash.toString(36);
}
