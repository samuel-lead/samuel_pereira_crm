"use client";

import { Fragment, useActionState, useState } from "react";
import { atualizarLead, type EstadoFormulario } from "@/lib/leads/actions";
import { OrigemSelect } from "@/components/origem-select";
import { ResponsavelSelect } from "@/components/responsavel-select";
import { rotuloNivel, type NivelResumo } from "@/lib/niveis";
import { reuniao } from "@/lib/terminologia";

const NIVEL_REUNIAO_MARCADA = "4";
const NIVEL_FOLLOW_POS_REUNIAO = "6";
const NIVEL_OPORTUNIDADES = "7";
const NIVEL_BASE = "8";
const OPCAO_OPORTUNIDADE_FUTURA = "oportunidade_futura";

const MOTIVOS_BASE = [
  { valor: "nao_iniciou_conversa", nome: "Não consegui iniciar conversa" },
  { valor: "qualificou_sumiu", nome: "Iniciei conversa, qualifiquei e sumiu" },
  { valor: "nao_reagendados", nome: "Não reagendados" },
  { valor: "proposta_nao_comprou", nome: "Fiz proposta e não comprou" },
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
  origem: string | null;
  nivel_ordem: number;
  criterio_problema: string | null;
  criterio_urgencia: string;
  criterio_capacidade: string;
  responsavel_id: string | null;
  oportunidade_futura: boolean;
  motivo_base: string | null;
  status: string;
};

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500";
const labelClasse = "text-sm font-medium text-neutral-700";
const estadoInicial: EstadoFormulario = { erro: null };

export function EditarLeadForm({
  lead,
  niveis,
  numerosVisiveis,
  usuarios,
  origens,
  souAdmin = true,
  podeEditar = true,
  preSelecionarReuniao = false,
  preSelecionarNivel,
  reuniaoAnteriorPendente = false,
  publicoOrg = "mentoria",
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
  // Veio do drag-and-drop no Kanban (saindo de "Reunião marcada" pra
  // "Follow após reunião"/"Oportunidades"): já chega com o nível de
  // destino escolhido, só falta confirmar se a reunião aconteceu.
  preSelecionarNivel?: string;
  // Existe uma reunião anterior ainda "marcada" com a data já passada —
  // precisa perguntar se a pessoa sumiu ou avisou antes de remarcar.
  reuniaoAnteriorPendente?: boolean;
}) {
  const acaoComId = atualizarLead.bind(null, lead.id);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);
  const [nivelSelecionado, setNivelSelecionado] = useState(
    preSelecionarReuniao
      ? NIVEL_REUNIAO_MARCADA
      : preSelecionarNivel === OPCAO_OPORTUNIDADE_FUTURA
        ? NIVEL_OPORTUNIDADES
        : preSelecionarNivel ?? String(lead.nivel_ordem)
  );
  const [oportunidadeFutura, setOportunidadeFutura] = useState(
    preSelecionarNivel === OPCAO_OPORTUNIDADE_FUTURA ? true : lead.oportunidade_futura
  );
  const [reuniaoAconteceu, setReuniaoAconteceu] = useState("");
  const [reuniaoAnteriorSumiu, setReuniaoAnteriorSumiu] = useState("");
  const [origemAtual, setOrigemAtual] = useState(lead.origem ?? "");
  const ehIndicacao = origemAtual.toLowerCase().includes("indica");

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
        ) : (
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="nivel_ordem">
            Nível
          </label>
          <select
            id="nivel_ordem"
            value={valorMenuNivel}
            onChange={(e) => aoMudarNivel(e.target.value)}
            className={campoClasse}
          >
            {niveis.map((nivel) => (
              <Fragment key={nivel.ordem}>
                <option value={nivel.ordem}>
                  {rotuloNivel(nivel, numerosVisiveis[nivel.ordem])}
                </option>
                {String(nivel.ordem) === NIVEL_OPORTUNIDADES && (
                  <option value={OPCAO_OPORTUNIDADE_FUTURA}>
                    ↳ Oportunidades futuras
                  </option>
                )}
              </Fragment>
            ))}
          </select>
          <input type="hidden" name="nivel_ordem" value={nivelSelecionado} />

          {vaiEntrarEmReuniaoMarcada && (
            <div className="mt-2 space-y-3 rounded-md border border-green-200 bg-green-50 p-3">
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

              {reuniaoAnteriorPendente && (
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

          {vaiConfirmarReuniao && (
            <div className="mt-2 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">
                Essa {reuniao(publicoOrg)} realmente aconteceu?
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-sm text-amber-800">
                  <input
                    type="radio"
                    name="reuniao_aconteceu"
                    value="sim"
                    checked={reuniaoAconteceu === "sim"}
                    onChange={() => setReuniaoAconteceu("sim")}
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
              <p className="text-xs text-amber-700">
                Se marcar &quot;Não&quot;, essa {reuniao(publicoOrg)} não conta na taxa de
                comparecimento — mesmo o lead seguindo pro nível escolhido.
              </p>
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
                  Oportunidade futura — fez a {reuniao(publicoOrg)}, é ICP qualificado, mas
                  avisou que só fecha depois (não é pra fechar esse mês).
                </span>
              </label>
            </div>
          )}

          {vaiEntrarEmBase && (
            <div className="mt-2 space-y-1 rounded-md border border-neutral-300 bg-neutral-50 p-3">
              <label className="text-sm font-medium text-neutral-700" htmlFor="motivo_base">
                Por que esse lead está indo pra Base?
              </label>
              <select
                id="motivo_base"
                name="motivo_base"
                required
                defaultValue={lead.motivo_base ?? ""}
                className={`${campoClasse} bg-white`}
              >
                <option value="" disabled>
                  Selecione o motivo...
                </option>
                {MOTIVOS_BASE.map((motivo) => (
                  <option key={motivo.valor} value={motivo.valor}>
                    {motivo.nome}
                  </option>
                ))}
              </select>
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
              <select
                id="criterio_urgencia"
                name="criterio_urgencia"
                defaultValue={lead.criterio_urgencia}
                className={`${campoClasse} bg-white`}
              >
                <option value="desconhecida">Ainda não sei</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelClasse} htmlFor="criterio_capacidade">
                Consegue pagar a solução
              </label>
              <select
                id="criterio_capacidade"
                name="criterio_capacidade"
                defaultValue={lead.criterio_capacidade}
                className={`${campoClasse} bg-white`}
              >
                <option value="desconhecida">Ainda não sei</option>
                <option value="sim">Sim</option>
                <option value="parcial">Parcial</option>
                <option value="nao">Não</option>
              </select>
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
