"use client";

import { useEffect, useRef, useState } from "react";
import { buscarUnidadesParaVenda, type UnidadeParaVenda } from "@/lib/imoveis/unidades-actions";

function moeda(v: number | null) {
  return v === null ? "" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function rotulo(u: UnidadeParaVenda) {
  const partes = [
    u.numero,
    moeda(u.valor),
    u.area_m2 !== null ? `${u.area_m2} m²` : "",
    u.tipologia ?? "",
    u.posicao ?? "",
    u.status === "reservada" ? "(reservada)" : "",
  ].filter(Boolean);
  return partes.join(" · ");
}

// Depois de escolher o empreendimento, lista as unidades que ainda dá pra
// vender. Escolher uma preenche o valor da venda sozinho (aoEscolher).
// Ao editar uma venda, `unidadeInicial` é a unidade que o lead já tem: ela
// aparece selecionada (e na lista, mesmo já vendida) sem mexer no valor.
export function UnidadeSelect({
  imovelId,
  unidadeInicial,
  aoEscolher,
}: {
  imovelId: string;
  unidadeInicial?: string | null;
  aoEscolher: (unidade: UnidadeParaVenda | null) => void;
}) {
  const [unidades, setUnidades] = useState<UnidadeParaVenda[] | null>(null);
  const [selecionada, setSelecionada] = useState(unidadeInicial ?? "");
  const primeiraCarga = useRef(true);

  useEffect(() => {
    let cancelado = false;
    const ehPrimeira = primeiraCarga.current;
    primeiraCarga.current = false;

    setUnidades(null);
    if (!ehPrimeira) {
      // Trocou de empreendimento depois de abrir a tela: limpa a escolha.
      setSelecionada("");
      aoEscolher(null);
    }
    if (!imovelId) return;
    buscarUnidadesParaVenda(imovelId, ehPrimeira ? unidadeInicial : null)
      .then((lista) => {
        if (!cancelado) setUnidades(lista);
      })
      .catch(() => {
        if (!cancelado) setUnidades([]);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imovelId]);

  // Empreendimento sem unidades cadastradas: não mostra nada, a venda segue
  // como sempre (só com o empreendimento).
  if (!imovelId || unidades === null || unidades.length === 0) {
    return <input type="hidden" name="unidade_id" value="" />;
  }

  return (
    <div className="mt-2">
      <label className="mb-1 block text-xs font-semibold text-green-900">Unidade vendida</label>
      <select
        name="unidade_id"
        value={selecionada}
        onChange={(e) => {
          setSelecionada(e.target.value);
          aoEscolher(unidades.find((u) => u.id === e.target.value) ?? null);
        }}
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Selecione a unidade (opcional)</option>
        {unidades.map((u) => (
          <option key={u.id} value={u.id}>
            {rotulo(u)}
          </option>
        ))}
      </select>
    </div>
  );
}
