"use client";

import { RegistrarNotaForm } from "@/components/registrar-nota-form";
import { RegistrarLigacaoButton } from "@/components/registrar-ligacao-button";
import { ExcluirInteracaoButton } from "@/components/excluir-interacao-button";
import { EditarLeadForm } from "@/components/editar-lead-form";
import { EditarVendaForm } from "@/components/editar-venda-form";
import { PropostaVendaCard } from "@/components/proposta-venda-card";
import { ProximoContatoForm } from "@/components/proximo-contato-form";
import { ReagendarReuniaoForm } from "@/components/reagendar-reuniao-form";
import { ExcluirLeadButton } from "@/components/excluir-lead-button";
import { ReivindicarLeadButton } from "@/components/reivindicar-lead-button";
import { DiaFollowSelector } from "@/components/dia-follow-selector";
import { Reuniao } from "@/lib/terminologia";
import type { DetalhesLead } from "@/lib/leads/actions";

const NIVEL_REUNIAO_MARCADA = 4;
const NIVEL_NO_SHOW = 5;
const NIVEL_REAGENDAMENTO = 6;

const ROTULO_STATUS_REUNIAO: Record<string, string> = {
  marcada: "Marcada",
  realizada: "Realizada",
  nao_compareceu: "Não compareceu",
  cancelada: "Cancelada (avisou antes)",
};

