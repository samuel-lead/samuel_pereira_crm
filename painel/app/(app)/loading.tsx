// Aparece na hora, assim que clica em qualquer página do menu lateral,
// enquanto a página de verdade ainda tá buscando os dados no servidor —
// sem isso a tela ficava "congelada" (nada mudava na hora do clique) até
// tudo carregar, o que parecia mais lento do que realmente era. Fica só
// na área de conteúdo — a barra lateral continua ali, parada, porque ela
// mora no layout, não neste arquivo.
export default function Carregando() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-blue-600" />
        <p className="text-sm text-neutral-400">Carregando...</p>
      </div>
    </div>
  );
}
