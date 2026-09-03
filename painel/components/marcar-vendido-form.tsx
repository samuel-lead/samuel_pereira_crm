"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { marcarVendido, type EstadoFormulario } from "@/lib/leads/actions";
import { ProdutoSelect } from "@/components/produto-select";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";

const estadoInicial: EstadoFormulario = { erro: null };

function hojeNoInputDate() {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatarCentavos(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function CampoMoeda({
  name,
  label,
  placeholder,
  valorInicial,
}: {
  name: string;
  label: string;
  placeholder: string;
  valorInicial?: number | null;
}) {
  const [centavos, setCentavos] = useState(
    valorInicial ? Math.round(valorInicial * 100) : 0
  );

  function aoDigitar(evento: ChangeEvent<HTMLInputElement>) {
    const somenteDigitos = evento.target.value.replace(/\D/g, "");
    setCentavos(somenteDigitos ? Number(somenteDigitos) : 0);
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-green-800">
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={centavos ? formatarCentavos(centavos) : ""}
        onChange={aoDigitar}
        placeholder={placeholder}
        className="w-full rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-[10px] focus:border-green-500 focus:ring-1 focus:ring-green-500"
      />
      <input type="hidden" name={name} value={centavos ? (centavos / 100).toFixed(2) : ""} />
    </div>
  );
}

export function MarcarVendidoForm({
  leadId,
  propostaValor,
  produtos,
}: {
  leadId: string;
  propostaValor?: number | null;
  produtos: string[];
}) {
  const modalAtivo = useLeadModalAtivo();
  const acaoComId = marcarVendido.bind(null, leadId);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (pendente) {
      enviandoRef.current = true;
      return;
    }
    if (enviandoRef.current) {
      enviandoRef.current = false;
      if (estado.erro === null) {
        modalAtivo?.recarregar();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendente, estado]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500">
        Ao marcar como vendido, o lead sai do Funil e vai para Clientes.
      </p>
      <form action={acaoFormulario} className="space-y-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-green-800" htmlFor="vendido_em">
            Data da venda
          </label>
          <input
            id="vendido_em"
            name="vendido_em"
            type="date"
            required
            defaultValue={hojeNoInputDate()}
            max={hojeNoInputDate()}
            className="w-full rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
          <p className="mt-1 text-[10px] text-neutral-400">
            O dia em que a venda realmente aconteceu — não precisa ser hoje.
          </p>
        </div>
        <CampoMoeda
          key={propostaValor ?? "sem-proposta"}
          name="valor_venda"
          label="Valor da venda (R$)"
          placeholder="Preço combinado com o lead"
          valorInicial={propostaValor}
        />
        <CampoMoeda
          name="receita_venda"
          label="Receita recebida (R$)"
          placeholder="Deixe em branco se o pagamento ainda não caiu"
        />
        {estado.erro && (
          <p className="text-sm text-red-600">{estado.erro}</p>
        )}
        <button
          type="submit"
          disabled={pendente}
          className="w-full rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 disabled:opacity-60"
        >
          {pendente ? "Salvando..." : "Marcar como vendido"}
        </button>

        <div>
          <label className="mb-1 block text-xs font-medium text-green-800">
            Produto
          </label>
          <ProdutoSelect produtos={produtos} />
        </div>
      </form>
    </div>
  );
}
