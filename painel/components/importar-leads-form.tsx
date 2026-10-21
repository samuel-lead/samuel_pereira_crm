"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  importarLeads,
  conferirListaImportacao,
  type ResultadoImportacao,
  type ItemPreviaImportacao,
} from "@/lib/leads/actions";
import { OrigemSelect } from "@/components/origem-select";
import { ResponsavelSelect } from "@/components/responsavel-select";
import { MenuSelect } from "@/components/menu-select";
import { lerContatosVcf } from "@/lib/vcf";
import { sdr } from "@/lib/terminologia";
import { analisarCsv, xlsxParaLinhas } from "@/lib/planilha";

const estadoInicial: ResultadoImportacao = {
  erro: null,
  criados: 0,
  duplicados: 0,
  invalidos: 0,
  total: 0,
};

// Palavras que aparecem no cabeçalho de uma planilha de leads. A comparação é
// por PALAVRA inteira dentro de cada célula ("Nome Fantasia" tem a palavra
// "nome"), senão cabeçalho com mais de uma palavra virava um lead de verdade
// (foi o que aconteceu na Inove Gôndolas: "Nome Fantasia" entrou como lead).
const PALAVRAS_NOME = ["nome", "name", "empresa", "fantasia"];
const PALAVRAS_TELEFONE = ["telefone", "fone", "celular", "whatsapp", "phone", "numero", "número"];
const PALAVRAS_ORIGEM = ["origem"];
const PALAVRAS_OUTRAS_COLUNAS = ["razao", "razão", "social", "cnpj", "email", "e-mail", "cidade", "estado", "uf", "endereco", "endereço"];

function palavrasDaCelula(celula: string) {
  return celula
    .toLowerCase()
    .split(/[^a-zà-úç0-9-]+/i)
    .filter(Boolean);
}

function celulaTemPalavra(celula: string, lista: string[]) {
  return palavrasDaCelula(celula).some((p) => lista.includes(p));
}

function linhaPareceCabecalho(celulas: string[]) {
  // Só é cabeçalho se as células forem curtas (títulos de coluna) e alguma
  // tiver uma palavra de coluna conhecida — um nome de empresa comprido na
  // primeira linha não vira cabeçalho só por ter "empresa" no meio.
  const todasCurtas = celulas.every((c) => c.trim().length <= 40);
  return (
    todasCurtas &&
    celulas.some(
      (c) =>
        celulaTemPalavra(c, PALAVRAS_NOME) ||
        celulaTemPalavra(c, PALAVRAS_TELEFONE) ||
        celulaTemPalavra(c, PALAVRAS_ORIGEM) ||
        celulaTemPalavra(c, PALAVRAS_OUTRAS_COLUNAS)
    )
  );
}

// Compartilhada entre o CSV (analisarCsv) e o .xlsx (xlsxParaLinhas) — os
// dois terminam nesse mesmo formato de "linhas de células" antes de virar
// texto pro campo da lista. Se a primeira linha for cabeçalho, usa ela pra
// descobrir em qual coluna está o nome, o telefone e (se existir) a origem.
//
// Só essas colunas seguem pra lista. As OUTRAS (Razão Social, CNPJ...) são
// descartadas: antes elas iam coladas atrás do telefone e a terceira virava
// a ORIGEM de cada lead (na Inove Gôndolas, 600 leads ficaram com a razão
// social da empresa como origem). Também não some mais com a célula vazia do
// telefone — isso empurrava o CNPJ pra dentro do campo de telefone.
function linhasParaLista(linhas: string[][]) {
  if (linhas.length === 0) return "";

  let dados = linhas;
  let indiceNome = 0;
  let indiceTelefone = 1;
  let indiceOrigem = -1;

  const primeiraLinha = linhas[0];
  if (linhaPareceCabecalho(primeiraLinha)) {
    const posNome = primeiraLinha.findIndex((c) => celulaTemPalavra(c, PALAVRAS_NOME));
    const posTelefone = primeiraLinha.findIndex((c) => celulaTemPalavra(c, PALAVRAS_TELEFONE));
    const posOrigem = primeiraLinha.findIndex((c) => celulaTemPalavra(c, PALAVRAS_ORIGEM));
    if (posNome !== -1) indiceNome = posNome;
    if (posTelefone !== -1) indiceTelefone = posTelefone;
    if (posOrigem !== -1) indiceOrigem = posOrigem;
    dados = linhas.slice(1);
  }

  return dados
    .filter((linha) => linha.some((celula) => celula.trim()))
    .map((linha) => {
      const nome = (linha[indiceNome] ?? "").trim();
      const telefone = (linha[indiceTelefone] ?? "").trim();
      const origem = indiceOrigem !== -1 ? (linha[indiceOrigem] ?? "").trim() : "";
      // Telefone vazio vira só o nome (sem coluna vazia no meio).
      if (!telefone) return nome;
      return origem ? [nome, telefone, origem].join("\t") : [nome, telefone].join("\t");
    })
    .filter(Boolean)
    .join("\n");
}

