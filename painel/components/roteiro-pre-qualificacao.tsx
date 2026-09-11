// Conteúdo do documento "Pré-qualificação para marcar call" digitado
// direto aqui — Samuel pediu pra tirar do Google Docs embutido (o zoom
// via CSS nunca ficou bom) e trazer nativo, com fonte e espaçamento sob
// controle. Se o texto original mudar no Google Docs, precisa atualizar
// aqui também à mão (não é mais uma cópia ao vivo do documento).
const PASSOS = [
  {
    numero: 1,
    titulo: "Ponto A — situação atual do lead",
    perguntas: [
      "Há quanto tempo está no mercado imobiliário?",
      "E qual está sendo o seu maior desafio atualmente?",
    ],
    observacao:
      "Pode ser em áudio, se preferir. Se o lead falar um objetivo em vez de uma dor, pergunte: \"o que está te impedindo de alcançar esse objetivo?\". Depois de identificar o problema, desenvolva: \"me conta um pouco mais\", \"qual a causa dessa dor?\", \"há quanto tempo está com esse problema?\".",
  },
  {
    numero: 2,
    titulo: "Tentativas de solução",
    perguntas: ["O que já tentou fazer para resolver?"],
    observacao:
      "Se está há 1 ano no problema e não tentou nada: \"por que não fica com essa dor por mais 6 meses em vez de tentar resolver agora?\". Quem está começando agora na profissão pula direto pro Ponto B.",
  },
  {
    numero: 3,
    titulo: "Ponto B — onde ele quer chegar",
    perguntas: [
      "Qual a sua meta para os próximos 6 meses como corretor?",
      "No ritmo que você está, acredita que conseguiria atingir essa meta?",
    ],
  },
  {
    numero: 4,
    titulo: "Urgência / prioridade em resolver",
    perguntas: [
      "Esse problema é algo que você quer resolver para agora, ou pode ficar mais uns 2-3 meses com ele?",
      "De 0 a 10, que nota você dá pra sua prioridade em resolver essa situação?",
    ],
    observacao:
      "Nota menor que 10: \"o que está faltando pra ser um 10?\". Sem urgência, eleve a consciência: \"o que pode acontecer se seguir mais 3-6 meses com os mesmos resultados?\". Se mesmo assim não tiver prioridade, não marque a reunião — mande a aula em vez disso.",
  },
  {
    numero: 5,
    titulo: "Capacidade de investimento",
    destaque: true,
    perguntas: [
      "Como resolver essa situação é prioridade pra você, um investimento a partir de R$3.000 está dentro da sua realidade hoje, se isso te levar a vender de 2 a 4 imóveis no mês?",
    ],
  },
  {
    numero: 6,
    titulo: "Convite para a reunião",
    perguntas: [
      "Quero te convidar pra participar de uma conversa online de uns 60 minutos, onde nosso especialista vai te mostrar no detalhe o plano de ação pra você resolver/conquistar [dor/objetivo do lead]. Você topa participar dessa conversa?",
    ],
  },
  {
    numero: 7,
    titulo: "Compromisso de decidir",
    perguntas: [
      "Se você enxergar que é a melhor solução pro seu momento e que cabe na sua realidade financeira, eu posso contar com a sua decisão no final da conversa?",
    ],
  },
  {
    numero: 8,
    titulo: "Autonomia na decisão",
    perguntas: ["Hoje você trabalha sozinho ou tem sócio/parceiro de negócio?"],
    observacao:
      "Se tiver sócio: é importante que ele participe da conversa também, pra apoiar na decisão. Depois disso, passe os horários (mesmo dia, ou o mais próximo possível) e siga pro selo de compromisso.",
  },
  {
    numero: 9,
    titulo: "Selo de compromisso com o horário",
    obrigatorio: true,
    perguntas: [
      "Só pra ficar claro: não remarcamos reunião, a não ser que aconteça um apocalipse por aqui — estou reservando esse horário exclusivamente pra você. Esse horário que você definiu, você vai estar 100% disponível?",
    ],
  },
];

export function RoteiroPreQualificacao() {
  return (
    <div className="space-y-5 px-5 py-5 text-[15px] leading-relaxed text-neutral-800">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="font-semibold text-amber-900">O seu papel na hora de falar com o lead</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-amber-900">
          <li>Descobrir se ele tem uma dor que nós resolvemos.</li>
          <li>Se ele quer resolver a dor agora.</li>
          <li>E se ele tem condições de investir na solução.</li>
        </ol>
        <p className="mt-2 font-semibold text-amber-900">
          Enquanto você não sabe esses 3 pontos, não deve marcar call.
        </p>
      </div>

      <div className="space-y-4">
        {PASSOS.map((passo) => (
          <div
            key={passo.numero}
            className={`rounded-xl border p-4 ${
              passo.destaque
                ? "border-blue-200 bg-blue-50"
                : "border-neutral-200 bg-white"
            }`}
          >
            <p
              className={`text-sm font-bold ${
                passo.destaque ? "text-blue-900" : "text-neutral-900"
              }`}
            >
              {passo.numero}) {passo.titulo}
            </p>
            <div className="mt-2 space-y-1.5">
              {passo.perguntas.map((pergunta, i) => (
                <p key={i} className={passo.destaque ? "text-blue-900" : "text-neutral-700"}>
                  "{pergunta}"
                </p>
              ))}
            </div>
            {passo.observacao && (
              <p className="mt-2 text-sm text-neutral-500">{passo.observacao}</p>
            )}
            {passo.obrigatorio && (
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-red-600">
                Obrigatório perguntar antes de marcar a reunião
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-sm font-semibold text-neutral-700">Observações</p>
        <ul className="mt-2 space-y-1.5 text-neutral-600">
          <li>
            • Quando o lead engajar bem na conversa, tente ligar — acelera a qualificação.
          </li>
          <li>
            • <strong>Tréplica:</strong> antes de perguntar de novo, repete o que o lead
            falou — evita parecer interrogatório.
          </li>
          <li>• No-show aceitável: 20% (12 de cada 15 reuniões marcadas precisam comparecer).</li>
        </ul>
      </div>
    </div>
  );
}
