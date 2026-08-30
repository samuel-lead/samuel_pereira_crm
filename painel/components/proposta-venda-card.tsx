import { RegistrarPropostaForm } from "@/components/registrar-proposta-form";
import { MarcarVendidoForm } from "@/components/marcar-vendido-form";

export function PropostaVendaCard({
  leadId,
  propostaAtual,
  produtos,
}: {
  leadId: string;
  propostaAtual: {
    valor: number | null;
    enviadaEm: string | null;
    observacao: string | null;
  };
  produtos: string[];
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[10px] text-white">
            1
          </span>
          Proposta
        </p>
        <RegistrarPropostaForm leadId={leadId} propostaAtual={propostaAtual} />
      </div>

      <div className="border-t border-neutral-100 p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-green-700">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">
            2
          </span>
          Fechar venda
        </p>
        <MarcarVendidoForm
          leadId={leadId}
          temProposta={propostaAtual.valor != null}
          produtos={produtos}
        />
      </div>
    </div>
  );
}