function rotuloStatusReuniao(reuniao: { status: string; reagendada: boolean }) {
  if (reuniao.status === "marcada" && reuniao.reagendada) return "Remarcada";
  return ROTULO_STATUS_REUNIAO[reuniao.status] ?? reuniao.status;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Mesmo conteúdo de app/(app)/leads/[id]/page.tsx, mas recebendo os dados
// já prontos (buscados por components/modal-lead.tsx via server action)
// em vez de buscar sozinho — é o que permite isso rodar num pop-up, sem
// virar uma rota nova.
export function LeadModalConteudo({
  dados,
  marcarReuniao,
  reuniaoAnteriorSumiu,
}: {
  dados: DetalhesLead;
  marcarReuniao?: boolean;
  reuniaoAnteriorSumiu?: "sim" | "nao";
}) {
  const {
    lead,
    niveis,
    interacoes,
    reunioes,
    nivelHistorico,
    usuarios,
    origens,
    produtos,
    souAdmin,
    publicoOrg,
    podeEditar,
    podeReivindicar,
    nomeResponsavel,
    nomeSdrOriginal,
    reuniaoAtiva,
    reuniaoAnteriorPendente,
    numerosVisiveis,
    iscaResposta,
  } = dados;

  const nomePorOrdem = new Map(niveis.map((n) => [n.ordem, n.nome]));

  return (
    <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-neutral-400">
          Lead adicionado em {formatarData(lead.declarado_em)}
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
            <ReivindicarLeadButton leadId={lead.id} />
          </div>
        )}

        {!podeEditar && !podeReivindicar && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Você só pode visualizar este lead — o responsável é{" "}
            <strong>{nomeResponsavel ?? "outra pessoa"}</strong>. Quem edita, move
            ou anota é só ela (ou um admin).
          </div>
        )}

        {iscaResposta && (
          <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Respostas do cadastro na isca
            </p>
            {iscaResposta.tempo_mercado && (
              <p>
                <span className="text-neutral-500">Tempo no mercado: </span>
                <span className="font-medium text-neutral-800">{iscaResposta.tempo_mercado}</span>
              </p>
            )}
            {iscaResposta.atuacao && (
              <p>
                <span className="text-neutral-500">Atuação: </span>
                <span className="font-medium text-neutral-800">{iscaResposta.atuacao}</span>
              </p>
            )}
            {iscaResposta.prioridade !== null && (
              <p>
                <span className="text-neutral-500">É prioridade resolver agora: </span>
                <span className="font-medium text-neutral-800">
                  {iscaResposta.prioridade ? "Sim" : "Não"}
                </span>
              </p>
            )}
            {iscaResposta.maior_desafio && (
              <p>
                <span className="text-neutral-500">Maior desafio: </span>
                <span className="font-medium text-neutral-800">{iscaResposta.maior_desafio}</span>
              </p>
            )}
          </div>
        )}

        <EditarLeadForm
          lead={lead}
          niveis={niveis}
          numerosVisiveis={numerosVisiveis}
          usuarios={usuarios}
          origens={origens}
          souAdmin={souAdmin}
          podeEditar={podeEditar}
          preSelecionarReuniao={!!marcarReuniao}
          reuniaoAnteriorPendente={reuniaoAnteriorPendente}
          reuniaoAnteriorSumiuPredefinido={reuniaoAnteriorSumiu}
          publicoOrg={publicoOrg}
          jaTeveReuniao={reunioes.length > 0}
          reuniaoAtivaAgendadaPara={reuniaoAtiva?.agendada_para ?? null}
        />
      </div>

      <div className="flex flex-col gap-4">
        {podeEditar && lead.nivel_ordem === NIVEL_REUNIAO_MARCADA && reuniaoAtiva && (
          <ReagendarReuniaoForm
            leadId={lead.id}
            reuniaoId={reuniaoAtiva.id}
            agendadaPara={reuniaoAtiva.agendada_para}
            rotulo={Reuniao(publicoOrg)}
          />
        )}

        {podeEditar && lead.status !== "vendido" && (
          <ProximoContatoForm leadId={lead.id} proximoContatoEm={lead.proximo_follow_em} />
        )}

        {lead.status === "vendido" ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-green-800">✓ Vendido</h2>
            {lead.produto && (
              <p className="mt-1 text-sm text-green-700">Produto: {lead.produto}</p>
            )}
            <p className="mt-1 text-sm text-green-700">
              Venda:{" "}
              {lead.valor_venda?.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
            <p className="text-sm text-green-700">
              Receita:{" "}
              {lead.receita_venda?.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              }) ?? "não informada"}
            </p>
            {lead.vendido_em && (
              <p className="mt-1 text-xs text-green-600">{formatarData(lead.vendido_em)}</p>
            )}
            {podeEditar && (
              <div className="mt-3">
                <EditarVendaForm
                  leadId={lead.id}
                  valorVenda={lead.valor_venda}
                  receitaVenda={lead.receita_venda}
                  produto={lead.produto}
                  produtos={produtos}
                />
              </div>
            )}
          </div>
        ) : (
          podeEditar &&
          lead.nivel_ordem >= NIVEL_REUNIAO_MARCADA &&
          lead.nivel_ordem !== NIVEL_NO_SHOW &&
          lead.nivel_ordem !== NIVEL_REAGENDAMENTO && (
            <PropostaVendaCard
              leadId={lead.id}
              propostaAtual={{
                valor: lead.proposta_valor,
                enviadaEm: lead.proposta_enviada_em,
                observacao: lead.proposta_observacao,
              }}
              produtos={produtos}
            />
          )
        )}

        {podeEditar && <RegistrarLigacaoButton leadId={lead.id} />}

        {podeEditar && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-neutral-800">Registrar nota</h2>
            <RegistrarNotaForm leadId={lead.id} />
          </div>
        )}

        {podeEditar && <DiaFollowSelector leadId={lead.id} diaFollow={lead.dia_follow} />}

        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-neutral-800">Linha do tempo</h2>

          {interacoes.length === 0 && reunioes.length === 0 && nivelHistorico.length === 0 ? (
            <p className="rounded-md border border-dashed border-neutral-300 px-3 py-6 text-center text-xs text-neutral-400">
              Nada registrado ainda
            </p>
          ) : (
            <ul className="space-y-3">
              {reunioes.map((reuniao) => (
                <li key={`reuniao-${reuniao.id}`} className="border-l-2 border-amber-300 pl-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    {Reuniao(publicoOrg)} · {rotuloStatusReuniao(reuniao)}
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
                    <p className="text-xs text-neutral-500">Resultado: {reuniao.resultado}</p>
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
                    <p className="text-sm text-neutral-700">{interacao.conteudo}</p>
                    <p className="text-xs text-neutral-400">{formatarData(interacao.ocorreu_em)}</p>
                  </div>
                  {podeEditar && (
                    <ExcluirInteracaoButton leadId={lead.id} interacaoId={interacao.id} />
                  )}
                </li>
              ))}
              {nivelHistorico.map((h) => (
                <li key={`nivel-${h.id}`} className="border-l-2 border-blue-300 pl-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Nível · {h.automatico ? "Automático" : "Manual"}
                  </p>
                  <p className="text-sm text-neutral-700">
                    {nomePorOrdem.get(h.de_ordem) ?? h.de_ordem} →{" "}
                    {nomePorOrdem.get(h.para_ordem) ?? h.para_ordem}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {formatarData(h.ocorreu_em)}
                    {h.usuario_id &&
                      ` · ${usuarios.find((u) => u.id === h.usuario_id)?.nome ?? "—"}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {podeEditar && lead.status !== "vendido" && (
          <ExcluirLeadButton leadId={lead.id} nome={lead.nome} />
        )}
      </div>
    </div>
  );
}
