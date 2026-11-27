-- Samuel (27/11/26): o lead do lembrete de amanhã (28/11, 14h) se chama Willian.
select cron.alter_job(
  (select jobid from cron.job where jobname = 'lembrete-ligar-ilha-2026-11-28'),
  command := $job$
    select private.chamar_enviar_whatsapp(
      '31f5b5d4-b3f0-4de3-82c1-2473800613bc',
      E'📞 *Ligar pro Willian*\n\nOi, Samuel! Chegou a hora:\n\n🕑 Às 14:00\n\n📝 *O que fazer:*\n• Ligar pro Willian\n• Ver se ele vai aproveitar a oferta de R$ 1.500 que fizemos pra ele'
    );
    select cron.unschedule('lembrete-ligar-ilha-2026-11-28');
  $job$
);
