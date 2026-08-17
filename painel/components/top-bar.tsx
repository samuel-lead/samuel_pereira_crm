import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export function TopBar({
  acaoPrincipal,
}: {
  acaoPrincipal?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/leads" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-900 text-sm font-bold text-white">
            MV
          </span>
          <span className="text-base font-semibold text-neutral-900">
            Meu Vendedor
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {acaoPrincipal}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
