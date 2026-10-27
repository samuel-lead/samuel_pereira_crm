-- Samuel (27/10/26): mensagem que já vem escrita no WhatsApp quando a pessoa
-- clica em "Falar no WhatsApp" no formulário da Ketlyn (/ketlyn).
update public.iscas
   set whatsapp_mensagem = 'Olá, Ketlyn! Acabei de me cadastrar e quero saber mais informações do imóvel.',
       updated_at = now()
 where slug = 'ketlyn' and org_id = '475cb573-f3de-48a7-ae91-e45824c60514';
