"use client";

// Hero — orange gradient band with headline + live search.
import { Search, Truck, ShieldCheck, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";

export function Hero({
  query,
  onQuery,
}: {
  query: string;
  onQuery: (q: string) => void;
}) {
  return (
    <section className="relative bg-gradient-to-br from-orange-brand via-[#ff7a47] to-[#e85c2a] text-white overflow-hidden">
      {/* decorative shapes */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-white" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-white" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14 relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl"
        >
          <span className="inline-block bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full text-xs font-medium mb-3">
            🛒 Kesses · Uasin Gishu · Kenya
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Shop local. Pay local. <br className="hidden sm:block" />
            Get it delivered.
          </h1>
          <p className="mt-3 text-white/90 text-sm sm:text-base max-w-xl">
            Groceries, household goods and fresh produce from vendors at Kesses Market,
            Cheptiret and Tulwet — delivered to your door.
          </p>

          {/* Search */}
          <div className="mt-5 relative max-w-xl">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search maize flour, sukuma, milk, soap…"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              className="pl-11 h-12 bg-white text-navy placeholder:text-muted-foreground border-0 shadow-lg"
            />
          </div>
        </motion.div>

        {/* Trust row */}
        <div className="mt-7 grid grid-cols-3 gap-3 max-w-2xl">
          <TrustItem icon={<Truck className="w-4 h-4" />} label="Same-day delivery" />
          <TrustItem icon={<Wallet className="w-4 h-4" />} label="M-Pesa & pay on delivery" />
          <TrustItem icon={<ShieldCheck className="w-4 h-4" />} label="Trusted local vendors" />
        </div>
      </div>
    </section>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-2.5 py-2">
      <span className="shrink-0">{icon}</span>
      <span className="text-xs sm:text-sm font-medium leading-tight">{label}</span>
    </div>
  );
}
