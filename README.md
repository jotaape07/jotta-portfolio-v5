# JOTTA V5 — PACOTE CORRIGIDO (MÍDIAS + 7 ARTES)

## O que foi corrigido

- Corrigido o clique que abria o seletor de arquivos repetidamente no painel `/admin`.
- Instaladas 7 imagens novas em `public/assets/`, com aparência diferenciada para cada área.
- O `content-default.json` agora referencia essas imagens diretamente, sem precisar de upload manual.
- Todas as artes têm 1920 × 1080 px, com títulos e cores personalizados.

## Atualização rápida do GitHub

1. Descompacte o ZIP; abra o repositório `jotaape07/jotta-portfolio-v5`.
2. Substitua os arquivos `public/admin.js`, `public/admin.html` e `content-default.json` pelos novos.
3. Envie os 7 JPGs de `public/assets/` para a pasta `public/assets/` do repositório.
4. Faça o commit e aguarde o Render fazer um novo deploy.

Importante: os arquivos da raiz, como `server.js`, `package.json` e `render.yaml`, também acompanham o ZIP. Podem permanecer como estão, caso já estejam funcionando.

## Por que novos uploads podem desaparecer?

O Render Free utiliza armazenamento local temporário. Sem `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` em Environment, o endpoint faz o upload localmente, mas os arquivos enviados desaparecem quando o serviço reinicia ou faz novo deploy.

O painel de conteúdo também precisa de Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e a tabela do `supabase.sql`) para manter edições salvas em um serviço persistente.

**Segurança:** nunca envie seus segredos de ambiente ao repositório GitHub, nem os compartilhe em mensagens.

## Se as capas padrão não aparecerem após o deploy

Pode haver configuração antiga armazenada no Supabase. Entre em `/admin` → APARÊNCIA & CAPAS, e use os seguintes caminhos diretamente:

- Abertura: `assets/01_abertura_red_studio.jpg`
- Capa: `assets/02_capa_yellow_tech.jpg`
- Galeria: `assets/03_galeria_red_archive.jpg`
- Caçadores de Lendas projeto: `assets/04_projeto_cacadores.jpg`
- EB do Fofex: `assets/05_projeto_eb_fofex.jpg`
- Systems Lab: `assets/06_projeto_systems_lab.jpg`
- Catálogo Caçadores: `assets/07_jogo_cacadores_retorno.jpg`

Depois clique em PUBLICAR ALTERAÇÕES. Os caminhos acima só funcionarão depois de enviar os JPGs ao GitHub e publicar o projeto.

## Links atuais

Roblox: https://www.roblox.com/pt/users/1729771980/profile
GitHub: https://github.com/jotaape07
Site V5: https://jotta-portfolio-v5.onrender.com

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
