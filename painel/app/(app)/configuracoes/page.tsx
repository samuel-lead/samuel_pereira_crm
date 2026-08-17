import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { atualizarOrg } from "@/lib/configuracoes/actions";

type Org = {
  nome: string;
  vocabulario_encontro: string;
  criterio_1_label: string;
  criterio_2_label: string;
  criterio_3_label: string;
  ticket_medio_padrao: number | null;
};

type MetasConfig = {
  piso_leads_dia: number;
  piso_reunioes_dia: number;
  taxa_agendamento_min: number;
  taxa_comparecimento_min: number;
  taxa_venda_min: number;
};

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500";
const labelClasse = "text-sm font-medium text-neutral-700";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("org_id")
    .eq("id", user!.id)
    .single();

  const [{ data: orgData }, { data: metasData }] = await Promise.all([
    supabase
      .from("orgs")
      .select(
        "nome, vocabulario_encontro, criterio_1_label, criterio_2_label, criterio_3_label, ticket_medio_padrao"
      )
      .eq("id", usuario!.org_id)
      .single(),
    supabase
      .from("metas_config")
      .select(
        "piso_leads_dia, piso_reunioes_dia, taxa_agendamento_min, taxa_comparecimento_min, taxa_venda_min"
      )
      .eq("org_id", usuario!.org_id)
      .single(),
  ]);

  const org = orgData as Org;
  const metas = metasData as MetasConfig | null;

  return (
    <>
      <PageHeader titulo="Configurações" />

      <main className="max-w-2xl px-6 py-6">
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-neutral-800">
            Organização e vocabulário
          </h2>
          <p className="mb-4 text-xs text-neutral-500">
            Isso é o que muda quando o produto migrar pra vender outra coisa
            (ex.: corretor de imóveis) — é só trocar o texto aqui, o sistema
            continua o mesmo.
          </p>

          <form action={atualizarOrg} className="space-y-4">
            <div className="space-y-1">
              <label className={labelClasse} htmlFor="nome">
                Nome da organização
              </label>
              <input
                id="nome"
                name="nome"
                required
                defaultValue={org.nome}
                className={campoClasse}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClasse} htmlFor="vocabulario_encontro">
                Como se chama o encontro comercial
              </label>
              <input
                id="vocabulario_encontro"
                name="vocabulario_encontro"
                required
                defaultValue={org.vocabulario_encontro}
                className={campoClasse}
              />
              <p className="text-xs text-neutral-400">
                No V1 é sempre &quot;reunião&quot;. Nunca escreva
                &quot;visita&quot; aqui.
              </p>
            </div>

            <div className="space-y-1">
              <label className={labelClasse} htmlFor="ticket_medio_padrao">
                Ticket médio padrão (R$)
              </label>
              <input
                id="ticket_medio_padrao"
                name="ticket_medio_padrao"
                type="number"
                step="0.01"
                defaultValue={org.ticket_medio_padrao ?? ""}
                className={campoClasse}
              />
            </div>

            <fieldset className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Os 3 critérios de qualificação
              </legend>

              <div className="space-y-1">
                <label className={labelClasse} htmlFor="criterio_1_label">
                  Critério 1
                </label>
                <input
                  id="criterio_1_label"
                  name="criterio_1_label"
                  required
                  defaultValue={org.criterio_1_label}
                  className={`${campoClasse} bg-white`}
                />
              </div>

              <div className="space-y-1">
                <label className={labelClasse} htmlFor="criterio_2_label">
                  Critério 2
                </label>
                <input
                  id="criterio_2_label"
                  name="criterio_2_label"
                  required
                  defaultValue={org.criterio_2_label}
                  className={`${campoClasse} bg-white`}
                />
              </div>

              <div className="space-y-1">
                <label className={labelClasse} htmlFor="criterio_3_label">
                  Critério 3
                </label>
                <input
                  id="criterio_3_label"
                  name="criterio_3_label"
                  required
                  defaultValue={org.criterio_3_label}
                  className={`${campoClasse} bg-white`}
                />
              </div>
            </fieldset>

            <button
              type="submit"
              className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
            >
              Salvar
            </button>
          </form>
        </div>

        {metas && (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-neutral-800">
              Metas e taxas do sistema
            </h2>
            <p className="mb-4 text-xs text-neutral-500">
              Essas são constantes do sistema — o piso é chão, nunca teto, e
              as taxas nunca são recalculadas por performance. Não dá pra
              editar por aqui de propósito.
            </p>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-neutral-500">Piso de leads/dia</dt>
                <dd className="font-medium text-neutral-900">{metas.piso_leads_dia}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Piso de reuniões/dia</dt>
                <dd className="font-medium text-neutral-900">{metas.piso_reunioes_dia}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Taxa de agendamento mín.</dt>
                <dd className="font-medium text-neutral-900">
                  {Math.round(Number(metas.taxa_agendamento_min) * 100)}%
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Taxa de comparecimento mín.</dt>
                <dd className="font-medium text-neutral-900">
                  {Math.round(Number(metas.taxa_comparecimento_min) * 100)}%
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Taxa de venda mín.</dt>
                <dd className="font-medium text-neutral-900">
                  {Math.round(Number(metas.taxa_venda_min) * 100)}%
                </dd>
              </div>
            </dl>
          </div>
        )}
      </main>
    </>
  );
}
