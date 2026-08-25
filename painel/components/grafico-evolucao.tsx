"use client";

import { useState } from "react";
import type { PontoEvolucao } from "@/lib/metricas";

// Cores validadas (skill dataviz) — mesma ordem categórica fixa nos dois
// gráficos, cada um com a legenda própria, então reusar slot 1/2 não gera
// ambiguidade entre os dois cartões.
const CORES = {
  serie1: { light: "#2a78d6", dark: "#3987e5" }, // azul
  serie2: { light: "#eb6834", dark: "#d95926" }, // laranja
  serie3: { light: "#1baf7a", dark: "#199e70" }, // água
};

type Serie = {
  chave: keyof Omit<PontoEvolucao, "dia">;
  rotulo: string;
  cor: { light: string; dark: string };
};

function formatarData(dia: string) {
  const [, mes, d] = dia.split("-");
  return `${d}/${mes}`;
}

function GraficoLinha({
  titulo,
  pontos,
  series,
  formatarValor,
}: {
  titulo: string;
  pontos: PontoEvolucao[];
  series: Serie[];
  formatarValor: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const largura = 600;
  const altura = 180;
  const margem = { topo: 10, baixo: 24, esquerda: 8, direita: 8 };
  const areaLargura = largura - margem.esquerda - margem.direita;
  const areaAltura = altura - margem.topo - margem.baixo;

  const maiorValor = Math.max(
    1,
    ...pontos.flatMap((p) => series.map((s) => Number(p[s.chave]) || 0))
  );

  function x(i: number) {
    if (pontos.length <= 1) return margem.esquerda + areaLargura / 2;
    return margem.esquerda + (i / (pontos.length - 1)) * areaLargura;
  }
  function y(valor: number) {
    return margem.topo + areaAltura - (valor / (maiorValor * 1.1)) * areaAltura;
  }

  function aoMoverMouse(evento: React.MouseEvent<SVGRectElement>) {
    const retangulo = evento.currentTarget.getBoundingClientRect();
    const posX = evento.clientX - retangulo.left;
    const proporcao = posX / retangulo.width;
    const indice = Math.round(proporcao * (pontos.length - 1));
    setHover(Math.min(pontos.length - 1, Math.max(0, indice)));
  }

  const indicesRotulo =
    pontos.length <= 1
      ? [0]
      : Array.from(new Set([0, Math.floor((pontos.length - 1) / 2), pontos.length - 1]));

  const pontoHover = hover !== null ? pontos[hover] : null;

  return (
    <div className="grafico-evolucao rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <style>{`
        .grafico-evolucao {
          --superficie: #fcfcfb;
          --texto-secundario: #52514e;
          --texto-mutado: #898781;
          --grade: #e1e0d9;
          --eixo: #c3c2b7;
          --serie-1: ${CORES.serie1.light};
          --serie-2: ${CORES.serie2.light};
          --serie-3: ${CORES.serie3.light};
        }
        .dark .grafico-evolucao {
          --texto-secundario: #c3c2b7;
          --texto-mutado: #898781;
          --grade: #2c2c2a;
          --eixo: #383835;
          --serie-1: ${CORES.serie1.dark};
          --serie-2: ${CORES.serie2.dark};
          --serie-3: ${CORES.serie3.dark};
        }
      `}</style>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {titulo}
      </p>

      <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full">
        {/* linhas de grade horizontais */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={margem.esquerda}
            x2={largura - margem.direita}
            y1={y(maiorValor * 1.1 * f)}
            y2={y(maiorValor * 1.1 * f)}
            stroke="var(--grade)"
            strokeWidth={1}
          />
        ))}

        {/* eixo base */}
        <line
          x1={margem.esquerda}
          x2={largura - margem.direita}
          y1={altura - margem.baixo}
          y2={altura - margem.baixo}
          stroke="var(--eixo)"
          strokeWidth={1}
        />

        {series.map((serie) => {
          const pontosLinha = pontos
            .map((p, i) => `${x(i)},${y(Number(p[serie.chave]) || 0)}`)
            .join(" ");
          return (
            <polyline
              key={serie.chave}
              points={pontosLinha}
              fill="none"
              stroke={`var(--${serie.cor === CORES.serie1 ? "serie-1" : serie.cor === CORES.serie2 ? "serie-2" : "serie-3"})`}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* rótulos do eixo X */}
        {indicesRotulo.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={altura - 6}
            textAnchor="middle"
            fontSize={10}
            fill="var(--texto-mutado)"
          >
            {formatarData(pontos[i].dia)}
          </text>
        ))}

        {/* crosshair do hover */}
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={margem.topo}
            y2={altura - margem.baixo}
            stroke="var(--eixo)"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        )}

        {/* área invisível que captura o mouse */}
        <rect
          x={margem.esquerda}
          y={margem.topo}
          width={areaLargura}
          height={areaAltura}
          fill="transparent"
          onMouseMove={aoMoverMouse}
          onMouseLeave={() => setHover(null)}
        />
      </svg>

      {pontoHover && (
        <div className="mb-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs">
          <p className="mb-1 font-semibold text-neutral-700">{formatarData(pontoHover.dia)}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {series.map((serie) => (
              <span key={serie.chave} className="flex items-center gap-1.5 text-neutral-600">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      serie.cor === CORES.serie1
                        ? "var(--serie-1)"
                        : serie.cor === CORES.serie2
                          ? "var(--serie-2)"
                          : "var(--serie-3)",
                  }}
                />
                {serie.rotulo}: {formatarValor(Number(pontoHover[serie.chave]) || 0)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
        {series.map((serie) => (
          <span key={serie.chave} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor:
                  serie.cor === CORES.serie1
                    ? "var(--serie-1)"
                    : serie.cor === CORES.serie2
                      ? "var(--serie-2)"
                      : "var(--serie-3)",
              }}
            />
            {serie.rotulo}
          </span>
        ))}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-neutral-400 hover:text-neutral-600">
          Ver como tabela
        </summary>
        <div className="mt-2 max-h-48 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-neutral-400">
                <th className="py-1 pr-3 font-medium">Dia</th>
                {series.map((s) => (
                  <th key={s.chave} className="py-1 pr-3 font-medium">
                    {s.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pontos.map((p) => (
                <tr key={p.dia} className="border-t border-neutral-100 text-neutral-600">
                  <td className="py-1 pr-3">{formatarData(p.dia)}</td>
                  {series.map((s) => (
                    <td key={s.chave} className="py-1 pr-3">
                      {formatarValor(Number(p[s.chave]) || 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export function GraficoEvolucaoComercial({
  pontos,
  rotuloReunioes,
}: {
  pontos: PontoEvolucao[];
  rotuloReunioes: string;
}) {
  if (pontos.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-neutral-900">Evolução comercial</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraficoLinha
          titulo="Faturamento e receita"
          pontos={pontos}
          formatarValor={(v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          series={[
            { chave: "faturamento", rotulo: "Faturamento", cor: CORES.serie1 },
            { chave: "receita", rotulo: "Receita", cor: CORES.serie2 },
          ]}
        />
        <GraficoLinha
          titulo="Leads, reuniões e vendas"
          pontos={pontos}
          formatarValor={(v) => String(v)}
          series={[
            { chave: "leads", rotulo: "Leads", cor: CORES.serie1 },
            { chave: "reunioes", rotulo: rotuloReunioes, cor: CORES.serie2 },
            { chave: "vendas", rotulo: "Vendas", cor: CORES.serie3 },
          ]}
        />
      </div>
    </section>
  );
}
