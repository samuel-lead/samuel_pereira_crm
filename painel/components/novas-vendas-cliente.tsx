"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { registrarNovaVenda, removerNovaVenda, type VendaExtra } from "@/lib/leads/actions";
import { MenuSelect } from "@/components/menu-select";
import { RecebimentosVenda } from "@/components/recebimentos-venda";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDia(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

const campoClasse =
  "w-full rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500";

function CampoMoeda({
  rotulo,
  centavos,
  aoMudar,
}: {
  rotulo: string;
  centavos: number;
  aoMudar: (centavos: number) => void;
}) {
  function aoDigitar(e: ChangeEvent<HTMLInputElement>) {
    const digitos = e.target.value.replace(/\D/g, "");
    aoMudar(digitos ? Number(digitos) : 0);
  }
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-green-800">{rotulo}</label>
      <input
        type="text"
        inputMode="numeric"
        value={centavos ? formatarReais(centavos / 100) : ""}
        onChange={aoDigitar}
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        className={campoClasse}
      />
    </div>
  );
}

// Samuel (24/11/26): cliente que já comprou e compra outro produto. Cada nova
// compra entra aqui, sem mexer na 1ª venda. Conta no faturamento e na receita
// da empresa, mas NÃO no bônus do SDR. Só CRMs de serviço/mentoria.
export function NovasVendasCliente({
  leadId,
  vendasExtras,
  produtos,
  publicoOrg,
  podeEditar,
}: {
  leadId: string;
  vendasExtras: VendaExtra[];
  produtos: string[];
  publicoOrg: string;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const modalAtivo = useLeadModalAtivo();
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const [adicionando, setAdicionando] = useState(false);
  const [produtoEscolhido, setProdutoEscolhido] = useState("");
  const [produtoOutro, setProdutoOutro] = useState("");
  const [centavosVenda, setCentavosVenda] = useState(0);
  const [centavosRecebido, setCentavosRecebido] = useState(0);
  const [dia, setDia] = useState(hoje);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const produto = produtoEscolhido === "Outro" ? produtoOutro.trim() : produtoEscolhido;

  function atualizarTela() {
    modalAtivo?.recarregar();
    router.refresh();
  }

  function limpar() {
    setAdicionando(false);
    setProdutoEscolhido("");
    setProdutoOutro("");
    setCentavosVenda(0);
    setCentavosRecebido(0);
    setDia(hoje);
    setErro(null);
  }

  async function salvar() {
    setErro(null);
    setOcupado(true);
    const resultado = await registrarNovaVenda(leadId, produto, centavosVenda / 100, dia, centavosRecebido / 100);
    setOcupado(false);
    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }
    limpar();
    atualizarTela();
  }

  async function remover(v: VendaExtra) {
    if (!window.confirm(`Remover a venda de "${v.produto}" (${formatarReais(v.valor_venda)}) deste cliente?`)) return;
    setErro(null);
    setOcupado(true);
    const resultado = await removerNovaVenda(leadId, v.id);
    setOcupado(false);
    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }
    atualizarTela();
  }

  if (!podeEditar && vendasExtras.length === 0) return null;

  return (
    <div className="mt-3 border-t border-green-200 pt-3">
      <p className="text-xs font-semibold text-green-800">Outras compras deste cliente</p>

      {vendasExtras.length === 0 ? (
        <p className="mt-1 text-xs text-green-700">Nenhuma nova venda registrada ainda.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {vendasExtras.map((v) => (
            <li key={v.id} className="rounded-md border border-green-200 bg-white/60 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-green-900">{v.produto}</p>
                  <p className="text-sm text-green-800">
                    {formatarReais(v.valor_venda)}{" "}
                    <span className="text-xs text-green-600">· vendido em {formatarDia(v.vendido_em)}</span>
                  </p>
                </div>
                {podeEditar && (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => remover(v)}
                    className="shrink-0 text-xs text-green-700 underline hover:text-red-600 disabled:opacity-60"
                  >
                    remover
                  </button>
                )}
              </div>
              <RecebimentosVenda
                leadId={leadId}
                recebimentos={v.recebimentos}
                publicoOrg={publicoOrg}
                podeEditar={podeEditar}
                vendaExtraId={v.id}
              />
            </li>
          ))}
        </ul>
      )}

      {podeEditar &&
        (adicionando ? (
          <div className="mt-3 space-y-2 rounded-md border border-green-300 bg-white/60 p-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-green-800">Produto que comprou</label>
              <MenuSelect
                placeholder="Selecione o produto..."
                value={produtoEscolhido}
                onChange={setProdutoEscolhido}
                options={[
                  ...produtos.map((p) => ({ value: p, label: p })),
                  { value: "Outro", label: "Outro..." },
                ]}
              />
              {produtoEscolhido === "Outro" && (
                <input
                  value={produtoOutro}
                  onChange={(e) => setProdutoOutro(e.target.value)}
                  placeholder="Qual?"
                  className={`${campoClasse} mt-2`}
                />
              )}
            </div>
            <CampoMoeda rotulo="Valor da venda (R$)" centavos={centavosVenda} aoMudar={setCentavosVenda} />
            <div>
              <label className="mb-1 block text-xs font-medium text-green-800">Dia da venda</label>
              <input
                type="date"
                value={dia}
                max={hoje}
                onChange={(e) => setDia(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className={`${campoClasse} cursor-pointer`}
              />
            </div>
            <CampoMoeda
              rotulo="Quanto já caiu na conta (R$) — se ainda não caiu nada, deixe vazio"
              centavos={centavosRecebido}
              aoMudar={setCentavosRecebido}
            />
            <p className="text-[11px] text-green-600">
              Essa venda não entra no bônus do SDR. Conta no faturamento e na
              receita da empresa (no dia em que o dinheiro cair).
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={ocupado || !produto || centavosVenda === 0 || !dia}
                onClick={salvar}
                className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 disabled:opacity-60"
              >
                {ocupado ? "Salvando..." : "Registrar nova venda"}
              </button>
              <button
                type="button"
                onClick={limpar}
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
            className="mt-2 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700"
          >
            + Registrar nova venda deste cliente
          </button>
        ))}
      {erro && <p className="mt-1 text-sm text-red-600">{erro}</p>}
    </div>
  );
}
