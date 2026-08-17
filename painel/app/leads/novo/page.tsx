import Link from "next/link";
import { criarLead } from "@/lib/leads/actions";

export default function NovoLeadPage() {
  return (
    <main className="mx-auto max-w-lg p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Novo lead</h1>
        <Link href="/leads" className="text-sm text-neutral-500">
          Cancelar
        </Link>
      </div>

      <form action={criarLead} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="nome">
            Nome *
          </label>
          <input
            id="nome"
            name="nome"
            required
            className="w-full rounded border border-neutral-300 px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="telefone">
            Telefone
          </label>
          <input
            id="telefone"
            name="telefone"
            placeholder="+55 62 99999-9999"
            className="w-full rounded border border-neutral-300 px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="origem">
            Origem
          </label>
          <input
            id="origem"
            name="origem"
            placeholder="Ex.: campanha Instagram, indicação..."
            className="w-full rounded border border-neutral-300 px-3 py-2"
          />
        </div>

        <p className="text-xs text-neutral-400">
          O lead entra no nível 1 (Sem conversa iniciada). Os 3 critérios de
          qualificação você preenche depois, editando o lead.
        </p>

        <button
          type="submit"
          className="w-full rounded bg-neutral-900 px-3 py-2 text-white"
        >
          Salvar lead
        </button>
      </form>
    </main>
  );
}
