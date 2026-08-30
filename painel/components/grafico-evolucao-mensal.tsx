"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ResumoMes } from "@/lib/metricas";

const NOMES_MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

// Cor de status por mês (bateu/não bateu a meta) — não é uma cor
// categórica arbitrária, é o mesmo verde/âmbar já usado em todo o resto
// do painel (cartões de meta, barras de progresso) pra dizer "bom"/"atenção".
const COR_BATEU = { light: "#16a34a", dark: "#22c55e" };
const COR_NAO_BATEU = { light: "#d97706", dark: "#f59e0b" };
const COR_SEM_META = { light: "#78766f", dark: "#9c9a92" };
const COR_LINHA = { light: "#2a78d6", dark: "#3987e5" };

type PontoMes = ResumoMes & { percentual: number | null };

function corDoPonto(p: PontoMes) {
  if (p.percentual === null) return COR_SEM_META;
  return p.percentual >= 100 ? COR_BATEU : COR_NAO_BATEU;
}

export function GraficoEvolucaoMensal({
  dados,
  ano,
  anoAtual,
  mesAtual,
}: {
  dados: ResumoMes[];
  ano: number;
  anoAtual: number;
  mesAtual: number; // 0 se `ano` não é o ano corrente (mostra os 12 meses)
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hover, setHover] = useState<number | null>(null);

  const pontos: PontoMes[] = dados
    .filter((m) => mesAtual === 0 || m.mes <= mesAtual)
    .map((m) => ({
      ...m,
      percentual: m.metaReceita && m.metaReceita > 0 ? (m.receita / m.metaReceita) * 100 : null,
    }));

  const mesesComMeta = pontos.filter((p) => p.percentual !== null);
  const bateram = mesesComMeta.filter((p) => (p.percentual ?? 0) >= 100).length;

  function aoTrocarAno(novoAno: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("anoEvolucao", String(novoAno));
    router.push(`/dashboard?${params.toString()}`);
  }

  const anos: number[] = [];
  for (let a = anoAtual; a <= anoAtual + 4; a++) anos.push(a);

  const largura = 900;
  const altura = 260;
  const margem = { topo: 24, baixo: 30, esquerda: 12, direita: 12 };
  const areaLargura = largura - margem.esquerda - margem.direita;
  const areaAltura = altura - margem.topo - margem.baixo;

  const maiorPercentual = Math.max(
    120,
    ...pontos.map((p) => p.percentual ?? 0)
  );
  const tetoEscala = maiorPercentual * 1.15;

  function x(i: number) {
    if (pontos.length <= 1) return margem.esquerda + areaLargura / 2;
    return margem.esquerda + (i / (pontos.length - 1)) * areaLargura;
  }
  function y(percentual: number) {
    return margem.topo + areaAltura - (percentual / tetoEscala) * areaAltura;
  }

  const linha = pontos.map((p, i) => `${x(i)},${y(p.percentual ?? 0)}`).join(" ");
  const area = `${margem.esquerda},${y(0)} ${linha} ${x(pontos.length - 1)},${y(0)}`;

  function aoMoverMouse(evento: React.MouseEvent<SVGRectElement>) {
    const retangulo = evento.currentTarget.getBoundingClientRect();
    const posX = evento.clientX - retangulo.left;
    const proporcao = posX / retangulo.width;
    const indice = Math.round(proporcao * (pontos.length - 1));
    setHover(Math.min(pontos.length - 1, Math.max(0, indice)));
  }

  const pontoHover = hover !== null ? pontos[hover] : null;

  return (
    <section className="grafico-evolucao-mensal overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <style>{`
        .grafico-evolucao-mensal {
          --superficie: #ffffff;
          --superficie-alt: #fafaf9;
          --texto: #1c1c1a;
          --texto-secundario: #52514e;
          --texto-mutado: #898781;
          --grade: #ececea;
          --eixo: #d8d7d1;
          --linha: ${COR_LINHA.light};
          --bateu: ${COR_BATEU.light};
          --nao-bateu: ${COR_NAO_BATEU.light};
          --sem-meta: ${COR_SEM_META.light};
          background: var(--superficie);
        }
        .dark .grafico-evolucao-mensal {
          --superficie: #18181b;
          --superficie-alt: #1f1f22;
          --texto: #f4f4f2;
          --texto-secundario: #c3c2b7;
          --texto-mutado: #8b8a84;
          --grade: #2c2c2a;
          --eixo: #38383a;
          --linha: ${COR_LINHA.dark};
          --bateu: ${COR_BATEU.dark};
          --nao-bateu: ${COR_NAO_BATEU.dark};
          --sem-meta: ${COR_SEM_META.dark};
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 dark:border-white/5">
        <div>
          <h2 className="text-base font-bold" style={{ color: "var(--texto)" }}>
            Evolução comercial
          </h2>
          <p className="text-xs" style={{ color: "var(--texto-mutado)" }}>
            {mesesComMeta.length > 0
              ? `Bateu a meta em ${bateram} de ${mesesComMeta.length} meses`
              : "Nenhuma meta registrada ainda"}
          </p>
        </div>

        <select
          value={ano}
          onChange={(e) => aoTrocarAno(Number(e.target.value))}
          className="rounded-md border px-3 py-1.5 text-sm font-medium outline-none"
          style={{
            borderColor: "var(--eixo)",
            background: "var(--superficie-alt)",
            color: "var(--texto)",
          }}
        >
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="px-5 py-4">
        {pontos.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: "var(--texto-mutado)" }}>
            Sem dados pra {ano} ainda.
          </p>
        ) : (
          <>
            <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full">
              <defs>
                <linearGradient id="gradienteEvolucaoMensal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--linha)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--linha)" stopOpacity={0} />
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <line
                  key={f}
                  x1={margem.esquerda}
                  x2={largura - margem.direita}
                  y1={y(tetoEscala * f)}
                  y2={y(tetoEscala * f)}
                  stroke="var(--grade)"
                  strokeWidth={1}
                />
              ))}

              {/* linha de referência da meta (100%) */}
              <line
                x1={margem.esquerda}
                x2={largura - margem.direita}
                y1={y(100)}
                y2={y(100)}
                stroke="var(--eixo)"
                strokeWidth={1.5}
                strokeDasharray="4,4"
              />
              <text x={largura - margem.direita} y={y(100) - 6} textAnchor="end" fontSize={11} fill="var(--texto-mutado)">
                Meta · 100%
              </text>

              <polygon points={area} fill="url(#gradienteEvolucaoMensal)" />

              <polyline
                points={linha}
                fill="none"
                stroke="var(--linha)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {pontos.map((p, i) => (
                <circle
                  key={p.mes}
                  cx={x(i)}
                  cy={y(p.percentual ?? 0)}
                  r={i === hover ? 7 : p.mes === mesAtual ? 6 : 4.5}
                  fill={
                    p.percentual === null
                      ? "var(--sem-meta)"
                      : p.percentual >= 100
                        ? "var(--bateu)"
                        : "var(--nao-bateu)"
                  }
                  stroke="var(--superficie)"
                  strokeWidth={2}
                />
              ))}

              {pontos.map((p, i) => (
                <text
                  key={p.mes}
                  x={x(i)}
                  y={altura - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill={p.mes === mesAtual ? "var(--texto)" : "var(--texto-mutado)"}
                  fontWeight={p.mes === mesAtual ? 700 : 400}
                >
                  {NOMES_MESES[p.mes - 1]}
                </text>
              ))}

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
              <div
                className="mb-3 rounded-lg border px-3 py-2 text-xs"
                style={{ borderColor: "var(--grade)", background: "var(--superficie-alt)" }}
              >
                <p className="mb-1 font-semibold" style={{ color: "var(--texto)" }}>
                  {NOMES_MESES[pontoHover.mes - 1]}/{ano}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ color: "var(--texto-secundario)" }}>
                  <span>Receita: {formatarMoeda(pontoHover.receita)}</span>
                  <span>
                    Meta: {pontoHover.metaReceita !== null ? formatarMoeda(pontoHover.metaReceita) : "não definida"}
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: `var(--${pontoHover.percentual === null ? "sem-meta" : pontoHover.percentual >= 100 ? "bateu" : "nao-bateu"})` }}
                  >
                    {pontoHover.percentual !== null ? `${Math.round(pontoHover.percentual)}% da meta` : "—"}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--texto-mutado)" }}>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--bateu)" }} />
                Bateu a meta
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--nao-bateu)" }} />
                Não bateu
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--sem-meta)" }} />
                Sem meta definida
              </span>
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium" style={{ color: "var(--texto-mutado)" }}>
                Ver como tabela
              </summary>
              <div className="mt-2 max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr style={{ color: "var(--texto-mutado)" }}>
                      <th className="py-1 pr-3 font-medium">Mês</th>
                      <th className="py-1 pr-3 font-medium">Receita</th>
                      <th className="py-1 pr-3 font-medium">Meta</th>
                      <th className="py-1 pr-3 font-medium">% da meta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pontos.map((p) => (
                      <tr key={p.mes} className="border-t" style={{ borderColor: "var(--grade)", color: "var(--texto-secundario)" }}>
                        <td className="py-1 pr-3">{NOMES_MESES[p.mes - 1]}</td>
                        <td className="py-1 pr-3">{formatarMoeda(p.receita)}</td>
                        <td className="py-1 pr-3">{p.metaReceita !== null ? formatarMoeda(p.metaReceita) : "—"}</td>
                        <td className="py-1 pr-3">
                          {p.percentual !== null ? `${Math.round(p.percentual)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </div>
    </section>
  );
}
