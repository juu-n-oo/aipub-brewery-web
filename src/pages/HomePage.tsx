import { Link } from 'react-router-dom';
import { FileCode2, Hammer, FolderOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function HomePage() {
  const { username, projects, isAdmin } = useAuth();

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="mb-1.5 text-2xl font-bold text-foreground">환영합니다, {username}님</h1>
        <p className="text-base text-muted-foreground">
          Dockerizer에서 Dockerfile을 작성하고 이미지를 빌드하세요.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickActionCard
          icon={<FileCode2 className="h-5 w-5 text-primary" />}
          title="새 Dockerfile 작성"
          description="Dockerfile을 생성하여 이미지 빌드 환경을 구성하세요."
          to="/dockerfiles"
          action="Dockerfiles"
        />
        <QuickActionCard
          icon={<Hammer className="h-5 w-5 text-[#FF9500]" />}
          title="빌드 현황 확인"
          description="실행 중인 빌드의 상태와 로그를 확인하세요."
          to="/builds"
          action="Builds"
        />
        <QuickActionCard
          icon={<FolderOpen className="h-5 w-5 text-green-600" />}
          title="프로젝트"
          description={`${projects.length}개의 프로젝트에 접근 가능합니다.`}
          to="/dockerfiles"
          action="프로젝트 보기"
        />
      </div>

      {/* Project Overview */}
      <Card className="gap-0 py-0">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-bold text-foreground">내 프로젝트</h2>
        </div>
        <div className="divide-y divide-border">
          {projects.map((p) => (
            <div key={p.name} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-medium text-foreground">{p.name}</span>
                <span className="rounded bg-muted px-2 py-0.5 text-sm text-muted-foreground">
                  {p.role}
                </span>
              </div>
              <Link
                to={`/dockerfiles?projectId=${p.name}`}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Dockerfiles <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </Card>

      {isAdmin && <p className="mt-4 text-sm text-muted-foreground/70">관리자 권한이 있습니다.</p>}
    </div>
  );
}

function QuickActionCard({
  icon,
  title,
  description,
  to,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
  action: string;
}) {
  return (
    <Card className="gap-0 p-5">
      <div className="mb-3">{icon}</div>
      <h3 className="mb-1 text-base font-bold text-foreground">{title}</h3>
      <p className="mb-4 flex-1 text-sm text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" asChild className="self-start">
        <Link to={to}>
          {action}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </Card>
  );
}
