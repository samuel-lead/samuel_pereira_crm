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

// Mesma ideia do diasDesde, mas só conta dia útil (segunda a sexta) — usado
// só pro alarme de "lead parado". Fim de semana não é abandono: sexta pra
// segunda não pode contar como "2 dias parado".
export function diasUteisDesde(dataIso: string, agora: Date = new Date()) {
  const dataLocal = new Date(new Date(dataIso).getTime() - FUSO_BRASIL_MS);
  const agoraLocal = new Date(agora.getTime() - FUSO_BRASIL_MS);

  const diaData = Date.UTC(dataLocal.getUTCFullYear(), dataLocal.getUTCMonth(), dataLocal.getUTCDate());
  const diaAgora = Date.UTC(agoraLocal.getUTCFullYear(), agoraLocal.getUTCMonth(), agoraLocal.getUTCDate());

  let contador = 0;
  for (let cursor = diaData + UM_DIA_MS; cursor <= diaAgora; cursor += UM_DIA_MS) {
    const diaSemana = new Date(cursor).getUTCDay();
    if (diaSemana !== 0 && diaSemana !== 6) contador += 1;
  }
  return contador;
}
