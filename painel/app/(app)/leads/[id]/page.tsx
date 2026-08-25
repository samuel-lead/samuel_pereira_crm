import { notFound } from "next/navigation";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { BotaoVoltar } from "@/components/botao-voltar";
import { RegistrarNotaForm } from "@/components/registrar-nota-form";
import { RegistrarLigacaoButton } from "@/components/registrar-ligacao-button";
import { ExcluirInteracaoButton } from "@/components/excluir-interacao-button";
import { PageHeader } from "@/components/page-header";
import { EditarLeadForm } from "@/components/editar-lead-form";
import { MarcarVendidoForm } from "@/components/marcar-vendido-form";
import { EditarVendaForm } from "@/components/editar-venda-form";
import { RegistrarPropostaForm } from "@/components/registrar-proposta-form";
import { ProximoContatoForm } from "@/components/proximo-contato-form";
import { ReagendarReuniaoForm } from "@/components/reagendar-reuniao-form";
import { ExcluirLeadButton } from "@/components/excluir-lead-button";
import { ReivindicarLeadButton } from "@/components/reivindicar-lead-button";
import { numerarNiveis, type NivelResumo } from "@/lib/niveis";
import { Reuniao } from "@/lib/terminologia";

const NIVEL_REUNIAO_MARCADA = 4;
const NIVEL_NO_SHOW = 5;

type Lead = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  email: string | null;
  origem: string | null;
  produto: string | null;
  nivel_ordem: number;
  criterio_problema: string | null;
  criterio_urgencia: string;
  criterio_capacidade: string;
  status: string;
  valor_venda: number | null;
  receita_venda: number | null;
  vendido_em: string | null;
  declarado_em: string;
  responsavel_id: string | null;
  oportunidade_futura: boolean;
  motivo_base: string | null;
  proposta_valor: number | null;
  proposta_enviada_em: string | null;
  proposta_observacao: string | null;
  proximo_follow_em: string | null;
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
  marcada_em: string;
  status: string;
  resultado: string | null;
  closer_id: string | null;
  usuario_id: string;
};

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

