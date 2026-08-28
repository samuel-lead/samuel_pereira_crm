"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { arquivarLead, revalidarListasLeads, type EstadoFormulario } from "@/lib/leads/actions";

const estadoInicial: EstadoFormulario = { erro: null };

export function ExcluirLeadButton({
  leadId,
  nome,
  variante,
}: {
  leadId: string;
  nome: string;
  variante: "pagina" | "modal";
}) {
  const router = useRouter();
  // Na página cheia, quem manda de volta pra /leads é a própria ação
  // (redirect). No pop-up isso quebraria ele (ver comentário em
  // arquivarLead) — então quem fecha é esse componente, ao ver "salvoEm"
  // aparecer no estado.
  const acaoComId = arquivarLead.bind(null, leadId, variante === "pagina");
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);

  useEffect(() => {
    if (variante !== "modal" || !estado.salvoEm) return;
    (async () => {
      await revalidarListasLeads();
      router.back();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.salvoEm]);

  return (
    <form
      action={acaoFormulario}
      onSubmit={(e) => {
        if (
          !confirm(
            `Tem certeza que quer excluir o lead "${nome}"? Ele vai sumir de todas as telas.`
          )
        ) {
          e.preventDefault();
        }
      }}
      className="space-y-1"
    >
      {estado.erro && <p className="text-xs text-red-600">{estado.erro}</p>}
      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
      >
        {pendente ? "Excluindo..." : "Excluir lead"}
      </button>
    </form>
  );
}
