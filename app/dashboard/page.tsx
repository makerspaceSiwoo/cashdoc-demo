import Link from "next/link";
import DashBoard from "./components/DashBoard";

export default function DashboardPage() {
  return (
    <main className="min-h-screen w-full bg-background p-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <h1 className="text-2xl font-bold">Hospital Performance Analysis</h1>
        <p className="text-muted-foreground">
          병원 검색 후 선택하면 딥 애널리틱스와 엑셀 스타일 테이블을 볼 수 있습니다.
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
