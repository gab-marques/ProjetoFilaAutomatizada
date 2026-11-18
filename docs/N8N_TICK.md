# Agendador Periódico com n8n (docs/N8N_TICK.md)

Este documento orienta a configuração do agendador automático (Cron) de **1 minuto** e do **retreino diário**, contornando a restrição de frequência da camada gratuita da Vercel (Hobby).

---

## 1. Visão Geral

- **Endpoint de Tick (`/api/tick`):** Executado a cada 1 minuto. Avalia se o tempo restante de espera atingiu o tempo de deslocamento do cliente, disparando a notificação *"🚗 Saia agora!"* e expurgando contatos LGPD com mais de 24 horas.
- **Endpoint de Retreino (`/api/retrain`):** Executado diariamente às 04:00 da manhã. Retreina o modelo de regressão linear regularizada com os atendimentos reais e atualiza o MAE em `model_versions`.

---

## 2. Como Importar o Workflow no n8n

1. Acesse seu painel do n8n.
2. Clique em **Workflows** $\to$ **Add Workflow** $\to$ menu de 3 pontinhos $\to$ **Import from File**.
3. Selecione o arquivo [`n8n/tick-workflow.json`](../n8n/tick-workflow.json).
4. Configure as variáveis de ambiente ou parâmetros nos nós HTTP Request:
   - `APP_BASE_URL`: URL pública da sua aplicação (ex: `https://fila-inteligente.vercel.app`).
   - `TICK_SECRET`: O mesmo segredo configurado no `.env` da aplicação.
5. Ative o workflow no botão **Active** (canto superior direito).
