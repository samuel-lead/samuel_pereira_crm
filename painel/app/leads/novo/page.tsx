import Link from "next/link";
import { criarLead } from "@/lib/leads/actions";
import { TopBar } from "@/components/top-bar";

export default function NovoLeadPage() {
  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <TopBar />

      <main className="mx-auto max-w-lg px-6 py-10">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-neutral-900">
              Novo lead
            </h1>
            <Link
              href="/leads"
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              Cancelar
            </Link>
          </div>

          <form action={criarLead} className="space-y-4">
            <div className="space-y-1">
              <label
                className="text-sm font-medium text-neutral-700"
                htmlFor="nome"
              >
                Nome *
              </label>
              <input
                id="nome"
                name="nome"
                required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
              />
            </div>

            <div className="space-y-1">
              <label
                className="text-sm font-medium text-neutral-700"
                htmlFor="telefone"
              >
                Telefone
              </label>
              <input
                id="telefone"
                name="telefone"
                placeholder="+55 62 99999-9999"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
              />
            </div>

            <div className="space-y-1">
              <label
                className="text-sm font-medium text-neutral-700"
                htmlFor="origem"
              >
                Origem
              </label>
              <input
                id="origem"
                name="origem"
                placeholder="Ex.: campanha Instagram, indicação..."
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
              />
            </div>

            <p className="rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
              O lead entra no nível 1 (Sem conversa iniciada). Os 3 critérios
              de qualificação você preenche depois, editando o lead.
            </p>

            <button
              type="submit"
              className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800"
            >
              Salvar lead
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
