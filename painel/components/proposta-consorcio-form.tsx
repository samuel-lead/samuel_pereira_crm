"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  PROPOSTA_CONSORCIO_VAZIA,
  montarTextoPropostaConsorcio,
  type PropostaConsorcio,
} from "@/lib/proposta-consorcio";

function formatarCentavos(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Campo de dinheiro: a pessoa digita só os números e ele vira R$ sozinho.
// O valor "limpo" (ex.: 70000.00) vai num campo escondido, que o formulário
// do lead envia junto ao salvar.
function CampoDinheiro({
  rotulo,
  nome,
  valor,
  aoMudar,
}: {
  rotulo: string;
  nome: string;
  valor: number | null;
  aoMudar: (novo: number | null) => void;
}) {
  function aoDigitar(evento: ChangeEvent<HTMLInputElement>) {
    const digitos = evento.target.value.replace(/\D/g, "");
    aoMudar(digitos ? Number(digitos) / 100 : null);
  }
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-green-800">{rotulo}</label>
      <input
        type="text"
        inputMode="numeric"
        value={valor !== null ? formatarCentavos(Math.round(valor * 100)) : ""}
        onChange={aoDigitar}
        placeholder="R$ 0,00"
        className="w-full rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
      />
      <input type="hidden" name={nome} value={valor !== null ? valor.toFixed(2) : ""} />
    </div>
  );
}

// Proposta de consórcio (Banker): aparece no card do lead quando ele vai pra
// "Proposta iniciada" (ou já está nela / em "Aguardando pagamento").
export function PropostaConsorcioForm({
  inicial,
  soSimulacao = false,
}: {
  inicial: PropostaConsorcio | null;
  // Nível "Simulação enviada": mesmo bloco, mas o lead continua em Pré-vendas.
  soSimulacao?: boolean;
}) {
  const [proposta, setProposta] = useState<PropostaConsorcio>(inicial ?? PROPOSTA_CONSORCIO_VAZIA);
  const [copiado, setCopiado] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);

  // Rola até a proposta assim que ela aparece (vindo do botão "Iniciar proposta").
  useEffect(() => {
    raizRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const percentualLance = proposta.lance_percentual ?? 25;

  function atualizar<K extends keyof PropostaConsorcio>(campo: K, valor: PropostaConsorcio[K]) {
    setProposta((atual) => ({ ...atual, [campo]: valor }));
  }

  // Digitou o crédito: o lance embutido (25% do crédito) e o crédito liberado
  // (crédito menos o lance) saem sozinhos. Continuam editáveis, caso o
  // vendedor precise ajustar algum valor na mão.
  function mudarCredito(credito: number | null) {
    setProposta((atual) => {
      if (credito === null) return { ...atual, credito, lance_embutido: null, credito_liberado: null };
      const lance = Math.round(credito * (atual.lance_percentual ?? 25)) / 100;
      return {
        ...atual,
        credito,
        lance_embutido: lance,
        credito_liberado: Math.round((credito - lance) * 100) / 100,
      };
    });
  }

  // Mexeu no lance na mão: o crédito liberado acompanha.
  function mudarLance(lance: number | null) {
    setProposta((atual) => ({
      ...atual,
      lance_embutido: lance,
      credito_liberado:
        atual.credito !== null && lance !== null ? Math.round((atual.credito - lance) * 100) / 100 : atual.credito_liberado,
    }));
  }

  function copiar() {
    navigator.clipboard?.writeText(montarTextoPropostaConsorcio(proposta)).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div ref={raizRef} className="mt-2 scroll-mt-40 space-y-3 rounded-md border border-green-200 bg-green-50 p-3">
      <input type="hidden" name="prop_consorcio_presente" value="1" />
      <div>
        <p className="text-sm font-bold text-green-900">🚘 Consórcio Volkswagen</p>
        <p className="text-xs text-green-800">
          {soSimulacao
            ? "Preencha a simulação. Ao salvar, o lead fica em Pré-vendas, em \"Simulação enviada\"."
            : "Preencha a proposta. Ao salvar, o lead vai para a área de Vendas."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CampoDinheiro
          rotulo="Crédito"
          nome="prop_credito"
          valor={proposta.credito}
          aoMudar={mudarCredito}
        />
        <div>
          <CampoDinheiro
            rotulo={`Lance embutido (${percentualLance}%)`}
            nome="prop_lance"
            valor={proposta.lance_embutido}
            aoMudar={mudarLance}
          />
          <input type="hidden" name="prop_lance_pct" value={percentualLance} />
        </div>
      </div>

      <CampoDinheiro
        rotulo="Crédito liberado"
        nome="prop_credito_liberado"
        valor={proposta.credito_liberado}
        aoMudar={(v) => atualizar("credito_liberado", v)}
      />

      <p className="text-xs font-semibold uppercase tracking-wide text-green-800">Plano de pagamento</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-green-800" htmlFor="prop_prazo">
            Prazo — qual prazo? (meses)
          </label>
          <input
            id="prop_prazo"
            name="prop_prazo"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={proposta.prazo_meses ?? ""}
            onChange={(e) => atualizar("prazo_meses", e.target.value ? Number(e.target.value) : null)}
            placeholder="Ex.: 100"
            className="w-full rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>
        <CampoDinheiro
          rotulo="Valor da parcela"
          nome="prop_parcela"
          valor={proposta.valor_parcela}
          aoMudar={(v) => atualizar("valor_parcela", v)}
        />
      </div>
      <CampoDinheiro
        rotulo="Parcelas após contemplação (aproximadamente)"
        nome="prop_parcelas_apos"
        valor={proposta.parcelas_apos_contemplacao}
        aoMudar={(v) => atualizar("parcelas_apos_contemplacao", v)}
      />

      <div>
        <label className="mb-1 block text-xs font-medium text-green-800" htmlFor="prop_situacao">
          Situação do grupo
        </label>
        <input
          id="prop_situacao"
          name="prop_situacao"
          type="text"
          list="situacoes-grupo"
          value={proposta.situacao ?? ""}
          onChange={(e) => atualizar("situacao", e.target.value)}
          placeholder="Grupo Em Andamento"
          className="w-full rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        <datalist id="situacoes-grupo">
          <option value="Grupo Em Andamento" />
          <option value="Grupo Novo" />
          <option value="Grupo Em Formação" />
        </datalist>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-800">{soSimulacao ? "Texto da simulação" : "Texto da proposta"}</p>
          <button
            type="button"
            onClick={copiar}
            className="rounded-md border border-green-300 bg-white px-2.5 py-1 text-xs font-medium text-green-800 transition hover:bg-green-100"
          >
            {copiado ? "Copiado ✓" : "Copiar texto"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap rounded-md border border-green-200 bg-white p-3 text-xs text-neutral-800">
          {montarTextoPropostaConsorcio(proposta)}
        </pre>
      </div>
    </div>
  );
}
