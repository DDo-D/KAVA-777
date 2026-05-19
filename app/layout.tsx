import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KAVA — 약품 → 제약회사 검색",
  description:
    "약학정보원(KPIC) 데이터를 기반으로 약품명·성분·효능을 검색하고 관련 제약회사를 정리합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="sticky top-0 z-50 border-b border-black/10 bg-white/80 backdrop-blur dark:bg-black/60 dark:border-white/10">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/" className="text-sm font-bold tracking-tight">KAVA</Link>
            <Link href="/" className="text-sm text-foreground/70 hover:text-foreground transition">약품 검색</Link>
            <Link href="/screener" className="text-sm text-foreground/70 hover:text-foreground transition">밸류에이션 스크리너</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
