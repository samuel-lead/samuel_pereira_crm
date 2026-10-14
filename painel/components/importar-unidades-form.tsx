"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { analisarCsv, xlsxParaLinhas } from "@/lib/planilha";
import {
  importarUnidades,
  type ResultadoUnidades,
  type UnidadeLinha,
} from "@/lib/imoveis/unidades-actions";

type Campo =
  | "numero"
  | "andar"
  | "area_m2"
  | "quartos"
  | "vagas"
  | "tipologia"
  | "posicao"
  | "status"
  | "valor"
  | "parcela_entrada"
  | "parcela_mensal"
  | "parcela_semestral"
  | "parcela_chaves";

const CAMPOS: { campo: Campo; rotulo: string }[] = [
  { campo: "numero", rotulo: "Unidade (número)" },
  { campo: "andar", rotulo: "Andar" },
  { campo: "area_m2", rotulo: "Área (m²)" },
  { campo: "quartos", rotulo: "Quartos" },
  { campo: "vagas", rotulo: "Vagas" },
  { campo: "tipologia", rotulo: "Tipologia" },
  { campo: "posicao", rotulo: "Posição" },
  { campo: "status", rotulo: "Situação" },
  { campo: "valor", rotulo: "Preço da unidade" },
  { campo: "parcela_entrada", rotulo: "Entrada" },
  { campo: "parcela_mensal", rotulo: "Parcela mensal" },
  { campo: "parcela_semestral", rotulo: "Parcela semestral" },
  { campo: "parcela_chaves", rotulo: "Chaves" },
];

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Descobre qual campo cada coluna da planilha é, pelo nome do cabeçalho.
// A ordem importa: "Preço Unidade" tem a palavra "unidade", então o preço é
// testado antes do número da unidade.
const REGRAS_CABECALHO: { campo: Campo; palavras: string[] }[] = [
  { campo: "valor", palavras: ["preco", "valor"] },
  { campo: "parcela_entrada", palavras: ["entrada"] },
  { campo: "parcela_mensal", palavras: ["mensal"] },
  { campo: "parcela_semestral", palavras: ["semestral"] },
  { campo: "parcela_chaves", palavras: ["chaves"] },
  { campo: "area_m2", palavras: ["area", "metragem", "m2"] },
  { campo: "vagas", palavras: ["vaga", "garagem"] },
  { campo: "tipologia", palavras: ["tipologia", "tipo"] },
  { campo: "posicao", palavras: ["posicao", "orientacao", "sol"] },
  { campo: "status", palavras: ["status", "situacao", "disponibilidade"] },
  { campo: "andar", palavras: ["andar", "pavimento"] },
  { campo: "quartos", palavras: ["quarto", "dorm"] },
  { campo: "numero", palavras: ["unidade", "apto", "numero", "unid", "n°", "nº"] },
];

function campoDoCabecalho(cabecalho: string): Campo | null {
  const c = normalizar(cabecalho);
  if (!c) return null;
  for (const regra of REGRAS_CABECALHO) {
    if (regra.palavras.some((p) => c.includes(p))) return regra.campo;
  }
  return null;
}

function mapearCabecalho(celulas: string[]): (Campo | null)[] {
  const usados = new Set<Campo>();
  return celulas.map((celula) => {
    const campo = campoDoCabecalho(celula);
    if (campo && !usados.has(campo)) {
      usados.add(campo);
      return campo;
    }
    return null;
  });
}

// A linha de cabeçalho não é necessariamente a primeira (a tabela comercial
// tem um título em cima) — pega a primeira linha, nas 20 primeiras, em que
// pelo menos 3 colunas são reconhecidas.
function acharCabecalho(linhas: string[][]): number {
  for (let i = 0; i < Math.min(linhas.length, 20); i++) {
    const reconhecidas = mapearCabecalho(linhas[i]).filter(Boolean).length;
    if (reconhecidas >= 3) return i;
  }
  return -1;
}

