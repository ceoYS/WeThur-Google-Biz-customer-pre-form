import Link from "next/link";

import { requireAdmin } from "@/lib/admin-auth";
import { getDashboardCases } from "@/lib/admin-case-data";
import { caseStatusLabels, intakeStatusLabels } from "@/lib/case-status";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; intake?: string }>;
}) {
  const admin = await requireAdmin();
  const allCases = await getDashboardCases();
  const filters = await searchParams;
  const query = filters.q?.trim().toLocaleLowerCase("ko-KR") ?? "";
  const cases = allCases.filter((item) => {
    const matchesQuery =
      !query ||
      [
        item.caseCode,
        item.businessName,
        item.customerName,
        item.topHypothesis,
        ...item.issueModules,
      ].some((value) => value.toLocaleLowerCase("ko-KR").includes(query));
    return (
      matchesQuery &&
      (!filters.status || item.status === filters.status) &&
      (!filters.intake || item.intakeStatus === filters.intake)
    );
  });

  return (
    <main className="mx-auto min-h-screen max-w-[96rem] px-5 py-10 sm:px-8 lg:px-12">
      <header className="flex flex-col gap-6 border-b border-[var(--navy-300)] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-[var(--navy-700)] uppercase">
            Case desk
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">
            사건 대시보드
          </h1>
        </div>
        <div className="flex items-center gap-5">
          <p className="text-sm text-[var(--navy-700)]">
            {admin.displayName ?? admin.email}
          </p>
          <Link
            href="/admin/cases/new"
            className="min-h-12 bg-[var(--navy-950)] px-5 py-3 text-sm font-bold text-white"
          >
            새 사건 만들기
          </Link>
        </div>
      </header>
      <form
        method="get"
        className="mt-8 grid gap-3 border-y border-[var(--navy-300)] py-5 sm:grid-cols-[1fr_12rem_12rem_auto]"
      >
        <label className="text-xs font-bold">
          검색
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="사건 코드, 사업장, 고객, 가설"
            className="mt-2 min-h-11 w-full border border-[var(--navy-300)] bg-white px-3 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-bold">
          사건 상태
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="mt-2 min-h-11 w-full border border-[var(--navy-300)] bg-white px-3 text-sm font-normal"
          >
            <option value="">전체</option>
            {Object.entries(caseStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          작성 상태
          <select
            name="intake"
            defaultValue={filters.intake ?? ""}
            className="mt-2 min-h-11 w-full border border-[var(--navy-300)] bg-white px-3 text-sm font-normal"
          >
            <option value="">전체</option>
            {Object.entries(intakeStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="min-h-11 self-end bg-[var(--navy-950)] px-5 text-sm font-black text-white"
        >
          필터 적용
        </button>
      </form>
      <p className="mt-4 text-xs font-bold text-[var(--navy-700)]">
        전체 {allCases.length}건 중 {cases.length}건
      </p>
      {allCases.length === 0 ? (
        <section className="py-20 text-center">
          <p className="text-lg font-bold">아직 생성된 사건이 없습니다.</p>
          <p className="mt-3 text-sm text-[var(--navy-700)]">
            첫 고객 사건을 만들고 필요한 질문 모듈을 선택해주세요.
          </p>
        </section>
      ) : cases.length === 0 ? (
        <section className="py-16 text-center">
          <p className="font-black">검색 조건에 맞는 사건이 없습니다.</p>
          <Link
            href="/admin"
            className="mt-4 inline-block text-sm font-bold underline"
          >
            필터 초기화
          </Link>
        </section>
      ) : (
        <section className="mt-8 overflow-x-auto border-y border-[var(--navy-300)]">
          <table className="w-full min-w-[92rem] border-collapse text-left text-xs">
            <thead className="bg-[var(--neutral-100)] text-[var(--navy-700)]">
              <tr>
                {[
                  "사건 코드",
                  "사업장",
                  "업종",
                  "고객",
                  "제출일",
                  "사건 상태",
                  "작성 상태",
                  "이슈 모듈",
                  "우선 가설",
                  "부족 정보",
                  "첨부",
                  "이의신청",
                  "담당자",
                  "마지막 변경",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="border-b border-[var(--navy-300)] px-4 py-4 font-bold"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--navy-300)] align-top last:border-0"
                >
                  <td className="px-4 py-5 font-black">
                    <Link
                      href={`/admin/cases/${item.id}`}
                      className="border-b border-[var(--navy-950)]"
                    >
                      {item.caseCode}
                    </Link>
                  </td>
                  <td className="max-w-40 px-4 py-5 font-bold">
                    {item.businessName}
                  </td>
                  <td className="px-4 py-5">{item.industry}</td>
                  <td className="px-4 py-5">{item.customerName}</td>
                  <td className="px-4 py-5">{formatDate(item.submittedAt)}</td>
                  <td className="px-4 py-5 font-bold">
                    {caseStatusLabels[
                      item.status as keyof typeof caseStatusLabels
                    ] ?? item.status}
                  </td>
                  <td className="px-4 py-5">
                    {intakeStatusLabels[
                      item.intakeStatus as keyof typeof intakeStatusLabels
                    ] ?? item.intakeStatus}
                  </td>
                  <td className="max-w-52 px-4 py-5 leading-5">
                    {item.issueModules.join(", ") || "선택 없음"}
                  </td>
                  <td className="max-w-52 px-4 py-5 leading-5">
                    {item.topHypothesis}
                  </td>
                  <td className="px-4 py-5 text-center font-bold">
                    {item.missingInformationCount}
                  </td>
                  <td className="px-4 py-5 text-center font-bold">
                    {item.attachmentCount}
                  </td>
                  <td className="px-4 py-5">{item.appealStatus}</td>
                  <td className="px-4 py-5">{item.assignedAdmin}</td>
                  <td className="px-4 py-5">{formatDate(item.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short" }).format(
    new Date(value),
  );
}
