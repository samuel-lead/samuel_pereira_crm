"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { reagendarReuniao, moverLeadNivel } from "@/lib/leads/actions";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";
import { CampoDataHora } from "@/components/campo-data-hora";
import { IconeCalendario } from "@/components/icons";
import { useConfirmacaoTravaTela } from "@/components/confirmacao-modal";

// Mesmo nível "Precisa reagendar" que o Kanban já usa quando o card é
// arrastado de "Reunião marcada" pra lá — cancelar por aqui passa pelo
// mesmo caminho (moverLeadNivel), então herda de graça a mesma regra que
// já existe: marca a reunião ativa como "cancelada" no banco. Samuel
// pediu essa opção explicitamente — não tinha jeito nenhum de cancelar
// sem ser arrastando o card manualmente.
const NIVEL_PRECISA_REAGENDAR = 6;

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Reagendar é sempre pra uma data NOVA — a data antiga (a que está sendo
// trocada) não precisa continuar clicável no calendário, então trava
// dias passados sempre, sem exceção (Samuel pegou isso ao vivo: dava pra
// escolher um dia anterior a hoje reagendando).
function agoraParaInputLocal() {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

// Versão compacta do "Reunião marcada pra..." pro cabeçalho do card do lead
// (Samuel pediu: tira do lado direito, deixa no topo junto dos outros) —
// mesmo padrão do ProximoContatoBotao: um pill sempre visível com a data,
// "Editar" abre um popover com o campo de data e o botão de salvar.
export function ReagendarReuniaoBotao({
  leadId,
  reuniaoId,
  agendadaPara,
  rotulo,
}: {
  leadId: string;
  reuniaoId: string;
  agendadaPara: string;
  rotulo: string;
}) {
  const modalAtivo = useLeadModalAtivo();
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  // perguntar() troca o confirm() nativo — em Chrome, um confirm()
  // disparado logo depois de um drag-and-drop pode travar a página de
  // vez (foi a causa real do "preciso recarregar 10 vezes" que o Samuel
  // relatou em outro lugar do app; corrigido aqui antes de repetir o
  // mesmo problema nesse botão novo).
  const { perguntar, modal: modalConfirmacao } = useConfirmacaoTravaTela();

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function aoSubmeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const formData = new FormData(evento.currentTarget);
    iniciarTransicao(async () => {
      try {
        await reagendarReuniao(leadId, reuniaoId, formData);
        // Espera terminar antes de fechar — sem isso o popover fecha
        // mostrando a data velha até a busca por baixo dos panos chegar
        // (mesmo problema já corrigido no "Marcar próximo contato").
        await modalAtivo?.recarregar();
        setAberto(false);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu pra reagendar");
      }
    });
  }

  async function aoCancelarReuniao() {
    const confirmou = await perguntar(
      `Cancelar essa ${rotulo.toLowerCase()}? O lead vai pra "Precisa reagendar".`,
      "Cancelar reunião",
      "Voltar"
    );
    if (!confirmou) return;

    setErro(null);
    iniciarTransicao(async () => {
      const erroRetornado = await moverLeadNivel(leadId, NIVEL_PRECISA_REAGENDAR);
      if (erroRetornado) {
        setErro(erroRetornado);
        return;
      }
      await modalAtivo?.recarregar();
      setAberto(false);
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-amber-600/30">
        <IconeCalendario className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap">
          {rotulo} marcada: {formatarData(agendadaPara)}
        </span>
        <button
          type="button"
          onClick={() => setAberto((atual) => !atual)}
          className="shrink-0 rounded border border-white/70 px-1.5 py-0.5 text-[11px] transition hover:bg-white/10"
        >
          Editar
        </button>
      </div>

      {aberto && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-80 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg">
          <form onSubmit={aoSubmeter} className="space-y-2">
            <label className="block text-xs font-medium text-neutral-600" htmlFor="nova-data-reuniao">
              Mudar pra outro dia/horário
            </label>
            <CampoDataHora
              id="nova-data-reuniao"
              name="agendada_para"
              required
              defaultValue={agendadaPara}
              min={agoraParaInputLocal()}
              autoFocus
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            {erro && <p className="text-xs text-red-600">{erro}</p>}

            <button
              type="submit"
              disabled={pendente}
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {pendente ? "Salvando..." : "Salvar novo horário"}
            </button>
          </form>

          <button
            type="button"
            onClick={aoCancelarReuniao}
            disabled={pendente}
            className="mt-2 w-full rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          >
            Cancelar {rotulo.toLowerCase()}
          </button>
        </div>
      )}
      {modalConfirmacao}
    </div>
  );
}
