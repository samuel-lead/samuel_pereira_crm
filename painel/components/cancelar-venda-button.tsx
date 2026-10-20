"use client";

import { useState, useTransition } from "react";
import { cancelarVenda } from "@/lib/leads/actions";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";
import { MenuSelect } from "@/components/menu-select";
import { motivosBaseDaOrg } from "@/lib/niveis";

// Cancelar a venda de um cliente: pede o motivo, a coluna da Base pra onde o
// lead vai e o dia do próximo contato (mesma regra de qualquer lead que
// entra na Base). Só aparece no card de quem já é cliente.
export function CancelarVendaButton({
  leadId,
  nome,
  publicoOrg,
}: {
  leadId: string;
  nome: string;
  publicoOrg: string;
}) {
  const modalAtivo = useLeadModalAtivo();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [colunaBase, setColunaBase] = useState("");
  const [proximoContato, setProximoContato] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function aoConfirmar() {
    if (!motivo.trim()) {
      setErro("Escreva o motivo do cancelamento.");
      return;
    }
    if (!colunaBase) {
      setErro("Escolha para qual coluna da Base o lead vai.");
      return;
    }
    if (!proximoContato) {
      setErro("Escolha o dia do próximo contato.");
      return;
    }
    if (
      !confirm(
        `Cancelar a venda de "${nome}"? Ela sai de Clientes e do faturamento, e o lead vai pra Base.`
      )
    ) {
      return;
    }
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await cancelarVenda(leadId, motivo, colunaBase, proximoContato);
      if (resultado) {
        setErro(resultado);
        return;
      }
      modalAtivo?.recarregar();
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
      >
        Cancelar venda
      </button>
    );
  }

  const amanha = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  return (
    <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-semibold text-red-700">Cancelar a venda</p>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-700" htmlFor="motivo_cancelamento">
          Por que a venda foi cancelada?
        </label>
        <textarea
          id="motivo_cancelamento"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          disabled={pendente}
          rows={3}
          placeholder="Ex.: o cliente desistiu, o pagamento não foi feito..."
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-700">
          Para qual coluna da Base ele vai?
        </label>
        <MenuSelect
          placeholder="Selecione a coluna..."
          disabled={pendente}
          value={colunaBase}
          onChange={setColunaBase}
          options={motivosBaseDaOrg(publicoOrg).map((m) => ({ value: m.valor, label: m.nome }))}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-700">
          Quando será o próximo contato?
        </label>
        <input
          type="date"
          value={proximoContato}
          min={amanha}
          disabled={pendente}
          onClick={(e) => e.currentTarget.showPicker?.()}
          onChange={(e) => setProximoContato(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={aoConfirmar}
          disabled={pendente}
          className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {pendente ? "Cancelando..." : "Confirmar cancelamento"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            setErro(null);
          }}
          disabled={pendente}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
