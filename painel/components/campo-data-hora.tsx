"use client";

import { useEffect, useRef, useState } from "react";
import { IconeCalendario, IconeChevronBaixo } from "@/components/icons";

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// "2026-09-08T16:21" (o formato que os Server Actions esperam, igual um
// <input type="datetime-local"> nativo) <-> um objeto Date local.
function paraIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function deIso(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, ano, mes, dia, hora, minuto] = m;
  return new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));
}

function paraExibicao(d: Date | null) {
  if (!d) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Aceita digitar "08/09/2026 16:21" (com ou sem a hora, com ou sem as
// barras/espaço — só os números importam) e também aceita colar algo já
// no formato ISO do próprio campo.
function dePrimeiraTentativa(texto: string): Date | null {
  const iso = deIso(texto);
  if (iso) return iso;
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length < 8) return null;
  const dia = Number(digitos.slice(0, 2));
  const mes = Number(digitos.slice(2, 4));
  const ano = Number(digitos.slice(4, 8));
  const hora = digitos.length >= 10 ? Number(digitos.slice(8, 10)) : 0;
  const minuto = digitos.length >= 12 ? Number(digitos.slice(10, 12)) : 0;
  const d = new Date(ano, mes - 1, dia, hora, minuto);
  if (Number.isNaN(d.getTime()) || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return d;
}

function inicioDoMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Hora e minuto do calendário: dá pra digitar direto (como o resto do
// campo) OU clicar nas setinhas — maiores que a setinha minúscula nativa
// do <input type="number">, que era difícil de acertar o clique (Samuel
// pediu especificamente pra aumentar essas setas).
function SeletorNumero({
  valor,
  onIncrementar,
  onDecrementar,
  onDigitar,
}: {
  valor: string;
  onIncrementar: () => void;
  onDecrementar: () => void;
  onDigitar: (texto: string) => void;
}) {
  return (
    <div className="flex h-11 items-stretch overflow-hidden rounded-md border border-neutral-300">
      <input
        type="text"
        inputMode="numeric"
        value={valor}
        onChange={(e) => onDigitar(e.target.value.replace(/\D/g, "").slice(0, 2))}
        className="w-11 border-none px-1 text-center text-base outline-none"
      />
      <div className="flex flex-col border-l border-neutral-300">
        <button
          type="button"
          onClick={onIncrementar}
          className="flex h-1/2 w-9 items-center justify-center border-b border-neutral-300 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 active:bg-neutral-200"
        >
          <IconeChevronBaixo className="h-5 w-5 rotate-180" />
        </button>
        <button
          type="button"
          onClick={onDecrementar}
          className="flex h-1/2 w-9 items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 active:bg-neutral-200"
        >
          <IconeChevronBaixo className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// Calendário feito do zero (não o nativo do navegador) — o nativo trava o
// teclado assim que abre automaticamente com qualquer clique (só dá pra
// digitar OU usar o calendário, nunca os dois juntos). Aqui as duas coisas
// convivem: digita direto no campo de texto a qualquer momento, ou clica
// em qualquer lugar do campo pra abrir esse calendário maior e escolhe com
// o mouse — sem um atrapalhar o outro (Samuel pediu as duas formas).
export function CampoDataHora({
  name,
  id,
  required,
  value,
  defaultValue,
  onChange,
  min,
  max,
  autoFocus,
  disabled,
  className,
}: {
  name?: string;
  id?: string;
  required?: boolean;
  // Controlado (o pai guarda o valor, ex.: BlocoReativarLead) — mesmo
  // padrão do MenuSelect/ProdutoSelect já usados no projeto.
  value?: string;
  // Não-controlado (o próprio componente guarda e manda num input
  // escondido com `name`, pra formulário comum ler via FormData).
  defaultValue?: string;
  onChange?: (isoDatetimeLocal: string) => void;
  min?: string;
  max?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const controlado = value !== undefined;
  const [internoValor, setInternoValor] = useState(defaultValue ?? "");
  const valorAtual = controlado ? value! : internoValor;
  const dataAtual = deIso(valorAtual);

  const [texto, setTexto] = useState(paraExibicao(dataAtual));
  const [aberto, setAberto] = useState(false);
  const [mesExibido, setMesExibido] = useState(inicioDoMes(dataAtual ?? new Date()));
  const [hora, setHora] = useState(dataAtual ? pad(dataAtual.getHours()) : "");
  const [minuto, setMinuto] = useState(dataAtual ? pad(dataAtual.getMinutes()) : "");
  const containerRef = useRef<HTMLDivElement>(null);

  // O valor pode mudar por fora (ex.: outro campo resetando o form) — sem
  // isso o texto digitado ficava "preso" mostrando um valor antigo.
  useEffect(() => {
    const d = deIso(valorAtual);
    setTexto(paraExibicao(d));
    if (d) {
      setMesExibido(inicioDoMes(d));
      setHora(pad(d.getHours()));
      setMinuto(pad(d.getMinutes()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorAtual]);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function definirValor(d: Date) {
    const iso = paraIso(d);
    if (!controlado) setInternoValor(iso);
    onChange?.(iso);
  }

  function aoDigitar(e: React.ChangeEvent<HTMLInputElement>) {
    setTexto(e.target.value);
    const d = dePrimeiraTentativa(e.target.value);
    if (d) {
      definirValor(d);
      setMesExibido(inicioDoMes(d));
      setHora(pad(d.getHours()));
      setMinuto(pad(d.getMinutes()));
    }
  }

  function aoSairDoCampo() {
    // Se não deu pra entender o que foi digitado, volta a mostrar o
    // último valor válido em vez de deixar um texto quebrado na tela.
    setTexto(paraExibicao(deIso(valorAtual)));
  }

  function escolherDia(dia: number) {
    const h = Number(hora || 0);
    const m = Number(minuto || 0);
    const d = new Date(mesExibido.getFullYear(), mesExibido.getMonth(), dia, h, m);
    definirValor(d);
    setTexto(paraExibicao(d));
  }

  function aoMudarHorario(novaHora: string, novoMinuto: string) {
    setHora(novaHora);
    setMinuto(novoMinuto);
    if (!dataAtual) return;
    const d = new Date(dataAtual);
    d.setHours(Number(novaHora || 0), Number(novoMinuto || 0));
    definirValor(d);
    setTexto(paraExibicao(d));
  }

  const primeiroDiaSemana = new Date(mesExibido.getFullYear(), mesExibido.getMonth(), 1).getDay();
  const diasNoMes = new Date(mesExibido.getFullYear(), mesExibido.getMonth() + 1, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  const dataMin = min ? deIso(min) : null;
  const dataMax = max ? deIso(max) : null;

  function diaBloqueado(dia: number) {
    const d = new Date(mesExibido.getFullYear(), mesExibido.getMonth(), dia, 23, 59);
    if (dataMin && d < dataMin) return true;
    if (dataMax) {
      const inicioDia = new Date(mesExibido.getFullYear(), mesExibido.getMonth(), dia, 0, 0);
      if (inicioDia > dataMax) return true;
    }
    return false;
  }

  const campoClasse =
    className ??
    "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/aaaa --:--"
          value={texto}
          onChange={aoDigitar}
          onBlur={aoSairDoCampo}
          onFocus={() => setAberto(true)}
          onClick={() => setAberto(true)}
          autoFocus={autoFocus}
          disabled={disabled}
          required={required}
          className={`${campoClasse} pr-9`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setAberto((v) => !v)}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-neutral-400 hover:text-neutral-600 disabled:cursor-not-allowed"
        >
          <IconeCalendario className="h-4 w-4" />
        </button>
      </div>

      {!controlado && name && <input type="hidden" name={name} value={valorAtual} required={required} />}

      {aberto && (
        <div className="absolute z-30 mt-1 w-72 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMesExibido(new Date(mesExibido.getFullYear(), mesExibido.getMonth() - 1, 1))}
              className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"
            >
              <IconeChevronBaixo className="h-4 w-4 rotate-90" />
            </button>
            <p className="text-sm font-semibold text-neutral-800">
              {MESES[mesExibido.getMonth()]} de {mesExibido.getFullYear()}
            </p>
            <button
              type="button"
              onClick={() => setMesExibido(new Date(mesExibido.getFullYear(), mesExibido.getMonth() + 1, 1))}
              className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"
            >
              <IconeChevronBaixo className="h-4 w-4 -rotate-90" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-neutral-400">
            {DIAS_SEMANA.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celulas.map((dia, i) => {
              if (dia === null) return <span key={i} />;
              const selecionado =
                dataAtual &&
                dataAtual.getDate() === dia &&
                dataAtual.getMonth() === mesExibido.getMonth() &&
                dataAtual.getFullYear() === mesExibido.getFullYear();
              const bloqueado = diaBloqueado(dia);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={bloqueado}
                  onClick={() => escolherDia(dia)}
                  className={`rounded-lg py-2 text-sm transition disabled:cursor-not-allowed disabled:text-neutral-300 ${
                    selecionado
                      ? "bg-blue-600 font-semibold text-white"
                      : "text-neutral-700 hover:bg-blue-50"
                  }`}
                >
                  {dia}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 border-t border-neutral-100 pt-3">
            <span className="text-xs font-medium text-neutral-500">Horário</span>
            <SeletorNumero
              valor={hora}
              onIncrementar={() => aoMudarHorario(pad((Number(hora || 0) + 1) % 24), minuto || "00")}
              onDecrementar={() => aoMudarHorario(pad((Number(hora || 0) + 23) % 24), minuto || "00")}
              onDigitar={(texto) => aoMudarHorario(pad(Number(texto || 0) % 24), minuto || "00")}
            />
            <span className="text-lg font-semibold text-neutral-400">:</span>
            <SeletorNumero
              valor={minuto}
              onIncrementar={() => aoMudarHorario(hora || "00", pad((Number(minuto || 0) + 1) % 60))}
              onDecrementar={() => aoMudarHorario(hora || "00", pad((Number(minuto || 0) + 59) % 60))}
              onDigitar={(texto) => aoMudarHorario(hora || "00", pad(Number(texto || 0) % 60))}
            />
          </div>

          <button
            type="button"
            onClick={() => setAberto(false)}
            className="mt-3 w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Pronto
          </button>
        </div>
      )}
    </div>
  );
}
