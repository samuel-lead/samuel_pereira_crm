export default function PoliticaDePrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-neutral-800">
      <h1 className="text-2xl font-bold text-neutral-900">Política de Privacidade</h1>
      <p className="mt-1 text-sm text-neutral-500">Última atualização: 14 de setembro de 2026</p>

      <p className="mt-6 leading-relaxed">
        Esta política explica quais dados o <strong>Meu Vendedor</strong> (CRM comercial
        disponível em sousamuelpereira.com.br) coleta, como usa e como protege esses
        dados. Se você tiver qualquer dúvida, pode falar diretamente com a gente pelo
        e-mail no fim desta página.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Quais dados coletamos</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li>
          <strong>Leads (potenciais clientes):</strong> nome, telefone/WhatsApp, e-mail,
          Instagram e as respostas dadas em formulários de cadastro, quando a própria
          pessoa preenche um desses formulários.
        </li>
        <li>
          <strong>Usuários da equipe:</strong> nome e WhatsApp de quem usa o CRM para
          gerenciar a operação comercial.
        </li>
        <li>
          <strong>Dados de agenda (Google):</strong> quando um usuário conecta a própria
          conta do Google, o CRM cria, edita e cancela eventos na agenda dele
          correspondentes aos compromissos marcados dentro do próprio CRM.
        </li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Como usamos esses dados</h2>
      <p className="mt-3 leading-relaxed">
        Os dados são usados exclusivamente para operar o CRM: organizar o
        acompanhamento comercial de cada lead, enviar lembretes por WhatsApp para a
        equipe, e manter a agenda de compromissos sincronizada. Não usamos esses dados
        para nenhuma outra finalidade.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Integração com o Google Agenda</h2>
      <p className="mt-3 leading-relaxed">
        Ao conectar a conta do Google, o CRM solicita permissão apenas para gerenciar
        eventos de agenda (escopo <code className="rounded bg-neutral-100 px-1 py-0.5 text-sm">calendar.events</code>).
        Com essa permissão, o CRM:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li>Cria um evento na agenda quando um compromisso é marcado no CRM;</li>
        <li>Atualiza esse evento se o compromisso for remarcado;</li>
        <li>Cancela esse evento se o compromisso for cancelado no CRM.</li>
      </ul>
      <p className="mt-3 leading-relaxed">
        O CRM não lê, não acessa e não armazena nenhum outro evento da sua agenda além
        dos que ele mesmo criou. Os dados de agenda não são compartilhados com terceiros
        e não são usados para propaganda.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Com quem compartilhamos dados</h2>
      <p className="mt-3 leading-relaxed">
        Usamos a Z-API (plataforma de envio de mensagens de WhatsApp) para mandar
        lembretes e notificações internas da equipe, e a infraestrutura da Supabase e da
        Vercel para hospedar o sistema e o banco de dados. Nenhum desses serviços recebe
        mais dados do que o necessário para prestar o serviço contratado, e nenhum dado
        é vendido ou compartilhado para fins de marketing de terceiros.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Segurança e retenção</h2>
      <p className="mt-3 leading-relaxed">
        Os dados ficam armazenados em banco de dados protegido por controle de acesso,
        separado por empresa. Dados não são apagados automaticamente — quando um
        registro precisa ser removido, ele é arquivado, e pode ser excluído
        definitivamente mediante pedido.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Seus direitos</h2>
      <p className="mt-3 leading-relaxed">
        Você pode pedir a qualquer momento para saber quais dados seus temos guardados,
        corrigi-los, ou solicitar a exclusão deles (inclusive revogar o acesso à sua
        conta do Google a qualquer momento, direto nas configurações da sua Conta
        Google). Basta entrar em contato pelo e-mail abaixo.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Contato</h2>
      <p className="mt-3 leading-relaxed">
        Dúvidas sobre esta política ou sobre os seus dados:{" "}
        <a href="mailto:samuuelpereiradasilva@gmail.com" className="text-blue-600 underline">
          samuuelpereiradasilva@gmail.com
        </a>
      </p>
    </main>
  );
}
