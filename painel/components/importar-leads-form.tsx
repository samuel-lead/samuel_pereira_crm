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
import { MenuSelect } from "@/components/menu-select";
import { lerContatosVcf } from "@/lib/vcf";
import { sdr } from "@/lib/terminologia";
import { analisarCsv, xlsxParaLinhas } from "@/lib/planilha";
import { linhasParaLista, type ResultadoLista, type ItemIgnorado } from "@/lib/lista-importacao";
import { JanelaImportacao, NumeroGrande, BlocoLista } from "@/components/janela-importacao";

const estadoInicial: ResultadoImportacao = {
  erro: null,
  criados: 0,
  duplicados: 0,
  invalidos: 0,
  total: 0,
};

// Quantos contatos foram deixados de fora de propósito (grupos do WhatsApp,
// números de outro país, "Meu número"/"Meta AI") — vira um aviso na tela.
function avisoDoQueFicouDeFora(r: ResultadoLista): string | null {
  const partes: string[] = [];
  if (r.gruposIgnorados > 0) partes.push(`${r.gruposIgnorados} grupo${r.gruposIgnorados === 1 ? "" : "s"} do WhatsApp`);
  if (r.estrangeirosIgnorados > 0)
    partes.push(`${r.estrangeirosIgnorados} número${r.estrangeirosIgnorados === 1 ? "" : "s"} de fora do Brasil`);
  if (r.sistemaIgnorados > 0)
    partes.push(`${r.sistemaIgnorados} contato${r.sistemaIgnorados === 1 ? "" : "s"} do próprio WhatsApp (Meu número / Meta AI)`);
  return partes.length > 0 ? `Deixei de fora: ${partes.join(", ")}. Não são leads.` : null;
}

function csvParaLista(textoCsv: string) {
  return linhasParaLista(analisarCsv(textoCsv));
}

// Valores internos do seletor de responsável: "ainda não escolheu" e "escolheu sem responsável".
const NAO_ESCOLHIDO = "__nao_escolhido__";
const SEM_RESPONSAVEL = "__sem_responsavel__";

function TituloPasso({ numero, titulo }: { numero: number; titulo: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
        {numero}
      </span>
      <h3 className="text-base font-bold text-neutral-900">{titulo}</h3>
    </div>
  );
}

