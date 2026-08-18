import { LogoutButton } from "@/components/logout-button";

export default function ContaSuspensaPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f5f7] p-6 text-center">
      <h1 className="text-lg font-semibold text-neutral-900">
        O acesso da sua empresa está suspenso
      </h1>
      <p className="max-w-sm text-sm text-neutral-500">
        Fale com quem administra esse CRM pra regularizar e voltar a usar.
      </p>
      <div className="w-40">
        <LogoutButton />
      </div>
    </main>
  );
}
