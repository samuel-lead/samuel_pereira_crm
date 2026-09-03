import { inicioDoDia, UM_DIA_MS, inicioDoMes, inicioDaSemana, parseDataBrasil } from "./datas";

export const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export type ChavePeriodo =
  | "hoje"
  | "ontem"
  | "semana"
  | "semana_passada"
  | "mes"
  | "mes_passado"
  | "ultimos_3_meses"
  | "mes_especifico"
  | "ano_especifico"
  | "custom";

export type PeriodoResolvido = {
  chave: ChavePeriodo;
  titulo: string;
  subtitulo?: string;
  inicio: Date;
  fim: Date;
};

export function formatarDataCurta(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  });
}

// Volta N meses a partir do início do mês de "agora" (mês por mês, não só
// subtraindo dias — assim mês curto/longo não desalinha o resultado).
function inicioMesesAtras(agora: Date, quantidade: number) {
  let referencia = inicioDoMes(agora);
  for (let i = 0; i < quantidade; i++) {
    referencia = inicioDoMes(new Date(referencia.getTime() - UM_DIA_MS));
  }
  return referencia;
}

// Traduz o filtro de período (botões rápidos, mês/ano específico, ou
// período personalizado) no intervalo de datas certo. Prioridade: período
// personalizado (de/ate) > mês/ano específico (mesAno) > atalho (periodo).
// Devolve null quando nada foi escolhido — cada tela decide o que fazer
// nesse caso (a Métricas cai pra "semana", os Clientes mostram tudo).
export function resolverPeriodo(
  input: { periodo?: string; mesAno?: string; de?: string; ate?: string },
  agora: Date
): PeriodoResolvido | null {
  const { periodo, mesAno, de, ate } = input;
  const inicioHoje = inicioDoDia(agora);
  const amanha = new Date(inicioHoje.getTime() + UM_DIA_MS);

  if (de && ate) {
    const inicio = parseDataBrasil(de);
    const fimSelecionado = parseDataBrasil(ate);
    const fim = new Date(fimSelecionado.getTime() + UM_DIA_MS);
    return {
      chave: "custom",
      titulo: "Período personalizado",
      subtitulo: `${formatarDataCurta(inicio)} a ${formatarDataCurta(fimSelecionado)}`,
      inicio,
      fim,
    };
  }

  if (mesAno && /^\d{4}$/.test(mesAno)) {
    const ano = Number(mesAno);
    const inicio = parseDataBrasil(`${ano}-01-01`);
    const fim = parseDataBrasil(`${ano + 1}-01-01`);
    return {
      chave: "ano_especifico",
      titulo: `Ano de ${ano}`,
      inicio,
      fim,
    };
  }

  if (mesAno && /^\d{4}-\d{2}$/.test(mesAno)) {
    const [ano, mes] = mesAno.split("-").map(Number);
    const inicio = parseDataBrasil(`${ano}-${String(mes).padStart(2, "0")}-01`);
    const proximoMes = mes === 12 ? 1 : mes + 1;
    const anoProximoMes = mes === 12 ? ano + 1 : ano;
    const fim = parseDataBrasil(`${anoProximoMes}-${String(proximoMes).padStart(2, "0")}-01`);
    return {
      chave: "mes_especifico",
      titulo: `${NOMES_MES[mes - 1]} de ${ano}`,
      inicio,
      fim,
    };
  }

  if (periodo === "ontem") {
    const inicio = new Date(inicioHoje.getTime() - UM_DIA_MS);
    return { chave: "ontem", titulo: "Ontem", subtitulo: formatarDataCurta(inicio), inicio, fim: inicioHoje };
  }
  if (periodo === "hoje") {
    return { chave: "hoje", titulo: "Hoje", subtitulo: formatarDataCurta(agora), inicio: inicioHoje, fim: amanha };
  }
  if (periodo === "semana") {
    const inicio = inicioDaSemana(agora);
    return {
      chave: "semana",
      titulo: "Esta semana",
      subtitulo: `${formatarDataCurta(inicio)} a ${formatarDataCurta(new Date(inicio.getTime() + 6 * UM_DIA_MS))}`,
      inicio,
      fim: amanha,
    };
  }
  if (periodo === "semana_passada") {
    const inicioSemanaAtual = inicioDaSemana(agora);
    const inicio = new Date(inicioSemanaAtual.getTime() - 7 * UM_DIA_MS);
    return {
      chave: "semana_passada",
      titulo: "Semana passada",
      subtitulo: `${formatarDataCurta(inicio)} a ${formatarDataCurta(new Date(inicio.getTime() + 6 * UM_DIA_MS))}`,
      inicio,
      fim: inicioSemanaAtual,
    };
  }
  if (periodo === "mes") {
    return { chave: "mes", titulo: "Este mês", inicio: inicioDoMes(agora), fim: amanha };
  }
  if (periodo === "mes_passado") {
    const inicio = inicioMesesAtras(agora, 1);
    const fim = inicioDoMes(agora);
    return {
      chave: "mes_passado",
      titulo: "Mês passado",
      subtitulo: `${formatarDataCurta(inicio)} a ${formatarDataCurta(new Date(fim.getTime() - UM_DIA_MS))}`,
      inicio,
      fim,
    };
  }
  if (periodo === "ultimos_3_meses") {
    const inicio = inicioMesesAtras(agora, 2);
    return {
      chave: "ultimos_3_meses",
      titulo: "Últimos 3 meses",
      subtitulo: `${formatarDataCurta(inicio)} a ${formatarDataCurta(agora)}`,
      inicio,
      fim: amanha,
    };
  }

  return null;
}
