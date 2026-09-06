"use client";

import { useState, useTransition } from "react";
import { salvarReuniaoNoGoogleAgenda } from "@/lib/leads/actions";

// Clica e já salva na Google Agenda de verdade, sem abrir nada — Samuel
// pediu que o próprio botão mostrasse que salvou, sem trocar de tela. Se
// a reunião já tinha sido salva antes (reagendou, por exemplo), clicar de
// novo ATUALIZA o mesmo evento em vez de criar um duplicado (ver
// google_event_id em reunioes).
//
// O botão sempre aparece, mesmo sem e-mail do lead — Samuel pediu que
// ficasse visível só desabilitado, com o aviso vermelho embaixo, em vez
// de sumir. Assim que o e-mail é cadastrado ele libera sozinho.
export function BotaoGoogleAgenda({
  reuniaoId,
  temEmail,
}: {
  reuniaoId: string;
  temEmail: boolean;
}) {
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function aoClicar() {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await salvarReuniaoNoGoogleAgenda(reuniaoId);
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      setSalvo(true);
    });
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={aoClicar}
        disabled={pendente || !temEmail}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
          salvo
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
        }`}
      >
        {pendente ? "Salvando..." : salvo ? "✓ Salvo na Google Agenda" : "Salvar na Google Agenda"}
      </button>
      {!temEmail && (
        <p className="text-xs font-medium text-red-600">
          Só é possível salvar na Google Agenda se tiver o e-mail do cliente.
          Adicione o e-mail acima e salve pra liberar.
        </p>
      )}
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
