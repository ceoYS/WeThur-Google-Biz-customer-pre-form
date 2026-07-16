import Link from "next/link";

const sections = [
  [
    "무엇을 수집하나요",
    "사업장 현황, 과거 Google 프로필 이력, 현재 관련 프로필 정보, 담당자 연락 선호, 고객이 선택해 제출한 증빙 자료를 수집합니다.",
  ],
  [
    "왜 필요한가요",
    "과거 등록 흐름과 현재 정보를 비교하고, 부족한 자료와 안전한 다음 확인 경로를 정리하기 위해 사용합니다.",
  ],
  [
    "누가 볼 수 있나요",
    "허용된 WeThru 담당자만 사건 자료를 열람할 수 있습니다. 고객 링크로 다른 사건을 조회할 수 없습니다.",
  ],
  [
    "파일은 어떻게 보호하나요",
    "증빙은 비공개 저장소에 보관하며, 담당자 확인 시에도 짧은 시간만 유효한 접근 링크를 사용합니다.",
  ],
  [
    "제출하면 안 되는 정보",
    "Google 비밀번호, OTP, 복구 코드, 주민등록번호, 전체 결제 정보, 가리지 않은 신분증은 제출하지 마세요.",
  ],
  [
    "얼마나 보관하나요",
    "사건 진행 중에는 업무를 위해 보관하고, 완료 후 보관 필요성을 검토합니다. 자동 삭제는 명시적으로 설정된 정책이 있을 때만 수행합니다.",
  ],
  [
    "삭제를 요청하려면",
    "담당자에게 사건 코드와 함께 삭제 범위를 알려주세요. 법적·운영상 보관 의무가 없는 범위에서 확인 후 처리합니다.",
  ],
  [
    "추가 사업장은 어떻게 되나요",
    "현재 유료 사건은 정해진 한 사업장에 적용됩니다. 다른 사업장은 별도 사건으로 안전하게 분리해 진행합니다.",
  ],
] as const;

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
      <Link href="/" className="text-sm font-bold text-[var(--navy-700)]">
        ← WeThru
      </Link>
      <p className="mt-16 text-xs font-bold tracking-[0.2em] text-[var(--navy-700)] uppercase">
        Privacy & retention
      </p>
      <h1 className="mt-5 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
        개인정보와 자료 보관 안내
      </h1>
      <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--navy-700)]">
        필요한 정보만 받고, 사건 검토에 필요한 범위에서만 사용합니다. 아래
        내용을 어렵지 않은 말로 정리했습니다.
      </p>
      <div className="mt-14 divide-y divide-[var(--navy-300)] border-y border-[var(--navy-300)]">
        {sections.map(([title, body]) => (
          <section
            key={title}
            className="grid gap-3 py-7 sm:grid-cols-[12rem_1fr] sm:gap-8"
          >
            <h2 className="font-bold">{title}</h2>
            <p className="text-sm leading-7 text-[var(--navy-700)]">{body}</p>
          </section>
        ))}
      </div>
      <p className="mt-10 text-xs leading-6 text-[var(--navy-700)]">
        이 안내는 서비스 운영 방식에 대한 쉬운 설명입니다. 적용되는 법령이나
        계약상 별도 의무가 있는 경우 해당 기준이 함께 적용될 수 있습니다.
      </p>
    </main>
  );
}
