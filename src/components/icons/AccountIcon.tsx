import { cn } from '@/lib/utils';

/** AIPub GNB 프로필(account) 아이콘. aipub-web 과 동일. */
export function AccountIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={cn('fill-current', className)}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9.99996 9.99996C12.302 9.99996 14.1666 8.13538 14.1666 5.83329C14.1666 3.53121 12.302 1.66663 9.99996 1.66663C7.69788 1.66663 5.83329 3.53121 5.83329 5.83329C5.83329 8.13538 7.69788 9.99996 9.99996 9.99996ZM9.99996 12.0833C7.21871 12.0833 1.66663 13.4791 1.66663 16.25V18.3333H18.3333V16.25C18.3333 13.4791 12.7812 12.0833 9.99996 12.0833Z"
        fill="currentColor"
      />
    </svg>
  );
}
