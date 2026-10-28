# JOTTA STUDIOS VIP CLUB — implantação segura

O site já contém a página /club.html, login Discord e o checkout condicionado a credenciais privadas. O Pix só fica ativo quando VIP_CHECKOUT_ENABLED=true.

Primeiro, os responsáveis precisam configurar uma conta de recebimento comercial elegível no Mercado Pago e confirmar o titular nela. Não use apenas a chave Pix Nubank como verificador.

Instale a estrutura do banco executando vip-schema.sql no SQL Editor do Supabase.

Configure no Render as variáveis privadas de OAuth Discord, Mercado Pago e Supabase indicadas no código vip-checkout.js. Não adicione segredos ao GitHub, prints ou mensagens.

No Discord Developer Portal, registre a URL de redirecionamento https://jotta-portfolio-v5.onrender.com/api/vip/callback . O bot deve ter permissão Gerenciar Cargos e posição acima dos cargos VIP.

No Mercado Pago Developers, registre o webhook de pagamentos https://jotta-portfolio-v5.onrender.com/api/vip/webhook e configure o segredo de assinatura. O webhook de novidades do Discord é outro sistema.

Teste login, criação de preferência, pagamento teste, assinatura, reembolso, expiração e concessão de cargo antes de ativar pagamentos reais.

A renovação de Pix é manual. A URL /api/vip/sweep precisa de agendamento autenticado para revogar cargos expirados mesmo que o cliente não volte ao site.
