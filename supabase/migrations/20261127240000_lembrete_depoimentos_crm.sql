-- Samuel (27/11/26): lembrete único no WhatsApp dele, amanhã (28/11) às 13h (16:00 UTC):
-- mandar depoimentos positivos dos clientes (nível 5) sobre o CRM, mostrando o CRM da Ketlyn.
-- O próprio job se apaga depois de rodar.
select cron.schedule(
  'lembrete-depoimentos-crm-2026-11-28',
  '0 16 28 11 *',
  $job$
    select private.chamar_enviar_whatsapp(
      '31f5b5d4-b3f0-4de3-82c1-2473800613bc',
      E'💬 *Depoimentos do CRM*\n\nOi, Samuel! Chegou a hora:\n\n🕐 Às 13:00\n\n📝 *O que fazer:*\n• Mandar depoimentos positivos dos clientes que estão no nível 5 sobre o CRM\n• Mostrar o CRM da Ketlyn nessa conversa'
    );
    select cron.unschedule('lembrete-depoimentos-crm-2026-11-28');
  $job$
);
