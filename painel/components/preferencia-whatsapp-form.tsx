"use client";

import { useEffect, useState } from "react";
import {
  lerPreferenciaWhatsapp,
  salvarPreferenciaWhatsapp,
  type PreferenciaWhatsapp,
} from "@/lib/whatsapp";

const OPCOES: { valor: PreferenciaWhatsapp; titulo: string; descricao: string }[] = [
  {
    valor: "ambos",
    titulo: "Abrir os dois",
    descricao: "Tenta o aplicativo e o WhatsApp Web ao mesmo tempo (padrão).",
  },
  {
    valor: "app",
    titulo: "Só o aplicativo",
    descricao: "Uso o WhatsApp instalado neste computador.",
  },
  {
    valor: "web",
    titulo: "Só o navegador (Web)",
    descricao: "Uso o web.whatsapp.com, sem aplicativo instalado.",
  },
];

// Fica salvo só neste navegador/computador (localStorage) — cada
// dispositivo pode ter uma resposta diferente, não é algo da conta.
export function PreferenciaWhatsappForm() {
  const [preferencia, setPreferencia] = useState<PreferenciaWhatsapp>("ambos");

  useEffect(() => {
    setPreferencia(lerPreferenciaWhatsapp());
  }, []);

  function aoEscolher(valor: PreferenciaWhatsapp) {
    setPreferencia(valor);
    salvarPreferenciaWhatsapp(valor);
  }

  return (
    <div className="space-y-2">
      {OPCOES.map((opcao) => (
        <label
          key={opcao.valor}
          className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition ${
            preferencia === opcao.valor
              ? "border-blue-500 bg-blue-50"
              : "border-neutral-200 hover:bg-neutral-50"
          }`}
        >
          <input
            type="radio"
            name="preferencia_whatsapp"
            checked={preferencia === opcao.valor}
            onChange={() => aoEscolher(opcao.valor)}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-neutral-900">
              {opcao.titulo}
            </span>
            <span className="block text-xs text-neutral-500">
              {opcao.descricao}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
