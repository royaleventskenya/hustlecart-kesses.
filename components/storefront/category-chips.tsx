"use client";

// Horizontal-scroll category chips.
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Category = { id: string; name: string; slug: string };

export function CategoryChips({
  categories,
  active,
  onSelect,
}: {
  categories: Category[];
  active: string | null; // slug or null = all
  onSelect: (slug: string | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollBy(dir: -1 | 1) {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-thin py-1"
        style={{ scrollbarWidth: "thin" }}
      >
        <Chip active={active === null} onClick={() => onSelect(null)}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip key={c.id} active={active === c.slug} onClick={() => onSelect(c.slug)}>
            {c.name}
          </Chip>
        ))}
      </div>
      <button
        onClick={() => scrollBy(-1)}
        className="absolute left-0 top-0 bottom-0 px-1 bg-gradient-to-r from-cream to-transparent items-center justify-center hidden sm:flex"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-4 h-4 text-muted-foreground" />
      </button>
      <button
        onClick={() => scrollBy(1)}
        className="absolute right-0 top-0 bottom-0 px-1 bg-gradient-to-l from-cream to-transparent items-center justify-center hidden sm:flex"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
        active
          ? "bg-orange-brand text-white border-orange-brand"
          : "bg-card text-navy border-border hover:border-orange-brand/40 hover:bg-soft-orange"
      }`}
    >
      {children}
    </button>
  );
}
