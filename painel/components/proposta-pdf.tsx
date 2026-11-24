"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  listarPropostasPdf,
  registrarPropostaPdf,
  removerPropostaPdf,
  urlPropostaPdf,
  type PropostaPdf,
} from "@/lib/leads/actions";

const LIMITE_BYTES = 10 * 1024 * 1024;

function formatarTamanho(bytes: number | null) {
  if (!bytes) return "";
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

// Proposta em PDF (Inove Gôndolas): sobe o arquivo, lista os PDFs do lead e
// abre cada um num link temporário.
export function PropostaPdf({ leadId, orgId }: { leadId: string; orgId: string }) {
  const [arquivos, setArquivos] = useState<PropostaPdf[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [abrindoId, setAbrindoId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const recarregar = useCallback(async () => {
    try {
      setArquivos(await listarPropostasPdf(leadId));
    } finally {
      setCarregando(false);
    }
  }, [leadId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function aoEscolherArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;
    setErro(null);

    const ehPdf = arquivo.type === "application/pdf" || arquivo.name.toLowerCase().endsWith(".pdf");
    if (!ehPdf) {
      setErro("Esse arquivo não é um PDF. Escolha um arquivo .pdf.");
      return;
    }
    if (arquivo.size > LIMITE_BYTES) {
      setErro("PDF muito grande (máximo 10 MB). Comprima o arquivo e tente de novo.");
      return;
    }

    setEnviando(true);
    try {
      const caminho = `${orgId}/${leadId}/${crypto.randomUUID()}.pdf`;
      const supabase = createClient();
      const { error: erroUpload } = await supabase.storage
        .from("propostas-pdf")
        .upload(caminho, arquivo, { contentType: "application/pdf", upsert: false });
      if (erroUpload) {
        setErro("Não consegui enviar o PDF. Confira a internet e tente de novo.");
        return;
      }
      const erroRegistro = await registrarPropostaPdf(leadId, caminho, arquivo.name, arquivo.size);
      if (erroRegistro) {
        setErro(erroRegistro);
        return;
      }
      await recarregar();
    } finally {
      setEnviando(false);
    }
  }

  async function abrir(id: string) {
    setErro(null);
    setAbrindoId(id);
    // Abre a aba já no clique (senão o navegador bloqueia o pop-up) e preenche depois.
    const aba = window.open("", "_blank");
    const { url, erro: erroUrl } = await urlPropostaPdf(id);
    setAbrindoId(null);
    if (!url) {
      aba?.close();
      setErro(erroUrl ?? "Não consegui abrir o PDF.");
      return;
    }
    if (aba) aba.location.href = url;
    else window.location.href = url;
  }

  async function remover(id: string, nome: string) {
    if (!window.confirm(`Remover "${nome}" da lista de propostas deste lead?`)) return;
    setErro(null);
    const erroRemocao = await removerPropostaPdf(id);
    if (erroRemocao) {
      setErro(erroRemocao);
      return;
    }
    await recarregar();
  }

  return (
    <div className="mb-3 space-y-2 border-b border-amber-100 pb-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Proposta em PDF</p>
        <button
          type="button"
          disabled={enviando}
          onClick={() => inputRef.current?.click()}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Anexar PDF"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={aoEscolherArquivo}
          className="hidden"
        />
      </div>

      {erro && <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">{erro}</p>}

      {carregando ? (
        <p className="text-xs text-neutral-400">Carregando…</p>
      ) : arquivos.length === 0 ? (
        <p className="text-xs text-neutral-500">Nenhum PDF anexado ainda. Máximo 10 MB por arquivo.</p>
      ) : (
        <ul className="space-y-1.5">
          {arquivos.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-white/70 px-2.5 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-neutral-800">{a.nome_arquivo}</p>
                <p className="text-neutral-500">
                  {formatarData(a.criado_em)}
                  {a.tamanho_bytes ? ` · ${formatarTamanho(a.tamanho_bytes)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  disabled={abrindoId === a.id}
                  onClick={() => abrir(a.id)}
                  className="font-bold text-blue-700 underline hover:text-blue-900 disabled:opacity-60"
                >
                  {abrindoId === a.id ? "Abrindo…" : "Abrir"}
                </button>
                <button
                  type="button"
                  onClick={() => remover(a.id, a.nome_arquivo)}
                  className="font-medium text-neutral-400 underline hover:text-red-600"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
