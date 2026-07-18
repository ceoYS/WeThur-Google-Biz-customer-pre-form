import Link from "next/link";

import {
  CaseCreationForm,
  type ModuleOption,
} from "@/components/admin/case-creation-form";
import { requireAdmin } from "@/lib/admin-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ModuleRow = {
  id: string;
  module_key: string;
  module_type: "common" | "industry" | "issue";
  title: string;
  description: string;
};

type AdminRow = { user_id: string; display_name: string | null; email: string };

export default async function NewCasePage() {
  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const [moduleResult, adminResult] = await Promise.all([
    supabase
      .from("question_modules")
      .select("id, module_key, module_type, title, description")
      .eq("is_active", true)
      .order("module_type")
      .order("title")
      .returns<ModuleRow[]>(),
    supabase
      .from("admin_profiles")
      .select("user_id, display_name, email")
      .order("email")
      .returns<AdminRow[]>(),
  ]);

  const modules: ModuleOption[] = (moduleResult.data ?? []).map((module) => ({
    id: module.id,
    moduleKey: module.module_key,
    moduleType: module.module_type,
    title: module.title,
    description: module.description,
  }));
  const admins = (adminResult.data ?? []).map((profile) => ({
    id: profile.user_id,
    label: profile.display_name ?? profile.email,
  }));
  if (!admins.some((profile) => profile.id === admin.id)) {
    admins.push({ id: admin.id, label: admin.displayName ?? admin.email });
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <header className="mb-14 flex flex-col gap-6 border-b border-[var(--navy-300)] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin"
            className="text-sm font-bold text-[var(--navy-700)]"
          >
            ← 사건 대시보드
          </Link>
          <p className="mt-10 text-xs font-bold tracking-[0.2em] text-[var(--navy-700)] uppercase">
            새 고객 사건
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
            고객별 사건 만들기
          </h1>
        </div>
        <p className="max-w-sm text-sm leading-6 text-[var(--navy-700)]">
          공통 구조 위에 업종, 이슈, 알려진 사실과 고객별 질문을 조합합니다.
        </p>
      </header>
      {moduleResult.error ? (
        <p className="border-l-2 border-[var(--navy-950)] pl-4 text-sm leading-6">
          질문 모듈을 불러오지 못했습니다. Supabase 마이그레이션 적용 상태를
          확인해주세요.
        </p>
      ) : (
        <CaseCreationForm
          modules={modules}
          admins={admins}
          currentAdminId={admin.id}
        />
      )}
    </main>
  );
}
