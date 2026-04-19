import { Link } from 'react-router-dom';
import { FileCode2, Hammer, FolderOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuthContext';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const { username, projects, isAdmin } = useAuth();

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-text-primary mb-1">
          환영합니다, {username}님
        </h1>
        <p className="text-sm text-text-secondary">
          AIPub Brewery에서 Dockerfile을 작성하고 이미지를 빌드하세요.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
          icon={<FolderOpen className="h-5 w-5 text-success" />}
          title="프로젝트"
          description={`${projects.length}개의 프로젝트에 접근 가능합니다.`}
          to="/dockerfiles"
          action="프로젝트 보기"
        />
      </div>

      {/* Project Overview */}
      <div className="rounded-lg border border-border bg-white">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-text-primary">내 프로젝트</h2>
        </div>
        <div className="divide-y divide-border">
          {projects.map((p) => (
            <div key={p.name} className="px-5 py-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-text-primary">{p.name}</span>
                <span className="ml-2 text-xs text-text-secondary bg-muted-bg px-2 py-0.5 rounded">
                  {p.role}
                </span>
              </div>
              <Link
                to={`/dockerfiles?projectId=${p.name}`}
                className="text-xs text-text-link hover:underline flex items-center gap-1"
              >
                Dockerfiles <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {isAdmin && (
        <p className="mt-4 text-xs text-text-muted">
          관리자 권한이 있습니다.
        </p>
      )}
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
    <div className="rounded-lg border border-border bg-white p-5 flex flex-col">
      <div className="mb-3">{icon}</div>
      <h3 className="text-sm font-bold text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-secondary flex-1 mb-4">{description}</p>
      <Button variant="outline" size="sm" asChild className="self-start">
        <Link to={to}>
          {action}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
