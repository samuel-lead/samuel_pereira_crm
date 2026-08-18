"use client";

import { useActionState, useState } from "react";
import { atualizarLead, type EstadoFormulario } from "@/lib/leads/actions";
import { OrigemSelect } from "@/components/origem-select";
import { ResponsavelSelect } from "@/components/responsavel-select";
import { rotuloNivel, type NivelResumo } from "@/lib/niveis";

const NIVEL_REUNIAO_MARCADA = "4";
const NIVEL_OPORTUNIDADES = "6";

function agoraParaInputLocal() {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
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
};

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500";
const labelClasse = "text-sm font-medium text-neutral-700";
const estadoInicial: EstadoFormulario = { erro: null };

export function EditarLeadForm({
  lead,
  niveis,
  numerosVisiveis,
  usuarios,
  souAdmin = true,
  podeEditar = true,
  preSelecionarReuniao = false,
}: {
  lead: Lead;
  niveis: NivelResumo[];
  numerosVisiveis: Record<number, number>;
  usuarios: { id: string; nome: string; funcao?: string | null }[];
  souAdmin?: boolean;
  podeEditar?: boolean;
  preSelecionarReuniao?: boolean;
}) {
  const acaoComId = atualizarLead.bind(null, lead.id);
  const [estado, acaoFormulario] = useActionState(acaoComId, estadoInicial);
  const [nivelSelecionado, setNivelSelecionado] = useState(
    preSelecionarReuniao ? NIVEL_REUNIAO_MARCADA : String(lead.nivel_ordem)
  );
  const vaiEntrarEmReuniaoMarcada =
    nivelSelecionado === NIVEL_REUNIAO_MARCADA && String(lead.nivel_ordem) !== NIVEL_REUNIAO_MARCADA;
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
          <OrigemSelect valorInicial={lead.origem ?? ""} />
        </div>

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

        <div className="space-y-1">
          <label className={labelClasse} htmlFor="nivel_ordem">
            Nível
          </label>
          <select
            id="nivel_ordem"
            name="nivel_ordem"
            value={nivelSelecionado}
            onChange={(e) => setNivelSelecionado(e.target.value)}
            className={campoClasse}
          >
            {niveis.map((nivel) => (
              <option key={nivel.ordem} value={nivel.ordem}>
                {rotuloNivel(nivel, numerosVisiveis[nivel.ordem])}
              </option>
            ))}
          </select>

          {vaiEntrarEmReuniaoMarcada && (
            <div className="mt-2 space-y-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-emerald-800" htmlFor="marcada_em">
                  Data em que foi marcada
                </label>
                <input
                  id="marcada_em"
                  name="marcada_em"
                  type="datetime-local"
                  required
                  defaultValue={agoraParaInputLocal()}
                  className={`${campoClasse} bg-white`}
                />
                <p className="text-xs text-emerald-700">
                  Já vem preenchido com agora — troque se estiver registrando
                  uma reunião que foi marcada em outro dia.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-emerald-800" htmlFor="reuniao_data">
                  Data e hora da reunião
                </label>
                <input
                  id="reuniao_data"
                  name="reuniao_data"
                  type="datetime-local"
                  required
                  className={`${campoClasse} bg-white`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-emerald-800" htmlFor="closer_id">
                  Closer (quem vai fazer a reunião)
                </label>
                <ResponsavelSelect
                  usuarios={usuarios}
                  name="closer_id"
                  placeholder="Ainda não definido"
                  funcaoFiltro="closer"
                />
              </div>
            </div>
          )}

          {nivelSelecionado === NIVEL_OPORTUNIDADES && (
            <div className="mt-2 rounded-md border border-green-200 bg-green-50 p-3">
              <label className="flex items-start gap-2 text-sm text-green-800">
                <input
                  type="checkbox"
                  name="oportunidade_futura"
                  defaultChecked={lead.oportunidade_futura}
                  className="mt-0.5"
                />
                <span>
                  Oportunidade futura — fez a reunião, é ICP qualificado, mas
                  avisou que só fecha depois (não é pra fechar esse mês).
                </span>
              </label>
            </div>
          )}
        </div>

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
      </fieldset>

        {estado.erro && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {estado.erro}
          </p>
        )}

        {podeEditar && (
          <button
            type="submit"
            className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
          >
            Salvar alterações
          </button>
        )}
      </form>
    </div>
  );
}
