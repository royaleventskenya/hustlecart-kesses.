// Site footer — sticky to bottom. Includes the HustleCart brand, links,
// and an "Install on your phone" + "Share with friends" CTA row so the
// operator + shoppers can easily install the PWA + share the link.
import { BagKMark } from "@/components/logo";
import { InstallAppButton } from "@/components/install-app-button";
import { ShareAppButton } from "@/components/share-app-button";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Install + Share CTA row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5 pb-5 border-b border-border">
          <div className="text-center sm:text-left">
            <div className="text-sm font-bold text-navy">Get HustleCart on your phone</div>
            <div className="text-xs text-muted-foreground">
              Install the app for instant access + share with friends around Kesses.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InstallAppButton
              variant="default"
              size="sm"
              className="bg-orange-brand hover:bg-orange-brand/90 text-white"
              label="Install"
            />
            <ShareAppButton
              variant="outline"
              size="sm"
              label="Share"
            />
          </div>
        </div>

        {/* Brand row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <BagKMark width={28} height={28} />
            <div>
              <div className="text-sm font-bold text-navy">
                Hustle<span className="text-orange-brand">Cart</span> Kesses
              </div>
              <div className="text-xs text-muted-foreground">
                Connecting Kesses vendors and shoppers.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-navy transition-colors">About</a>
            <a href="#" className="hover:text-navy transition-colors">Vendors</a>
            <a href="#" className="hover:text-navy transition-colors">Support</a>
            <span className="hidden sm:inline">·</span>
            <span>© 2026 HustleCart Kesses</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