function formatarData(iso: string) {
  // Sem timeZone explícito, o servidor formata no fuso dele (UTC na
  // Vercel), não no do Brasil — uma ligação das 15h aparecia como se
  // fosse mais tarde. Todo mundo aqui é do Brasil, então fixa o fuso.
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
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
  searchParams: Promise<{ marcarReuniao?: string; confirmarReuniao?: string }>;
}) {
  const { id } = await params;
  const { marcarReuniao, confirmarReuniao } = await searchParams;
  const supabase = await createClient();
  const { user, usuario: usuarioAtual } = await usuarioAutenticado();

  const [
    { data: lead },
    { data: niveisData },
    { data: interacoesData },
    { data: reunioesData },
    { data: usuariosData },
    { data: origensData },
    { data: produtosData },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, nome, telefone_e164, email, origem, produto, nivel_ordem, criterio_problema, criterio_urgencia, criterio_capacidade, status, valor_venda, receita_venda, vendido_em, declarado_em, responsavel_id, oportunidade_futura, motivo_base, proposta_valor, proposta_enviada_em, proposta_observacao, proximo_follow_em"
      )
      .eq("id", id)
      .single(),
    supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
    supabase
      .from("interacoes")
      .select("id, tipo, canal, conteudo, ocorreu_em")
      .eq("lead_id", id)
      .is("excluido_em", null)
      .order("ocorreu_em", { ascending: false }),
    supabase
      .from("reunioes")
      .select("id, agendada_para, marcada_em, status, resultado, closer_id, usuario_id")
      .eq("lead_id", id)
      .order("agendada_para", { ascending: false }),
    supabase.from("usuarios").select("id, nome, funcao").order("nome"),
    supabase.from("origens").select("id, nome").order("nome"),
    supabase.from("produtos").select("nome").order("nome"),
  ]);

  if (!lead) {
    notFound();
  }

  const leadTipado = lead as Lead;
  const niveis = (niveisData ?? []) as NivelResumo[];
  const interacoes = (interacoesData ?? []) as Interacao[];
  const reunioes = (reunioesData ?? []) as Reuniao[];
  const usuarios = usuariosData ?? [];
  const origens = origensData ?? [];
  const produtos = (produtosData ?? []).map((p) => p.nome);
  const souAdmin = usuarioAtual?.papel === "admin";
  const publicoOrg = usuarioAtual?.publico_org ?? "mentoria";
  const souCloserAtivo = reunioes.some(
    (r) => r.status === "marcada" && r.closer_id === user?.id
  );
  const reuniaoAtiva = reunioes.find((r) => r.status === "marcada") ?? null;
  const podeEditar =
    souAdmin || leadTipado.responsavel_id === user?.id || souCloserAtivo;
  const podeReivindicar = !souAdmin && leadTipado.responsavel_id === null;
  const nomeResponsavel = usuarios.find((u) => u.id === leadTipado.responsavel_id)?.nome;
  // SDR original = quem marcou a primeira reunião — depois que a reunião é
  // realizada, o responsável do lead vira o Closer (ver transferir_lead_
  // para_closer), então esse é o único jeito de saber quem foi o SDR.
  const sdrOriginalId = reunioes.length
    ? [...reunioes].sort(
        (a, b) => new Date(a.marcada_em).getTime() - new Date(b.marcada_em).getTime()
      )[0].usuario_id
    : null;
  const nomeSdrOriginal = usuarios.find((u) => u.id === sdrOriginalId)?.nome;
  const numerosVisiveis = Object.fromEntries(numerarNiveis(niveis));

  return (
    <>
      <PageHeader
        titulo={leadTipado.nome}
        acao={
          <BotaoVoltar
            fallbackHref="/leads"
            className="text-sm text-neutral-500 hover:text-neutral-700"
          />
        }
      />

      <main className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-neutral-400">
            Lead adicionado em {formatarData(leadTipado.declarado_em)}
          </p>

          {(nomeResponsavel || nomeSdrOriginal) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">
              <p>
                <span className="text-neutral-500">Responsável atual: </span>
                <span className="font-medium text-neutral-800">
                  {nomeResponsavel ?? "sem responsável"}
                </span>
              </p>
              {nomeSdrOriginal && (
                <p>
                  <span className="text-neutral-500">SDR responsável: </span>
                  <span className="font-medium text-neutral-800">{nomeSdrOriginal}</span>
                </p>
              )}
            </div>
          )}

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
            origens={origens}
            souAdmin={souAdmin}
            podeEditar={podeEditar}
            preSelecionarReuniao={marcarReuniao === "1"}
            preSelecionarNivel={confirmarReuniao}
            publicoOrg={publicoOrg}
          />
        </div>

        <div className="flex flex-col gap-4">
          {podeEditar &&
            leadTipado.nivel_ordem === NIVEL_REUNIAO_MARCADA &&
            reuniaoAtiva && (
              <ReagendarReuniaoForm
                leadId={leadTipado.id}
                reuniaoId={reuniaoAtiva.id}
                agendadaPara={reuniaoAtiva.agendada_para}
                rotulo={Reuniao(publicoOrg)}
              />
            )}

          {podeEditar && leadTipado.status !== "vendido" && (
            <ProximoContatoForm
              leadId={leadTipado.id}
              proximoContatoEm={leadTipado.proximo_follow_em}
            />
          )}

          {leadTipado.status === "vendido" ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-green-800">
                ✓ Vendido
              </h2>
              {leadTipado.produto && (
                <p className="mt-1 text-sm text-green-700">
                  Produto: {leadTipado.produto}
                </p>
              )}
              <p className="mt-1 text-sm text-green-700">
                Venda:{" "}
                {leadTipado.valor_venda?.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
              <p className="text-sm text-green-700">
                Receita:{" "}
                {leadTipado.receita_venda?.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }) ?? "não informada"}
              </p>
              {leadTipado.vendido_em && (
                <p className="mt-1 text-xs text-green-600">
                  {formatarData(leadTipado.vendido_em)}
                </p>
              )}
              {podeEditar && (
                <div className="mt-3">
                  <EditarVendaForm
                    leadId={leadTipado.id}
                    valorVenda={leadTipado.valor_venda}
                    receitaVenda={leadTipado.receita_venda}
                    produto={leadTipado.produto}
                    produtos={produtos}
                  />
                </div>
              )}
            </div>
          ) : (
            podeEditar &&
            leadTipado.nivel_ordem >= NIVEL_REUNIAO_MARCADA &&
            leadTipado.nivel_ordem !== NIVEL_NO_SHOW && (
              <>
                <RegistrarPropostaForm
                  leadId={leadTipado.id}
                  propostaAtual={{
                    valor: leadTipado.proposta_valor,
                    enviadaEm: leadTipado.proposta_enviada_em,
                    observacao: leadTipado.proposta_observacao,
                  }}
                />
                <MarcarVendidoForm
                  leadId={leadTipado.id}
                  temProposta={leadTipado.proposta_valor != null}
                  produtos={produtos}
                />
              </>
            )
          )}

          {podeEditar && <RegistrarLigacaoButton leadId={leadTipado.id} />}

          {podeEditar && (
            <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-neutral-800">
                Registrar nota
              </h2>
              <RegistrarNotaForm leadId={leadTipado.id} />
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
                      {Reuniao(publicoOrg)} · {reuniao.status}
                    </p>
                    <p className="text-sm text-neutral-700">
                      Agendada para {formatarData(reuniao.agendada_para)}
                    </p>
                    <p className="text-xs text-neutral-400">
                      Marcada em {formatarData(reuniao.marcada_em)}
                    </p>
                    {reuniao.closer_id && (
                      <p className="text-xs text-neutral-500">
                        Closer: {usuarios.find((u) => u.id === reuniao.closer_id)?.nome ?? "—"}
                      </p>
                    )}
                    {reuniao.resultado && (
                      <p className="text-xs text-neutral-500">
                        Resultado: {reuniao.resultado}
                      </p>
                    )}
                  </li>
                ))}
                {interacoes.map((interacao) => (
                  <li
                    key={interacao.id}
                    className="group flex items-start justify-between gap-2 border-l-2 border-neutral-200 pl-3"
                  >
                    <div>
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
                    </div>
                    {podeEditar && (
                      <ExcluirInteracaoButton
                        leadId={leadTipado.id}
                        interacaoId={interacao.id}
                      />
                    )}
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
