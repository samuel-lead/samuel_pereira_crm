// Nota digitada e ainda não adicionada à linha do tempo (Samuel, 18/11/26).
// O campo "Registrar nota" e o "Salvar alterações" do card são formulários
// separados — sem isso, quem escrevia a nota e clicava direto em "Salvar"
// perdia o texto. A caixa de nota se registra aqui; o "Salvar alterações" pergunta
// se tem nota pendente e, se tiver, salva a nota primeiro e só depois salva o card.
type NotaPendente = {
  tem: () => boolean;
  // Devolve null se salvou (ou não tinha nada), ou a mensagem de erro.
  salvar: () => Promise<string | null>;
};

const notas = new Map<string, NotaPendente>();

export function registrarNotaPendente(leadId: string, nota: NotaPendente) {
  notas.set(leadId, nota);
  return () => {
    if (notas.get(leadId) === nota) notas.delete(leadId);
  };
}

export function temNotaPendente(leadId: string) {
  return notas.get(leadId)?.tem() ?? false;
}

export async function salvarNotaPendente(leadId: string): Promise<string | null> {
  const nota = notas.get(leadId);
  if (!nota || !nota.tem()) return null;
  return nota.salvar();
}
