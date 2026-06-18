import logoUrl from '@/assets/imagekit-logo.png';

type BrandLogoProps = {
  className?: string;
};

/**
 * ImageKit 브랜드 심볼(favicon 과 동일한 에셋).
 * 컬러 PNG 이므로 부모의 text-color 가 아닌 이미지 자체 색으로 그려지며,
 * `object-contain` 으로 정사각이 아닌 원본 비율(42x48)을 유지한다.
 * AIPub 플랫폼 자체를 가리키는 표식에는 `Logo`(AIPub 심볼)를 계속 사용한다.
 */
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img src={logoUrl} alt="" aria-hidden="true" className={`object-contain ${className ?? ''}`} />
  );
}
