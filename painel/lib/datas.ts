const UM_DIA_MS = 24 * 60 * 60 * 1000;
const FUSO_BRASIL_MS = 3 * 60 * 60 * 1000; // UTC-3, sem horário de verão

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
