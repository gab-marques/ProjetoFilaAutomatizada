# Regras do Projeto (AGENTS.md)

Este documento define as diretrizes de desenvolvimento para os agentes de IA e desenvolvedores que atuam no repositório **Fila Inteligente com Rota**.

---

## 1. Diretrizes de Código e Padrões
- **Idioma:**
  - Código-fonte, variáveis, funções, tipos e commits em **inglês**.
  - Textos de interface de usuário (UI), mensagens enviadas ao usuário, documentação e README em **português do Brasil (pt-BR)**.
- **Stack Tecnológica:**
  - **Framework:** Next.js (App Router) + TypeScript estrito + TailwindCSS.
  - **Banco de Dados:** Supabase (PostgreSQL) via cliente oficial `@supabase/supabase-js`.
  - **Testes:** Vitest.
  - **Qualidade de Código:** ESLint + Prettier.
- **Custo Zero:**
  - Somente serviços gratuitos. Nunca adicione dependências ou serviços que exijam cartão de crédito ou cobrança.
- **Segurança e Variáveis de Ambiente:**
  - Segredos nunca são commitados. Mantenha `.env.example` sempre atualizado.
  - Validação estrita de variáveis de ambiente no boot via Zod (`lib/env.ts`).

---

## 2. IA e Lógica Determinística
- **Ponto Único de Acesso ao LLM:**
  - Toda chamada ao Google Gemini deve passar exclusivamente por `lib/llm.ts`.
  - Configurações obrigatórias: modelo definido por variável de ambiente (`GEMINI_MODEL`), timeout configurado, retry com backoff exponencial, validação de saída estruturada com schemas Zod e logs de latência/tokens.
- **Divisão Clara de Responsabilidades:**
  - **O LLM apenas interpreta linguagem natural e formata respostas.**
  - **Toda regra de negócio, decisão, cálculo de rota, ordenação e previsão é determinística** e executada em funções puras com testes unitários. O LLM nunca realiza cálculos matemáticos ou decisões de estado que o código pode resolver.
- **Fallback Resiliente:**
  - Se a cota do LLM expirar (ex: HTTP 429), um fallback baseado em regex/regras determinísticas deve assumir a operação básica do bot.

---

## 3. Privacidade e LGPD (Lei 13.709/2018)
- **Minimização de Dados:**
  - Endereço completo ou coordenadas de latitude/longitude do cliente **NUNCA são persistidos no banco de dados nem registrados em logs**.
  - O endereço é geocodificado em memória no momento da requisição, calculando-se apenas `travel_minutes` e, opcionalmente, o bairro (`origin_area`). O restante é descartado imediatamente.
- **Consentimento Explícito:**
  - Checkbox explícito na entrada da fila informando o uso temporário da localização apenas para estimativa de rota.
- **Retenção Curta:**
  - Contatos (`telegram_chat_id`) são apagados automaticamente em até 24 horas após o encerramento do atendimento (`purge_after`).
  - Disponibilizar página `/privacidade` e comando `/apagar` no bot.
- **Row Level Security (RLS):**
  - Usuários anônimos só podem criar entradas via endpoints controlados e consultar o status da sua própria entrada via `link_token`.
  - Leitura gerencial e alteração de status são restritas ao perfil `staff` autenticado.

---

## 4. Garantia de Qualidade e Entrega
- **Critério de Encerramento de Tarefa:**
  - Antes de concluir qualquer tarefa ou fase, execute e garanta sucesso em:
    ```bash
    npm run lint
    npm run typecheck
    npm test
    ```
- **Transparência de Métricas (Portfólio Confiável):**
  - Todo número de benchmark, tempo ou taxa deve conter sua respectiva etiqueta de origem:
    - `[medido]`: obtido através de benchmarks reais ou testes automatizados.
    - `[simulado]`: obtido a partir do gerador sintético/simulação.
    - `[estimativa]`: cálculo analítico baseado em premissas explícitas.
- **Decisões de Design:**
  - Se houver ambiguidade técnica, opte pela solução mais simples e robusta, documentando a decisão em `docs/DECISIONS.md`.
