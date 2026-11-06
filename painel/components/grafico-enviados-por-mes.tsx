"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EnviadosMes } from "@/lib/metricas";
import { MenuSelect } from "@/components/menu-select";

const NOMES_MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// "Evolução comercial" da Inove Gôndolas (Samuel, 06/11/26): quantos leads foram
// enviados pro Elton em cada mês, e quem enviou. Sem meta de receita.
export function GraficoEnviadosPorMes({
  dados,
  ano,
  anoAtual,
  mesAtual,
}: {
  dados: EnviadosMes[];
  ano: number;
  anoAtual: number;
  mesAtual: number; // 0 se `ano` não é o ano corrente (mostra os 12 meses)
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hover, setHover] = useState<number | null>(null);

  const pontos = dados.filter((m) => mesAtual === 0 || m.mes <= mesAtual);
  const totalAno = pontos.reduce((soma, p) => soma + p.total, 0);
  const maior = Math.max(1, ...pontos.map((p) => p.total));
  const teto = Math.ceil(maior * 1.2);

  function aoTrocarAno(novoAno: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("anoEvolucao", String(novoAno));
    router.push(`/dashboard?${params.toString()}`);
  }

  const anos: number[] = [];
  for (let a = 2026; a <= anoAtual + 1; a++) anos.push(a);

  const largura = 900;
  const altura = 260;
  const margem = { topo: 28, baixo: 30, esquerda: 12, direita: 12 };
  const areaLargura = largura - margem.esquerda - margem.direita;
  const areaAltura = altura - margem.topo - margem.baixo;
  const passo = areaLargura / Math.max(1, pontos.length);
  const larguraBarra = Math.min(54, passo * 0.6);
  const y = (valor: number) => margem.topo + areaAltura - (valor / teto) * areaAltura;
  const centro = (i: number) => margem.esquerda + passo * i + passo / 2;
  const pontoHover = hover !== null ? pontos[hover] : null;

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Evolução comercial — leads enviados para o Elton</h2>
          <p className="text-xs text-neutral-500">
            {totalAno} lead{totalAno === 1 ? "" : "s"} enviado{totalAno === 1 ? "" : "s"} em {ano}
          </p>
        </div>
        <div className="w-24">
          <MenuSelect
            value={String(ano)}
            onChange={(valor) => aoTrocarAno(Number(valor))}
            buscar={false}
            options={anos.map((a) => ({ value: String(a), label: String(a) }))}
          />
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="relative mb-3">
          <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full">
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <line
                key={f}
                x1={margem.esquerda}
                x2={largura - margem.direita}
                y1={y(teto * f)}
                y2={y(teto * f)}
                stroke="#ececea"
                strokeWidth={1}
              />
            ))}
            {pontos.map((p, i) => (
              <g key={p.mes}>
                <rect
                  x={centro(i) - larguraBarra / 2}
                  y={y(p.total)}
                  width={larguraBarra}
                  height={Math.max(0, y(0) - y(p.total))}
                  rx={5}
                  fill={i === hover ? "#15803d" : "#16a34a"}
                />
                <text x={centro(i)} y={y(p.total) - 7} textAnchor="middle" fontSize={12} fontWeight={700} fill="#1c1c1a">
                  {p.total}
                </text>
                <text
                  x={centro(i)}
                  y={altura - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill={p.mes === mesAtual ? "#1c1c1a" : "#898781"}
                  fontWeight={p.mes === mesAtual ? 700 : 400}
                >
                  {NOMES_MESES[p.mes - 1]}
                </text>
                <rect
                  x={margem.esquerda + passo * i}
                  y={margem.topo}
                  width={passo}
                  height={areaAltura}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            ))}
          </svg>
          {pontoHover && (
            <div className="pointer-events-none absolute left-2 top-1 z-10 max-w-[calc(100%-1rem)] rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs shadow-md">
              <p className="mb-1 font-semibold text-neutral-900">
                {NOMES_MESES[pontoHover.mes - 1]}/{ano}: {pontoHover.total} enviado{pontoHover.total === 1 ? "" : "s"}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-neutral-600">
                {pontoHover.porUsuario.length === 0 ? (
                  <span>Nenhum envio</span>
                ) : (
                  pontoHover.porUsuario.map((u) => (
                    <span key={u.usuarioId}>
                      {u.nome}: {u.quantidade}
                    </span>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-neutral-500">Ver como tabela</summary>
          <div className="mt-2 max-h-48 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-neutral-500">
                  <th className="py-1 pr-3 font-medium">Mês</th>
                  <th className="py-1 pr-3 font-medium">Enviados</th>
                  <th className="py-1 pr-3 font-medium">Por SDR</th>
                </tr>
              </thead>
              <tbody>
                {pontos.map((p) => (
                  <tr key={p.mes} className="border-t border-neutral-100 text-neutral-600">
                    <td className="py-1 pr-3">{NOMES_MESES[p.mes - 1]}</td>
                    <td className="py-1 pr-3 font-semibold">{p.total}</td>
                    <td className="py-1 pr-3">
                      {p.porUsuario.length === 0 ? "—" : p.porUsuario.map((u) => `${u.nome} ${u.quantidade}`).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}
