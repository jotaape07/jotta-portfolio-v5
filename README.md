# JOTTA Studio — Portfolio V5

Portfólio completo com entrada animada, Roblox avatar com atualização automática, catálogo de jogos, painel administrativo para imagens/vídeos, e edição de textos, imagens de fundo, projetos, linguagens e links. Interface preto e branco com amarelo ou vermelho.

## Links já configurados

- Roblox: https://www.roblox.com/pt/users/1729771980/profile (ID 1729771980)
- GitHub: https://github.com/jotaape07
- Caçadores de Lendas — O Retorno: https://www.roblox.com/pt/games/87519362651583/
- Discord: **não informado**; botão permanece desativado até adicionar URL no painel.

## Teste no computador

Use Node.js 20 ou superior:

```bash
npm install
# copie .env.example para .env; configure ADMIN_PASSWORD e SESSION_SECRET
npm start
```

Abra `http://localhost:3000` e `http://localhost:3000/admin`.

## Publicar pelo Render (Web Service)

1. Suba os arquivos do **conteúdo desta pasta** em um repositório GitHub privado ou público. Não suba `.env`, senhas nem chaves; confira `.gitignore`.
2. Em Render > New > Web Service, selecione o repositório. Ambiente Node, Build Command `npm install` e Start Command `npm start`. Ou use `render.yaml` como Blueprint.
3. Configure em **Environment**:
   - `NODE_ENV=production`
   - `ADMIN_PASSWORD` (senha forte e única)
   - `SESSION_SECRET` (32+ caracteres aleatórios)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (uploads persistentes)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (alterações do painel persistentes)
4. No **SQL Editor** do seu projeto Supabase, execute `supabase.sql`. Mantenha `SUPABASE_SERVICE_ROLE_KEY` exclusivamente no servidor, nunca no HTML ou GitHub.
5. Publique, abra `/admin`, entre e personalize capas, links, jogos, textos. Clique em **Publicar alterações**. Teste a publicação pública, os uploads e a exclusão.

**IMPORTANTE:** Render Free perde os arquivos locais a cada restart/deploy/spin down. Sem Cloudinary e Supabase o painel funciona localmente, mas as imagens enviadas e as edições podem desaparecer na hospedagem gratuita. Contas externas podem ter quotas gratuitas; consulte as condições antes de publicar. As credenciais são apenas suas e não precisam ser fornecidas ao ChatGPT.

## Painel: como adicionar um jogo

Acesse `/admin` > **TODOS OS JOGOS** > **+ NOVO JOGO**. Digite título, gênero, status, link do Roblox, descrição e URL da imagem. Você pode escolher uma imagem da biblioteca ou enviar uma nova mídia em **GALERIA / UPLOAD**. Reordene com ↑/↓. Clique em **PUBLICAR ALTERAÇÕES**. A lista aparece no final do portfólio, antes de Contato.

## Atualização da skin Roblox

O backend lê os endpoints de miniatura de avatar oficial da Roblox para o usuário 1729771980. A página consulta novamente a cada 5 minutos, e o servidor usa cache de 4 minutos. Mudanças na skin podem demorar mais a aparecer caso a própria Roblox ainda não tenha gerado a nova miniatura. A imagem antiga/fallback aparece se a API estiver temporariamente indisponível. Não precisa mexer no site ao mudar a skin.

## Testes realizados

O layout estático e painel foram verificados em navegador simulado com APIs locais. A instalação de dependências do servidor e teste real de Cloudinary/Supabase devem ser executados no ambiente de publicação; não consideramos uploads persistentes testados até esse passo.
