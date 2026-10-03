import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "顧事",
  description:
    "每日一篇，精彩到停不下來的中文網絡小說——收藏喜歡的故事，親手選出專屬結局。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 2026-10-04：回頭客喺 paint 前隱藏開場動畫（見 BookEntrance.tsx） */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('gushi_entrance_seen')==='1')document.documentElement.classList.add('entrance-seen')}catch(e){}",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@500;700;900&family=Noto+Sans+TC:wght@400;500;700&family=Fraunces:ital,wght@1,600;1,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col md:flex-row bg-cream text-ink">
        <NavBar />
        <div className="flex-1 min-w-0 flex flex-col">
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
