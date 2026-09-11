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

const ATIVIDADES = [
  {
    id: "confirmar_reunioes",
    hora: "09:00–09:30",
    titulo: "Confirmar reuniões do dia",
    desc: "Reagendar as que não confirmaram e resolver o no-show de ontem.",
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
    desc: "Mínimo 80 abordagens no Instagram, meta de 20 leads novos.",
    Icone: IconeInstagram,
  },
  {
    id: "follow_niveis_1_2",
    hora: "15:30–17:00",
    titulo: "Follow com níveis 1 e 2",
    desc: "Sequência de mensagens curtas pra reengajar.",
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
    <div className="mx-auto max-w-2xl space-y-4 px-6 py-8">
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

      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${percentual}%` }}
        />
      </div>

      <div className="space-y-2">
        {ATIVIDADES.map((atividade) => {
          const feita = concluidas.has(atividade.id);
          return (
            <button
              key={atividade.id}
              type="button"
              onClick={() => alternar(atividade.id)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                feita
                  ? "border-neutral-200 bg-neutral-50"
                  : "border-neutral-200 bg-white hover:border-blue-300 hover:shadow-sm"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  feita ? "border-blue-600 bg-blue-600" : "border-neutral-300"
                }`}
              >
                {feita && <IconeCheck className="h-3 w-3 text-white" />}
              </span>

              <div className={`min-w-0 flex-1 ${feita ? "opacity-50" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-sm font-semibold text-neutral-900 ${
                      feita ? "line-through" : ""
                    }`}
                  >
                    {atividade.titulo}
                  </span>
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
                    {atividade.hora}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] text-neutral-500">{atividade.desc}</p>
              </div>

              <atividade.Icone className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
