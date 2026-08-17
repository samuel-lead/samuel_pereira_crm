"use client";

import { arquivarLead } from "@/lib/leads/actions";

export function ExcluirLeadButton({ leadId, nome }: { leadId: string; nome: string }) {
  return (
    <form
      action={arquivarLead.bind(null, leadId)}
      onSubmit={(e) => {
        if (
          !confirm(
            `Tem certeza que quer excluir o lead "${nome}"? Ele vai sumir de todas as telas.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
      >
        Excluir lead
      </button>
    </form>
  );
}
