"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NOMES_MES, type ChavePeriodo } from "@/lib/periodo";
import { MenuSelect } from "@/components/menu-select";

const OPCOES = [
  { valor: "hoje", label: "Hoje" },
  { valor: "ontem", label: "Ontem" },
  { valor: "semana", label: "Semana" },
  { valor: "mes", label: "Mês" },
  { valor: "mes_passado", label: "Mês passado" },
  { valor: "ultimos_3_meses", label: "Últimos 3 meses" },
] as const;

// Filtro de período reutilizável — usado em Métricas e em Clientes, pra
// não ter dois jeitos diferentes de escolher data no mesmo CRM. Cada tela
// passa o "baseHref" (pra onde navegar) e os outros parâmetros de busca
// que quer preservar ao trocar o período (ex.: o campo de busca por nome).
export function FiltroPeriodo({
  baseHref,
  periodoAtual,
  mesAnoAtual,
  deAtual,
  ateAtual,
  outrosParams,
  atalhos,
  mostrarMesEspecifico = true,
}: {
  baseHref: string;
  periodoAtual: ChavePeriodo | null;
  mesAnoAtual?: string;
  deAtual?: string;
  ateAtual?: string;
  outrosParams?: Record<string, string | undefined>;
  // Quais botões de atalho mostrar — por padrão, todos. Telas mais
  // simples (ex.: Lista de leads) só precisam de um subconjunto.
  atalhos?: (typeof OPCOES)[number]["valor"][];
  mostrarMesEspecifico?: boolean;
}) {
  const opcoesVisiveis = atalhos ? OPCOES.filter((o) => atalhos.includes(o.valor)) : OPCOES;
  const router = useRouter();
  const anoAtual = new Date().getFullYear();
  const [mostrarCustom, setMostrarCustom] = useState(periodoAtual === "custom");
  const [de, setDe] = useState(deAtual ?? "");
  const [ate, setAte] = useState(ateAtual ?? "");
  const [ano, setAno] = useState(mesAnoAtual ? Number(mesAnoAtual.split("-")[0]) : anoAtual);
  const [mes, setMes] = useState(
    mesAnoAtual ? (mesAnoAtual.includes("-") ? mesAnoAtual.split("-")[1] : "ano") : ""
  );

  function comOutrosParams(params: URLSearchParams) {
    for (const [chave, valor] of Object.entries(outrosParams ?? {})) {
      if (valor) params.set(chave, valor);
    }
    return params;
  }

  function irPara(valor: string) {
    setMostrarCustom(false);
    setMes("");
    const params = comOutrosParams(new URLSearchParams());
    params.set("periodo", valor);
    router.push(`${baseHref}?${params.toString()}`);
  }

  function irParaMesEspecifico(anoEscolhido: number, mesEscolhido: string) {
    if (!mesEscolhido) return;
    const params = comOutrosParams(new URLSearchParams());
    params.set("mesAno", mesEscolhido === "ano" ? String(anoEscolhido) : `${anoEscolhido}-${mesEscolhido}`);
    router.push(`${baseHref}?${params.toString()}`);
  }

  function aplicarCustom(evento: React.FormEvent) {
    evento.preventDefault();
    if (!de || !ate) return;
    const params = comOutrosParams(new URLSearchParams());
    params.set("de", de);
    params.set("ate", ate);
    router.push(`${baseHref}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-stretch gap-2">
      <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-neutral-200 bg-white px-2 py-2 shadow-sm">
        {opcoesVisiveis.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => irPara(opcao.valor)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              periodoAtual === opcao.valor
                ? "bg-blue-600 text-white shadow-sm"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {opcao.label}
          </button>
        ))}
      </div>

      {mostrarMesEspecifico && (
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
          <div className="w-[90px]">
            <MenuSelect
              variante="sem-borda"
              value={String(ano)}
              onChange={(valor) => {
                const novoAno = Number(valor);
                setAno(novoAno);
                if (mes) irParaMesEspecifico(novoAno, mes);
              }}
              options={[anoAtual, anoAtual + 1, anoAtual + 2, anoAtual + 3, anoAtual + 4].map((a) => ({
                value: String(a),
                label: String(a),
              }))}
            />
          </div>
          <span className="text-neutral-200">|</span>
          <div className="w-[140px]">
            <MenuSelect
              variante="sem-borda"
              placeholder="Escolher mês"
              value={mes}
              onChange={(valor) => {
                setMes(valor);
                irParaMesEspecifico(ano, valor);
              }}
              options={[
                { value: "ano", label: "Ano todo" },
                ...NOMES_MES.map((nome, i) => ({
                  value: String(i + 1).padStart(2, "0"),
                  label: nome,
                })),
              ]}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setMostrarCustom((v) => !v)}
        className={`rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium shadow-sm transition ${
          periodoAtual === "custom" ? "bg-blue-600 text-white" : "bg-white text-neutral-600 hover:bg-neutral-100"
        }`}
      >
        Período personalizado
      </button>

      {mostrarCustom && (
        <form
          onSubmit={aplicarCustom}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2 shadow-sm"
        >
          <div className="flex flex-col justify-center gap-0.5">
            <label className="text-[10px] font-medium text-neutral-500" htmlFor="periodo-de">
              De
            </label>
            <input
              id="periodo-de"
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              required
              className="border-0 bg-transparent p-0 text-sm text-neutral-900 outline-none focus:ring-0"
            />
          </div>
          <span className="mt-3.5 text-neutral-300">–</span>
          <div className="flex flex-col justify-center gap-0.5">
            <label className="text-[10px] font-medium text-neutral-500" htmlFor="periodo-ate">
              Até
            </label>
            <input
              id="periodo-ate"
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              required
              className="border-0 bg-transparent p-0 text-sm text-neutral-900 outline-none focus:ring-0"
            />
          </div>
          <button
            type="submit"
            className="ml-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Aplicar
          </button>
        </form>
      )}
    </div>
  );
}
