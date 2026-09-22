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
} from "@/components/icons";

// Horários e descrições batem com o documento "Rotina do SDR" (Samuel
// ajustou o documento em 22/09/26) — não é mais a mesma redação da
// versão anterior, então não "arredondar" pra bater com a de antes se
// ele atualizar de novo. Nessa versão o contato com nível 3 entrou
// dentro da Atividade 1 (não é mais uma atividade separada) e a
// "Atividade 5" do documento não existe — vai direto da 4 pra 6, é
// assim no documento mesmo.
const ATIVIDADES = [
  {
    id: "confirmar_reunioes",
    hora: "09:00–09:30",
    titulo: "Confirmar e reagendar reuniões",
    desc: "Reuniões do dia, reagendar as do dia anterior (processo anti-no-show) e contato com os leads do nível 3.",
    Icone: IconeCalendario,
    cor: "blue",
  },
  {
    id: "retomar_conversas",
    hora: "09:30–10:00",
    titulo: "Retomar conversas",
    desc: "Leads que responderam no dia anterior no WhatsApp e Instagram, parados ou atrasados no CRM.",
    Icone: IconeAtividade,
    cor: "violet",
  },
  {
    id: "prospeccao",
    hora: "10:00–12:00 e 13:30–15:30",
    titulo: "Prospecção",
    desc: "Instagram, base ou tráfego — lead de tráfego é sempre prioridade. Pausa assim que qualquer lead responder.",
    Icone: IconeInstagram,
    cor: "pink",
  },
  {
    id: "ligacoes_quentes",
    hora: "15:30–16:00",
    titulo: "Ligações para leads quentes",
    desc: "Leads do Instagram que passou o WhatsApp, leads engajados, leads qualificados e do tráfego.",
    Icone: IconeTelefone,
    cor: "teal",
  },
  {
    id: "follow_niveis_1_2",
    hora: "16:00–16:30",
    titulo: "Follow com níveis 1 e 2",
    desc: "Sequência seguindo a matriz de follow-up — pausa e atende na hora quem responder ou lead de tráfego que chegar.",
    Icone: IconeAlvo,
    cor: "indigo",
  },
  {
    id: "confirmar_amanha",
    hora: "16:30–17:00",
    titulo: "Confirmar reuniões de amanhã",
    desc: "Seguir o processo de anti-no-show e enviar o relatório diário no grupo do comercial até as 18h.",
    Icone: IconeCalendario,
    cor: "emerald",
  },
];

const CORES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  teal: "bg-teal-50 text-teal-600",
  pink: "bg-pink-50 text-pink-600",
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
};

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
    <div className="flex flex-wrap items-start gap-6 px-6 py-8">
      {/* Título, data e o contador ficam tudo empilhado na esquerda —
          os cards formam um bloco à parte, começando no mesmo topo,
          deslocado pra direita (Samuel pediu, os dois lado a lado). */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-neutral-900">Minha rotina</h1>
        <p className="text-sm capitalize text-neutral-500">{dataDeHojeFormatada()}</p>
        <p className="pt-2 text-2xl font-bold text-neutral-900">
          {feitas} <span className="text-base font-normal text-neutral-400">de {total}</span>
        </p>
        <p className="text-xs text-neutral-400">concluídas</p>
      </div>

      <div className="ml-auto w-full max-w-2xl flex-1 space-y-4">
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
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      feita ? "bg-neutral-100 text-neutral-400" : CORES[atividade.cor]
                    }`}
                  >
                    {atividade.hora}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-500">{atividade.desc}</p>
              </div>

              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  feita ? "bg-neutral-100 text-neutral-300" : CORES[atividade.cor]
                }`}
              >
                <atividade.Icone className="h-5 w-5" />
              </span>
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}
