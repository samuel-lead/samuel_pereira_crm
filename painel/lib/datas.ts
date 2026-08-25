export const UM_DIA_MS = 24 * 60 * 60 * 1000;
const FUSO_BRASIL_MS = 3 * 60 * 60 * 1000; // UTC-3, sem horário de verão

// Meia-noite de um dia do calendário do Brasil, como instante real (o UTC
// correto pra usar num filtro de query — não é meia-noite UTC).
function meiaNoiteBrasil(ano: number, mes: number, dia: number) {
  return new Date(Date.UTC(ano, mes, dia) + FUSO_BRASIL_MS);
}

// O servidor (Vercel) roda em UTC, sem fuso — sozinho, ele acha que o dia
// (ou a semana, ou o mês) já virou até 3h mais cedo do que no Brasil de
// verdade. Isso fazia "vendas hoje", "ligações hoje" etc. sumirem uma
// venda feita às 22h, porque o limite de "hoje" já tinha passado pro
// servidor. Essas funções sempre calculam o limite certo, no fuso Brasil.
export function inicioDoDia(agora: Date = new Date()) {
  const local = new Date(agora.getTime() - FUSO_BRASIL_MS);
  return meiaNoiteBrasil(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
}

// Semana sempre domingo a sábado (não segunda a domingo) — combinado com
// o Samuel, senão as contas de "esta semana" batem errado.
export function inicioDaSemana(agora: Date = new Date()) {
  const local = new Date(agora.getTime() - FUSO_BRASIL_MS);
  const diaSemana = local.getUTCDay(); // 0 = domingo, já no fuso Brasil
  return meiaNoiteBrasil(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - diaSemana);
}

export function inicioDoMes(agora: Date = new Date()) {
  const local = new Date(agora.getTime() - FUSO_BRASIL_MS);
  return meiaNoiteBrasil(local.getUTCFullYear(), local.getUTCMonth(), 1);
}

// Pra comparar "esta semana" com a semana anterior: mesmo pedaço relativo
// (do início até o mesmo ponto que já passou), não a semana anterior
// inteira — senão compararia 3 dias desta semana com 7 dias da passada.
export function periodoAnteriorSemana(inicioSemana: Date, agora: Date) {
  const decorridoMs = agora.getTime() - inicioSemana.getTime();
  const inicio = new Date(inicioSemana.getTime() - 7 * UM_DIA_MS);
  return { inicio, fim: new Date(inicio.getTime() + decorridoMs) };
}

// Mesma ideia pro mês — mês não tem tamanho fixo, por isso usa
// inicioDoMes de novo num dia que já caiu no mês anterior, em vez de
// simplesmente subtrair 30 dias.
export function periodoAnteriorMes(inicioMes: Date, agora: Date) {
  const inicio = inicioDoMes(new Date(inicioMes.getTime() - UM_DIA_MS));
  const decorridoMs = agora.getTime() - inicioMes.getTime();
  return { inicio, fim: new Date(inicio.getTime() + decorridoMs) };
}

// Dia da semana (0 = domingo ... 6 = sábado) de um instante, no fuso do
// Brasil — não no fuso do servidor. Ex.: bônus de fim de semana, que dá
// errado perto da meia-noite se calculado no fuso errado.
export function diaDaSemana(dataIso: string) {
  const local = new Date(new Date(dataIso).getTime() - FUSO_BRASIL_MS);
  return local.getUTCDay();
}

// Parseia uma data "solta" tipo "2026-08-25" (de um <input type="date">)
// como meia-noite no fuso do Brasil — sem isso, o servidor (UTC) interpreta
// como meia-noite UTC, que é 21h do dia anterior no Brasil.
export function parseDataBrasil(dataStr: string) {
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  return meiaNoiteBrasil(ano, mes - 1, dia);
}

// "YYYY-MM" de um instante, no fuso do Brasil — usado pra agrupar por mês
// (ex.: filtro de período). Perto da meia-noite, o fuso do servidor podia
// jogar uma venda pro mês errado.
export function anoMesBrasil(dataIso: string) {
  const local = new Date(new Date(dataIso).getTime() - FUSO_BRASIL_MS);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Quantos dias de calendário (fuso Brasil) já se passaram desde a data —
// não é "quantas horas completas passaram". Uma atividade de ontem às 23h
// já é "1 dia" às 00h01 de hoje, mesmo tendo passado só alguns minutos —
// contar em horas fazia isso continuar mostrando "Hoje" por quase 24h.
export function diasDesde(dataIso: string, agora: Date = new Date()) {
  const dataLocal = new Date(new Date(dataIso).getTime() - FUSO_BRASIL_MS);
  const agoraLocal = new Date(agora.getTime() - FUSO_BRASIL_MS);

  const diaData = Date.UTC(dataLocal.getUTCFullYear(), dataLocal.getUTCMonth(), dataLocal.getUTCDate());
  const diaAgora = Date.UTC(agoraLocal.getUTCFullYear(), agoraLocal.getUTCMonth(), agoraLocal.getUTCDate());

  return Math.max(0, Math.round((diaAgora - diaData) / UM_DIA_MS));
}

// Mesma ideia do diasDesde, mas conta tempo real (não dia de calendário) e
// pula fim de semana — usado só pro alarme de "lead parado". Tem que passar
// 24h de verdade, não só virar a meia-noite — senão um lead que acabou de
// entrar às 23h já aparecia como "1 dia parado" um minuto depois. Fim de
// semana não é abandono: as horas de sábado e domingo não entram na conta,
// então sexta à noite pra segunda de manhã não vira "2 dias parado".
export function diasUteisDesde(dataIso: string, agora: Date = new Date()) {
  const dataLocal = new Date(dataIso).getTime() - FUSO_BRASIL_MS;
  const agoraLocal = agora.getTime() - FUSO_BRASIL_MS;
  if (agoraLocal <= dataLocal) return 0;

  const diaInicio = Date.UTC(
    new Date(dataLocal).getUTCFullYear(),
    new Date(dataLocal).getUTCMonth(),
    new Date(dataLocal).getUTCDate(),
  );
  const diaFim = Date.UTC(
    new Date(agoraLocal).getUTCFullYear(),
    new Date(agoraLocal).getUTCMonth(),
    new Date(agoraLocal).getUTCDate(),
  );

  let msUteis = agoraLocal - dataLocal;
  for (let cursor = diaInicio; cursor <= diaFim; cursor += UM_DIA_MS) {
    const diaSemana = new Date(cursor).getUTCDay();
    if (diaSemana === 0 || diaSemana === 6) {
      const inicioSobreposicao = Math.max(dataLocal, cursor);
      const fimSobreposicao = Math.min(agoraLocal, cursor + UM_DIA_MS);
      if (fimSobreposicao > inicioSobreposicao) msUteis -= fimSobreposicao - inicioSobreposicao;
    }
  }

  return Math.max(0, Math.floor(msUteis / UM_DIA_MS));
}
