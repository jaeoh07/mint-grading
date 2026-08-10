import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MINT | 바이닐 그레이딩 넘버 조회",
  description: "MINT 바이닐 그레이딩 인증번호 조회 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
