"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buscarDetalhesDoLead, type DetalhesLead } from "@/lib/leads/actions";
import { ContextoLeadModalAtivo } from "@/components/contexto-lead-modal";
import { ContextoPainelDocumento } from "@/components/contexto-painel-documento";
import { LeadModalConteudo } from "@/components/lead-modal-conteudo";
import { LeadPainelImobiliario } from "@/components/lead-painel-imobiliario";
import { AvatarLead } from "@/components/avatar-lead";
import { lerLeadDoCache, salvarLeadNoCache } from "@/lib/leads/cache-lead";
import { ehImobiliario } from "@/lib/terminologia";

// Pop-up que abre por cima da tela atual ao clicar num lead, sem trocar
// de rota — não usa nenhuma técnica de rota do Next.js (foi exatamente
// uma rota interceptada que causou aquele 404 real em produção antes;
// esse componente não mexe em rota nenhuma, só em estado do React), então
// não corre o mesmo risco.
export function ModalLead({
  leadId,
  marcarReuniao,
  reuniaoAnteriorSumiu,
  abrirProposta,
  nivelPretendido,
  aoFechar,
}: {
  leadId: string;
  marcarReuniao?: boolean;
  reuniaoAnteriorSumiu?: "sim" | "nao";
  abrirProposta?: boolean;
  nivelPretendido?: number;
  aoFechar: () => void;
}) {
  // Se a pessoa passou o mouse no card antes de clicar, os dados já
  // podem estar prontos aqui (ver lib/leads/cache-lead.ts) — o pop-up
  // abre com o conteúdo na hora, sem "Carregando...". Mesmo assim busca
  // de novo por baixo dos panos pra garantir que está atualizado.
  const [dados, setDados] = useState<DetalhesLead | null>(() => lerLeadDoCache(leadId) ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(() => !lerLeadDoCache(leadId));

  // Se a primeira exibição veio do cache, o dado pode estar desatualizado
  // (ex.: o card foi arrastado pra outro nível no Kanban depois do cache
  // ter sido gravado — ver lib/leads/cache-lead.ts). A busca "por baixo dos
  // panos" logo abaixo traz o dado certo, mas só atualizar `dados` não
  // bastava: o formulário de edição guarda o nível escolhido no próprio
  // estado dele, que só lê o valor inicial na hora que monta — continuava
  // preso no nível velho do cache mesmo depois do dado certo chegar, e
  // salvar qualquer outra coisa reenviava esse nível velho, empurrando o
  // lead de volta pra "Novos Leads". Remontar o conteúdo do pop-up nessa
  // hora (via o "key" abaixo) resolve. Só acontece uma vez por abertura —
  // recargas depois disso (ex.: após salvar algo) não mexem nesse contador,
  // pra não apagar o que a pessoa estiver digitando.
  const [revisao, setRevisao] = useState(0);
  const vindoDoCacheRef = useRef(!!lerLeadDoCache(leadId));
  // Enquanto isso for true, o formulário ainda pode estar mostrando o
  // nível/"Repescagem futura" antigos do cache — trava o "Salvar
  // alterações" até a busca por baixo dos panos confirmar (ver comentário
  // grande acima sobre o remonte por "revisao"). Sem essa trava, clicar em
  // salvar rápido demais (antes da resposta chegar) reenviava o estado
  // velho e desmarcava a "Repescagem futura de ICP" sozinho — foi
  // exatamente isso que aconteceu com um lead do Samuel.
  const [confirmandoCache, setConfirmandoCache] = useState(() => !!lerLeadDoCache(leadId));
  // Quando um script (Google Doc) abre do lado direito, o modal precisa
  // se deslocar pra esquerda — senão o painel do documento cobre parte
  // do card, escondendo campos que a pessoa ainda precisa preencher
  // (Samuel pegou isso ao vivo, na "Pré-qualificação para marcar call").
  const [documentoAberto, setDocumentoAberto] = useState(false);

  const carregar = useCallback(async () => {
    const resultado = await buscarDetalhesDoLead(leadId);
    setDados(resultado.dados);
    setErro(resultado.erro);
    setCarregando(false);
    if (resultado.dados) salvarLeadNoCache(leadId, resultado.dados);
    if (vindoDoCacheRef.current) {
      vindoDoCacheRef.current = false;
      setRevisao((r) => r + 1);
    }
    setConfirmandoCache(false);
  }, [leadId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  // Imobiliário pediu um painel lateral (cópia do CRM 100Bug), deslizando
  // da direita, em vez do pop-up centralizado — mentoria continua com o
  // pop-up de sempre, sem nenhuma mudança. Só decide depois que "dados"
  // chega (ou já veio do cache) — enquanto carrega do zero, cai no
  // centralizado por padrão.
  const painelLateral = dados ? ehImobiliario(dados.publicoOrg) : false;

  return (
    <div
      className={
        painelLateral
          ? "fixed inset-0 z-50 flex justify-end bg-black/50"
          : `fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10 transition-[padding] sm:pt-16 ${
              documentoAberto ? "lg:pr-[50vw]" : ""
            }`
      }
      onClick={aoFechar}
    >
      <div
        className={
          painelLateral
            ? "relative flex h-full w-full max-w-xl flex-col bg-[#f4f5f7] shadow-2xl"
            : `relative w-full rounded-xl bg-[#f4f5f7] shadow-2xl transition-[max-width] ${
                documentoAberto ? "lg:max-w-[46vw]" : "max-w-5xl"
              }`
        }
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md hover:bg-neutral-100 hover:text-neutral-800"
        >
          ✕
        </button>

        <div
          className={
            painelLateral
              ? "flex h-full min-h-0 flex-col"
              : "max-h-[85vh] overflow-y-auto rounded-xl"
          }
        >
          {carregando ? (
            <div className="flex h-64 items-center justify-center text-sm text-neutral-400">
              Carregando...
            </div>
          ) : erro || !dados ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-sm text-red-600">{erro ?? "Não deu pra carregar esse lead"}</p>
            </div>
          ) : (
            <>
              <div
                className={`flex shrink-0 items-center gap-3 justify-between border-b border-neutral-200 bg-white px-5 py-4 pr-14 ${
                  painelLateral ? "" : "sticky top-0 z-10 rounded-t-xl"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarLead
                    nome={dados.lead.nome}
                    fotoUrl={dados.lead.foto_url}
                    tamanho="h-14 w-14 text-lg"
                  />
                  <h1 className="truncate text-lg font-bold text-neutral-900">
                    {dados.lead.nome}
                  </h1>
                </div>
              </div>
              <ContextoLeadModalAtivo.Provider
                value={{ recarregar: carregar, fechar: aoFechar }}
              >
                <ContextoPainelDocumento.Provider value={{ setDocumentoAberto }}>
                  {painelLateral ? (
                    <LeadPainelImobiliario
                      key={revisao}
                      dados={dados}
                      marcarReuniao={marcarReuniao}
                      reuniaoAnteriorSumiu={reuniaoAnteriorSumiu}
                      abrirProposta={abrirProposta}
                      nivelPretendido={nivelPretendido}
                      travaSalvarPorCache={confirmandoCache}
                    />
                  ) : (
                    <LeadModalConteudo
                      key={revisao}
                      dados={dados}
                      marcarReuniao={marcarReuniao}
                      reuniaoAnteriorSumiu={reuniaoAnteriorSumiu}
                      abrirProposta={abrirProposta}
                      nivelPretendido={nivelPretendido}
                      travaSalvarPorCache={confirmandoCache}
                      documentoAberto={documentoAberto}
                    />
                  )}
                </ContextoPainelDocumento.Provider>
              </ContextoLeadModalAtivo.Provider>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