function ItemTarefa({ feito, texto }: { feito: boolean; texto: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
          feito ? "bg-white text-green-700" : "border-2 border-white"
        }`}
      >
        {feito ? "✓" : ""}
      </span>
      <span className={feito ? "line-through opacity-70" : ""}>{texto}</span>
    </li>
  );
}

function OpcaoModo({
  ativo,
  icone,
  titulo,
  descricao,
  aoClicar,
}: {
  ativo: boolean;
  icone: string;
  titulo: string;
  descricao: string;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativo}
      className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
        ativo
          ? "border-blue-500 bg-blue-50 shadow-sm"
          : "border-neutral-200 bg-white hover:border-blue-300 hover:bg-neutral-50"
      }`}
    >
      <span className="text-2xl leading-none">{icone}</span>
      <span className="min-w-0">
        <span className={`block break-words text-sm font-bold ${ativo ? "text-blue-900" : "text-neutral-800"}`}>{titulo}</span>
        <span className="mt-0.5 block break-words text-xs text-neutral-500">{descricao}</span>
      </span>
    </button>
  );
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
  // Erro de leitura do arquivo (vermelho, com o motivo) — separado do aviso (amarelo).
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  // Passo 1: como a pessoa vai enviar a lista (Samuel, 20/11/26).
  const [modo, setModo] = useState<"arquivo" | "colar">("arquivo");
  // Sem origem padrão (Samuel, 20/11/26): as etapas só aparecem na ordem, quando a
  // anterior foi preenchida — a origem precisa ser ESCOLHIDA pra liberar o passo 3.
  const [origemAtual, setOrigemAtual] = useState("");
  const [quemIndicouTexto, setQuemIndicouTexto] = useState("");
  // Ao subir a lista, a conferência roda sozinha e mostra tudo (já existe, repetido,
  // inválido...). A etapa 2 só abre quando a pessoa clica em "Continuar" (Samuel,
  // 20/11/26) — e só dá pra continuar se tiver lead novo pra importar.
  const [passo1Confirmado, setPasso1Confirmado] = useState(false);
  const [responsavelSel, setResponsavelSel] = useState<string>(NAO_ESCOLHIDO);
  const [previa, setPrevia] = useState<ItemPreviaImportacao[] | null>(null);
  const [conferindo, setConferindo] = useState(false);
  const [erroPrevia, setErroPrevia] = useState<string | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const topoRef = useRef<HTMLDivElement>(null);
  const enviandoRef = useRef(false);
  // Janela (popup) do resultado — Samuel (20/11/26): o aviso pequeno lá embaixo
  // passava despercebido.
  const [janelaResultado, setJanelaResultado] = useState(false);
  const [foraDoArquivo, setForaDoArquivo] = useState<ItemIgnorado[]>([]);
  const resultadoRef = useRef<HTMLDivElement>(null);
  // Samuel (16/11/26): depois de importar, o resultado ficava só lá embaixo
  // (e erro nem aparecia). Agora vira um cartão grande no topo, sempre visível.
  const [resultadoVisivel, setResultadoVisivel] = useState(false);
  const ehIndicacao = origemAtual.toLowerCase().includes("indica");

  useEffect(() => {
    if (pendente) {
      enviandoRef.current = true;
      setResultadoVisivel(false);
      return;
    }
    if (enviandoRef.current) {
      enviandoRef.current = false;
      setResultadoVisivel(true);
      setJanelaResultado(true);
      if (!estado.erro && estado.criados > 0) {
        setTexto("");
        setArquivoNome(null);
        setPrevia(null);
      }
      setTimeout(() => resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      // Samuel (18/11/26): a tela NÃO fecha mais sozinha (fechava rápido demais
      // e ele não conseguia ver o resultado) — fica aberta com o cartão de
      // resultado e o botão "Ver os leads".
    }
  }, [pendente, estado]);

  // Mexeu na lista: a conferência roda de novo sozinha (ver o efeito abaixo).
  function aoMudarTexto(novo: string) {
    setTexto(novo);
  }

  async function processarArquivo(arquivo: File) {
    setAvisoArquivo(null);
    setErroArquivo(null);
    setPrevia(null);
    setErroPrevia(null);
    setForaDoArquivo([]);
    setPasso1Confirmado(false);

    const nomeMinusculo = arquivo.name.toLowerCase();

    if (nomeMinusculo.endsWith(".xls")) {
      setErroArquivo(
        'Esse formato antigo (.xls) não é lido. Abra o arquivo no Excel ou no Google Planilhas e salve como .xlsx ou CSV. Aceitamos só .xlsx, .csv e .vcf.'
      );
      return;
    }

    // Contatos exportados do WhatsApp/celular: nome + telefone de cada um,
    // sem o "Corretor -" colado no nome e sem repetir quem veio duas vezes.
    if (nomeMinusculo.endsWith(".vcf")) {
      const contatos = lerContatosVcf(await arquivo.text());
      if (contatos.length === 0) {
        setErroArquivo("Não encontrei nenhum contato com telefone nesse arquivo .vcf. Confira se o arquivo é mesmo a lista de contatos exportada do celular.");
        return;
      }
      setTexto(contatos.map((c) => `${c.nome}\t${c.telefone}`).join("\n"));
      setArquivoNome(arquivo.name);
      return;
    }

    if (nomeMinusculo.endsWith(".xlsx")) {
      try {
        const linhas = await xlsxParaLinhas(await arquivo.arrayBuffer());
        const convertida = linhasParaLista(linhas);
        if (!convertida.lista) {
          setErroArquivo(
            `Não encontrei nenhum lead nessa planilha. ${avisoDoQueFicouDeFora(convertida) ?? "Ela parece estar vazia ou sem uma coluna de nome/telefone."}`
          );
          return;
        }
        setTexto(convertida.lista);
        setArquivoNome(arquivo.name);
        setAvisoArquivo(avisoDoQueFicouDeFora(convertida));
        setForaDoArquivo(convertida.ignorados);
      } catch {
        setErroArquivo(
          'Não consegui ler esse .xlsx. O arquivo pode estar corrompido. Exporte como CSV (Arquivo → Fazer download → "Valores separados por vírgula") e envie de novo.'
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
    const convertida = csvParaLista(textoArquivo);

    if (!convertida.lista) {
      setErroArquivo(
        `Não encontrei nenhum lead nesse arquivo. ${avisoDoQueFicouDeFora(convertida) ?? "Ele parece estar vazio ou sem uma coluna de nome/telefone."}`
      );
      return;
    }

    setTexto(convertida.lista);
    setArquivoNome(arquivo.name);
    setAvisoArquivo(avisoDoQueFicouDeFora(convertida));
    setForaDoArquivo(convertida.ignorados);
  }

  // Desistiu da importação: limpa a lista e o arquivo e volta pro funil —
  // nada foi gravado até clicar em "Importar".
  function cancelarImportacao() {
    setTexto("");
    setArquivoNome(null);
    setAvisoArquivo(null);
    setErroArquivo(null);
    setPrevia(null);
    setForaDoArquivo([]);
    setPasso1Confirmado(false);
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

  const temLista = texto.trim().length > 0;

  // Conferência automática: assim que a lista chega (arquivo na hora; colada à mão
  // depois de parar de digitar) o servidor diz quem entra, quem já existe, quem é
  // repetido e quem é inválido — nada é gravado.
  useEffect(() => {
    if (!texto.trim()) {
      setPrevia(null);
      setErroPrevia(null);
      setConferindo(false);
      setPasso1Confirmado(false);
      return;
    }
    let cancelado = false;
    setConferindo(true);
    const t = setTimeout(
      async () => {
        try {
          const resultado = await conferirListaImportacao(texto);
          if (cancelado) return;
          if (resultado.erro) {
            setErroPrevia(resultado.erro);
            setPrevia(null);
          } else {
            setErroPrevia(null);
            setPrevia(resultado.itens);
          }
        } catch {
          if (!cancelado) {
            setErroPrevia("Não consegui conferir a lista agora. Tente de novo.");
            setPrevia(null);
          }
        } finally {
          if (!cancelado) setConferindo(false);
        }
      },
      arquivoNome ? 0 : 900
    );
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [texto, arquivoNome]);

  // A conferência abre AO LADO da lista (Samuel, 20/11/26) assim que há resultado.
  const painelAberto = temLista && (previa !== null || erroPrevia !== null);
  const listaPronta = temLista && passo1Confirmado;
  // Se o passo 2 some (lista apagada ou importação concluída), a origem escolhida
  // volta a vazio — senão a próxima importação já nasceria "preenchida".
  useEffect(() => {
    if (!listaPronta) {
      setOrigemAtual("");
      setQuemIndicouTexto("");
      setResponsavelSel(NAO_ESCOLHIDO);
    }
  }, [listaPronta]);
  // Passo 2 preenchido: origem escolhida (e, se for indicação, quem indicou).
  const passo2Preenchido =
    origemAtual.trim() !== "" &&
    responsavelSel !== NAO_ESCOLHIDO &&
    (!ehIndicacao || quemIndicouTexto.trim() !== "");
  // Só o PRÓXIMO campo a preencher fica pulsando; ao preencher, o destaque vai pro seguinte
  // (Samuel, 20/11/26).
  const proximoCampo: "origem" | "responsavel" | "indicou" | null =
    origemAtual.trim() === ""
      ? "origem"
      : responsavelSel === NAO_ESCOLHIDO
        ? "responsavel"
        : ehIndicacao && quemIndicouTexto.trim() === ""
          ? "indicou"
          : null;
  const nomeDoResponsavel =
    responsavelSel === SEM_RESPONSAVEL || responsavelSel === NAO_ESCOLHIDO
      ? "ninguém (fila de novos leads pra alguém pegar)"
      : (usuarios.find((u) => u.id === responsavelSel)?.nome ??
        (responsavelSel === usuarioId ? "Você" : "a pessoa escolhida"));
  const totalLinhas = texto.split("\n").filter((l) => l.trim()).length;
  const novos = previa?.filter((i) => i.situacao === "novo") ?? [];
  const jaExistem = previa?.filter((i) => i.situacao === "ja_existe") ?? [];
  const repetidos = previa?.filter((i) => i.situacao === "repetido_na_lista") ?? [];
  const invalidos = previa?.filter((i) => i.situacao === "invalido") ?? [];

  return (
    <div
      ref={topoRef}
      className={`mx-auto w-full scroll-mt-24 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-md transition-[max-width] duration-300 ${
        painelAberto ? "max-w-6xl" : "max-w-2xl"
      }`}
    >
      <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
        <h2 className="text-base font-semibold text-neutral-900">Importar leads</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Envie a lista, veja o que está certo e o que não está, escolha como os leads entram e importe.
          Cada um entra na coluna &quot;Leads&quot; do funil, pronto pro {sdr(publicoOrg)} abordar.
        </p>
      </div>

      <form ref={formRef} action={acaoFormulario} className="space-y-4 p-6">
        {resultadoVisivel && (estado.erro || estado.total > 0) && (
          <div
            ref={resultadoRef}
            className={`rounded-xl border-2 p-4 ${
              estado.erro ? "border-red-300 bg-red-50 text-red-800" : "border-green-300 bg-green-50 text-green-900"
            }`}
          >
            {estado.erro ? (
              <p className="text-base font-bold">❌ Não consegui importar: {estado.erro}</p>
            ) : (
              <>
                <p className="text-lg font-extrabold">
                  ✅ {estado.criados} lead{estado.criados === 1 ? "" : "s"} importado
                  {estado.criados === 1 ? "" : "s"} com sucesso
                </p>
                {estado.duplicados > 0 && (
                  <p className="mt-1 text-sm font-medium text-amber-700">
                    {estado.duplicados} ignorado{estado.duplicados === 1 ? "" : "s"} por telefone já
                    cadastrado.
                  </p>
                )}
                {(estado.semTelefone ?? 0) > 0 && (
                  <p className="mt-1 text-sm font-medium text-amber-700">
                    ⚠️ {estado.semTelefone} lead{estado.semTelefone === 1 ? "" : "s"} entrou
                    {estado.semTelefone === 1 ? "" : "ram"} sem telefone válido — confere a coluna de
                    telefone da planilha.
                  </p>
                )}
                {estado.invalidos > 0 && (
                  <p className="mt-1 text-sm font-medium text-red-700">
                    {estado.invalidos} linha{estado.invalidos === 1 ? "" : "s"} ignorada
                    {estado.invalidos === 1 ? "" : "s"} (sem nome ou com erro).
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Link
                    href="/leads"
                    className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
                  >
                    Ver os leads →
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* As 3 etapas ficam lado a lado e a 2 e a 3 aparecem quando a lista chega
            (Samuel, 20/11/26). No celular ficam uma embaixo da outra. */}
        <div
          className={
            listaPronta
              ? passo2Preenchido
                ? "grid gap-4 lg:grid-cols-3 lg:items-start"
                : "grid gap-4 lg:grid-cols-2 lg:items-start"
              : painelAberto
                ? "grid gap-4 lg:grid-cols-2 lg:items-start"
                : ""
          }
        >
        {/* PASSO 1 — enviar a lista */}
        <div
          className={`space-y-3 ${painelAberto ? "rounded-xl border border-neutral-200 bg-white p-4" : ""}`}
        >
          <TituloPasso numero={1} titulo="Envie a lista de leads" />
          {/* Com as colunas abertas o espaço é curto: as duas opções ficam uma em cima da outra, sem cortar o nome. */}
          <div className={`grid gap-2 ${painelAberto ? "" : "sm:grid-cols-2"}`}>
            <OpcaoModo
              ativo={modo === "arquivo"}
              icone="📄"
              titulo="Arrastar planilha"
              descricao="Arquivo .xlsx, .csv ou .vcf (contatos do celular)"
              aoClicar={() => setModo("arquivo")}
            />
            <OpcaoModo
              ativo={modo === "colar"}
              icone="✍️"
              titulo="Colar manualmente"
              descricao="Copie de uma planilha ou digite: um lead por linha"
              aoClicar={() => setModo("colar")}
            />
          </div>

          {modo === "arquivo" && (
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
              className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 text-center transition ${
                arquivoNome ? "py-4" : "py-12"
              } ${
                arrastando
                  ? "border-blue-500 bg-blue-50"
                  : arquivoNome
                    ? "border-green-300 bg-green-50 hover:border-green-400"
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
              {arquivoNome ? (
                <>
                  <p className="text-sm font-semibold text-green-800">✅ {arquivoNome}</p>
                  <p className="text-xs text-green-700">
                    {totalLinhas} lead{totalLinhas === 1 ? "" : "s"} lido{totalLinhas === 1 ? "" : "s"} · clique aqui pra trocar de arquivo
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl">📄</p>
                  <p className="text-base font-semibold text-neutral-800">Arraste a planilha aqui</p>
                  <p className="text-xs text-neutral-500">
                    ou clique pra escolher o arquivo · .xlsx, .csv ou .vcf · colunas: nome e telefone
                  </p>
                </>
              )}
            </div>
          )}

          {erroArquivo && (
            <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-bold">❌ Não consegui ler o arquivo</p>
              <p className="mt-0.5">{erroArquivo}</p>
            </div>
          )}

          {avisoArquivo && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-bold">⚠️ Atenção</p>
              <p className="mt-0.5">{avisoArquivo}</p>
            </div>
          )}

          {(modo === "colar" || temLista) && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-700" htmlFor="lista">
                {modo === "colar" && !temLista
                  ? "Cole a lista aqui (um lead por linha: nome e telefone)"
                  : `Lista de leads (${totalLinhas}) — confira e, se precisar, edite aqui`}
              </label>
              <textarea
                id="lista"
                name="lista"
                required
                rows={temLista ? 12 : 8}
                value={texto}
                onChange={(evento) => aoMudarTexto(evento.target.value)}
                placeholder={"Maria Silva, 11 99999-1234\nJoão Souza, 21 98888-4321"}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-neutral-400">
                Nome e telefone separados por vírgula (ou cole direto de uma planilha, funciona igual).
                Todo lead precisa de um telefone (WhatsApp com DDD) — sem ele não entra.
              </p>
            </div>
          )}

          {temLista && conferindo && previa === null && erroPrevia === null && (
            <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
              ⏳ Conferindo a lista...
            </p>
          )}
        </div>

        {/* CONFERÊNCIA — abre ao lado da lista assim que a lista é conferida */}
        {/* Depois do "Continuar" a conferência some — só ficam as etapas (Samuel, 20/11/26). */}
        {painelAberto && !passo1Confirmado && (
          <div className="passo-aparece space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-neutral-900">🔎 Conferência da lista</h3>
              {conferindo && <span className="text-xs text-neutral-500">⏳ atualizando...</span>}
            </div>
            <p className="text-xs text-neutral-500">Veja o que está certo e o que não está. Nada foi gravado ainda.</p>

            {erroPrevia && (
              <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p className="font-bold">❌ Não consegui conferir a lista</p>
                <p className="mt-0.5">{erroPrevia}</p>
              </div>
            )}

            {previa && !erroPrevia && (
              <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <NumeroGrande valor={novos.length} rotulo="Vão entrar" cor="verde" />
                <NumeroGrande valor={jaExistem.length} rotulo="Já existem no CRM" cor="azul" />
                <NumeroGrande valor={repetidos.length} rotulo="Repetidos na lista" cor="cinza" />
                <NumeroGrande valor={invalidos.length + foraDoArquivo.length} rotulo="Ficam de fora" cor="vermelho" />
              </div>

              <BlocoLista
                titulo="Já existem no CRM — não entram de novo"
                motivo="O telefone desses contatos já está cadastrado (mesmo que com o 9 a mais ou a menos, ou que o lead esteja excluído)."
                cor="azul"
                itens={jaExistem.map((item) => ({
                  nome: item.nome,
                  detalhe:
                    (item.nomeExistente && item.nomeExistente !== item.nome
                      ? `já cadastrado como ${item.nomeExistente}`
                      : "mesmo nome") + (item.excluido ? " (estava excluído)" : ""),
                }))}
              />
              <BlocoLista
                titulo="Repetidos dentro da própria lista"
                motivo="O mesmo telefone aparece mais de uma vez — entra só uma vez."
                cor="cinza"
                itens={repetidos.map((item) => ({ nome: item.nome, detalhe: item.telefone ?? undefined }))}
              />
              <BlocoLista
                titulo="Linhas inválidas — não entram"
                cor="vermelho"
                itens={invalidos.map((item) => ({
                  nome: item.nome,
                  detalhe: [item.motivo, item.telefone].filter(Boolean).join(" · "),
                }))}
              />
              <BlocoLista
                titulo="Deixados de fora do arquivo"
                motivo="Não são leads: grupos do WhatsApp, números de outro país e contatos do próprio WhatsApp."
                cor="cinza"
                itens={foraDoArquivo.map((item) => ({ nome: item.nome, detalhe: item.motivo }))}
              />

              {novos.length === 0 ? (
                <div className="rounded-xl border-2 border-red-400 bg-red-50 px-4 py-4 text-red-900">
                  <p className="text-base font-extrabold">⛔ Não dá pra importar essa lista</p>
                  <p className="mt-1 text-sm">
                    Nenhum contato é novo: todos já existem no CRM ou têm algum problema (os motivos estão
                    nas caixas acima). Corrija a lista ou envie outro arquivo.
                  </p>
                </div>
              ) : (
                !passo1Confirmado && (
                  <div className="passo-aparece rounded-2xl border-2 border-green-700 bg-green-600 p-5 text-center text-white shadow-lg">
                    <p className="text-4xl font-extrabold leading-none">{novos.length}</p>
                    <p className="mt-1 text-lg font-extrabold">
                      lead{novos.length === 1 ? "" : "s"} pronto{novos.length === 1 ? "" : "s"} pra importar ✅
                    </p>
                    <p className="mt-1 text-sm text-green-50">
                      Próximo passo: escolher a origem e o responsável.
                    </p>
                    <button
                      type="button"
                      onClick={() => setPasso1Confirmado(true)}
                      className="botao-pulsa mt-4 w-full rounded-xl bg-white px-6 py-4 text-lg font-extrabold text-green-800 shadow-md transition hover:bg-green-50"
                    >
                      Continuar →
                    </button>
                  </div>
                )
              )}
              </div>
            )}
          </div>
        )}

        {/* PASSO 2 e 3 — o 2 abre quando a pessoa confirma a lista, o 3 depois da origem e do responsável */}
        {listaPronta && (
          <>
            <div
              className={`passo-aparece space-y-4 rounded-xl border bg-white p-4 ${
                passo2Preenchido
                  ? "border-neutral-200"
                  : "border-2 border-blue-500 shadow-lg ring-4 ring-blue-500/20"
              }`}
            >
              <TituloPasso numero={2} titulo="Defina como os leads entram" />

              {/* O que falta fazer — fica bem destacado até tudo ser escolhido (Samuel, 20/11/26). */}
              {!passo2Preenchido ? (
                <div className="rounded-xl bg-blue-600 p-4 text-white shadow-md">
                  <p className="text-base font-extrabold">👉 O que fazer agora</p>
                  <ul className="mt-2 space-y-2 text-sm font-semibold">
                    <ItemTarefa feito={origemAtual.trim() !== ""} texto="Escolher a origem dos leads" />
                    <ItemTarefa feito={responsavelSel !== NAO_ESCOLHIDO} texto="Escolher o responsável" />
                    {ehIndicacao && (
                      <ItemTarefa feito={quemIndicouTexto.trim() !== ""} texto="Escrever quem indicou" />
                    )}
                  </ul>
                  <p className="mt-2 text-xs text-blue-100">Quando escolher tudo, aparece o botão de importar.</p>
                </div>
              ) : (
                <p className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
                  ✅ Tudo escolhido. Confira o resumo e importe na etapa 3.
                </p>
              )}

              <div className={`space-y-1 ${proximoCampo === "origem" ? "campo-pendente" : ""}`}>
                <label className="text-sm font-bold text-neutral-800">
                  Origem (pra todos os leads dessa lista) *
                </label>
                <OrigemSelect origens={origens} onChange={setOrigemAtual} />
              </div>

              <div className={`space-y-1 ${proximoCampo === "responsavel" ? "campo-pendente" : ""}`}>
                <label className="text-sm font-bold text-neutral-800">Responsável pelos leads *</label>
                {/* Escolha obrigatória pra liberar o passo 3 — "Sem responsável" também
                    conta como escolha (Samuel, 20/11/26). */}
                <MenuSelect
                  value={responsavelSel}
                  onChange={setResponsavelSel}
                  placeholder="Escolha o responsável..."
                  options={[
                    { value: SEM_RESPONSAVEL, label: "— Sem responsável (fila de novos leads) —" },
                    ...(souAdmin
                      ? usuarios
                          .filter((u) => u.funcao === "sdr" || u.papel === "admin")
                          .map((u) => ({ value: u.id, label: u.nome }))
                      : [{ value: usuarioId, label: "Eu" }]),
                  ]}
                />
                <input
                  type="hidden"
                  name="responsavel_id"
                  value={responsavelSel === SEM_RESPONSAVEL || responsavelSel === NAO_ESCOLHIDO ? "" : responsavelSel}
                />
                <p className="text-xs text-neutral-400">
                  Todos os leads dessa lista ficam com essa pessoa. Se escolher &quot;Sem responsável&quot;,
                  caem na fila de novos leads para alguém pegar.
                </p>
              </div>

              {/* Só aparece quando a origem escolhida é "Indicação" (Samuel, 20/11/26). */}
              {ehIndicacao && (
                <div
                  className={`space-y-1 rounded-lg border-2 border-amber-400 bg-amber-50 p-3 ${
                    proximoCampo === "indicou" ? "campo-pendente" : ""
                  }`}
                >
                  <label className="text-sm font-bold text-amber-800" htmlFor="quem_indicou">
                    ⚠️ Escreva quem indicou
                  </label>
                  <p className="text-xs font-medium text-amber-700">
                    O nome aparece no card de cada lead dessa lista, na frente da origem.
                  </p>
                  <input
                    id="quem_indicou"
                    name="quem_indicou"
                    placeholder="Nome de quem indicou essa lista"
                    value={quemIndicouTexto}
                    onChange={(e) => setQuemIndicouTexto(e.target.value)}
                    className="w-full rounded-md border border-amber-400 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

            </div>

        {passo2Preenchido && (
          <div className="passo-aparece space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
            <TituloPasso numero={3} titulo="Importe" />

            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              <p className="font-bold">
                {novos.length} lead{novos.length === 1 ? "" : "s"} {novos.length === 1 ? "vai" : "vão"} entrar:
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                <li>Na coluna &quot;Leads&quot; do funil</li>
                <li>
                  Origem: <strong>{origemAtual}</strong>
                  {ehIndicacao && quemIndicouTexto.trim() ? ` (indicação de ${quemIndicouTexto.trim()})` : ""}
                </li>
                <li>
                  Responsável: <strong>{nomeDoResponsavel}</strong>
                </li>
              </ul>
            </div>

            <div className="flex flex-col-reverse gap-2">
              <button
                type="button"
                onClick={cancelarImportacao}
                disabled={pendente}
                className="w-full rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-60"
              >
                Cancelar importação
              </button>
              <button
                type="submit"
                disabled={pendente || conferindo || novos.length === 0}
                className="w-full rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
              >
                {pendente
                  ? "Importando..."
                  : conferindo
                    ? "Conferindo a lista..."
                    : novos.length === 0
                      ? "Nenhum lead novo para importar"
                      : `Importar ${novos.length} lead${novos.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        )}
          </>
        )}
        </div>

        {janelaResultado && resultadoVisivel && (estado.erro || estado.total > 0) && (
          <JanelaImportacao
            titulo={
              estado.erro
                ? "❌ A importação não foi feita"
                : estado.criados === 0
                  ? "⚠️ Nenhum lead novo foi importado"
                  : "✅ Importação concluída"
            }
            tom={estado.erro ? "vermelho" : estado.criados === 0 ? "ambar" : "verde"}
            aoFechar={() => setJanelaResultado(false)}
            rodape={
              <>
                <button
                  type="button"
                  onClick={() => setJanelaResultado(false)}
                  className="rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50"
                >
                  Fechar
                </button>
                {!estado.erro && estado.criados > 0 && (
                  <Link
                    href="/leads"
                    className="rounded-md bg-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
                  >
                    Ver os leads →
                  </Link>
                )}
              </>
            }
          >
            {estado.erro ? (
              <p className="text-sm font-medium text-red-800">Motivo: {estado.erro}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <NumeroGrande valor={estado.criados} rotulo="Importados" cor="verde" />
                  <NumeroGrande valor={estado.duplicados} rotulo="Já existiam" cor="azul" />
                  <NumeroGrande valor={estado.invalidos} rotulo="Não entraram (erro)" cor="vermelho" />
                  <NumeroGrande valor={estado.total} rotulo="Linhas na lista" cor="cinza" />
                </div>

                {estado.criados > 0 && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                    <p className="font-bold">Como foram importados:</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                      <li>Na coluna &quot;Leads&quot; do funil</li>
                      <li>Origem: <strong>{estado.origemUsada ?? "Prospecção fria"}</strong></li>
                      <li>
                        Responsável:{" "}
                        <strong>
                          {estado.responsavelId
                            ? (usuarios.find((u) => u.id === estado.responsavelId)?.nome ??
                              (estado.responsavelId === usuarioId ? "Você" : "a pessoa escolhida"))
                            : "ninguém (fila de novos leads pra alguém pegar)"}
                        </strong>
                      </li>
                    </ul>
                  </div>
                )}

                <BlocoLista
                  titulo="Não entraram"
                  motivo="Cada um com o motivo ao lado."
                  cor="vermelho"
                  itens={(estado.naoImportados ?? []).map((item) => ({
                    nome: item.nome,
                    detalhe: [item.motivo, item.telefone].filter(Boolean).join(" · "),
                  }))}
                />
                <BlocoLista
                  titulo="Entraram, mas sem telefone válido"
                  motivo="Foram criados, mas o telefone não parece um WhatsApp do Brasil — o contato por WhatsApp não vai funcionar. Corrija o número no lead."
                  cor="ambar"
                  itens={(estado.semTelefoneNomes ?? []).map((nome) => ({ nome }))}
                />
                {foraDoArquivo.length > 0 && (
                  <BlocoLista
                    titulo="Deixados de fora do arquivo"
                    motivo="Não são leads: grupos do WhatsApp, números de outro país e contatos do próprio WhatsApp."
                    cor="cinza"
                    itens={foraDoArquivo.map((item) => ({ nome: item.nome, detalhe: item.motivo }))}
                  />
                )}
              </>
            )}
          </JanelaImportacao>
        )}
      </form>
    </div>
  );
}
