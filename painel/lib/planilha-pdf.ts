// Lê uma tabela dentro de um PDF "de verdade" (com texto selecionável, como
// a tabela comercial exportada de uma planilha) e devolve as linhas de
// células, no mesmo formato do leitor de CSV/.xlsx (lib/planilha.ts) — daí
// o resto da importação é igual. Não usa IA: só lê o texto e a posição de
// cada pedaço na página. PDF escaneado (foto) não tem texto e não funciona.
// Roda só no navegador.
export async function pdfParaLinhas(buffer: ArrayBuffer): Promise<string[][]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const documento = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const linhas: string[][] = [];

  for (let numeroPagina = 1; numeroPagina <= documento.numPages; numeroPagina++) {
    const pagina = await documento.getPage(numeroPagina);
    const conteudo = await pagina.getTextContent();

    type Pedaco = { texto: string; x: number; y: number };
    const pedacos: Pedaco[] = [];
    for (const item of conteudo.items) {
      if (!("str" in item)) continue;
      const texto = item.str.trim();
      if (!texto) continue;
      pedacos.push({ texto, x: item.transform[4], y: item.transform[5] });
    }

    // Agrupa em linhas pela altura (de cima pra baixo), com uma folga de 3
    // pontos pra pedaços da mesma linha que ficam um tantinho desalinhados.
    pedacos.sort((a, b) => b.y - a.y || a.x - b.x);
    const grupos: Pedaco[][] = [];
    for (const pedaco of pedacos) {
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && Math.abs(ultimo[0].y - pedaco.y) <= 3) {
        ultimo.push(pedaco);
      } else {
        grupos.push([pedaco]);
      }
    }

    for (const grupo of grupos) {
      grupo.sort((a, b) => a.x - b.x);
      linhas.push(grupo.map((p) => p.texto));
    }
  }

  return linhas;
}