function csvParaLista(textoCsv: string) {
  return linhasParaLista(analisarCsv(textoCsv));
}

export function ImportarLeadsForm({
  publicoOrg = "mentoria",
  origens = [],
  usuarios = [],
  souAdmin = false,
  usuarioId = "",
}: {
  publicoOrg?: string;
  origens?: { id: string; nome: string }[];
  usuarios?: { id: string; nome: string; funcao?: string | null; papel?: string | null }[];
  souAdmin?: boolean;
  usuarioId?: string;
}) {
  const router = useRouter();
  const [estado, acaoFormulario, pendente] = useActionState(importarLeads, estadoInicial);
  const [texto, setTexto] = useState("");
  const [arquivoNome, setArquivoNome] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [avisoArquivo, setAvisoArquivo] = useState<string | null>(null);
  const [origemAtual, setOrigemAtual] = useState("Prospecção fria");
  const [previa, setPrevia] = useState<ItemPreviaImportacao[] | null>(null);
  const [conferindo, setConferindo] = useState(false);
  const [erroPrevia, setErroPrevia] = useState<string | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const enviandoRef = useRef(false);
  const jaImportou = estado.total > 0;
  const ehIndicacao = origemAtual.toLowerCase().includes("indica");

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
        setPrevia(null);
      }
    }
  }, [pendente, estado]);

  // Mexeu na lista depois de conferir: a prévia antiga deixou de valer.
  function aoMudarTexto(novo: string) {
    setTexto(novo);
    setPrevia(null);
    setErroPrevia(null);
  }

  async function processarArquivo(arquivo: File) {
    setAvisoArquivo(null);
    setPrevia(null);
    setErroPrevia(null);

    const nomeMinusculo = arquivo.name.toLowerCase();

    if (nomeMinusculo.endsWith(".xls")) {
      setAvisoArquivo(
        'Esse formato antigo (.xls) eu ainda não leio — só .xlsx, .csv e .vcf. Abre no Excel ou Google Planilhas e exporta como .xlsx ou CSV.'
      );
      return;
    }

    // Contatos exportados do WhatsApp/celular: nome + telefone de cada um,
    // sem o "Corretor -" colado no nome e sem repetir quem veio duas vezes.
    if (nomeMinusculo.endsWith(".vcf")) {
      const contatos = lerContatosVcf(await arquivo.text());
      if (contatos.length === 0) {
        setAvisoArquivo("Não encontrei nenhum contato com telefone nesse arquivo .vcf.");
        return;
      }
      setTexto(contatos.map((c) => `${c.nome}\t${c.telefone}`).join("\n"));
      setArquivoNome(arquivo.name);
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

    // CSV exportado do Excel costuma vir em Windows-1252 (acentos viram "�"
    // se lido como UTF-8). Tenta UTF-8 e, se falhar, lê como Windows-1252.
    const bytes = await arquivo.arrayBuffer();
    let textoArquivo: string;
    try {
      textoArquivo = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      textoArquivo = new TextDecoder("windows-1252").decode(bytes);
    }
    const listaConvertida = csvParaLista(textoArquivo);

    if (!listaConvertida) {
      setAvisoArquivo("Não encontrei nenhuma linha com dado nesse arquivo.");
      return;
    }

    setTexto(listaConvertida);
    setArquivoNome(arquivo.name);
  }

  async function conferirLista() {
    setErroPrevia(null);
    setConferindo(true);
    try {
      const resultado = await conferirListaImportacao(texto);
      if (resultado.erro) {
        setErroPrevia(resultado.erro);
        return;
      }
      setPrevia(resultado.itens);
    } catch {
      setErroPrevia("Não consegui conferir a lista agora. Tente de novo.");
    } finally {
      setConferindo(false);
    }
  }

  // Desistiu da importação: limpa a lista e o arquivo e volta pro funil —
  // nada foi gravado até clicar em "Importar".
  function cancelarImportacao() {
    setTexto("");
    setArquivoNome(null);
    setAvisoArquivo(null);
    setPrevia(null);
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

  const novos = previa?.filter((i) => i.situacao === "novo") ?? [];
  const jaExistem = previa?.filter((i) => i.situacao === "ja_existe") ?? [];
  const repetidos = previa?.filter((i) => i.situacao === "repetido_na_lista") ?? [];
  const invalidos = previa?.filter((i) => i.situacao === "invalido") ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-md">
      <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
        <h2 className="text-base font-semibold text-neutral-900">Importar leads</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Arraste uma planilha (.xlsx ou .csv) ou uma lista de contatos (.vcf),
          ou cole a lista à mão — um lead por linha. Cada um entra direto na
          coluna &quot;Leads&quot;, sem responsável, pronto pro {sdr(publicoOrg)} pegar
          e começar a abordar.
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
            accept=".xlsx,.csv,.vcf,text/csv,text/vcard,text/x-vcard,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={aoSelecionarArquivo}
            className="hidden"
          />
          <p className="text-sm font-medium text-neutral-700">
            {arquivoNome
              ? `📄 ${arquivoNome}`
              : "Arraste a planilha (.xlsx, .csv) ou os contatos (.vcf) aqui, ou clique pra selecionar"}
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
            onChange={(evento) => aoMudarTexto(evento.target.value)}
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
          <label className="text-sm font-medium text-neutral-700">
            Origem (pra todos os leads dessa lista)
          </label>
          <OrigemSelect origens={origens} valorInicial="Prospecção fria" onChange={setOrigemAtual} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">
            Responsável pelos leads <span className="font-normal text-neutral-400">(opcional)</span>
          </label>
          {souAdmin ? (
            <ResponsavelSelect
              usuarios={usuarios}
              funcaoFiltro="sdr"
              incluirAdmins
              permiteVazio
              placeholder="Sem responsável (fila de novos leads)"
            />
          ) : (
            <MenuSelect
              name="responsavel_id"
              defaultValue=""
              placeholder="Sem responsável (fila de novos leads)"
              options={[
                { value: "", label: "— Sem responsável (fila de novos leads) —" },
                { value: usuarioId, label: "Eu" },
              ]}
            />
          )}
          <p className="text-xs text-neutral-400">
            Todos os leads dessa lista ficam com essa pessoa. Se deixar sem
            responsável, caem na fila de novos leads para alguém pegar.
          </p>
        </div>

        <div
          className={`space-y-1 ${
            ehIndicacao
              ? "rounded-lg border-2 border-amber-400 bg-amber-50 p-3 dark:border-amber-500 dark:bg-amber-950/30"
              : ""
          }`}
        >
          <label
            className={`text-sm font-medium ${
              ehIndicacao ? "font-bold text-amber-800 dark:text-amber-300" : "text-neutral-700"
            }`}
            htmlFor="quem_indicou"
          >
            {ehIndicacao ? "⚠️ Escreva quem indicou" : "Quem indicou? (opcional)"}
          </label>
          {ehIndicacao && (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              O nome aparece no card de cada lead dessa lista, na frente da origem.
            </p>
          )}
          <input
            id="quem_indicou"
            name="quem_indicou"
            placeholder="Nome de quem indicou essa lista"
            className={`w-full rounded-md border px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
              ehIndicacao ? "border-amber-400 bg-white" : "border-neutral-300"
            }`}
          />
        </div>

        {previa && (
          <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-900">
            <p className="font-semibold">
              {novos.length} lead{novos.length === 1 ? "" : "s"} vão entrar
              {jaExistem.length + repetidos.length > 0 &&
                ` · ${jaExistem.length + repetidos.length} serão ignorado${
                  jaExistem.length + repetidos.length === 1 ? "" : "s"
                }`}
              {invalidos.length > 0 && ` · ${invalidos.length} sem nome`}
            </p>
            {jaExistem.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-800">Já existem no CRM:</p>
                <ul className="mt-1 space-y-0.5 text-xs text-amber-800">
                  {jaExistem.map((item, indice) => (
                    <li key={`${item.telefone}-${indice}`}>
                      {item.nome}
                      {item.nomeExistente && item.nomeExistente !== item.nome
                        ? ` (já cadastrado como ${item.nomeExistente})`
                        : ""}
                      {item.excluido ? " — estava excluído" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {repetidos.length > 0 && (
              <p className="text-xs text-amber-800">
                {repetidos.length} repetido{repetidos.length === 1 ? "" : "s"} dentro da própria
                lista (entra só uma vez).
              </p>
            )}
          </div>
        )}

        {erroPrevia && <p className="text-xs text-red-600">{erroPrevia}</p>}

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
          {previa ? (
            <button
              type="submit"
              disabled={pendente || novos.length === 0}
              className="flex-1 rounded-md bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {pendente
                ? "Importando..."
                : novos.length === 0
                  ? "Nenhum lead novo para importar"
                  : `Importar ${novos.length} lead${novos.length === 1 ? "" : "s"}`}
            </button>
          ) : (
            <button
              type="button"
              onClick={conferirLista}
              disabled={conferindo || !texto.trim()}
              className="flex-1 rounded-md bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {conferindo ? "Conferindo..." : "Conferir lista"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
