"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconeCheck, IconeChevronBaixo } from "@/components/icons";

export type OpcaoMenuSelect = {
  value: string;
  label: string;
  disabled?: boolean;
  // Indenta com "↳", pra opção que é uma sub-divisão de outra (ex.:
  // "Repescagem futura de ICP" dentro de "Oportunidades").
  indentado?: boolean;
};

type Props = {
  options: OpcaoMenuSelect[];
  placeholder?: string;
  // Controlado (o pai guarda o valor) — usado quando o campo já tem
  // lógica própria de onChange (ex.: nível do lead).
  value?: string;
  onChange?: (valor: string) => void;
  // Não-controlado (o próprio componente guarda o valor e manda num
  // input escondido) — usado dentro de <form action={...}> comum.
  name?: string;
  id?: string;
  defaultValue?: string;
  buscar?: boolean;
  buscarPlaceholder?: string;
  disabled?: boolean;
  // Estilo do botão gatilho — "campo" (com borda, padrão em formulário)
  // ou "sem-borda" (pra ficar dentro de um cartão premium que já tem a
  // borda por fora, ex.: os filtros de Clientes/Lista de leads).
  variante?: "campo" | "sem-borda" | "pilula";
  pilulaClasse?: string;
  titulo?: string;
  // Já nasce com a listinha aberta, sem precisar clicar primeiro — usado
  // quando o campo só aparece na tela depois de uma ação (ex.: clicar em
  // "Reativar"), e a pessoa provavelmente já vai escolher na hora.
  abrirAoMontar?: boolean;
};

export function MenuSelect({
  options,
  placeholder = "Selecione...",
  value,
  onChange,
  name,
  id,
  defaultValue,
  buscar,
  buscarPlaceholder = "Buscar...",
  disabled = false,
  variante = "campo",
  pilulaClasse,
  titulo,
  abrirAoMontar = false,
}: Props) {
  const controlado = value !== undefined;
  const [internoValor, setInternoValor] = useState(defaultValue ?? "");
  const valorAtual = controlado ? value! : internoValor;

  const [aberto, setAberto] = useState(abrirAoMontar);
  const [busca, setBusca] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
        setBusca("");
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function selecionar(opcao: OpcaoMenuSelect) {
    if (opcao.disabled) return;
    if (!controlado) setInternoValor(opcao.value);
    onChange?.(opcao.value);
    setAberto(false);
    setBusca("");
  }

  // Busca automática só some se a lista for curta — não faz sentido pra
  // 3 opções, mas ajuda muito quando tem 10+ parecidas.
  const mostrarBusca = buscar ?? options.length > 7;

  const opcoesFiltradas = useMemo(() => {
    if (!mostrarBusca || !busca.trim()) return options;
    const alvo = busca.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(alvo));
  }, [busca, options, mostrarBusca]);

  const opcaoSelecionada = options.find((o) => o.value === valorAtual);
  const rotulo = opcaoSelecionada?.label ?? placeholder;

  if (variante === "pilula") {
    return (
      <div ref={containerRef} className="relative inline-block">
        <button
          type="button"
          title={titulo}
          disabled={disabled}
          onClick={() => setAberto((v) => !v)}
          className={
            pilulaClasse ??
            "shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 outline-none disabled:opacity-50"
          }
        >
          {rotulo}
        </button>
        {aberto && (
          <div className="absolute z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
            {options.map((opcao) => (
              <button
                key={opcao.value}
                type="button"
                onClick={() => selecionar(opcao)}
                disabled={opcao.disabled}
                className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-transparent ${
                  valorAtual === opcao.value ? "bg-blue-50 font-medium text-blue-700" : "text-neutral-700"
                }`}
              >
                {opcao.label}
                {valorAtual === opcao.value && <IconeCheck className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
              </button>
            ))}
          </div>
        )}
        {name && <input type="hidden" name={name} value={valorAtual} />}
      </div>
    );
  }

  const botaoClasse =
    variante === "sem-borda"
      ? "flex w-full items-center justify-between gap-2 bg-transparent p-0 text-left text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
      : "flex w-full items-center justify-between gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-left text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setAberto((v) => !v)}
        className={`${botaoClasse} ${opcaoSelecionada ? "text-neutral-900" : "text-neutral-400"}`}
      >
        <span className="truncate">{rotulo}</span>
        <IconeChevronBaixo
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto && (
        <div className="absolute z-20 mt-1 w-full min-w-[200px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
          {mostrarBusca && (
            <div className="border-b border-neutral-100 p-2">
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={buscarPlaceholder}
                className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-blue-400"
              />
            </div>
          )}
          <ul className="max-h-64 overflow-y-auto py-1">
            {opcoesFiltradas.length === 0 && (
              <li className="px-3 py-2 text-sm text-neutral-400">Nenhuma opção encontrada</li>
            )}
            {opcoesFiltradas.map((opcao) => (
              <li key={opcao.value}>
                <button
                  type="button"
                  onClick={() => selecionar(opcao)}
                  disabled={opcao.disabled}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-transparent ${
                    valorAtual === opcao.value ? "bg-blue-50 font-medium text-blue-700" : "text-neutral-700"
                  }`}
                >
                  <span className="truncate">
                    {opcao.indentado && <span className="mr-1 text-neutral-400">↳</span>}
                    {opcao.label}
                    {opcao.disabled ? " (bloqueado)" : ""}
                  </span>
                  {valorAtual === opcao.value && (
                    <IconeCheck className="h-4 w-4 shrink-0 text-blue-600" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {name && <input type="hidden" name={name} value={valorAtual} />}
    </div>
  );
}
