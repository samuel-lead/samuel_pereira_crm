-- Samuel (27/11/26): lembrete único no WhatsApp dele, amanhã (28/11) às 14h (17:00 UTC),
-- pra ligar pro Ilha e ver se ele aproveita a oferta de R$ 1.500. O próprio job se apaga
-- depois de rodar, pra não repetir todo ano.
select cron.schedule(
  'lembrete-ligar-ilha-2026-11-28',
  '0 17 28 11 *',
  $job$
    select private.chamar_enviar_whatsapp(
      '31f5b5d4-b3f0-4de3-82c1-2473800613bc',
      E'📞 *Ligar pro Ilha*\n\nOi, Samuel! Chegou a hora:\n\n🕑 Às 14:00\n\n📝 *O que fazer:*\n• Ligar pro Ilha\n• Ver se ele vai aproveitar a oferta de R$ 1.500 que fizemos pra ele'
    );
    select cron.unschedule('lembrete-ligar-ilha-2026-11-28');
  $job$
);
