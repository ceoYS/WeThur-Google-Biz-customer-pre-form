"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 border border-[var(--navy-950)] px-5 py-2 text-sm font-black print:hidden"
    >
      인쇄 또는 PDF 저장
    </button>
  );
}
