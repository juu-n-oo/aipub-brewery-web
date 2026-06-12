import { cn } from '@/lib/utils';

/** AIPub GNB 공지(bullhorn) 아이콘. aipub-web 과 동일. */
export function BullhornIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={cn('fill-current stroke-none', className)}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M17.0512 7.86212V2.5437C17.0512 2.05924 16.6686 1.6665 16.1965 1.6665H15.3418C13.6507 3.40215 10.4724 4.37464 8.50423 4.83564V14.2869C10.4724 14.7478 13.6507 15.7204 15.3418 17.456H16.1965C16.6686 17.456 17.0512 17.0633 17.0512 16.5788V11.2604C17.7885 11.0656 18.3333 10.3787 18.3333 9.56124C18.3333 8.74378 17.7885 8.05685 17.0512 7.86212ZM3.37603 5.17528C2.43195 5.17528 1.66663 5.96074 1.66663 6.92966V12.1928C1.66663 13.1618 2.43195 13.9472 3.37603 13.9472H4.23073L5.08543 18.3332H6.79483V5.17528H3.37603Z"
        fill="currentColor"
      />
    </svg>
  );
}
