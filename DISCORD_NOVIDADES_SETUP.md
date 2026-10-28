# Novidades automáticas: portfólio → Discord

O site envia um embed ao Discord quando você:
- Publica mudanças em projetos, jogos, serviços, preços ou planos VIP no painel administrativo.
- Faz upload de uma nova imagem ou vídeo pelo painel.

## Como ativar (somente uma vez)
1. No seu servidor Discord, abra o canal de anúncios, **Editar Canal → Integrações → Webhooks → Novo Webhook**.
2. Dê o nome de **JOTTA STUDIOS | Atualizações** e copie a URL.
3. Acesse o serviço do site no **Render → Environment**.
4. Crie a variável de ambiente **DISCORD_UPDATES_WEBHOOK_URL** e cole nela a URL completa.
5. Salve e deixe o Render aplicar a atualização.

Segurança: **não coloque o webhook no GitHub, em screenshots ou no chat**. A URL dá permissão para publicar mensagens naquele canal.

O site anuncia apenas alterações **publicadas** e uploads realizados pelo painel; não anuncia cada digitação nem alterações feitas diretamente em arquivos do repositório. Para essas últimas, precisa de um workflow adicional.
Falhas de notificação não impedem salvar o conteúdo; mensagens não são reenviadas automaticamente.
