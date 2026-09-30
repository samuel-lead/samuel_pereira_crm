"use client";

import { useState, useTransition } from "react";
import { atualizarCobrancaOrg, marcarOrgComoPaga } from "@/lib/plataforma/actions";
import { StatusCobrancaBadge } from "@/components/status-cobranca-badge";

function formatarDataHora(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function CobrancaOrgForm({
  orgId,
  diaVencimentoInicial,
  mensalidadeValorInicial,
  ultimoPagamentoEm,
}: {
  orgId: string;
  diaVencimentoInicial: number | null;
  mensalidadeValorInicial: number | null;
  ultimoPagamentoEm: string | null;
}) {
  const [diaVencimento, setDiaVencimento] = useState(diaVencimentoInicial?.toString() ?? "");
  const [mensalidadeValor, setMensalidadeValor] = useState(mensalidadeValorInicial?.toString() ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function salvar() {
    setErro(null);
    iniciarTransicao(async () => {
      try {
        await atualizarCobrancaOrg(
          orgId,
          diaVencimento ? Number(diaVencimento) : null,
          mensalidadeValor ? Number(mensalidadeValor) : null
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu pra salvar");
      }
    });
  }

  function marcarPago() {
    setErro(null);
    iniciarTransicao(async () => {
      try {
        await marcarOrgComoPaga(orgId);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu pra marcar como pago");
      }
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">Cobrança da mensalidade</h2>
        <StatusCobrancaBadge diaVencimento={diaVencimentoInicial} ultimoPagamentoEm={ultimoPagamentoEm} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Dia do vencimento
          <input
            type="number"
            min={1}
            max={31}
            value={diaVencimento}
            onChange={(e) => setDiaVencimento(e.target.value)}
            placeholder="Ex.: 18"
            className="w-24 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-blue-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Valor da mensalidade
          <input
            type="number"
            min={0}
            step="0.01"
            value={mensalidadeValor}
            onChange={(e) => setMensalidadeValor(e.target.value)}
            placeholder="Ex.: 297"
            className="w-32 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-blue-400"
          />
        </label>
        <button
          type="button"
          onClick={salvar}
          disabled={pendente}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={marcarPago}
          disabled={pendente}
          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          Marcar como pago hoje
        </button>
      </div>

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}

      <p className="mt-3 text-xs text-neutral-400">
        {ultimoPagamentoEm
          ? `Último pagamento registrado: ${formatarDataHora(ultimoPagamentoEm)}`
          : "Nenhum pagamento registrado ainda"}
        {" · "}O CRM não cobra de verdade — isso só ajuda você a lembrar quem está em dia.
      </p>
    </div>
  );
}
