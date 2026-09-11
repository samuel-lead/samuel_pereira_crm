// Cópia fiel do documento "Pré-qualificação para marcar call" do Google
// Drive — Samuel pediu pra tirar do Google Docs embutido (o zoom via CSS
// nunca ficou bom) e trazer nativo, mas exatamente igual ao original:
// mesmo texto, mesmos títulos, mesmas cores de marca-texto (verde, amarelo,
// laranja, rosa e vermelho) e mesma formatação (negrito, sublinhado).
// Se o documento original mudar no Google Docs, precisa atualizar aqui
// também à mão (não é mais uma cópia ao vivo do documento).

const LINK_AULA =
  "https://drive.google.com/file/d/1tFHtisw7fGa6K57n3kgjRsbtGkUvAOFI/view?usp=drive_link";
const LINK_AGENDAMENTOS =
  "https://docs.google.com/document/d/1pTlELN589qKcRiAq7-2tcmfjgsQcgolGBQcQWdrJCQA/edit?usp=sharing";

function Titulo({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-neutral-900">{children}</h2>;
}

function TituloEtapa({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-lg font-bold text-neutral-900">
      <mark className="rounded bg-yellow-300 px-1.5 py-0.5">{children}</mark>
    </p>
  );
}

function Link({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-blue-600 underline"
    >
      {href}
    </a>
  );
}

export function RoteiroPreQualificacao() {
  return (
    <div className="space-y-6 px-6 py-6 text-[15px] leading-relaxed text-neutral-800">
      <h1 className="text-2xl font-bold text-neutral-900">Pré-qualificação para marcar call</h1>

      <div className="space-y-2">
        <p className="font-bold text-neutral-900">O seu papel na hora de falar com o lead é 👇</p>
        <ol className="list-decimal space-y-1 pl-6">
          <li>Descobrir se ele tem uma dor que nós resolvemos.</li>
          <li>Se ele quer resolver a dor agora</li>
          <li>E se ele tem condições de investir na solução.</li>
        </ol>
        <p className="font-bold text-neutral-900">
          Enquanto você não sabe esses 3 pontos acima, não deve marcar call🤙
        </p>
      </div>

      <div className="space-y-2">
        <Titulo>Boas práticas da ligação👇</Titulo>
        <ul className="list-disc space-y-1 pl-6">
          <li>Estuda o cliente antes de ligar.</li>
          <li className="underline">
            Não liga para a pessoa e pergunta se ligou em uma hora ruim, se ela tem 5 minutos ou
            se está podendo falar.
          </li>
          <li>Jamais passe de 15 minutos.</li>
          <li>Não ligue tímido e inseguro, coloque energia.</li>
          <li>Seja especialista não o estagiário.</li>
          <li>Fale pausadamente</li>
        </ul>
      </div>

      <div className="space-y-2">
        <Titulo>Início da ligação👇</Titulo>
        <div className="space-y-2">
          <p>Bom dia, tudo bem com você?</p>
          <p className="pl-4 italic text-neutral-500">- Pausa e aguardar resposta.</p>

          <p>Ótimo, [nome do lead] aqui é o [seu nome] da [nome da empresa].</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Pausa e deixa o cliente processar o seu nome.</li>
            <li>E avança com uma pergunta</li>
          </ul>

          <p>Eu te encaminhei um WhatsApp/email, você chegou a dar uma olhada?</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Ele vai falar não, dificilmente ele olhou o Wpp ou e-mail.</li>
            <li>Essa pergunta é para avançar e quebrar gelo.</li>
          </ul>

          <p>
            Não tem problema/fique tranquilo, eu sei que você é uma pessoa ocupada, e eu estou te
            ligando para mostrar como ajudamos mais de 100 corretores nos últimos anos a vender no
            mínimo um imóvel por mês como corretor.
          </p>

          <p>Hoje você já consegue vender no mínimo um imóvel todos os meses?</p>
          <p className="pl-4 italic text-neutral-500">- Aguarda a resposta.</p>

          <p className="font-bold text-neutral-900">Se falar, "sim", diga:</p>
          <p>Ótimo, e qual tem sido o seu maior desafio atualmente como corretor?</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Aguardar resposta</li>
          </ul>

          <p className="font-bold text-neutral-900">Se falar "não", diga:</p>
          <p>Entendo, você já tentou fazer alguma coisa para resolver essa situação?</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Aguardar resposta</li>
          </ul>
        </div>
      </div>

      <p className="text-xl font-bold text-neutral-900">
        <mark className="rounded bg-[#00ff00] px-1.5 py-0.5">
          Para identificar esses 3 pontos da qualificação, seguimos o processo de 9 etapas
          abaixo👇
        </mark>
      </p>

      <div className="space-y-2">
        <TituloEtapa>1) Ponto A (situação atual do lead)</TituloEtapa>
        <p>Nome, me conta 👇</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Há quanto tempo está no mercado imobiliário?</li>
          <li>E qual está sendo o seu maior desafio atualmente?</li>
        </ul>
        <p>Pode ser em áudio se preferir (fique a vontade)</p>
        <p>----------</p>
        <p>
          Às vezes o lead vai te falar um objetivo no lugar de uma dor/desafio, e você pergunta,{" "}
          <strong>o que está te impedindo de alcançar esse objetivo?</strong>
        </p>
        <p>
          Quando identificar o problema, <strong>desenvolva ele</strong>
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Me conta um pouco mais, como assim o seu o problema é (falar o que o lead disse de
            problema)
          </li>
          <li>Lead, qual é a causa dessa dor, você saberia me dizer?</li>
          <li>Há quanto tempo que está com esse problema?</li>
        </ul>
      </div>

      <div className="space-y-2">
        <TituloEtapa>2) Tentativas de solução</TituloEtapa>
        <ul className="list-disc space-y-1 pl-6">
          <li>O que já tentou fazer para resolver?</li>
        </ul>
        <p>Se ele dizer que está com o problema a um ano e não fez nada para tentar resolver, pergunte:👇</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Nome, por que você não fica com essa dor por mais 6 meses ao invés de tentar resolver agora?</li>
        </ul>
        <p className="font-bold text-neutral-900">
          Se o lead tiver começando agora na profissão, não é necessário fazer a pergunta, pode ir
          para o Ponto B.
        </p>
      </div>

      <div className="space-y-2">
        <TituloEtapa>3) Ponto B (onde ele quer chegar)</TituloEtapa>
        <ul className="list-disc space-y-1 pl-6">
          <li>Qual a sua meta para os próximos 6 meses como corretor?</li>
        </ul>
        <p>Uma pergunta que pode ser feita aqui para começar a provocar a urgência nele👇</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Nome, no ritmo que você está você acredita que conseguiria atingir essa meta?</li>
        </ul>
      </div>

      <div className="space-y-2">
        <TituloEtapa>4) URGÊNCIA/PRIORIDADE EM RESOLVER O PROBLEMA</TituloEtapa>
        <ul className="list-disc space-y-1 pl-6">
          <li>Nome, esse problema é algo que você quer resolver para agora ou você pode ficar mais uns dois ou 3 meses com ele?</li>
          <li>De 0 a 10 qual nota que você dá para a sua prioridade em resolver essa situação?</li>
        </ul>
        <p>Qualquer nota menor que 10 você pergunta👇</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Nome, e o que está faltando para ser um 10? Eu pensei a (dor/desejo do lead) fosse uma
            prioridade para você
          </li>
        </ul>
        <p>
          <mark className="rounded bg-[#f6b26b] px-1.5 py-0.5 text-neutral-900">
            Caso o lead não tenha urgência para resolver o problema,{" "}
            <strong>procure elevar o nível de consciência dele,</strong> para ele querer resolver
            agora. <strong>Se ele não tem prioridade em resolver, não deve ser marcado a call.</strong>
          </mark>
        </p>
        <p>Pergunta que pode ser feitas para conscientizar o lead e aumentar a urgência👇</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            O que pode acontecer com você se seguir os próximos 3 a 6 meses com os mesmo
            resultados, você já fez os cálculos?
          </li>
        </ul>
        <p>Se o lead disser que está confortável do jeito que está, pergunte:👇</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Nome, se do jeito que você está, é confortável, o que faria você investir em algo que vai fazer você crescer mais?</li>
        </ul>
        <p>
          <mark className="rounded bg-[#f4a7a7] px-1.5 py-0.5 font-bold text-neutral-900">
            Se o lead disser que quer apenas conhecer, não mostrou prioridade em querer resolver
            agora e não conseguimos aumentar a consciência, não marque a reunião e envie a nossa
            aula📚
          </mark>
        </p>
        <p className="font-semibold text-neutral-900">Mensagem 1</p>
        <p>
          Nome, em respeito ao seu tempo e ao nosso, eu vou te mandar uma aula para você poder
          assistir com calma toda a nossa metodologia e a forma que trabalhamos, como não é uma
          prioridade para resolver a (dor do lead), não é necessário fazermos a reunião.
        </p>
        <p className="font-semibold text-neutral-900">Mensagem 2</p>
        <p>Segue o link da aula e me conta o que achou depois que terminar de assistir👇</p>
        <Link href={LINK_AULA} />
      </div>

      <div className="space-y-2">
        <TituloEtapa>5) CAPACIDADE DE INVESTIMENTO</TituloEtapa>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Nome, como resolver essa situação é uma prioridade para você, um investimento a partir
            de R$3.000, está dentro da sua realidade hoje, se isso te levar a vender 2 a 4 imóveis
            no mês?
          </li>
        </ul>
      </div>

      <div className="space-y-2">
        <TituloEtapa>6) CONVITE PARA A REUNIÃO</TituloEtapa>
        <p>
          Nome, como resolver essa situação é uma prioridade para você, você está disposto a
          investir na solução, eu quero te convidar para participar de uma conversa online de mais
          ou menos 60 minutos onde nosso especialista vai te mostrar no detalhe o plano de ação
          para você resolver/conquistar (falar das dores e objetivos do lead), você topa
          participar dessa conversa?
        </p>
      </div>

      <div className="space-y-2">
        <TituloEtapa>7) COMPROMISSO DE DECIDIR</TituloEtapa>
        <p>
          Na nossa conversa vamos entender o seu cenário detalhadamente e montar um plano de ação
          para você executar. No final, se fizer sentido, também vamos mostrar como funciona o
          nosso acompanhamento.
        </p>
        <p>
          Se você enxergar que é a melhor solução para o seu momento e que cabe dentro da sua
          realidade financeira, eu posso contar com a sua decisão no final da conversa?
        </p>
      </div>

      <div className="space-y-2">
        <TituloEtapa>8) AUTONOMIA NA DECISÃO</TituloEtapa>
        <ul className="list-disc space-y-1 pl-6">
          <li>Hoje você trabalha sozinho ou tem algum sócio ou parceiro de negócio?</li>
        </ul>
        <p>Se ele falar que tem sócio.</p>
        <p>
          <strong>Diga:</strong> É muito importante que ele esteja presente na nossa conversa
          também, para entender o plano de ação que será passado nos detalhes e te apoiar na
          decisão.
        </p>
        <p>----------</p>
        <p>
          Após isso, passar os horários (sempre agendar para o mesmo dia ou o mais próximo possível
          de hoje) <strong>e depois de definir os horários, fazer o selo de compromisso.</strong>
        </p>
      </div>

      <div className="space-y-2">
        <TituloEtapa>9) SELO DE COMPROMISSO COM O HORÁRIO</TituloEtapa>
        <p>
          <mark className="rounded bg-[#e06666] px-1.5 py-0.5 font-bold text-white">
            Obrigatório fazer essa pergunta antes de marcar a reunião
          </mark>
        </p>
        <p>
          Nome, só para ficar claro, não remarcamos reunião, a não ser que aconteça um apocalipse
          por aqui, estou reservando esse horário exclusivamente para você.
        </p>
        <p>Levamos muito a sério os nossos horários.</p>
        <p>Esse horário que você definiu, você vai estar 100% disponível?</p>
        <p className="font-bold text-neutral-900">A partir daqui seguir o processo de agendamentos⚡</p>
        <Link href={LINK_AGENDAMENTOS} />
      </div>

      <div className="space-y-2">
        <Titulo>
          <mark className="rounded bg-yellow-300 px-1.5 py-0.5">Observações:</mark>
        </Titulo>
        <p>
          Quando o lead engajar com você na conversa é muito importante tentar{" "}
          <strong>fazer uma ligação</strong> para acelerar o processo de qualificação e aumentar
          sua performance.
        </p>
        <p className="font-bold text-neutral-900">Tréplica padrão (importante):</p>
        <p>Antes de fazer outra pergunta, repete o que ele falou.</p>
        <p>Fazemos a tréplica para não parecer que o lead está em um interrogatório.</p>
        <p>------------</p>
        <p className="text-lg font-bold text-neutral-900">No-show aceitável = 20%</p>
        <p>A cada 15 call marcadas 80% tem que comparecer = 12</p>
      </div>
    </div>
  );
}
