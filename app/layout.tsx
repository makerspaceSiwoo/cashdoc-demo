import "@/app/src/styles/globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cashdoc-demo.vercel.app";

export const metadata = {
  title: "캐시닥 데모",
  description: "프로젝트 미리보기 · 카드를 클릭하면 해당 페이지로 이동합니다.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "캐시닥 데모 – 프로젝트 미리보기",
    description:
      "프로젝트 미리보기 · 카드를 클릭하면 해당 페이지로 이동합니다.",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "캐시닥 데모 – 프로젝트 미리보기",
    description:
      "프로젝트 미리보기 · 카드를 클릭하면 해당 페이지로 이동합니다.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen w-full antialiased">{children}</body>
    </html>
  );
}
