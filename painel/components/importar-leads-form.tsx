"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { importarLeads, type ResultadoImportacao } from "@/lib/leads/actions";
import { sdr } from "@/lib/terminologia";
import { analisarCsv, xlsxParaLinhas } from "@/lib/planilha";

const estadoInicial: ResultadoImportacao = {
  erro: null,
  criados: 0,
  duplicados: 0,
  invalidos: 0,
  total: 0,
};

// Separadas em dois grupos (não é só "parece cabeçalho", é "qual coluna é
// qual") — sem isso, um arquivo exportado como "WhatsApp, Name" (telefone
// primeiro, nome depois — é assim que o WhatsApp exporta contato) fazia o
// número virar Nome e o nome virar Telefone. Samuel pegou isso ao vivo:
// 178 leads entraram com o telefone como nome e o nome (sem dígito
// nenhum) virando telefone vazio, todos colidindo como "duplicado" entre
// si.
const CABECALHOS_NOME = ["nome", "name", "empresa", "razao social", "razão social"];
const CABECALHOS_TELEFONE = ["telefone", "fone", "celular", "whatsapp", "phone", "número", "numero"];
const PALAVRAS_CABECALHO = [...CABECALHOS_NOME, ...CABECALHOS_TELEFONE, "origem"];

function linhaPareceCabecalho(celulas: string[]) {
  const primeira = (celulas[0] ?? "").trim().toLowerCase();
  return PALAVRAS_CABECALHO.includes(primeira);
}

// Compartilhada entre o CSV (analisarCsv) e o .xlsx (xlsxParaLinhas) — os
// dois terminam nesse mesmo formato de "linhas de células" antes de virar
// texto pro campo da lista. Se a primeira linha for cabeçalho, usa ela
// pra descobrir em qual coluna está o nome e em qual está o telefone —
// nunca assume que a ordem é sempre "nome, telefone" (ver comentário dos
// CABECALHOS_* acima).
function linhasParaLista(linhas: string[][]) {
  if (linhas.length === 0) return "";

  let dados = linhas;
  let indiceNome = 0;
  let indiceTelefone = 1;

  const primeiraLinha = linhas[0];
  if (linhaPareceCabecalho(primeiraLinha)) {
    const celulas = primeiraLinha.map((c) => c.trim().toLowerCase());
    const posNome = celulas.findIndex((c) => CABECALHOS_NOME.includes(c));
    const posTelefone = celulas.findIndex((c) => CABECALHOS_TELEFONE.includes(c));
    if (posNome !== -1) indiceNome = posNome;
    if (posTelefone !== -1) indiceTelefone = posTelefone;
    dados = linhas.slice(1);
  }

  return dados
    .filter((linha) => linha.some((celula) => celula.trim()))
    .map((linha) => {
      const nome = (linha[indiceNome] ?? "").trim();
      const telefone = (linha[indiceTelefone] ?? "").trim();
      const resto = linha
        .filter((_, indice) => indice !== indiceNome && indice !== indiceTelefone)
        .map((celula) => celula.trim())
        .filter(Boolean);
      return [nome, telefone, ...resto].filter(Boolean).join("\t");
    })
    .join("\n");
}

function csvParaLista(textoCsv: string) {
  return linhasParaLista(analisarCsv(textoCsv));
}

export function ImportarLeadsForm({ publicoOrg = "mentoria" }: { publicoOrg?: string }) {
  const [estado, acaoFormulario, pendente] = useActionState(importarLeads, estadoInicial);
  const [texto, setTexto] = useState("");
  const [arquivoNome, setArquivoNome] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [avisoArquivo, setAvisoArquivo] = useState<string | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
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

    if (nomeMinusculo.endsWith(".xls")) {
      setAvisoArquivo(
        'Esse formato antigo (.xls) eu ainda não leio — só .xlsx e .csv. Abre no Excel ou Google Planilhas e exporta como .xlsx ou CSV.'
      );
      return;
    }

    if (nomeMinusculo.endsWith(".xlsx")) {
      try {
        const linhas = await xlsxParaLinhas(await arquivo.arrayBuffer());
        const listaConvertida = linhasParaLista(linhas);
        if (!listaConvertida) {
          setAvisoArquivo("Não encontrei nenhuma linha com dado nessa planilha.");
          return;
        }
        setTexto(listaConvertida);
        setArquivoNome(arquivo.name);
      } catch {
        setAvisoArquivo(
          'Não consegui ler esse .xlsx — confere se não tá corrompido, ou exporta como CSV (Arquivo → Fazer download → "Valores separados por vírgula") e solta aqui.'
        );
      }
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

  // Desistiu da importação: limpa a lista e o arquivo e volta pro funil —
  // nada foi gravado até clicar em "Importar lista".
  function cancelarImportacao() {
    setTexto("");
    setArquivoNome(null);
    setAvisoArquivo(null);
    if (inputArquivoRef.current) inputArquivoRef.current.value = "";
    router.push("/leads");
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
          Arraste uma planilha (.xlsx ou .csv), ou cole a lista à mão — um
          lead por linha. Cada um entra direto na coluna &quot;Leads&quot;,
          sem responsável, pronto pro {sdr(publicoOrg)} pegar e começar a abordar.
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
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={aoSelecionarArquivo}
            className="hidden"
          />
          <p className="text-sm font-medium text-neutral-700">
            {arquivoNome ? `📄 ${arquivoNome}` : "Arraste a planilha (.xlsx ou .csv) aqui ou clique pra selecionar"}
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
            o {sdr(publicoOrg)} não consegue ligar. Confere a lista antes de importar — dá
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

        <div className="flex gap-3">
          <button
            type="button"
            onClick={cancelarImportacao}
            disabled={pendente}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-60"
          >
            Cancelar importação
          </button>
          <button
            type="submit"
            disabled={pendente}
            className="flex-1 rounded-md bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {pendente ? "Importando..." : "Importar lista"}
          </button>
        </div>
      </form>
    </div>
  );
}
