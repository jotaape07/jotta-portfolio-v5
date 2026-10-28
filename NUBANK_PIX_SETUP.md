# JOTTA STUDIOS — CONTROL ROOM V10
## Checklist para receber os primeiros pedidos reais pelo Pix Nubank

Status atual confirmado pelos logs do Render: **armazenamento local**. O banco Supabase ainda precisa ser configurado antes de habilitar compras. O painel foi redesenhado, mas não é seguro abrir pedidos pagos sem persistência.

### A) Banco de dados (obrigatório)
1. Entre no projeto Supabase que será administrado por você e seus responsáveis.
2. Abra **SQL Editor** e execute o arquivo `nubank-vip.sql` do repositório.
3. Em Render → serviço `jotta-portfolio-v5` → Environment, coloque duas variáveis **privadas**:
   - `SUPABASE_URL` = URL do projeto Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` = chave de serviço privada do Supabase
4. Salve e confira em **/admin → VISÃO GERAL → PRONTO PARA VENDER?** se o banco foi reconhecido.

**Nunca cole essas chaves no GitHub, no Discord, nos arquivos públicos do site ou nesta conversa.** Elas têm permissões elevadas sobre o banco.

### B) Login com Discord (obrigatório)
1. No Discord Developer Portal, abra o aplicativo do bot do JOTTA STUDIOS.
2. OAuth2 → Redirects: cadastre `https://jotta-portfolio-v5.onrender.com/api/vip/callback`.
3. Em Render → Environment, configure as variáveis privadas:
   - `DISCORD_CLIENT_ID` = application ID
   - `DISCORD_CLIENT_SECRET` = segredo OAuth2
   - `DISCORD_BOT_TOKEN` = token do bot
   - `DISCORD_GUILD_ID` = `1564870796399214703`
   - `SESSION_SECRET` = segredo já usado pelo site (nunca substitua sem entender o efeito sobre as sessões)
4. Certifique-se de que o bot está no servidor, tem a permissão **Gerenciar Cargos** e seu cargo está acima dos VIPs. Não é necessário conceder Administrator.
5. Teste em `/club.html` o login com um Discord autorizado e, na Control Room, use **TESTAR CONEXÕES**. O diagnóstico do bot verifica acesso, mas não substitui o teste de entrega real de cargos.

### C) Conferência de pagamento (manual, sem intermediador)
1. Em `/club.html`, o comprador escolhe um VIP, aceita os termos e cria um pedido.
2. O site mostra somente após registrar o pedido:
   - Banco Nubank
   - Chave Pix `jp904811@gmail.com`
   - Beneficiário informado `João Pedro Gonçalves Gomes`
   - Valor exato do plano e código do pedido
3. O comprador transfere o Pix **pelo próprio aplicativo bancário**, verifica o beneficiário e usa o botão **JÁ FIZ O PIX**. O identificador bancário informado pelo comprador é opcional.
4. Você abre **/admin → FINANCEIRO / PIX → CONFERIR**. Confere a entrada real no extrato Nubank, data, valor e referência/EndToEndId.
5. Preenche a referência real, marca o campo de conferência e clica **APROVAR E LIBERAR VIP**. A mesma referência não pode validar duas compras.
6. Se o Discord não sincronizar, aparece **SINCRONIZAR CARGO**. Pode rejeitar pedido sem crédito real. O registro do pedido permanece no banco.

**Não basta print, mensagem de “paguei” ou comprovante.** Nenhum botão do cliente ativa VIP sozinho.

### D) Testes antes da primeira venda real
- Supabase mostra conectado e as duas tabelas existem.
- OAuth2 entra com a conta Discord correta.
- Criar um pedido de teste **sem enviar dinheiro**; conferir que aparece na lista.
- Rejeitar esse pedido de teste para não deixar cobrança pendente.
- Confirmar que cliente **não consegue aprovar** o próprio pedido.
- Testar o fluxo de sincronização dos cargos pelo bot com um usuário autorizado, antes de expor a página para compras reais.
- Verificar termos, política de reembolso e que o responsável pelo recebimento acompanha as operações.
- Configure a expiração de cargos: `POST /api/vip/sweep` autenticado com `VIP_SWEEP_SECRET` precisa de um agendamento externo seguro. Sem isso, o cargo pode permanecer após o vencimento mesmo que o banco registre o fim da assinatura.
- As assinaturas são mensais por **novo Pix**, sem renovação automática.

### E) Abrir vendas (somente depois dos testes e com a autorização dos responsáveis)
Em Render → Environment, defina `NUBANK_MANUAL_ENABLED=true`. Antes disso, deixe essa variável ausente ou `false`.

Depois de salvar, entre em `/admin` e confira o status **PEDIDOS HABILITADOS**. A página `/club.html` só mostrará a chave Pix ao cliente depois de registrar um pedido válido. O site não verifica automaticamente o saldo Nubank: sua aprovação manual continua obrigatória.

### Como usar a nova Control Room
- **VISÃO GERAL**: pedidos esperando conferência, número de pagamentos aprovados, valor bruto dos últimos 100 pedidos carregados, VIPs ativos e gráfico dos últimos sete dias por data de criação dos pedidos.
- **FINANCEIRO / PIX**: filtros, busca por pedido/Discord/identificador, ordenação, validação dupla, aprovação, rejeição, sincronização do cargo, exportação CSV e teste de conexões.
- Os totais de faturamento exibidos são valores *brutos de pedidos aprovados consultados*, não receita líquida, lucro ou dados fiscais.
- O CSV é privado; armazená-lo num local protegido.

**Aviso legal**: a conta e a atividade comercial precisam ser acompanhadas pelos responsáveis legais. Os termos informativos do site não substituem direitos do consumidor nem garantem ausência de reclamações.

Site: https://jotta-portfolio-v5.onrender.com/
Painel: https://jotta-portfolio-v5.onrender.com/admin
VIP Club: https://jotta-portfolio-v5.onrender.com/club.html
Discord: https://discord.gg/Bds2pxD7qd
