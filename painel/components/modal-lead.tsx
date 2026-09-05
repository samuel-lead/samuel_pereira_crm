"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buscarDetalhesDoLead, type DetalhesLead } from "@/lib/leads/actions";
import { ContextoLeadModalAtivo } from "@/components/contexto-lead-modal";
import { LeadModalConteudo } from "@/components/lead-modal-conteudo";
import { lerLeadDoCache, salvarLeadNoCache } from "@/lib/leads/cache-lead";

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
  aoFechar,
}: {
  leadId: string;
  marcarReuniao?: boolean;
  reuniaoAnteriorSumiu?: "sim" | "nao";
  abrirProposta?: boolean;
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10 sm:pt-16"
      onClick={aoFechar}
    >
      <div
        className="relative w-full max-w-5xl rounded-xl bg-[#f4f5f7] shadow-2xl"
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

        <div className="max-h-[85vh] overflow-y-auto rounded-xl">
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
              <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b border-neutral-200 bg-white px-5 py-4 pr-14">
                <h1 className="truncate text-lg font-bold text-neutral-900">
                  {dados.lead.nome}
                </h1>
              </div>
              <ContextoLeadModalAtivo.Provider
                value={{ recarregar: carregar, fechar: aoFechar }}
              >
                <LeadModalConteudo
                  key={revisao}
                  dados={dados}
                  marcarReuniao={marcarReuniao}
                  reuniaoAnteriorSumiu={reuniaoAnteriorSumiu}
                  abrirProposta={abrirProposta}
                />
              </ContextoLeadModalAtivo.Provider>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
