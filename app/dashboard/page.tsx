import Link from "next/link";
import DashBoard from "./components/DashBoard";

export default function DashboardPage() {
  return (
    <main className="min-h-screen w-full bg-background p-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <h1 className="text-2xl font-bold">CMS 예약률/내원율 대시보드</h1>
        <p className="text-muted-foreground">
          병원 검색 후 선택하면 예약률/내원율 데이터를 볼 수 있습니다.
        </p>
        <Link
          href="/"
          className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          ← 목록으로 돌아가기
        </Link>
        <DashBoard />
      </div>
    </main>
  );
}
