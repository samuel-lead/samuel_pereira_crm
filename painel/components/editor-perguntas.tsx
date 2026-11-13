"use client";

import { useState } from "react";
import {
  MAX_PERGUNTAS,
  PERGUNTAS_SUGERIDAS,
  type PerguntaFormulario,
} from "@/lib/iscas/perguntas";

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

function novoId() {
  return `p${Math.random().toString(36).slice(2, 8)}`;
}

// Construtor de perguntas do formulário: nome e WhatsApp são fixos; o resto
// a pessoa monta (escrever ou escolher uma opção), com sugestões de um clique.
export function EditorPerguntas({ inicial }: { inicial: PerguntaFormulario[] }) {
  const [perguntas, setPerguntas] = useState<PerguntaFormulario[]>(inicial);

  function atualizar(id: string, mudanca: Partial<PerguntaFormulario>) {
    setPerguntas((lista) => lista.map((p) => (p.id === id ? { ...p, ...mudanca } : p)));
  }
  function remover(id: string) {
    setPerguntas((lista) => lista.filter((p) => p.id !== id));
  }
  function mover(id: string, direcao: -1 | 1) {
    setPerguntas((lista) => {
      const i = lista.findIndex((p) => p.id === id);
      const j = i + direcao;
      if (i < 0 || j < 0 || j >= lista.length) return lista;
      const copia = [...lista];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }
  function adicionar(base?: Omit<PerguntaFormulario, "id">) {
    setPerguntas((lista) =>
      lista.length >= MAX_PERGUNTAS
        ? lista
        : [...lista, { id: novoId(), rotulo: "", tipo: "texto", opcoes: [], obrigatoria: false, ...base }]
    );
  }

  const sugestoesQueFaltam = PERGUNTAS_SUGERIDAS.filter((s) => !perguntas.some((p) => p.rotulo === s.rotulo));

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-neutral-700">Perguntas do formulário</p>
        <p className="text-xs text-neutral-400">
          Quais perguntas você quer ter? Nome e WhatsApp sempre aparecem. As respostas ficam salvas
          numa nota dentro do lead.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          <span>Qual o seu nome?</span>
          <span className="text-[11px] font-semibold uppercase text-neutral-400">Fixa</span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          <span>Qual o seu WhatsApp?</span>
          <span className="text-[11px] font-semibold uppercase text-neutral-400">Fixa</span>
        </div>
      </div>

      {perguntas.map((p, i) => (
        <div key={p.id} className="space-y-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <input
              value={p.rotulo}
              onChange={(e) => atualizar(p.id, { rotulo: e.target.value })}
              placeholder="Escreva a pergunta"
              maxLength={150}
              className={campoClasse}
            />
            <button
              type="button"
              onClick={() => mover(p.id, -1)}
              disabled={i === 0}
              aria-label="Subir pergunta"
              className="rounded border border-neutral-200 px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-50 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => mover(p.id, 1)}
              disabled={i === perguntas.length - 1}
              aria-label="Descer pergunta"
              className="rounded border border-neutral-200 px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-50 disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => remover(p.id)}
              aria-label="Remover pergunta"
              className="rounded border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={p.tipo}
              onChange={(e) => atualizar(p.id, { tipo: e.target.value === "opcoes" ? "opcoes" : "texto" })}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-800"
            >
              <option value="texto">A pessoa escreve a resposta</option>
              <option value="opcoes">A pessoa escolhe uma opção</option>
            </select>
            <label className="flex items-center gap-1.5 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={p.obrigatoria}
                onChange={(e) => atualizar(p.id, { obrigatoria: e.target.checked })}
                className="h-4 w-4"
              />
              Obrigatória
            </label>
          </div>

          {p.tipo === "opcoes" && (
            <div className="space-y-1">
              <textarea
                value={p.opcoes.join("\n")}
                onChange={(e) => atualizar(p.id, { opcoes: e.target.value.split("\n") })}
                rows={4}
                placeholder={"Uma opção por linha\nEx.:\nCasa\nApartamento"}
                className={campoClasse}
              />
              <p className="text-xs text-neutral-400">Uma opção por linha (mínimo 2).</p>
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => adicionar()}
          disabled={perguntas.length >= MAX_PERGUNTAS}
          className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-40"
        >
          + Adicionar pergunta
        </button>
        {perguntas.length >= MAX_PERGUNTAS && (
          <span className="text-xs text-neutral-400">Máximo de {MAX_PERGUNTAS} perguntas.</span>
        )}
      </div>

      {sugestoesQueFaltam.length > 0 && perguntas.length < MAX_PERGUNTAS && (
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-500">Sugestões (clique para adicionar):</p>
          <div className="flex flex-wrap gap-1.5">
            {sugestoesQueFaltam.map((s) => (
              <button
                key={s.rotulo}
                type="button"
                onClick={() => adicionar(s)}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600 hover:border-blue-300 hover:text-blue-700"
              >
                + {s.rotulo}
              </button>
            ))}
          </div>
        </div>
      )}

      <input type="hidden" name="perguntas" value={JSON.stringify(perguntas)} />
    </div>
  );
}
