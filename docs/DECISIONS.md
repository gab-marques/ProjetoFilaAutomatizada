# Registro de Decisões Técnicas (docs/DECISIONS.md)

Este documento registra as decisões arquiteturais e técnicas tomadas durante o desenvolvimento da **Fila Inteligente com Rota**.

---

## 1. Escolha de Arquitetura e Stack

- **Decisão:** Next.js (App Router) + Supabase (PostgreSQL) + Vitest.
- **Motivação:** Combinação com suporte nativo na Vercel (camada Hobby gratuita), rotas de API serverless eficientes, tipagem estrita com TypeScript e compatibilidade com o ecossistema Supabase.
- **Alternativas consideradas:** Backend isolado em Express/Fastify. Descartado para manter toda a aplicação sob o mesmo repositório e deploy simplificado em um clique.

---

## 2. Ponto Único de Acesso ao LLM (lib/llm.ts)

- **Decisão:** Centralizar todas as chamadas à API do Google Gemini em `lib/llm.ts` com validação de saída via Zod schemas, timeout rígido e retries com backoff exponencial.
- **Motivação:** Evita vazamento de regras de prompt e lógica frágil pelo código, garante observabilidade de latência e custo de tokens, e desacopla o nome do modelo (`GEMINI_MODEL`).

---

## 3. Separação Estrita: IA Interpretativa vs Lógica Determinística

- **Decisão:** O modelo de IA **apenas** classifica a intenção do usuário a partir da linguagem natural. Toda regra de transição de status da fila, cálculo de tempos, ordenação de mesas e chamadas é executada em funções puras TypeScript.
- **Motivação:** Elimina alucinações em regras de negócio cruciais, garante repetibilidade e permite 100% de cobertura com testes unitários determinísticos.

---

## 4. Agendador (Cron) via Tick Externo

- **Decisão:** A Vercel Hobby possui restrição severa na frequência de cron jobs diários. Optou-se por disparar o endpoint seguro `POST /api/tick` (com header `x-tick-secret`) a cada 1 minuto através de instância self-hosted do n8n ou pg_cron do Supabase.
- **Motivação:** Cumpre a exigência de custo zero ($0) sem violar os limites das plataformas gratuitas.

---

## 5. Minimização de Dados (LGPD por Design)

- **Decisão:** O endereço completo e as coordenadas exatas (`lat`, `lng`) do cliente são mantidos apenas em memória durante a requisição para chamada ao OpenRouteService. Apenas o tempo calculado (`travel_minutes`) e opcionalmente o nome do bairro (`origin_area`) são persistidos.
- **Motivação:** Total conformidade com a LGPD (Lei 13.709/2018), mitigando qualquer risco de vazamento de dados de localização sensíveis dos usuários.
