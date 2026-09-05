"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { atualizarLead, reativarLead, type EstadoFormulario } from "@/lib/leads/actions";
import { OrigemSelect } from "@/components/origem-select";
import { ResponsavelSelect } from "@/components/responsavel-select";
import { MenuSelect } from "@/components/menu-select";
import { rotuloNivel, NIVEIS_REATIVACAO, type NivelResumo } from "@/lib/niveis";
import { reuniao, Reuniao } from "@/lib/terminologia";
import { IconeCalendario, IconeReativar } from "@/components/icons";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";

const NIVEL_REUNIAO_MARCADA = "4";
const NIVEL_NO_SHOW = "5";
const NIVEL_REAGENDAMENTO = "6";
const NIVEL_FOLLOW_POS_REUNIAO = "7";
const NIVEL_OPORTUNIDADES = "8";
const NIVEL_BASE = "9";
const OPCAO_OPORTUNIDADE_FUTURA = "oportunidade_futura";

const MOTIVOS_BASE = [
  { valor: "nao_iniciou_conversa", nome: "Não consegui iniciar conversa" },
  { valor: "qualificou_sumiu", nome: "Iniciei conversa, qualifiquei e sumiu" },
  { valor: "iniciou_sem_interesse", nome: "Iniciei conversa e não teve interesse" },
  { valor: "nao_reagendados", nome: "Não reagendados" },
  { valor: "proposta_nao_comprou", nome: "Fiz proposta e não comprou" },
  { valor: "desqualificado", nome: "Desqualificado (sem perfil pro momento)" },
] as const;

function agoraParaInputLocal() {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

// Sem isso, só clicar no iconezinho de calendário no canto do campo abre o
// seletor — clicar em qualquer outro lugar do campo só posiciona o cursor
// pra digitar. Clicar em qualquer ponto do campo já abre o seletor.
function abrirSeletorDeData(e: React.MouseEvent<HTMLInputElement>) {
  e.currentTarget.showPicker?.();
}

type Lead = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  email: string | null;
  instagram: string | null;
  origem: string | null;
  nivel_ordem: number;
  criterio_problema: string | null;
  criterio_urgencia: string;
  criterio_capacidade: string;
  responsavel_id: string | null;
  oportunidade_futura: boolean;
  motivo_base: string | null;
  motivo_base_detalhe: string | null;
  status: string;
};

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500";
const labelClasse = "text-sm font-medium text-neutral-700";
const estadoInicial: EstadoFormulario = { erro: null };

