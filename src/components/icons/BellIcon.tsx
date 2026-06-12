import { cn } from '@/lib/utils';

/** AIPub GNB 알림(bell) 아이콘. aipub-web 과 동일. */
export function BellIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={cn('fill-current stroke-current', className)}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M8.58337 17.4979C8.72286 17.7516 8.92791 17.9632 9.17712 18.1105C9.42632 18.2579 9.71052 18.3357 10 18.3357C10.2896 18.3357 10.5738 18.2579 10.823 18.1105C11.0722 17.9632 11.2772 17.7516 11.4167 17.4979M5 6.66455C5 5.33847 5.52678 4.0667 6.46447 3.12902C7.40215 2.19133 8.67392 1.66455 10 1.66455C11.3261 1.66455 12.5979 2.19133 13.5355 3.12902C14.4732 4.0667 15 5.33847 15 6.66455C15 12.4979 17.5 14.1646 17.5 14.1646H2.5C2.5 14.1646 5 12.4979 5 6.66455Z"
        stroke="currentColor"
        strokeWidth="1.33"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
