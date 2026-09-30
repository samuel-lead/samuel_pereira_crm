// Situação da mensalidade de uma empresa cliente — usado só na tela
// "Empresas" (super admin). Não é dinheiro de verdade, é só pra Samuel
// saber quem está em dia, quem vence e quem atrasou.
const UM_DIA_MS = 24 * 60 * 60 * 1000;
const FUSO_BRASIL_MS = 3 * 60 * 60 * 1000;

function hojeBrasil(agora: Date) {
  const local = new Date(agora.getTime() - FUSO_BRASIL_MS);
  return { ano: local.getUTCFullYear(), mes: local.getUTCMonth(), dia: local.getUTCDate() };
}

function dataBrasil(ano: number, mes: number, dia: number) {
  return new Date(Date.UTC(ano, mes, dia) + FUSO_BRASIL_MS);
}

export type StatusCobranca = {
  rotulo: string;
  cor: "verde" | "ambar" | "vermelho" | "neutro";
};

export function calcularStatusCobranca(
  diaVencimento: number | null,
  ultimoPagamentoEm: string | null,
  agora: Date = new Date()
): StatusCobranca | null {
  if (!diaVencimento) return null;

  const { ano, mes, dia } = hojeBrasil(agora);

  // Vencimento deste mês. Se ainda não chegou, o vencimento "em vigor"
  // é o do mês passado (é ele que decide se está atrasado).
  let vencimentoAtual = dataBrasil(ano, mes, diaVencimento);
  if (vencimentoAtual.getTime() > agora.getTime()) {
    vencimentoAtual = dataBrasil(ano, mes - 1, diaVencimento);
  }

  const pago = ultimoPagamentoEm ? new Date(ultimoPagamentoEm).getTime() >= vencimentoAtual.getTime() : false;
  if (pago) {
    return { rotulo: "Em dia", cor: "verde" };
  }

  const diasAtraso = Math.round((agora.getTime() - vencimentoAtual.getTime()) / UM_DIA_MS);
  if (diasAtraso <= 0) {
    return { rotulo: "Vence hoje", cor: "ambar" };
  }
  return { rotulo: `Atrasado ${diasAtraso} dia${diasAtraso === 1 ? "" : "s"}`, cor: "vermelho" };
}
