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
    <div className="flex min-h-svh bg-[#f5f5f5]">
      {/* Left: Branding */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center px-12">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <svg className="h-20 w-20 mb-4" viewBox="0 0 64 64" fill="none">
            <circle cx="20" cy="32" r="12" fill="#FF9500" />
            <path d="M28 20c6.627 0 12 5.373 12 12s-5.373 12-12 12" stroke="#2e7bff" strokeWidth="6" strokeLinecap="round" />
            <circle cx="44" cy="32" r="8" fill="#2e7bff" />
          </svg>
          <span className="text-4xl font-bold text-text-primary tracking-tight">AIPub</span>
        </div>

        <h2 className="text-2xl font-bold text-text-primary leading-snug text-center mb-2">
          인공지능<br />
          <span className="text-primary">개발</span>·<span className="text-[#FF9500]">운영</span>의 모든것
        </h2>

        <p className="text-sm text-text-secondary mt-4">
          AI Pub 사이트는 크롬 브라우저 사용을 권장합니다.
        </p>
        <p className="text-xs text-text-muted mt-1">©AIPub, TEN Inc</p>
      </div>

      {/* Right: Login Form */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-10">
          <h1 className="text-2xl font-bold text-text-primary mb-8">Sign in</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {/* ID */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">ID</Label>
              <Input
                id="username"
                placeholder="아이디를 입력해 주세요."
                autoComplete="username"
                {...register('username')}
              />
              {errors.username && (
                <p className="text-xs text-error">{errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호를 입력해 주세요."
                  autoComplete="current-password"
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-error">{errors.password.message}</p>
              )}
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="rounded-md bg-error-bg border border-error/20 px-3 py-2">
                <p className="text-sm text-error">{loginError}</p>
              </div>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full h-11 text-base" disabled={isLoading}>
              {isLoading ? '로그인 중...' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
