// Mesma normalização que a coluna gerada `nome_busca` faz no banco (ver
// migration leads_busca_sem_acento) — usada aqui pra preparar o termo
// digitado antes de comparar, senão buscar "Junior" nunca acha "Júnior".
// Filtra por código numérico (marcas de acentuação ficam entre 0x0300 e
// 0x036f depois do normalize) em vez de regex com caractere literal, pra
// não depender de como o editor/terminal exibe um acento solto.
export function removerAcento(texto: string) {
  return Array.from(texto.normalize("NFD"))
    .filter((c) => {
      const codigo = c.codePointAt(0) ?? 0;
      return codigo < 0x0300 || codigo > 0x036f;
    })
    .join("")
    .toLowerCase();
}
