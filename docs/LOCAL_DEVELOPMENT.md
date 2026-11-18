# Desenvolvimento local

O projeto pode ser executado inteiramente no computador. Não é necessário criar uma conta Supabase nem publicar o banco. O Supabase local fornece PostgreSQL, API e painel de administração por meio da CLI e do Docker.

## Requisitos

- Node.js 20 ou superior
- Docker Desktop iniciado e integrado ao WSL, se o projeto estiver sendo executado no WSL
- Dependências do projeto instaladas com `npm install`

## Iniciar o banco local

Crie uma rede Docker que publique as portas apenas no computador. Faça isso uma vez:

```bash
docker network create --opt com.docker.network.bridge.host_binding_ipv4=127.0.0.1 supabase-local-only
```

Inicie os serviços:

```bash
npm run db:start
```

Na primeira inicialização o Docker baixa as imagens. A migração em `supabase/migrations/` é aplicada automaticamente; ela cria as tabelas e o restaurante `Cantina Demo`.

Gere `.env.local` com as chaves locais sem mostrá-las no terminal:

```bash
npm run db:env
```

Execute esse comando uma vez por configuração local. Para regenerar o arquivo, remova `.env.local` manualmente e rode o comando novamente.

O repositório ignora `.env.local`; mantenha as chaves locais nesse arquivo e não as publique. Elas são apenas para desenvolvimento e não devem ser usadas em produção.

## Iniciar o app

Com o banco ativo e `.env.local` preenchido:

```bash
npm run dev
```

- Aplicação: `http://localhost:3000`
- Painel local do Supabase Studio: `http://127.0.0.1:54323`
- Healthcheck: `http://localhost:3000/api/health`

As integrações externas (ORS, Gemini e Telegram) continuam opcionais. Sem credenciais próprias, o projeto usa os fallbacks locais existentes.

## Parar e reiniciar

```bash
npm run db:stop
npm run db:start
```

Os dados locais são mantidos entre paradas. `npm run db:reset` recria o banco e reaplica as migrações, apagando os dados de desenvolvimento existentes.
