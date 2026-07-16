import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "WeThru Google Business Profile Diagnosis",
    template: "%s | WeThru",
  },
  description:
    "Google 비즈니스 프로필의 과거 등록 흐름과 현재 상태를 함께 정리하는 WeThru 사전 진단 플랫폼입니다.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#07182c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
