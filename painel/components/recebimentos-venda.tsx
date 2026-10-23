"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { registrarRecebimento, removerRecebimento } from "@/lib/leads/actions";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";
import { ehImobiliario, Receita, usaComissaoDoVendedor } from "@/lib/terminologia";

type Recebimento = { id: string; valor: number; recebido_em: string };

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDia(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// Samuel (23/10/26): a receita conta no mês em que o dinheiro CAIU, não no
// mês da venda. Cada pagamento recebido é registrado aqui com valor e dia.
// Só aparece nos CRMs em que a receita é por pagamento (imobiliário e os de
// comissão calculada por % têm um valor só, calculado na venda).
export function RecebimentosVenda({
  leadId,
  recebimentos,
  publicoOrg,
  podeEditar,
}: {
  leadId: string;
  recebimentos: Recebimento[];
  publicoOrg: string;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const modalAtivo = useLeadModalAtivo();
  const [adicionando, setAdicionando] = useState(false);
  const [centavos, setCentavos] = useState(0);
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [dia, setDia] = useState(hoje);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  if (ehImobiliario(publicoOrg) || usaComissaoDoVendedor(publicoOrg)) return null;

  function aoDigitar(e: ChangeEvent<HTMLInputElement>) {
    const digitos = e.target.value.replace(/\D/g, "");
    setCentavos(digitos ? Number(digitos) : 0);
  }

  function atualizarTela() {
    modalAtivo?.recarregar();
    router.refresh();
  }

  async function salvar() {
    setErro(null);
    setOcupado(true);
    const resultado = await registrarRecebimento(leadId, centavos / 100, dia);
    setOcupado(false);
    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }
    setAdicionando(false);
    setCentavos(0);
    setDia(hoje);
    atualizarTela();
  }

  async function remover(id: string) {
    if (!window.confirm("Remover esse pagamento?")) return;
    setErro(null);
    setOcupado(true);
    const resultado = await removerRecebimento(leadId, id);
    setOcupado(false);
    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }
    atualizarTela();
  }

  return (
    <div className="mt-3 border-t border-green-200 pt-3">
      <p className="text-xs font-semibold text-green-800">
        {Receita(publicoOrg)} recebida — pagamentos
      </p>
      {recebimentos.length === 0 ? (
        <p className="mt-1 text-xs text-green-700">Nenhum pagamento registrado ainda.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {recebimentos.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-sm text-green-800">
              <span>
                {formatarReais(r.valor)} <span className="text-xs text-green-600">· caiu em {formatarDia(r.recebido_em)}</span>
              </span>
              {podeEditar && (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => remover(r.id)}
                  className="text-xs text-green-700 underline hover:text-red-600 disabled:opacity-60"
                >
                  remover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {podeEditar &&
        (adicionando ? (
          <div className="mt-2 space-y-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-green-800">Valor que caiu (R$)</label>
              <input
                type="text"
                inputMode="numeric"
                value={centavos ? formatarReais(centavos / 100) : ""}
                onChange={aoDigitar}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                className="w-full rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-green-800">Dia em que caiu</label>
              <input
                type="date"
                value={dia}
                max={hoje}
                onChange={(e) => setDia(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className="w-full rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={ocupado || centavos === 0 || !dia}
                onClick={salvar}
                className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 disabled:opacity-60"
              >
                {ocupado ? "Salvando..." : "Registrar pagamento"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdicionando(false);
                  setErro(null);
                }}
                className="rounded-md border border-green-300 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdicionando(true)}
            className="mt-2 text-xs font-medium text-green-700 underline hover:text-green-800"
          >
            + Registrar pagamento recebido
          </button>
        ))}
      {erro && <p className="mt-1 text-sm text-red-600">{erro}</p>}
      <p className="mt-2 text-[11px] text-green-600">
        A {Receita(publicoOrg).toLowerCase()} conta no mês do dia em que o dinheiro caiu, não no mês da venda.
      </p>
    </div>
  );
}
