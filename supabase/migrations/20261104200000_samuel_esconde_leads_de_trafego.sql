-- Samuel (04/11/26): no CRM dele (org "Samuel Pereira") não precisa da página
-- "Leads de tráfego". Esconde só pra essa empresa (menu e endereço), sem mexer
-- nas outras. Pra voltar a mostrar: tirar '/dashboard/trafego' da lista.
update public.orgs
set paginas_ocultas = array_append(paginas_ocultas, '/dashboard/trafego')
where id = 'a26cfaff-8e96-4300-87c2-8fc527ef755c'
  and not ('/dashboard/trafego' = any(paginas_ocultas));
