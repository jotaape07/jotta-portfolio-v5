# JOTTA STUDIOS — Pix Nubank + Painel simples de aprovacao VIP

## O que o site faz
- `/club.html`: o cliente entra com Discord, aceita os termos, escolhe VIP e cria pedido.
- Mostra apenas a chave Pix Nubank e o nome do beneficiario para CONFERENCIA NO BANCO.
- O cliente clica **JA FIZ O PIX — ENVIAR PARA CONFERENCIA**. Isso NAO libera cargo.
- `/admin` → **PIX / PEDIDOS VIP**: ve todos os pedidos, filtra **CONFERIR**, abre Nubank em outro dispositivo, verifica credito e valor.
- Informe a referencia bancaria unica (ex.: EndToEndId do Pix recebido), marque a confirmacao e clique **APROVAR E LIBERAR VIP**.
- Aprovacao registra o VIP por 30 dias, previne reutilizar a mesma referencia e tenta entregar o cargo no Discord.
- Se o Discord falhar, aparece **SINCRONIZAR CARGO** para tentar novamente. Tambem e possivel **REJEITAR** quando nao houver credito.
- Repetir a aprovacao nao duplica a assinatura. O pagamento e MANUAL — comprovantes e prints nao sao verificacao.
- Nenhum dado de login bancario, CPF ou print e coletado pelo site.

## Configuracao obrigatoria (responsaveis legais administram o recebimento)
1. **Supabase**: crie/abra seu projeto e execute o SQL em `nubank-vip.sql` no **SQL Editor**. O site usa o banco para registrar pedidos de forma persistente.
2. **Discord Developer Portal**: em sua aplicacao → OAuth2 → Redirects, adicione exatamente
   `https://jotta-portfolio-v5.onrender.com/api/vip/callback`
3. O bot deve estar dentro do servidor `1564870796399214703` e ter **Gerenciar Cargos**. Posicione o cargo do bot acima de todos os cargos VIP, sem precisar dar Administrator.
4. **Render** → serviço web → **Environment**. Configure estas variáveis PRIVADAS:
   - `DISCORD_CLIENT_ID` = Application ID do bot
   - `DISCORD_CLIENT_SECRET` = segredo OAuth2 do aplicativo
   - `DISCORD_BOT_TOKEN` = token do bot (nao compartilhe)
   - `DISCORD_GUILD_ID` = `1564870796399214703`
   - `SUPABASE_URL` = URL do seu projeto Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` = chave privada service_role
   - `SESSION_SECRET` = segredo aleatorio longo (32+ caracteres; conservar o ja existente no site)
   - `PUBLIC_SITE_URL` = `https://jotta-portfolio-v5.onrender.com` (opcional, este ja e o padrao)
   - `NUBANK_MANUAL_ENABLED` = `false` ate os testes terminarem
5. O bot de novidades do Discord e INDEPENDENTE do Pix. O webhook de avisos segue em `DISCORD_UPDATES_WEBHOOK_URL`.
6. Opcional para staff: `DISCORD_VIP_STAFF_WEBHOOK_URL` para receber notificacoes privadas de novos pedidos. NUNCA use o webhook num canal publico, para nao revelar IDs de compra.
7. Teste login Discord, criacao de pedido, botao de solicitar conferência, rejeicao e sincronizacao de cargo, **sem realizar transferencia real de teste**. Confira que os pedidos aparecem em `/admin`.
8. Somente apos conferir com os responsaveis e testar, altere `NUBANK_MANUAL_ENABLED=true`. Isso mostra a chave Pix aos compradores, mas NUNCA ativa aprovacao automatica.
9. Para remover cargos apos o fim dos 30 dias, agende `POST /api/vip/sweep` com `Authorization: Bearer <VIP_SWEEP_SECRET>` usando segredo privado longo (24+ caracteres). Configure o agendamento para executar diariamente. Sem agendamento, a remocao automatica do cargo apos vencimento NAO estara garantida.

## Passo a passo rapido no painel
1. Abra `https://jotta-portfolio-v5.onrender.com/admin` e entre com a senha ja configurada.
2. Clique em **PIX / PEDIDOS VIP** na barra lateral.
3. Selecione **CONFERIR**. Abra a transacao recebida no aplicativo Nubank.
4. Confira o valor exato, data e que o credito foi recebido. Nao aceite apenas comprovante do cliente.
5. Cole a **referencia unica** encontrada nos detalhes da transferencia, marque a confirmacao e clique **APROVAR E LIBERAR VIP**.
6. Se aparecer **SINCRONIZAR CARGO**, confirme que o comprador entrou no Discord e use esse botao.

## Importante
- Esse modelo NAO gera cobranca Pix dinamica nem verifica pagamentos pela API do Nubank. O cliente inicia o Pix em seu banco copiando a chave; a pessoa responsavel valida manualmente o dinheiro recebido.
- Pix nao gera renovacao automatica. Cada renovacao precisa de um novo pedido e outro Pix.
- Dados dos pagamentos devem ficar acessiveis apenas ao administrador, e a plataforma deve seguir as leis e os termos aplicaveis.
- Os Termos de Serviço no site nao substituem os direitos do consumidor nem garantem ausencia de reclamacoes.
