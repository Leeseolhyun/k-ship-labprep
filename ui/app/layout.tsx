import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHIPMATE AI | 조선업 의사결정 지원",
  description: "선박 설계·법규 검토 및 조선소 인력 배치 의사결정 지원 프로토타입",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

