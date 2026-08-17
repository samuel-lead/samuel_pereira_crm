import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { atualizarLead } from "@/lib/leads/actions";

type NivelResumo = {
  ordem: number;
  nome: string;
};

type Lead = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  nivel_ordem: number;
  criterio_problema: string | null;
  criterio_urgencia: string;
  criterio_capacidade: string;
};

export default async function EditarLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: lead }, { data: niveisData }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, nome, telefone_e164, origem, nivel_ordem, criterio_problema, criterio_urgencia, criterio_capacidade"
      )
      .eq("id", id)
      .single(),
    supabase.from("niveis").select("ordem, nome").order("ordem"),
  ]);

  if (!lead) {
    notFound();
  }

  const leadTipado = lead as Lead;
  const niveis = (niveisData ?? []) as NivelResumo[];
  const atualizarComId = atualizarLead.bind(null, leadTipado.id);

  return (
    <main className="mx-auto max-w-lg p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Editar lead</h1>
        <Link href="/leads" className="text-sm text-neutral-500">
          Voltar
        </Link>
      </div>

      <form action={atualizarComId} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="nome">
            Nome *
          </label>
          <input
            id="nome"
            name="nome"
            required
            defaultValue={leadTipado.nome}
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
            defaultValue={leadTipado.telefone_e164 ?? ""}
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
            defaultValue={leadTipado.origem ?? ""}
            className="w-full rounded border border-neutral-300 px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="nivel_ordem">
            Nível
          </label>
          <select
            id="nivel_ordem"
            name="nivel_ordem"
            defaultValue={leadTipado.nivel_ordem}
            className="w-full rounded border border-neutral-300 px-3 py-2"
          >
            {niveis.map((nivel) => (
              <option key={nivel.ordem} value={nivel.ordem}>
                {nivel.ordem}. {nivel.nome}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-3 rounded border border-neutral-200 p-3">
          <legend className="px-1 text-xs font-semibold uppercase text-neutral-500">
            Os 3 critérios de qualificação
          </legend>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="criterio_problema">
              Qual é o problema dele
            </label>
            <textarea
              id="criterio_problema"
              name="criterio_problema"
              rows={2}
              defaultValue={leadTipado.criterio_problema ?? ""}
              className="w-full rounded border border-neutral-300 px-3 py-2"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="criterio_urgencia">
              Tem urgência em resolver
            </label>
            <select
              id="criterio_urgencia"
              name="criterio_urgencia"
              defaultValue={leadTipado.criterio_urgencia}
              className="w-full rounded border border-neutral-300 px-3 py-2"
            >
              <option value="desconhecida">Ainda não sei</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              className="text-sm font-medium"
              htmlFor="criterio_capacidade"
            >
              Consegue pagar a solução
            </label>
            <select
              id="criterio_capacidade"
              name="criterio_capacidade"
              defaultValue={leadTipado.criterio_capacidade}
              className="w-full rounded border border-neutral-300 px-3 py-2"
            >
              <option value="desconhecida">Ainda não sei</option>
              <option value="sim">Sim</option>
              <option value="parcial">Parcial</option>
              <option value="nao">Não</option>
            </select>
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full rounded bg-neutral-900 px-3 py-2 text-white"
        >
          Salvar alterações
        </button>
      </form>
    </main>
  );
}
