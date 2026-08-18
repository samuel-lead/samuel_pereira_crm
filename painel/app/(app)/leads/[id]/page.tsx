import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registrarNota } from "@/lib/leads/actions";
import { PageHeader } from "@/components/page-header";
import { EditarLeadForm } from "@/components/editar-lead-form";
import { MarcarVendidoForm } from "@/components/marcar-vendido-form";
import { ExcluirLeadButton } from "@/components/excluir-lead-button";
import { ReivindicarLeadButton } from "@/components/reivindicar-lead-button";
import { numerarNiveis, type NivelResumo } from "@/lib/niveis";

type Lead = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  nivel_ordem: number;
  criterio_problema: string | null;
  criterio_urgencia: string;
  criterio_capacidade: string;
  status: string;
  valor_venda: number | null;
  receita_venda: number | null;
  vendido_em: string | null;
  responsavel_id: string | null;
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ marcarReuniao?: string }>;
}) {
  const { id } = await params;
  const { marcarReuniao } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: lead },
    { data: niveisData },
    { data: interacoesData },
    { data: reunioesData },
    { data: usuariosData },
    { data: usuarioAtual },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, nome, telefone_e164, origem, nivel_ordem, criterio_problema, criterio_urgencia, criterio_capacidade, status, valor_venda, receita_venda, vendido_em, responsavel_id"
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
    supabase.from("usuarios").select("id, nome").order("nome"),
    user
      ? supabase.from("usuarios").select("papel").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  if (!lead) {
    notFound();
  }

  const leadTipado = lead as Lead;
  const niveis = (niveisData ?? []) as NivelResumo[];
  const interacoes = (interacoesData ?? []) as Interacao[];
  const reunioes = (reunioesData ?? []) as Reuniao[];
  const usuarios = usuariosData ?? [];
  const souAdmin = usuarioAtual?.papel === "admin";
  const podeEditar = souAdmin || leadTipado.responsavel_id === user?.id;
  const podeReivindicar = !souAdmin && leadTipado.responsavel_id === null;
  const nomeResponsavel = usuarios.find((u) => u.id === leadTipado.responsavel_id)?.nome;
  const registrarNotaComId = registrarNota.bind(null, leadTipado.id);
  const numerosVisiveis = Object.fromEntries(numerarNiveis(niveis));

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
        <div className="flex flex-col gap-4">
          {podeReivindicar && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span>Esse lead ainda não tem responsável.</span>
              <ReivindicarLeadButton leadId={leadTipado.id} />
            </div>
          )}

          {!podeEditar && !podeReivindicar && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Você só pode visualizar este lead — o responsável é{" "}
              <strong>{nomeResponsavel ?? "outra pessoa"}</strong>. Quem edita, move
              ou anota é só ela (ou um admin).
            </div>
          )}

          <EditarLeadForm
            lead={leadTipado}
            niveis={niveis}
            numerosVisiveis={numerosVisiveis}
            usuarios={usuarios}
            souAdmin={souAdmin}
            podeEditar={podeEditar}
            preSelecionarReuniao={marcarReuniao === "1"}
          />
        </div>

        <div className="flex flex-col gap-4">
          {leadTipado.status === "vendido" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-emerald-800">
                ✓ Vendido
              </h2>
              <p className="mt-1 text-sm text-emerald-700">
                Venda:{" "}
                {leadTipado.valor_venda?.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
              <p className="text-sm text-emerald-700">
                Receita:{" "}
                {leadTipado.receita_venda?.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }) ?? "não informada"}
              </p>
              {leadTipado.vendido_em && (
                <p className="mt-1 text-xs text-emerald-600">
                  {formatarData(leadTipado.vendido_em)}
                </p>
              )}
            </div>
          ) : (
            podeEditar && <MarcarVendidoForm leadId={leadTipado.id} />
          )}

          {podeEditar && (
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
          )}

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

          {podeEditar && (
            <ExcluirLeadButton leadId={leadTipado.id} nome={leadTipado.nome} />
          )}
        </div>
      </main>
    </>
  );
}
