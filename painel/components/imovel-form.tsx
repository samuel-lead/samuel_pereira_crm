"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { EstadoFormulario } from "@/lib/imoveis/actions";

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const labelClasse = "text-sm font-medium text-neutral-700";

export type ImovelExistente = {
  titulo: string;
  tipo: string;
  finalidade: string;
  valor_venda: number | null;
  valor_aluguel: number | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  quartos: number | null;
  banheiros: number | null;
  vagas_garagem: number | null;
  area_m2: number | null;
  descricao: string | null;
  status: string;
  proprietario_nome: string | null;
  proprietario_telefone: string | null;
};

export function ImovelForm({
  acao,
  imovel,
  textoBotao,
  cancelarHref,
}: {
  acao: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  imovel?: ImovelExistente;
  textoBotao: string;
  cancelarHref: string;
}) {
  const estadoInicial: EstadoFormulario = { erro: null };
  const [estado, acaoFormulario, pendente] = useActionState(acao, estadoInicial);
  const [salvo, setSalvo] = useState(false);
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (pendente) {
      enviandoRef.current = true;
      return;
    }
    if (enviandoRef.current) {
      enviandoRef.current = false;
      if (estado.erro === null) {
        setSalvo(true);
        const timeout = setTimeout(() => setSalvo(false), 2000);
        return () => clearTimeout(timeout);
      }
    }
  }, [pendente, estado]);

  return (
    <form action={acaoFormulario} className="space-y-4">
      <div className="space-y-1">
        <label className={labelClasse} htmlFor="titulo">
          Título *
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          defaultValue={imovel?.titulo}
          placeholder="Ex.: Apartamento 3 quartos - Setor Bueno"
          className={campoClasse}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="tipo">
            Tipo
          </label>
          <select id="tipo" name="tipo" defaultValue={imovel?.tipo ?? "apartamento"} className={campoClasse}>
            <option value="apartamento">Apartamento</option>
            <option value="casa">Casa</option>
            <option value="terreno">Terreno</option>
            <option value="sala_comercial">Sala comercial</option>
            <option value="galpao">Galpão</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="finalidade">
            Finalidade
          </label>
          <select
            id="finalidade"
            name="finalidade"
            defaultValue={imovel?.finalidade ?? "venda"}
            className={campoClasse}
          >
            <option value="venda">Venda</option>
            <option value="aluguel">Aluguel</option>
            <option value="venda_aluguel">Venda e aluguel</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="valor_venda">
            Valor de venda (R$)
          </label>
          <input
            id="valor_venda"
            name="valor_venda"
            type="number"
            step="0.01"
            defaultValue={imovel?.valor_venda ?? ""}
            className={campoClasse}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="valor_aluguel">
            Valor de aluguel (R$)
          </label>
          <input
            id="valor_aluguel"
            name="valor_aluguel"
            type="number"
            step="0.01"
            defaultValue={imovel?.valor_aluguel ?? ""}
            className={campoClasse}
          />
        </div>
      </div>

      <fieldset className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Endereço
        </legend>
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="endereco">
            Endereço
          </label>
          <input
            id="endereco"
            name="endereco"
            defaultValue={imovel?.endereco ?? ""}
            className={`${campoClasse} bg-white`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className={labelClasse} htmlFor="bairro">
              Bairro
            </label>
            <input
              id="bairro"
              name="bairro"
              defaultValue={imovel?.bairro ?? ""}
              className={`${campoClasse} bg-white`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClasse} htmlFor="cidade">
              Cidade
            </label>
            <input
              id="cidade"
              name="cidade"
              defaultValue={imovel?.cidade ?? "Goiânia"}
              className={`${campoClasse} bg-white`}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className={labelClasse} htmlFor="estado">
              Estado
            </label>
            <input
              id="estado"
              name="estado"
              defaultValue={imovel?.estado ?? "GO"}
              maxLength={2}
              className={`${campoClasse} bg-white`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClasse} htmlFor="cep">
              CEP
            </label>
            <input id="cep" name="cep" defaultValue={imovel?.cep ?? ""} className={`${campoClasse} bg-white`} />
          </div>
        </div>
      </fieldset>

      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="quartos">
            Quartos
          </label>
          <input
            id="quartos"
            name="quartos"
            type="number"
            defaultValue={imovel?.quartos ?? ""}
            className={campoClasse}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="banheiros">
            Banheiros
          </label>
          <input
            id="banheiros"
            name="banheiros"
            type="number"
            defaultValue={imovel?.banheiros ?? ""}
            className={campoClasse}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="vagas_garagem">
            Vagas
          </label>
          <input
            id="vagas_garagem"
            name="vagas_garagem"
            type="number"
            defaultValue={imovel?.vagas_garagem ?? ""}
            className={campoClasse}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="area_m2">
            Área (m²)
          </label>
          <input
            id="area_m2"
            name="area_m2"
            type="number"
            step="0.01"
            defaultValue={imovel?.area_m2 ?? ""}
            className={campoClasse}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className={labelClasse} htmlFor="status">
          Status
        </label>
        <select id="status" name="status" defaultValue={imovel?.status ?? "disponivel"} className={campoClasse}>
          <option value="disponivel">Disponível</option>
          <option value="reservado">Reservado</option>
          <option value="vendido">Vendido</option>
          <option value="alugado">Alugado</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className={labelClasse} htmlFor="descricao">
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={4}
          defaultValue={imovel?.descricao ?? ""}
          placeholder="Detalhes do imóvel — condição, diferenciais, condomínio..."
          className={campoClasse}
        />
      </div>

      <fieldset className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Proprietário
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className={labelClasse} htmlFor="proprietario_nome">
              Nome
            </label>
            <input
              id="proprietario_nome"
              name="proprietario_nome"
              defaultValue={imovel?.proprietario_nome ?? ""}
              className={`${campoClasse} bg-white`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClasse} htmlFor="proprietario_telefone">
              Telefone
            </label>
            <input
              id="proprietario_telefone"
              name="proprietario_telefone"
              defaultValue={imovel?.proprietario_telefone ?? ""}
              className={`${campoClasse} bg-white`}
            />
          </div>
        </div>
      </fieldset>

      {estado.erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{estado.erro}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pendente}
          className={`flex-1 rounded-md px-3 py-2.5 text-sm font-medium text-white shadow-sm transition disabled:opacity-60 ${
            salvo ? "bg-green-600 hover:bg-green-600" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {pendente ? "Salvando..." : salvo ? "Salvo ✓" : textoBotao}
        </button>
        <Link
          href={cancelarHref}
          className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
