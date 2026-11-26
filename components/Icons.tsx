import type { ReactNode } from "react";

type IconProps = { className?: string };

function Svg({
  className = "h-5 w-5",
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function Mark({ className = "h-8 w-8" }: IconProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[9px] bg-accent text-white ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4v16h12" />
        <path d="M10 8h7" />
        <path d="M10 13h7" />
      </svg>
    </span>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </Svg>
  );
}

export function CustomersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16.5 5.2a3 3 0 0 1 0 5.6" />
      <path d="M17 14.5a4.5 4.5 0 0 1 3.5 4.4" />
    </Svg>
  );
}

export function ProductIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </Svg>
  );
}

export function PriceIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.2a2.7 2.7 0 0 0-2.5-1.3c-1.6 0-2.7.9-2.7 2.2 0 3.1 5.4 1.3 5.4 4.5 0 1.4-1.2 2.4-2.9 2.4a3 3 0 0 1-2.8-1.5" />
      <path d="M12 6.2v11.6" />
    </Svg>
  );
}

export function SubscriptionIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 4v4.5h-4.5" />
      <path d="M12 8v4l3 2" />
    </Svg>
  );
}

export function CheckoutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19" />
      <path d="M6.5 15h4" />
    </Svg>
  );
}

export function InvoiceIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9.5 8h5M9.5 12h5" />
    </Svg>
  );
}

export function RefundIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 8H5V4" />
      <path d="M5.3 8A8 8 0 1 1 4 12" />
      <path d="M14.5 9.5 10 14l-2-2" />
    </Svg>
  );
}

export function DisputeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 3.5 18h17L12 3Z" />
      <path d="M12 9v4.5" />
      <circle cx="12" cy="16.6" r="0.6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function BalanceIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
      <circle cx="17" cy="15" r="1.2" />
    </Svg>
  );
}

export function PayoutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
      <path d="M4 11h16" />
      <path d="M15 16h2" />
      <path d="M7 4h10" />
    </Svg>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.9 12.1 8-8" />
      <path d="m16 5 3 3M14 7l3 3" />
    </Svg>
  );
}

export function WebhookIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M10.7 6.7 6.4 16.2M13.3 6.7l4.3 9.5M7 18h10" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </Svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="m15 8 4 4-4 4M19 12H9" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4.5 12.5 5 5L20 7" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6 18 18M18 6 6 18" />
    </Svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <circle cx="12" cy="16.4" r="0.6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z" />
    </Svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6a3 3 0 0 0-3 3v6.5A2.5 2.5 0 0 0 5.5 15" />
    </Svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function TrendIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 17 9 11l4 4 8-8" />
      <path d="M16 7h5v5" />
    </Svg>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </Svg>
  );
}