// Lead na Base: o card inteiro (aberto por aqui, "por dentro") não tem
// mais nível pra escolher nem "Agendar reunião" — só esse botão, igual ao
// que já existe "por fora" no rodapé do card em base-leads-board.tsx.
// Não pode ser um <form> de verdade porque esse componente já vive dentro
// do <form> principal do lead (HTML não permite form aninhado) — por
// isso o nível e o responsável ficam em estado local em vez de FormData.
function BlocoReativarLead({
  leadId,
  niveisReativacao,
  usuarios,
  souAdmin,
}: {
  leadId: string;
  niveisReativacao: { ordem: number; nome: string }[];
  usuarios: { id: string; nome: string; funcao?: string | null }[];
  souAdmin: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [nivel, setNivel] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function aoConfirmar() {
    if (!nivel) {
      setErro("Escolha pra qual nível reativar.");
      return;
    }
    setErro(null);
    iniciarTransicao(() => {
      reativarLead(leadId, Number(nivel), souAdmin ? responsavelId : undefined).then((erro) => {
        setErro(erro);
        if (!erro) {
          setAberto(false);
          setNivel("");
          setResponsavelId("");
        }
      });
    });
  }

  if (niveisReativacao.length === 0) return null;

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 text-sm font-bold text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900"
      >
        <IconeReativar className="h-4 w-4" />
        Reativar
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <MenuSelect
        titulo="Reativar pra qual nível"
        placeholder="Nível de Pré-vendas..."
        disabled={pendente}
        value={nivel}
        onChange={setNivel}
        abrirAoMontar
        options={niveisReativacao.map((n) => ({ value: String(n.ordem), label: n.nome }))}
      />
      {nivel && souAdmin && (
        <MenuSelect
          titulo="Quem vai ser o responsável"
          placeholder="Quem vai ser o responsável..."
          disabled={pendente}
          value={responsavelId}
          onChange={setResponsavelId}
          abrirAoMontar
          options={[
            { value: "", label: "— Sem responsável —" },
            ...usuarios
              .filter((u) => u.funcao === "sdr")
              .map((u) => ({ value: u.id, label: u.nome })),
          ]}
        />
      )}
      {erro && <p className="text-[11px] text-red-600">{erro}</p>}
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={pendente}
          onClick={aoConfirmar}
          className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          Confirmar
        </button>
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            setErro(null);
          }}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function EditarLeadForm({
  lead,
  niveis,
  numerosVisiveis,
  usuarios,
  origens,
  souAdmin = true,
  podeEditar = true,
  preSelecionarReuniao = false,
  reuniaoAnteriorPendente = false,
  reuniaoAnteriorSumiuPredefinido,
  publicoOrg = "mentoria",
  jaTeveReuniao = true,
  reuniaoAtivaAgendadaPara = null,
  reuniaoAtivaCloserId = null,
  aoConfirmarTeveProposta,
}: {
  lead: Lead;
  niveis: NivelResumo[];
  numerosVisiveis: Record<number, number>;
  usuarios: { id: string; nome: string; funcao?: string | null }[];
  origens: { id: string; nome: string }[];
  souAdmin?: boolean;
  podeEditar?: boolean;
  preSelecionarReuniao?: boolean;
  publicoOrg?: string;
  // Existe uma reunião anterior ainda "marcada" com a data já passada —
  // precisa perguntar se a pessoa sumiu ou avisou antes de remarcar.
  reuniaoAnteriorPendente?: boolean;
  // Veio do aviso que já apareceu no Kanban na hora de arrastar o card —
  // a resposta já está definida, não precisa perguntar de novo aqui dentro.
  reuniaoAnteriorSumiuPredefinido?: "sim" | "nao";
  // Esse lead já teve alguma reunião registrada alguma vez (não importa o
  // status) — usado só pra desabilitar no menu os níveis que a trava do
  // servidor ia recusar de qualquer jeito (ver sincronizarReuniao).
  jaTeveReuniao?: boolean;
  // Data da reunião que está "marcada" agora, se houver — usado só pra
  // desabilitar a opção "Sim" na pergunta "essa reunião aconteceu?" quando
  // a data ainda não chegou (mesma trava do servidor, mas visual).
  reuniaoAtivaAgendadaPara?: string | null;
  // Closer definido na reunião marcada agora, se houver — pré-preenche o
  // seletor de closer quando o lead já está em "Reunião marcada" (ver
  // bloco logo abaixo de vaiEntrarEmReuniaoMarcada).
  reuniaoAtivaCloserId?: string | null;
  // Avisa o pop-up (lead-modal-conteudo.tsx) que a pessoa confirmou "teve
  // proposta" ao mover manualmente pra Follow/Oportunidades — o pop-up
  // rola até o card de Proposta e destaca, em vez de fechar sozinho.
  aoConfirmarTeveProposta?: () => void;
}) {
  const modalAtivo = useLeadModalAtivo();
  const acaoComId = atualizarLead.bind(null, lead.id, !modalAtivo);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);
  const enviandoRef = useRef(false);

  // Só roda dentro do pop-up (fora dele, quem sinaliza sucesso é o
  // redirect — ver atualizarLead). Samuel pediu explicitamente que
  // "Salvar alterações" feche o pop-up sozinho, sem precisar clicar fora.
  useEffect(() => {
    if (pendente) {
      enviandoRef.current = true;
      return;
    }
    if (enviandoRef.current) {
      enviandoRef.current = false;
      if (estado.erro === null) {
        // "Teve proposta? Sim" — em vez de fechar, mantém o pop-up aberto
        // rolado até o card de Proposta, pra pessoa preencher na hora (ver
        // aoConfirmarTeveProposta em lead-modal-conteudo.tsx).
        if (tevePropostaResposta === "sim") {
          modalAtivo?.recarregar();
          aoConfirmarTeveProposta?.();
        } else {
          modalAtivo?.fechar();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendente, estado]);

  const [nivelSelecionado, setNivelSelecionado] = useState(
    preSelecionarReuniao ? NIVEL_REUNIAO_MARCADA : String(lead.nivel_ordem)
  );

  // Rola até o campo de data sempre que a pessoa entra em "vai marcar
  // reunião" — seja porque já veio assim do botão do card (marcarReuniao),
  // seja porque clicou em "Agendar {reunião}" aqui dentro do formulário.
  // Sem isso ela abria lá em cima, obrigando a descer pra achar o que veio
  // fazer (Samuel pediu isso explicitamente).
  const camposReuniaoRef = useRef<HTMLDivElement>(null);
  const [oportunidadeFutura, setOportunidadeFutura] = useState(lead.oportunidade_futura);
  const [reuniaoAconteceu, setReuniaoAconteceu] = useState("");
  const [tevePropostaResposta, setTevePropostaResposta] = useState("");
  const [reuniaoAnteriorSumiu, setReuniaoAnteriorSumiu] = useState("");
  const [origemAtual, setOrigemAtual] = useState(lead.origem ?? "");
  const ehIndicacao = origemAtual.toLowerCase().includes("indica");
  const [motivoBaseSelecionado, setMotivoBaseSelecionado] = useState(lead.motivo_base ?? "");

  // "Oportunidades futuras" não é um nível de verdade no banco — é o nível
  // 7 (Leads para fim do mês) + essa marcação. Mas o SDR quer escolher ela
  // direto no menu Nível, sem precisar primeiro escolher outro nível e
  // depois achar um checkbox separado. Por isso entra como uma opção a
  // mais dentro do <select>, logo abaixo de "Leads para fim do mês".
  function aoMudarNivel(novoValor: string) {
    if (novoValor === OPCAO_OPORTUNIDADE_FUTURA) {
      setNivelSelecionado(NIVEL_OPORTUNIDADES);
      setOportunidadeFutura(true);
    } else {
      setNivelSelecionado(novoValor);
      if (novoValor !== NIVEL_OPORTUNIDADES) setOportunidadeFutura(false);
    }
  }
  const valorMenuNivel =
    nivelSelecionado === NIVEL_OPORTUNIDADES && oportunidadeFutura
      ? OPCAO_OPORTUNIDADE_FUTURA
      : nivelSelecionado;
  const vaiEntrarEmReuniaoMarcada =
    nivelSelecionado === NIVEL_REUNIAO_MARCADA && String(lead.nivel_ordem) !== NIVEL_REUNIAO_MARCADA;

  useEffect(() => {
    if (vaiEntrarEmReuniaoMarcada) {
      camposReuniaoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [vaiEntrarEmReuniaoMarcada]);

  function aoClicarAgendarReuniao() {
    aoMudarNivel(NIVEL_REUNIAO_MARCADA);
  }

  const vaiEntrarEmBase =
    nivelSelecionado === NIVEL_BASE && String(lead.nivel_ordem) !== NIVEL_BASE;
  // Saindo de "Reunião marcada" pra "Follow após reunião" ou
  // "Oportunidades": a taxa de comparecimento só pode contar reunião que
  // realmente aconteceu, então confirma antes de deixar salvar.
  const vaiConfirmarReuniao =
    String(lead.nivel_ordem) === NIVEL_REUNIAO_MARCADA &&
    (nivelSelecionado === NIVEL_FOLLOW_POS_REUNIAO || nivelSelecionado === NIVEL_OPORTUNIDADES);
  // "Sobre o lead" só faz sentido a partir de Reunião marcada — é ali que
  // o SDR precisa preencher pra marcar a call. Antes disso (Sem conversa,
  // Em qualificação, Topou reunião sem horário) só existe "Registrar
  // nota", pra não confundir o SDR achando que precisa preencher isso
  // toda vez que só liga e anota o retorno. Uma vez preenchido, continua
  // aparecendo pra sempre, mesmo o lead indo pra No-show/Base/Oportunidade.
  const mostrarSobreLead = Number(nivelSelecionado) >= Number(NIVEL_REUNIAO_MARCADA);
  // Depois de vendido, o lead saiu do funil de vez — mudar o nível dele
  // não faz mais sentido (não existe "voltar pra qualificação" de quem já
  // fechou). O valor fica travado no que já estava, só sem aparecer.
  const vendido = lead.status === "vendido";
  const nomeResponsavelAtual =
    usuarios.find((u) => u.id === lead.responsavel_id)?.nome ?? "Ninguém definido";
  // Lead na Base: sem nível pra escolher, sem "Agendar reunião" — só o
  // botão "Reativar" (Samuel foi explícito: reativar é coisa de Base, a
  // "Repescagem futura de ICP" continua exatamente como estava).
  const estaNaBase = String(lead.nivel_ordem) === NIVEL_BASE;
  const niveisReativacao = niveis.filter((n) => NIVEIS_REATIVACAO.includes(n.ordem));

  // Mesmas travas de painel/lib/leads/actions.ts (sincronizarReuniao), só
  // que aplicadas aqui pra desabilitar a opção no menu em vez de deixar
  // escolher e mostrar erro só depois de clicar em "Salvar alterações".
  // Ficar no nível que já está sempre é permitido (não muda nada).
  // ehFutura = true só quando quem está checando é a opção "Repescagem
  // futura de ICP" — ela usa o mesmo nível 8 por baixo, mas não exige
  // reunião registrada (só a "Oportunidades" normal exige).
  function nivelPermitido(ordemDestino: string, ehFutura = false): boolean {
    const nivelAtual = String(lead.nivel_ordem);
    if (ordemDestino === nivelAtual) return true;

    if (
      nivelAtual === NIVEL_REUNIAO_MARCADA &&
      ordemDestino !== NIVEL_NO_SHOW &&
      ordemDestino !== NIVEL_REAGENDAMENTO &&
      ordemDestino !== NIVEL_FOLLOW_POS_REUNIAO &&
      ordemDestino !== NIVEL_OPORTUNIDADES
    ) {
      return false;
    }

    // No-show e "Precisa reagendar" só existem vindo de "Reunião marcada"
    // — os dois descrevem o que aconteceu com UMA reunião marcada
    // específica, não dá pra pular pra eles de qualquer nível. Mesma trava
    // de lib/leads/actions.ts, só que aqui bloqueia antes de tentar salvar
    // (Samuel reparou que essa aqui estava faltando).
    if (
      (ordemDestino === NIVEL_NO_SHOW || ordemDestino === NIVEL_REAGENDAMENTO) &&
      nivelAtual !== NIVEL_REUNIAO_MARCADA
    ) {
      return false;
    }

    // Base e "Oportunidades futuras" ficam de fora dessa trava (Samuel
    // pediu explicitamente os dois) — só Follow e a "Oportunidades" normal
    // exigem reunião registrada.
    if (
      (ordemDestino === NIVEL_FOLLOW_POS_REUNIAO ||
        (ordemDestino === NIVEL_OPORTUNIDADES && !ehFutura)) &&
      !jaTeveReuniao
    ) {
      return false;
    }

    return true;
  }

  // Diferente de nivelPermitido (que só desabilita, deixando visível e
  // acinzentado): esses dois casos nem devem aparecer na lista. Samuel foi
  // enfático — "já aconteceu, não tem como voltar" pros níveis de antes da
  // reunião, e No-show/Reagendamento só fazem sentido saindo de "Reunião
  // marcada" — de qualquer outro nível nem é opção.
  function deveApareceNoMenu(ordemDestino: string): boolean {
    const nivelAtual = String(lead.nivel_ordem);
    if (ordemDestino === nivelAtual) return true;

    // "Novos Leads" é porta de mão única: uma vez que o lead saiu de lá,
    // não existe voltar — não importa se já teve reunião ou não (Samuel
    // foi enfático: o lead já avançou na conversa).
    if (ordemDestino === "0" && nivelAtual !== "0") {
      return false;
    }

    if (
      jaTeveReuniao &&
      (ordemDestino === "1" || ordemDestino === "2" || ordemDestino === "3")
    ) {
      return false;
    }

    if (
      (ordemDestino === NIVEL_NO_SHOW || ordemDestino === NIVEL_REAGENDAMENTO) &&
      nivelAtual !== NIVEL_REUNIAO_MARCADA
    ) {
      return false;
    }

    // "Follow após reunião" só existe pra quem já teve reunião de
    // verdade em algum momento — sem essa trava dava pra pular direto de
    // "Novos Leads" pra lá (Samuel pegou isso ao vivo). "Oportunidades"
    // tem a mesma exigência, mas é tratada à parte lá no flatMap das
    // opções, porque a "Repescagem futura" usa o mesmo nível 8 sem essa
    // exigência.
    if (ordemDestino === NIVEL_FOLLOW_POS_REUNIAO && !jaTeveReuniao) {
      return false;
    }

    return true;
  }

  const saindoDeReuniaoMarcada = String(lead.nivel_ordem) === NIVEL_REUNIAO_MARCADA;
  const temNivelBloqueadoPorReuniaoMarcada =
    saindoDeReuniaoMarcada && niveis.some((n) => !nivelPermitido(String(n.ordem)));

  const reuniaoAtivaEhFutura = Boolean(
    reuniaoAtivaAgendadaPara && new Date(reuniaoAtivaAgendadaPara) > new Date()
  );

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <form action={acaoFormulario} className="space-y-4">
        <fieldset disabled={!podeEditar} className="space-y-4">
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="nome">
            Nome *
          </label>
          <input
            id="nome"
            name="nome"
            required
            defaultValue={lead.nome}
            className={campoClasse}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClasse} htmlFor="telefone">
            Telefone
          </label>
          <input
            id="telefone"
            name="telefone"
            defaultValue={lead.telefone_e164 ?? ""}
            className={campoClasse}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClasse} htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={lead.email ?? ""}
            className={campoClasse}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClasse} htmlFor="instagram">
            Instagram
          </label>
          <input
            id="instagram"
            name="instagram"
            placeholder="@usuario ou link do perfil"
            defaultValue={lead.instagram ?? ""}
            className={campoClasse}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClasse}>Origem</label>
          <OrigemSelect
            origens={origens}
            valorInicial={lead.origem ?? ""}
            onChange={setOrigemAtual}
          />
        </div>

        {ehIndicacao && (
          <div className="space-y-1">
            <label className={labelClasse} htmlFor="quem_indicou">
              Quem indicou?
            </label>
            <textarea
              id="quem_indicou"
              name="quem_indicou"
              rows={3}
              placeholder="Nome de quem indicou, características, se já é cliente..."
              className={campoClasse}
            />
            <p className="text-xs text-neutral-400">
              Isso vai ficar registrado nas notas do lead.
            </p>
          </div>
        )}

        <div className="space-y-1">
          <label className={labelClasse} htmlFor="responsavel_id">
            Responsável
          </label>
          {souAdmin ? (
            <ResponsavelSelect
              usuarios={usuarios}
              valorInicial={lead.responsavel_id}
              funcaoFiltro="sdr"
              permiteVazio
            />
          ) : (
            <p className={`${campoClasse} bg-neutral-50 text-neutral-600`}>
              {nomeResponsavelAtual}{" "}
              <span className="text-xs text-neutral-400">
                (só um admin pode reatribuir o lead)
              </span>
            </p>
          )}
        </div>

        {vendido ? (
          <input type="hidden" name="nivel_ordem" value={nivelSelecionado} />
        ) : estaNaBase ? (
          <>
            <input type="hidden" name="nivel_ordem" value={nivelSelecionado} />
            <BlocoReativarLead
              leadId={lead.id}
              niveisReativacao={niveisReativacao}
              usuarios={usuarios}
              souAdmin={souAdmin}
            />
          </>
        ) : (
        <div className="space-y-1.5">
          <label className="text-base font-bold text-neutral-900" htmlFor="nivel_ordem">
            Nível
          </label>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <MenuSelect
                id="nivel_ordem"
                value={valorMenuNivel}
                onChange={aoMudarNivel}
                buscar={false}
                options={niveis
                  .filter(
                    (nivel) =>
                      (String(nivel.ordem) !== NIVEL_REUNIAO_MARCADA ||
                        String(lead.nivel_ordem) === NIVEL_REUNIAO_MARCADA ||
                        // Acabou de clicar em "Agendar reunião" — mesmo essa
                        // opção não aparecendo mais na lista normal, o campo
                        // precisa mostrar "Reuniões marcadas" selecionado
                        // (não "Selecione..."), pra ficar claro o que vai
                        // acontecer e dar pra trocar de volta se quiser.
                        nivelSelecionado === NIVEL_REUNIAO_MARCADA) &&
                      deveApareceNoMenu(String(nivel.ordem))
                  )
                  .flatMap((nivel) => {
                    const opcao = {
                      value: String(nivel.ordem),
                      label: rotuloNivel(nivel, numerosVisiveis[nivel.ordem]),
                      disabled: !nivelPermitido(String(nivel.ordem)),
                    };
                    if (String(nivel.ordem) !== NIVEL_OPORTUNIDADES) return [opcao];
                    const futura = {
                      value: OPCAO_OPORTUNIDADE_FUTURA,
                      label: "Repescagem futura de ICP",
                      disabled: !nivelPermitido(NIVEL_OPORTUNIDADES, true),
                      indentado: true,
                    };
                    // A "Oportunidades" normal exige reunião registrada —
                    // sem isso só sobra a "Repescagem futura", que não exige
                    // (Samuel pediu essa exceção explicitamente).
                    if (!jaTeveReuniao) return [futura];
                    return [opcao, futura];
                  })}
              />
            </div>
            {/* "Reuniões marcadas" saiu da lista de opções — tem campo
                próprio (data, closer) que não cabe num clique só, então
                vira um botão dedicado do lado do SELETOR de nível (não só
                do título) — Samuel confirmou essa posição depois de ver
                ao vivo, maior e destacado igual o botão do card. */}
            {!vendido && String(lead.nivel_ordem) !== NIVEL_REUNIAO_MARCADA && (
              <button
                type="button"
                onClick={aoClicarAgendarReuniao}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm font-bold text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                <IconeCalendario className="h-4 w-4" />
                Agendar {reuniao(publicoOrg)}
              </button>
            )}
          </div>
          <input type="hidden" name="nivel_ordem" value={nivelSelecionado} />

          {temNivelBloqueadoPorReuniaoMarcada && (
            <p className="text-xs text-neutral-400">
              Alguns níveis estão bloqueados: saindo de &quot;{Reuniao(publicoOrg)} marcada&quot; só
              dá pra ir pra &quot;No-show&quot;, &quot;Precisa reagendar&quot;, &quot;Follow após reunião&quot; ou
              &quot;Oportunidades&quot;.
            </p>
          )}
          {vaiEntrarEmReuniaoMarcada && (
            <div
              ref={camposReuniaoRef}
              className="mt-2 scroll-mt-16 space-y-3 rounded-md border border-green-200 bg-green-50 p-3"
            >
              <div className="space-y-1">
                <label className="text-sm font-medium text-green-800" htmlFor="marcada_em">
                  Data em que foi marcada
                </label>
                <input
                  id="marcada_em"
                  name="marcada_em"
                  type="datetime-local"
                  required
                  defaultValue={agoraParaInputLocal()}
                  onClick={abrirSeletorDeData}
                  className={`${campoClasse} bg-white`}
                />
                <p className="text-xs text-green-700">
                  Já vem preenchido com agora — troque se estiver registrando
                  uma {reuniao(publicoOrg)} que foi marcada em outro dia.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-green-800" htmlFor="reuniao_data">
                  Data e hora da {reuniao(publicoOrg)}
                </label>
                <input
                  id="reuniao_data"
                  name="reuniao_data"
                  type="datetime-local"
                  required
                  onClick={abrirSeletorDeData}
                  className={`${campoClasse} bg-white`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-green-800" htmlFor="closer_id">
                  Closer (quem vai fazer a {reuniao(publicoOrg)})
                </label>
                <ResponsavelSelect
                  usuarios={usuarios}
                  name="closer_id"
                  placeholder="Ainda não definido"
                  funcaoFiltro="closer"
                />
              </div>

              {reuniaoAnteriorPendente && reuniaoAnteriorSumiuPredefinido && (
                <>
                  <input
                    type="hidden"
                    name="reuniao_anterior_sumiu"
                    value={reuniaoAnteriorSumiuPredefinido}
                  />
                  <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                    {reuniaoAnteriorSumiuPredefinido === "sim"
                      ? "Você já confirmou no aviso: a pessoa sumiu, não avisou nada."
                      : "Você já confirmou no aviso: ela avisou antes que precisava remarcar."}
                  </p>
                </>
              )}

              {reuniaoAnteriorPendente && !reuniaoAnteriorSumiuPredefinido && (
                <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-800">
                    Esse lead tem uma {reuniao(publicoOrg)} anterior marcada que já
                    passou da data. O que aconteceu?
                  </p>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 text-sm text-amber-800">
                      <input
                        type="radio"
                        name="reuniao_anterior_sumiu"
                        value="sim"
                        checked={reuniaoAnteriorSumiu === "sim"}
                        onChange={() => setReuniaoAnteriorSumiu("sim")}
                        required
                      />
                      A pessoa sumiu, não avisou nada
                    </label>
                    <label className="flex items-center gap-1.5 text-sm text-amber-800">
                      <input
                        type="radio"
                        name="reuniao_anterior_sumiu"
                        value="nao"
                        checked={reuniaoAnteriorSumiu === "nao"}
                        onChange={() => setReuniaoAnteriorSumiu("nao")}
                      />
                      Ela avisou antes que precisava remarcar
                    </label>
                  </div>
                  <p className="text-xs text-amber-700">
                    Só quem sumiu sem avisar conta como no-show na métrica de
                    comparecimento.
                  </p>
                </div>
              )}
            </div>
          )}

          {!vaiEntrarEmReuniaoMarcada &&
            nivelSelecionado === NIVEL_REUNIAO_MARCADA &&
            String(lead.nivel_ordem) === NIVEL_REUNIAO_MARCADA && (
              <div className="mt-2 space-y-1 rounded-md border border-green-200 bg-green-50 p-3">
                <label className="text-sm font-medium text-green-800" htmlFor="closer_id">
                  Closer (quem vai fazer a {reuniao(publicoOrg)})
                </label>
                <ResponsavelSelect
                  usuarios={usuarios}
                  valorInicial={reuniaoAtivaCloserId}
                  name="closer_id"
                  placeholder="Ainda não definido"
                  funcaoFiltro="closer"
                />
              </div>
            )}

          {vaiConfirmarReuniao && (
            <div className="mt-2 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">
                Essa {reuniao(publicoOrg)} realmente aconteceu?
              </p>
              <div className="flex gap-4">
                <label
                  className={`flex items-center gap-1.5 text-sm text-amber-800 ${reuniaoAtivaEhFutura ? "opacity-40" : ""}`}
                >
                  <input
                    type="radio"
                    name="reuniao_aconteceu"
                    value="sim"
                    checked={reuniaoAconteceu === "sim"}
                    onChange={() => setReuniaoAconteceu("sim")}
                    disabled={reuniaoAtivaEhFutura}
                    required
                  />
                  Sim
                </label>
                <label className="flex items-center gap-1.5 text-sm text-amber-800">
                  <input
                    type="radio"
                    name="reuniao_aconteceu"
                    value="nao"
                    checked={reuniaoAconteceu === "nao"}
                    onChange={() => setReuniaoAconteceu("nao")}
                  />
                  Não
                </label>
              </div>
              {reuniaoAtivaEhFutura ? (
                <p className="text-xs text-amber-700">
                  &quot;Sim&quot; está bloqueado porque essa {reuniao(publicoOrg)} está marcada pra
                  uma data que ainda não chegou (
                  {new Date(reuniaoAtivaAgendadaPara!).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                  ) — confira se a data está certa.
                </p>
              ) : (
                <p className="text-xs text-amber-700">
                  Se marcar &quot;Não&quot;, o lead continua em &quot;{Reuniao(publicoOrg)} marcada&quot;
                  — mova pra &quot;No-show&quot; ou &quot;Precisa reagendar&quot; se for o caso.
                </p>
              )}
            </div>
          )}

          {vaiConfirmarReuniao && reuniaoAconteceu === "sim" && (
            <div className="mt-2 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">
                Essa {reuniao(publicoOrg)} teve proposta?
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-sm text-amber-800">
                  <input
                    type="radio"
                    name="teve_proposta"
                    value="sim"
                    checked={tevePropostaResposta === "sim"}
                    onChange={() => setTevePropostaResposta("sim")}
                    required
                  />
                  Sim
                </label>
                <label className="flex items-center gap-1.5 text-sm text-amber-800">
                  <input
                    type="radio"
                    name="teve_proposta"
                    value="nao"
                    checked={tevePropostaResposta === "nao"}
                    onChange={() => setTevePropostaResposta("nao")}
                  />
                  Não
                </label>
              </div>
              {tevePropostaResposta === "sim" && (
                <p className="text-xs text-amber-700">
                  Depois de salvar, o card de Proposta abre destacado pra você preencher.
                </p>
              )}
            </div>
          )}

          {nivelSelecionado === NIVEL_OPORTUNIDADES && (
            <div className="mt-2 rounded-md border border-green-200 bg-green-50 p-3">
              <label className="flex items-start gap-2 text-sm text-green-800">
                <input
                  type="checkbox"
                  name="oportunidade_futura"
                  checked={oportunidadeFutura}
                  onChange={(e) => setOportunidadeFutura(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Repescagem futura de ICP — fez a {reuniao(publicoOrg)}, é ICP qualificado
                  (perfil de cliente ideal), mas não está podendo investir nesse mês.
                </span>
              </label>
            </div>
          )}

          {vaiEntrarEmBase && (
            <div className="mt-2 space-y-1 rounded-md border border-neutral-300 bg-neutral-50 p-3">
              <label className="text-sm font-medium text-neutral-700" htmlFor="motivo_base">
                Por que esse lead está indo pra Base?
              </label>
              <input type="hidden" name="motivo_base" value={motivoBaseSelecionado} />
              <MenuSelect
                id="motivo_base"
                value={motivoBaseSelecionado}
                onChange={setMotivoBaseSelecionado}
                placeholder="Selecione o motivo..."
                options={MOTIVOS_BASE.map((motivo) => ({
                  value: motivo.valor,
                  label: motivo.nome,
                }))}
              />

              {motivoBaseSelecionado === "desqualificado" && (
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-medium text-neutral-700" htmlFor="motivo_base_detalhe">
                    Por que esse lead está desqualificado? Descreva o perfil dele.
                  </label>
                  <textarea
                    id="motivo_base_detalhe"
                    name="motivo_base_detalhe"
                    required
                    rows={3}
                    defaultValue={lead.motivo_base_detalhe ?? ""}
                    placeholder="Ex.: não tem equipe de vendas hoje, só corretor autônomo — não é o perfil da mentoria agora."
                    className={campoClasse}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {mostrarSobreLead ? (
          <fieldset className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Sobre o lead
            </legend>

            <div className="space-y-1">
              <label className={labelClasse} htmlFor="criterio_problema">
                Me conte sobre o lead — qual é o perfil dele?
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Situação hoje",
                  "O que já tentou",
                  "Onde quer chegar",
                  "Autonomia de decisão",
                ].map((dica) => (
                  <span
                    key={dica}
                    className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs text-neutral-600"
                  >
                    {dica}
                  </span>
                ))}
              </div>
              <textarea
                id="criterio_problema"
                name="criterio_problema"
                rows={4}
                defaultValue={lead.criterio_problema ?? ""}
                className={`${campoClasse} bg-white`}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClasse} htmlFor="criterio_urgencia">
                Tem urgência em resolver
              </label>
              <MenuSelect
                id="criterio_urgencia"
                name="criterio_urgencia"
                defaultValue={lead.criterio_urgencia}
                buscar={false}
                options={[
                  { value: "desconhecida", label: "Ainda não sei" },
                  { value: "alta", label: "Alta" },
                  { value: "media", label: "Média" },
                  { value: "baixa", label: "Baixa" },
                ]}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClasse} htmlFor="criterio_capacidade">
                Consegue pagar a solução
              </label>
              <MenuSelect
                id="criterio_capacidade"
                name="criterio_capacidade"
                defaultValue={lead.criterio_capacidade}
                buscar={false}
                options={[
                  { value: "desconhecida", label: "Ainda não sei" },
                  { value: "sim", label: "Sim" },
                  { value: "parcial", label: "Parcial" },
                  { value: "nao", label: "Não" },
                ]}
              />
            </div>
          </fieldset>
        ) : (
          <>
            <input type="hidden" name="criterio_problema" value={lead.criterio_problema ?? ""} />
            <input type="hidden" name="criterio_urgencia" value={lead.criterio_urgencia} />
            <input type="hidden" name="criterio_capacidade" value={lead.criterio_capacidade} />
          </>
        )}
      </fieldset>

        <div className="sticky bottom-0 -mx-6 -mb-6 space-y-2 rounded-b-lg border-t border-neutral-200 bg-white px-6 py-4">
          {estado.erro && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {estado.erro}
            </p>
          )}

          {podeEditar && (
            <button
              type="submit"
              disabled={pendente}
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {pendente ? "Salvando..." : "Salvar alterações"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
