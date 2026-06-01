import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { login } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

const loginSchema = z.object({
  username: z.string().min(1, '아이디를 입력해 주세요.'),
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoginError('');
    setIsLoading(true);
    try {
      await login(data);
      navigate('/', { replace: true });
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted px-6 py-12">
      <div className="flex w-full max-w-6xl items-center gap-12">
        {/* Left: Branding */}
        <div className="hidden flex-1 flex-col items-center justify-center px-8 lg:flex">
          {/* Logo */}
          <div className="mb-12 flex flex-col items-center">
            <svg className="mb-6 h-32 w-32" viewBox="0 0 64 64" fill="none">
              <circle cx="20" cy="32" r="12" fill="#FF9500" />
              <path
                d="M28 20c6.627 0 12 5.373 12 12s-5.373 12-12 12"
                stroke="var(--primary)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <circle cx="44" cy="32" r="8" fill="var(--primary)" />
            </svg>
            <span className="text-6xl font-bold tracking-tight text-foreground">Dockerizer</span>
          </div>

          <h2 className="mb-3 text-center text-4xl font-bold leading-snug text-foreground">
            인공지능
            <br />
            <span className="text-primary">개발</span>·<span className="text-[#FF9500]">운영</span>
            의 모든것
          </h2>

          <p className="mt-6 text-base text-muted-foreground">
            Dockerizer 사이트는 크롬 브라우저 사용을 권장합니다.
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground/70">©AIPub, TEN Inc</p>
        </div>

        {/* Right: Login Form */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xl rounded-2xl border bg-card p-14 shadow-lg">
            <h1 className="mb-10 text-3xl font-bold text-foreground">Sign in</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-7">
              {/* ID */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="username" className="text-base">
                  ID
                </Label>
                <Input
                  id="username"
                  placeholder="아이디를 입력해 주세요."
                  autoComplete="username"
                  className="h-12 text-base px-4"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-base">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 입력해 주세요."
                    autoComplete="current-password"
                    className="h-12 text-base px-4 pr-12"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Error Message */}
              {loginError && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3">
                  <p className="text-base text-destructive">{loginError}</p>
                </div>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full h-14 text-lg" disabled={isLoading}>
                {isLoading ? '로그인 중...' : 'Sign in'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