function paraNumero(texto: string): number | null {
  const limpo = String(texto ?? "")
    .replace(/[^\d.,-]/g, "")
    .trim();
  if (!limpo || limpo === "-" || limpo === ",") return null;
  let normal = limpo;
  if (limpo.includes(",") && limpo.includes(".")) {
    normal = limpo.replace(/\./g, "").replace(",", ".");
  } else if (limpo.includes(",")) {
    normal = limpo.replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(limpo)) {
    // "405.858" = quatrocentos e cinco mil, não 405,858
    normal = limpo.replace(/\./g, "");
  }
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

function statusDaPlanilha(texto: string): UnidadeLinha["status"] {
  const t = normalizar(texto);
  if (!t) return null;
  if (t.startsWith("vend")) return "vendida";
  if (t.startsWith("reserv")) return "reservada";
  return "disponivel";
}

function montarLinha(celulas: string[], mapa: (Campo | null)[]): UnidadeLinha | null {
  const valores: Partial<Record<Campo, string>> = {};
  mapa.forEach((campo, i) => {
    if (campo) valores[campo] = (celulas[i] ?? "").trim();
  });

  const numero = valores.numero ?? "";
  // Rodapé da tabela (registro de incorporação, avisos...) tem texto longo na
  // primeira coluna — unidade de verdade é um número curto.
  if (!numero || numero.length > 12) return null;

  const andarInformado = valores.andar ? paraNumero(valores.andar) : null;
  const numeroInteiro = /^\d{3,}$/.test(numero) ? Number(numero) : null;
  // Sem coluna de andar, deduz do número da unidade: 1104 -> andar 11, 109 -> 1.
  const andar = andarInformado ?? (numeroInteiro !== null ? Math.floor(numeroInteiro / 100) : null);

  return {
    numero,
    andar,
    area_m2: valores.area_m2 ? paraNumero(valores.area_m2) : null,
    quartos: valores.quartos ? paraNumero(valores.quartos) : null,
    vagas: valores.vagas || null,
    tipologia: valores.tipologia || null,
    posicao: valores.posicao || null,
    status: valores.status ? statusDaPlanilha(valores.status) : null,
    valor: valores.valor ? paraNumero(valores.valor) : null,
    parcela_entrada: valores.parcela_entrada ? paraNumero(valores.parcela_entrada) : null,
    parcela_mensal: valores.parcela_mensal ? paraNumero(valores.parcela_mensal) : null,
    parcela_semestral: valores.parcela_semestral ? paraNumero(valores.parcela_semestral) : null,
    parcela_chaves: valores.parcela_chaves ? paraNumero(valores.parcela_chaves) : null,
  };
}

function moeda(v: number | null) {
  return v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function ImportarUnidadesForm({ imovelId }: { imovelId: string }) {
  const [linhasBrutas, setLinhasBrutas] = useState<string[][] | null>(null);
  const [indiceCabecalho, setIndiceCabecalho] = useState(-1);
  const [mapa, setMapa] = useState<(Campo | null)[]>([]);
  const [arquivoNome, setArquivoNome] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoUnidades | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function carregar(linhas: string[][], nome: string) {
    const util = linhas.filter((l) => l.some((c) => c.trim()));
    const cab = acharCabecalho(util);
    if (cab === -1) {
      setAviso(
        "Não achei a linha de títulos (Unidade, Área, Preço...). Confere se a planilha tem os títulos das colunas."
      );
      setLinhasBrutas(null);
      return;
    }
    setAviso(null);
    setResultado(null);
    setLinhasBrutas(util);
    setIndiceCabecalho(cab);
    setMapa(mapearCabecalho(util[cab]));
    setArquivoNome(nome);
  }

  async function processarArquivo(arquivo: File) {
    setAviso(null);
    const nome = arquivo.name.toLowerCase();
    try {
      if (nome.endsWith(".xls")) {
        setAviso("Esse formato antigo (.xls) eu não leio — salva como .xlsx ou CSV e tenta de novo.");
        return;
      }
      if (nome.endsWith(".xlsx")) {
        carregar(await xlsxParaLinhas(await arquivo.arrayBuffer()), arquivo.name);
        return;
      }
      if (nome.endsWith(".pdf")) {
        setAviso("Por enquanto eu leio planilha (.xlsx ou CSV). Exporta a tabela como planilha e envia aqui.");
        return;
      }
      carregar(analisarCsv(await arquivo.text()), arquivo.name);
    } catch {
      setAviso("Não consegui ler esse arquivo. Tenta exportar como CSV e enviar de novo.");
    }
  }

  const unidades = useMemo(() => {
    if (!linhasBrutas || indiceCabecalho < 0) return [];
    return linhasBrutas
      .slice(indiceCabecalho + 1)
      .map((l) => montarLinha(l, mapa))
      .filter((u): u is UnidadeLinha => u !== null);
  }, [linhasBrutas, indiceCabecalho, mapa]);

  const temNumero = mapa.includes("numero");

  function importar() {
    setResultado(null);
    iniciarTransicao(async () => {
      const r = await importarUnidades(imovelId, unidades);
      setResultado(r);
      if (!r.erro) {
        setLinhasBrutas(null);
        setArquivoNome(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          const arquivo = e.dataTransfer.files?.[0];
          if (arquivo) void processarArquivo(arquivo);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
          arrastando ? "border-blue-500 bg-blue-50" : "border-neutral-300 bg-white hover:border-blue-400"
        }`}
      >
        <p className="text-sm font-medium text-neutral-700">
          {arquivoNome ?? "Solte aqui a planilha (.xlsx ou CSV) ou clique pra escolher"}
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          Colunas aceitas: Unidade, Área, Vagas, Tipologia, Posição, Status, Preço, Entrada, Mensal, Semestral e
          Chaves.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv,.txt,.xls,.pdf"
          className="hidden"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo) void processarArquivo(arquivo);
            e.target.value = "";
          }}
        />
      </div>

      {aviso && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{aviso}</p>}

      {linhasBrutas && (
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-neutral-800">Confira as colunas</p>
          <p className="text-xs text-neutral-500">
            Eu reconheci as colunas pelo título. Se alguma estiver errada, troque na lista.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {linhasBrutas[indiceCabecalho].map((titulo, i) => (
              <label key={i} className="flex items-center justify-between gap-2 text-xs text-neutral-600">
                <span className="truncate font-medium">{titulo || `Coluna ${i + 1}`}</span>
                <select
                  value={mapa[i] ?? ""}
                  onChange={(e) =>
                    setMapa((atual) => {
                      const novo = [...atual];
                      novo[i] = (e.target.value || null) as Campo | null;
                      return novo;
                    })
                  }
                  className="w-44 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs"
                >
                  <option value="">Ignorar</option>
                  {CAMPOS.map((c) => (
                    <option key={c.campo} value={c.campo}>
                      {c.rotulo}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {!temNumero ? (
            <p className="text-sm text-red-600">Escolha qual coluna é o número da unidade.</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-neutral-800">{unidades.length} unidades encontradas</p>
              <div className="overflow-x-auto rounded-lg border border-neutral-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-500">
                    <tr>
                      {["Unidade", "Andar", "Área", "Tipologia", "Posição", "Situação", "Preço"].map((t) => (
                        <th key={t} className="px-3 py-2 font-medium">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {unidades.slice(0, 8).map((u) => (
                      <tr key={u.numero}>
                        <td className="px-3 py-1.5 font-medium text-neutral-900">{u.numero}</td>
                        <td className="px-3 py-1.5">{u.andar ?? "—"}</td>
                        <td className="px-3 py-1.5">{u.area_m2 !== null ? `${u.area_m2} m²` : "—"}</td>
                        <td className="px-3 py-1.5">{u.tipologia ?? "—"}</td>
                        <td className="px-3 py-1.5">{u.posicao ?? "—"}</td>
                        <td className="px-3 py-1.5">{u.status ?? "disponivel"}</td>
                        <td className="px-3 py-1.5">{moeda(u.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {unidades.length > 8 && (
                <p className="text-xs text-neutral-400">Mostrando as 8 primeiras de {unidades.length}.</p>
              )}
              <button
                type="button"
                onClick={importar}
                disabled={pendente || unidades.length === 0}
                className="w-full rounded-md bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
              >
                {pendente ? "Importando..." : `Importar ${unidades.length} unidades`}
              </button>
            </>
          )}
        </div>
      )}

      {resultado && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            resultado.erro ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"
          }`}
        >
          {resultado.erro
            ? resultado.erro
            : `Pronto: ${resultado.criadas} criadas, ${resultado.atualizadas} atualizadas${
                resultado.ignoradas ? `, ${resultado.ignoradas} ignoradas` : ""
              }.`}
        </p>
      )}
    </div>
  );
}
