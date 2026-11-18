"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NOMES_MES, type ChavePeriodo } from "@/lib/periodo";
import { MenuSelect } from "@/components/menu-select";
import { ehImobiliario } from "@/lib/terminologia";

// Mentoria não tem dado antes disso (é quando o CRM começou) — por
// enquanto só existe 2026 mesmo, mas o filtro já nasce pronto pra somar
// 2027, 2028... sozinho conforme os anos forem passando (mesma lógica do
// imobiliário, só que com piso diferente).
const ANO_INICIAL_MENTORIA = 2026;

const OPCOES = [
  { valor: "hoje", label: "Hoje" },
  { valor: "ontem", label: "Ontem" },
  { valor: "semana", label: "Semana atual" },
  { valor: "semana_passada", label: "Semana passada" },
  { valor: "mes", label: "Mês atual" },
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
  publicoOrg = "mentoria",
  personalizadoEmbaixo = false,
  opcaoTodos,
  compacto = false,
}: {
  // Visual enxuto (Pós-venda): cada atalho é um botão separado, no mesmo formato de
  // "Período personalizado", tudo na mesma linha — em vez de um bloco grande só.
  compacto?: boolean;
  // Botão "Todos" antes dos atalhos (Pós-venda): manda periodo=todos, que a tela
  // entende como "sem filtro de período". `ativo` diz se ele está selecionado.
  opcaoTodos?: { ativo: boolean };
  // "Período personalizado" empilhado embaixo do filtro de ano/mês (aba Clientes).
  personalizadoEmbaixo?: boolean;
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
  // Imobiliário filtra dado histórico (vendas de anos passados) — mentoria
  // usa esse seletor pra planejar meta de mês/ano que ainda vai vir. Por
  // isso o intervalo de anos é diferente pra cada público (Samuel pediu
  // explicitamente pra não misturar os dois).
  publicoOrg?: string;
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

  function hrefDoAtalho(valor: string) {
    const params = comOutrosParams(new URLSearchParams());
    params.set("periodo", valor);
    return `${baseHref}?${params.toString()}`;
  }

  // scroll: false — trocar o período é só um filtro na mesma tela, não
  // faz sentido voltar pro topo da página (comportamento padrão do
  // Next.js), principalmente com o filtro grudado (sticky) no topo.
  function irPara(valor: string) {
    setMostrarCustom(false);
    setMes("");
    router.push(hrefDoAtalho(valor), { scroll: false });
  }

  function irParaMesEspecifico(anoEscolhido: number, mesEscolhido: string) {
    if (!mesEscolhido) return;
    const params = comOutrosParams(new URLSearchParams());
    params.set("mesAno", mesEscolhido === "ano" ? String(anoEscolhido) : `${anoEscolhido}-${mesEscolhido}`);
    router.push(`${baseHref}?${params.toString()}`, { scroll: false });
  }

  const classeAtalho = compacto
    ? "rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium shadow-sm transition"
    : "rounded-md px-3 py-1.5 text-sm font-medium transition";
  const ativoClasse = compacto ? "bg-blue-600 text-white" : "bg-blue-600 text-white shadow-sm";
  const inativoClasse = compacto ? "bg-white text-neutral-600 hover:bg-neutral-100" : "text-neutral-600 hover:bg-neutral-100";

  function aplicarCustom(evento: React.FormEvent) {
    evento.preventDefault();
    if (!de || !ate) return;
    const params = comOutrosParams(new URLSearchParams());
    params.set("de", de);
    params.set("ate", ate);
    router.push(`${baseHref}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compacto ? "items-center" : "items-stretch"}`}>
      <div
        className={
          compacto
            ? "contents"
            : "inline-flex flex-wrap items-center gap-1 rounded-xl border border-neutral-200 bg-white px-2 py-2 shadow-sm"
        }
      >
        {opcaoTodos && (
          <button
            type="button"
            onClick={() => irPara("todos")}
            className={`${classeAtalho} ${
              opcaoTodos.ativo ? ativoClasse : inativoClasse
            }`}
          >
            Todos
          </button>
        )}
        {opcoesVisiveis.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => irPara(opcao.valor)}
            onMouseEnter={() => router.prefetch(hrefDoAtalho(opcao.valor))}
            onFocus={() => router.prefetch(hrefDoAtalho(opcao.valor))}
            onTouchStart={() => router.prefetch(hrefDoAtalho(opcao.valor))}
            className={`${classeAtalho} ${periodoAtual === opcao.valor ? ativoClasse : inativoClasse}`}
          >
            {opcao.label}
          </button>
        ))}
      </div>

      {/* Com personalizadoEmbaixo, o botão "Período personalizado" fica logo abaixo
          do filtro de ano/mês, com a mesma largura (Samuel, 18/11/26). Sem isso,
          "contents" faz este bloco não existir no layout (como era antes). */}
      <div className={personalizadoEmbaixo ? "flex flex-col items-stretch gap-2" : "contents"}>
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
              options={Array.from(
                { length: anoAtual - (ehImobiliario(publicoOrg) ? 2020 : ANO_INICIAL_MENTORIA) + 1 },
                (_, i) => anoAtual - i
              ).map((a) => ({
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
      </div>

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
              onClick={(e) => e.currentTarget.showPicker?.()}
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
              onClick={(e) => e.currentTarget.showPicker?.()}
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
