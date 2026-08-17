import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { atualizarLead, registrarNota } from "@/lib/leads/actions";
import { PageHeader } from "@/components/page-header";
import { OrigemSelect } from "@/components/origem-select";
import { numerarNiveis, rotuloNivel, type NivelResumo } from "@/lib/niveis";

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

type Interacao = {
  id: string;
  tipo: string | null;
  canal: string | null;
  conteudo: string | null;
  ocorreu_em: string;
};

type Reuniao = {
  id: string;
  agendada_para: string;
  status: string;
  resultado: string | null;
};

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500";
const labelClasse = "text-sm font-medium text-neutral-700";

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EditarLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: lead }, { data: niveisData }, { data: interacoesData }, { data: reunioesData }] =
    await Promise.all([
      supabase
        .from("leads")
        .select(
          "id, nome, telefone_e164, origem, nivel_ordem, criterio_problema, criterio_urgencia, criterio_capacidade"
        )
        .eq("id", id)
        .single(),
      supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
      supabase
        .from("interacoes")
        .select("id, tipo, canal, conteudo, ocorreu_em")
        .eq("lead_id", id)
        .order("ocorreu_em", { ascending: false }),
      supabase
        .from("reunioes")
        .select("id, agendada_para, status, resultado")
        .eq("lead_id", id)
        .order("agendada_para", { ascending: false }),
    ]);

  if (!lead) {
    notFound();
  }

  const leadTipado = lead as Lead;
  const niveis = (niveisData ?? []) as NivelResumo[];
  const interacoes = (interacoesData ?? []) as Interacao[];
  const reunioes = (reunioesData ?? []) as Reuniao[];
  const atualizarComId = atualizarLead.bind(null, leadTipado.id);
  const registrarNotaComId = registrarNota.bind(null, leadTipado.id);
  const numerosVisiveis = numerarNiveis(niveis);

  return (
    <>
      <PageHeader
        titulo={leadTipado.nome}
        acao={
          <Link
            href="/leads"
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            Voltar
          </Link>
        }
      />

      <main className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <form action={atualizarComId} className="space-y-4">
            <div className="space-y-1">
              <label className={labelClasse} htmlFor="nome">
                Nome *
              </label>
              <input
                id="nome"
                name="nome"
                required
                defaultValue={leadTipado.nome}
                className={campoClasse}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClasse} htmlFor="telefone">
                Telefone
              </label>
              <input
                id="telefone"
                name="telefone"
                defaultValue={leadTipado.telefone_e164 ?? ""}
                className={campoClasse}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClasse}>Origem</label>
              <OrigemSelect valorInicial={leadTipado.origem ?? ""} />
            </div>

            <div className="space-y-1">
              <label className={labelClasse} htmlFor="nivel_ordem">
                Nível
              </label>
              <select
                id="nivel_ordem"
                name="nivel_ordem"
                defaultValue={leadTipado.nivel_ordem}
                className={campoClasse}
              >
                {niveis.map((nivel) => (
                  <option key={nivel.ordem} value={nivel.ordem}>
                    {rotuloNivel(nivel, numerosVisiveis.get(nivel.ordem))}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Os 3 critérios de qualificação
              </legend>

              <div className="space-y-1">
                <label className={labelClasse} htmlFor="criterio_problema">
                  Qual é o problema dele
                </label>
                <textarea
                  id="criterio_problema"
                  name="criterio_problema"
                  rows={2}
                  defaultValue={leadTipado.criterio_problema ?? ""}
                  className={`${campoClasse} bg-white`}
                />
              </div>

              <div className="space-y-1">
                <label className={labelClasse} htmlFor="criterio_urgencia">
                  Tem urgência em resolver
                </label>
                <select
                  id="criterio_urgencia"
                  name="criterio_urgencia"
                  defaultValue={leadTipado.criterio_urgencia}
                  className={`${campoClasse} bg-white`}
                >
                  <option value="desconhecida">Ainda não sei</option>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className={labelClasse} htmlFor="criterio_capacidade">
                  Consegue pagar a solução
                </label>
                <select
                  id="criterio_capacidade"
                  name="criterio_capacidade"
                  defaultValue={leadTipado.criterio_capacidade}
                  className={`${campoClasse} bg-white`}
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
              className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
            >
              Salvar alterações
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-neutral-800">
              Registrar nota
            </h2>
            <form action={registrarNotaComId} className="space-y-2">
              <textarea
                name="conteudo"
                required
                rows={3}
                placeholder="Ex.: liguei, ficou de ver a agenda e responder amanhã..."
                className={campoClasse}
              />
              <button
                type="submit"
                className="w-full rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
              >
                Adicionar à linha do tempo
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-neutral-800">
              Linha do tempo
            </h2>

            {interacoes.length === 0 && reunioes.length === 0 ? (
              <p className="rounded-md border border-dashed border-neutral-300 px-3 py-6 text-center text-xs text-neutral-400">
                Nada registrado ainda
              </p>
            ) : (
              <ul className="space-y-3">
                {reunioes.map((reuniao) => (
                  <li key={`reuniao-${reuniao.id}`} className="border-l-2 border-amber-300 pl-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                      Reunião · {reuniao.status}
                    </p>
                    <p className="text-sm text-neutral-700">
                      Agendada para {formatarData(reuniao.agendada_para)}
                    </p>
                    {reuniao.resultado && (
                      <p className="text-xs text-neutral-500">
                        Resultado: {reuniao.resultado}
                      </p>
                    )}
                  </li>
                ))}
                {interacoes.map((interacao) => (
                  <li key={interacao.id} className="border-l-2 border-neutral-200 pl-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      {interacao.tipo ?? "interação"}
                      {interacao.canal ? ` · ${interacao.canal}` : ""}
                    </p>
                    <p className="text-sm text-neutral-700">
                      {interacao.conteudo}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {formatarData(interacao.ocorreu_em)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
