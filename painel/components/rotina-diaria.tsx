"use client";

import { useState, useTransition } from "react";
import { alternarAtividadeRotina } from "@/lib/rotina/actions";
import {
  IconeCalendario,
  IconeAtividade,
  IconeTelefone,
  IconeInstagram,
  IconeAlvo,
  IconeCheck,
  IconeCarta,
  IconeX,
} from "@/components/icons";

const SCRIPTS = [
  {
    label: "Pré-qualificação para marcar call",
    url: "https://docs.google.com/document/d/1EVwYLEpFFWh94NYClZ3qZSkRGvA4Zdl4Ek1xbhT3jtw/edit?usp=sharing",
    Icone: IconeCarta,
  },
  {
    label: "Script de ligação",
    url: "https://docs.google.com/document/d/1s1tB7gidMTPBFCRCwT4Ys78jcK-x4m_9l28ccYpmnFI/edit?usp=sharing",
    Icone: IconeTelefone,
  },
];

// Google Docs só embeda via /preview (o link de /edit recusa rodar num
// iframe) — extrai o ID do documento de qualquer formato de link que o
// Samuel colar (edit, view, etc.) e monta a URL certa.
function urlPreviewGoogleDocs(url: string) {
  const id = url.match(/\/document\/d\/([^/]+)/)?.[1];
  return id ? `https://docs.google.com/document/d/${id}/preview` : url;
}

const ATIVIDADES = [
  {
    id: "confirmar_reunioes",
    hora: "09:00–09:30",
    titulo: "Confirmar e reagendar reuniões",
    desc: "Reuniões do dia e reuniões que não aconteceram.",
    Icone: IconeCalendario,
  },
  {
    id: "retomar_conversas",
    hora: "09:30–10:30",
    titulo: "Retomar conversas sem resposta",
    desc: "Leads que responderam ontem no WhatsApp ou Instagram.",
    Icone: IconeAtividade,
  },
  {
    id: "contato_nivel_3",
    hora: "10:30",
    titulo: "Contato com leads nível 3",
    desc: "Topou reunião mas sumiu na hora de marcar horário.",
    Icone: IconeAlvo,
  },
  {
    id: "ligacoes_quentes",
    hora: "10:30–11:00",
    titulo: "Ligações para leads quentes",
    desc: "Mínimo 30 ligações — ICP, tráfego pago, leads engajados.",
    Icone: IconeTelefone,
  },
  {
    id: "prospeccao",
    hora: "11:00–15:30",
    titulo: "Prospecção",
    desc: "Mínimo 80 abordagens por dia no Instagram.",
    Icone: IconeInstagram,
  },
  {
    id: "follow_niveis_1_2",
    hora: "15:30–17:00",
    titulo: "Follow com níveis 1 e 2",
    desc: "Sequência de mensagens curtas para reengajar e ligações.",
    Icone: IconeAtividade,
  },
  {
    id: "confirmar_amanha",
    hora: "17:00–17:30",
    titulo: "Confirmar reuniões de amanhã",
    desc: "E atualizar o CRM antes de enviar o relatório do dia.",
    Icone: IconeCalendario,
  },
];

function dataDeHojeFormatada() {
  return new Date().toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export function RotinaDiaria({ concluidasIniciais }: { concluidasIniciais: string[] }) {
  const [concluidas, setConcluidas] = useState(new Set(concluidasIniciais));
  const [, iniciarTransicao] = useTransition();
  const [docAberto, setDocAberto] = useState<{ url: string; label: string } | null>(null);

  function alternar(id: string) {
    const novaConcluida = !concluidas.has(id);
    setConcluidas((atual) => {
      const novo = new Set(atual);
      if (novaConcluida) novo.add(id);
      else novo.delete(id);
      return novo;
    });
    iniciarTransicao(() => {
      alternarAtividadeRotina(id, novaConcluida);
    });
  }

  const total = ATIVIDADES.length;
  const feitas = concluidas.size;
  const percentual = Math.round((feitas / total) * 100);

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-6 py-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Minha rotina</h1>
          <p className="text-sm capitalize text-neutral-500">{dataDeHojeFormatada()}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-neutral-900">
            {feitas} <span className="text-base font-normal text-neutral-400">de {total}</span>
          </p>
          <p className="text-xs text-neutral-400">concluídas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${percentual}%` }}
            />
          </div>

          <div className="space-y-3">
            {ATIVIDADES.map((atividade) => {
              const feita = concluidas.has(atividade.id);
              return (
                <button
                  key={atividade.id}
                  type="button"
                  onClick={() => alternar(atividade.id)}
                  className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition ${
                    feita
                      ? "border-neutral-200 bg-neutral-50"
                      : "border-neutral-200 bg-white hover:border-blue-300 hover:shadow-sm"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      feita ? "border-blue-600 bg-blue-600" : "border-neutral-300"
                    }`}
                  >
                    {feita && <IconeCheck className="h-3.5 w-3.5 text-white" />}
                  </span>

                  <div className={`min-w-0 flex-1 ${feita ? "opacity-50" : ""}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-base font-semibold text-neutral-900 ${
                          feita ? "line-through" : ""
                        }`}
                      >
                        {atividade.titulo}
                      </span>
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                        {atividade.hora}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">{atividade.desc}</p>
                  </div>

                  <atividade.Icone className="mt-0.5 h-5 w-5 shrink-0 text-neutral-300" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Roteiros
          </p>
          {SCRIPTS.map((script) => (
            <button
              key={script.url}
              type="button"
              onClick={() => setDocAberto(script)}
              className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 text-left transition hover:border-blue-300 hover:shadow-md"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <script.Icone className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 whitespace-nowrap text-[13px] font-semibold text-neutral-800">
                {script.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {docAberto && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50"
          onClick={() => setDocAberto(null)}
        >
          <div
            className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h2 className="truncate text-base font-bold text-neutral-900">{docAberto.label}</h2>
              <div className="flex shrink-0 items-center gap-3">
                <a
                  href={docAberto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Abrir no Google Docs
                </a>
                <button
                  type="button"
                  onClick={() => setDocAberto(null)}
                  aria-label="Fechar"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
                >
                  <IconeX className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe
              src={urlPreviewGoogleDocs(docAberto.url)}
              title={docAberto.label}
              className="min-h-0 flex-1 border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
