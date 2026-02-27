import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PreviewCardProps = {
  href: string;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  external?: boolean;
  className?: string;
};

function PreviewCard({
  href,
  title,
  description,
  image,
  imageAlt,
  external = false,
  className,
}: PreviewCardProps) {
  const content = (
    <Card
      className={cn(
        "h-full cursor-pointer overflow-hidden transition-shadow hover:shadow-lg",
        className,
      )}
    >
      {/* 링크 미리보기 스타일: 상단 썸네일 */}
      <div className="relative aspect-[2/1] w-full bg-muted">
        {image ? (
          <Image
            src={image}
            alt={imageAlt ?? title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
            unoptimized={external}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-4xl font-bold text-muted-foreground"
            aria-hidden
          >
            {title.charAt(0)}
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-1">{title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground">{href}</p>
      </CardContent>
    </Card>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block transition-opacity hover:opacity-95 focus:opacity-95"
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={href as "/"}
      className="block transition-opacity hover:opacity-95 focus:opacity-95"
    >
      {content}
    </Link>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-background p-8">
      <div className="mx-auto w-full space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Demo Pages</h1>
          <p className="text-muted-foreground">
            카드를 클릭하면 해당 페이지로 이동합니다. 링크 공유 시 미리보기
            카드가 표시됩니다.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <PreviewCard
            href="/dashboard"
            title="Dashboard"
            description="대시보드 페이지입니다. 차트, 요약 카드 등을 추가할 수 있습니다."
          />
        </div>
      </div>
    </main>
  );
}
