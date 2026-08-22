"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { criarProduto, renomearProduto, excluirProduto, type EstadoProduto } from "@/lib/configuracoes/actions";

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const estadoInicial: EstadoProduto = { erro: null };

function LinhaProduto({ produto }: { produto: { id: string; nome: string } }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(produto.nome);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    if (
      !confirm(
        `Tem certeza que quer excluir o produto "${produto.nome}"? Só dá pra excluir se nenhum lead estiver usando ele.`
      )
    ) {
      return;
    }
    setExcluindo(true);
    setErro(null);
    const resultado = await excluirProduto(produto.id);
    if (resultado.erro) {
      setErro(resultado.erro);
      setExcluindo(false);
      return;
    }
    router.refresh();
  }

  async function salvar() {
    const novoNome = nome.trim();
    if (!novoNome || novoNome === produto.nome) {
      setEditando(false);
      setNome(produto.nome);
      return;
    }
    setSalvando(true);
    setErro(null);
    const resultado = await renomearProduto(produto.id, novoNome);
    setSalvando(false);
    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }
    setEditando(false);
    router.refresh();
  }

  if (editando) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") salvar();
              if (e.key === "Escape") {
                setEditando(false);
                setNome(produto.nome);
              }
            }}
            className={campoClasse}
          />
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditando(false);
              setNome(produto.nome);
            }}
            className="shrink-0 rounded-md border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
          >
            Cancelar
          </button>
        </div>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 rounded-md border border-neutral-100 px-3 py-2">
        <span className="truncate text-sm text-neutral-800">{produto.nome}</span>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={excluir}
            disabled={excluindo}
            className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
          >
            {excluindo ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
      {erro && <p className="px-3 text-xs text-red-600">{erro}</p>}
    </div>
  );
}

export function ProdutosConfig({ produtos }: { produtos: { id: string; nome: string }[] }) {
  const [estado, acaoFormulario] = useActionState(criarProduto, estadoInicial);

  return (
    <div className="space-y-3">
      <div className="max-h-72 space-y-1.5 overflow-y-auto">
        {produtos.map((produto) => (
          <LinhaProduto key={produto.id} produto={produto} />
        ))}
      </div>

      <form action={acaoFormulario} className="flex items-center gap-2 border-t border-neutral-100 pt-3">
        <input
          name="nome"
          placeholder="Novo produto (ex.: Mentoria VIP)"
          className={campoClasse}
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Adicionar
        </button>
      </form>
      {estado.erro && <p className="text-xs text-red-600">{estado.erro}</p>}
    </div>
  );
}
