"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { importarLeads, type ResultadoImportacao } from "@/lib/leads/actions";

const estadoInicial: ResultadoImportacao = {
  erro: null,
  criados: 0,
  duplicados: 0,
  invalidos: 0,
  total: 0,
};

const PALAVRAS_CABECALHO = [
  "nome",
  "empresa",
  "razao social",
  "razão social",
  "telefone",
  "fone",
  "celular",
  "whatsapp",
  "origem",
];

// Parser de CSV escrito à mão (sem depender de nenhum pacote de terceiros
// — os pacotes populares de ler .xlsx têm falha de segurança conhecida e
// sem correção disponível). Lida com aspas e ; ou , como separador, que
// são os dois formatos que Excel/Google Planilhas exportam.
function analisarCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let linhaAtual: string[] = [];
  let campoAtual = "";
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const caractere = texto[i];
    const proximo = texto[i + 1];

    if (dentroDeAspas) {
      if (caractere === '"' && proximo === '"') {
        campoAtual += '"';
        i++;
      } else if (caractere === '"') {
        dentroDeAspas = false;
      } else {
        campoAtual += caractere;
      }
      continue;
    }

    if (caractere === '"') {
      dentroDeAspas = true;
    } else if (caractere === "," || caractere === ";") {
      linhaAtual.push(campoAtual);
      campoAtual = "";
    } else if (caractere === "\n") {
      linhaAtual.push(campoAtual);
      linhas.push(linhaAtual);
      linhaAtual = [];
      campoAtual = "";
    } else if (caractere === "\r") {
      // ignora — o \n do \r\n já cuida da quebra de linha
    } else {
      campoAtual += caractere;
    }
  }
  if (campoAtual || linhaAtual.length > 0) {
    linhaAtual.push(campoAtual);
    linhas.push(linhaAtual);
  }
  return linhas;
}

function linhaPareceCabecalho(celulas: string[]) {
  const primeira = (celulas[0] ?? "").trim().toLowerCase();
  return PALAVRAS_CABECALHO.includes(primeira);
}

function csvParaLista(textoCsv: string) {
  const linhas = analisarCsv(textoCsv);
  return linhas
    .filter((linha, indice) => {
      const vazia = linha.every((celula) => !celula.trim());
      if (vazia) return false;
      if (indice === 0 && linhaPareceCabecalho(linha)) return false;
      return true;
    })
    .map((linha) =>
      linha
        .map((celula) => celula.trim())
        .filter(Boolean)
        .join("\t")
    )
    .join("\n");
}

export function ImportarLeadsForm() {
  const [estado, acaoFormulario, pendente] = useActionState(importarLeads, estadoInicial);
  const [texto, setTexto] = useState("");
  const [arquivoNome, setArquivoNome] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [avisoArquivo, setAvisoArquivo] = useState<string | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const enviandoRef = useRef(false);
  const jaImportou = estado.total > 0;

  useEffect(() => {
    if (pendente) {
      enviandoRef.current = true;
      return;
    }
    if (enviandoRef.current) {
      enviandoRef.current = false;
      if (!estado.erro && estado.criados > 0) {
        setTexto("");
        setArquivoNome(null);
      }
    }
  }, [pendente, estado]);

  async function processarArquivo(arquivo: File) {
    setAvisoArquivo(null);

    const nomeMinusculo = arquivo.name.toLowerCase();
    if (nomeMinusculo.endsWith(".xlsx") || nomeMinusculo.endsWith(".xls")) {
      setAvisoArquivo(
        'Esse formato (.xlsx) eu ainda não leio direto. Abre a planilha no Excel ou Google Planilhas e exporta como CSV (Arquivo → Fazer download → "Valores separados por vírgula") — depois solta o CSV aqui.'
      );
      return;
    }

    const textoArquivo = await arquivo.text();
    const listaConvertida = csvParaLista(textoArquivo);

    if (!listaConvertida) {
      setAvisoArquivo("Não encontrei nenhuma linha com dado nesse arquivo.");
      return;
    }

    setTexto(listaConvertida);
    setArquivoNome(arquivo.name);
  }

  function aoSoltarArquivo(evento: React.DragEvent<HTMLDivElement>) {
    evento.preventDefault();
    setArrastando(false);
    const arquivo = evento.dataTransfer.files?.[0];
    if (arquivo) processarArquivo(arquivo);
  }

  function aoSelecionarArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (arquivo) processarArquivo(arquivo);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-md">
      <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
        <h2 className="text-base font-semibold text-neutral-900">Importar leads</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Arraste uma planilha CSV, ou cole a lista à mão — um lead por
          linha. Cada um entra direto na coluna &quot;Leads&quot;, sem
          responsável, pronto pro SDR pegar e começar a abordar.
        </p>
      </div>

      <form action={acaoFormulario} className="space-y-4 p-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={aoSoltarArquivo}
          onClick={() => inputArquivoRef.current?.click()}
          role="button"
          tabIndex={0}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${
            arrastando
              ? "border-blue-500 bg-blue-50"
              : "border-neutral-300 bg-neutral-50 hover:border-blue-400 hover:bg-blue-50/60"
          }`}
        >
          <input
            ref={inputArquivoRef}
            type="file"
            accept=".csv,text/csv"
            onChange={aoSelecionarArquivo}
            className="hidden"
          />
          <p className="text-sm font-medium text-neutral-700">
            {arquivoNome ? `📄 ${arquivoNome}` : "Arraste a planilha CSV aqui ou clique pra selecionar"}
          </p>
          <p className="text-xs text-neutral-400">Colunas: nome, telefone</p>
        </div>

        {avisoArquivo && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {avisoArquivo}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700" htmlFor="lista">
            Lista (um lead por linha)
          </label>
          <textarea
            id="lista"
            name="lista"
            required
            rows={12}
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder={"Nome da empresa, telefone\nOutra empresa, telefone"}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="text-xs text-neutral-400">
            Formato: nome e telefone separados por vírgula (ou cole direto de
            uma planilha — funciona igual). Telefone é opcional, mas sem ele
            o SDR não consegue ligar. Confere a lista antes de importar — dá
            pra editar direto aqui se algo vier errado.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700" htmlFor="origem">
            Origem (pra todos os leads dessa lista)
          </label>
          <input
            id="origem"
            name="origem"
            defaultValue="Prospecção fria"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {jaImportou && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            <p className="font-medium">
              {estado.criados} lead{estado.criados === 1 ? "" : "s"} importado
              {estado.criados === 1 ? "" : "s"} com sucesso.
            </p>
            {estado.duplicados > 0 && (
              <p className="mt-1 text-amber-700">
                {estado.duplicados} ignorado{estado.duplicados === 1 ? "" : "s"} por
                telefone já cadastrado.
              </p>
            )}
            {estado.invalidos > 0 && (
              <p className="mt-1 text-red-700">
                {estado.invalidos} linha{estado.invalidos === 1 ? "" : "s"} ignorada
                {estado.invalidos === 1 ? "" : "s"} (sem nome ou com erro).
              </p>
            )}
            <Link
              href="/leads"
              className="mt-2 inline-block text-sm font-medium text-blue-600 underline hover:text-blue-700"
            >
              Ver na coluna &quot;Leads&quot; em Pré-vendas →
            </Link>
          </div>
        )}

        <button
          type="submit"
          disabled={pendente}
          className="w-full rounded-md bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {pendente ? "Importando..." : "Importar lista"}
        </button>
      </form>
    </div>
  );
}
