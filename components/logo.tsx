// HustleCart Kesses — Bag + K logo (inline SVG, no external assets)
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl";

const sizePx: Record<Size, number> = { sm: 24, md: 32, lg: 48, xl: 72 };

export function Logo({
  size = "md",
  className,
  withWordmark = false,
}: {
  size?: Size;
  className?: string;
  withWordmark?: boolean;
}) {
  const px = sizePx[size];
  const wordmarkSize =
    size === "sm" ? "text-sm" : size === "md" ? "text-base" : size === "lg" ? "text-xl" : "text-3xl";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BagKMark width={px} height={px} />
      {withWordmark && (
        <div className={cn("font-extrabold tracking-tight text-navy", wordmarkSize)}>
          Hustle<span className="text-orange-brand">Cart</span>{" "}
          <span className="text-muted-foreground font-semibold">Kesses</span>
        </div>
      )}
    </div>
  );
}

export function BagKMark({
  width = 32,
  height = 32,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="HustleCart Kesses logo"
      role="img"
    >
      {/* Bag body */}
      <rect
        x="6"
        y="14"
        width="36"
        height="30"
        rx="5"
        fill="#FF6B35"
      />
      {/* Bag handle */}
      <path
        d="M16 16 V12 a8 8 0 0 1 16 0 V16"
        stroke="#1B263B"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Highlight stripe */}
      <rect x="6" y="14" width="36" height="3" fill="#FFE8D6" opacity="0.45" />
      {/* The letter K */}
      <path
        d="M19 22 L19 36 M19 29 L28 22 M19 29 L28 36"
        stroke="#FFF8F0"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
