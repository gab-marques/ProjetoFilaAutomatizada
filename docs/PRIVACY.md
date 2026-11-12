# Política de Privacidade e Conformidade LGPD (docs/PRIVACY.md)

Este documento descreve as práticas de tratamento de dados pessoais da **Fila Inteligente com Rota**, em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei Federal nº 13.709/2018).

---

## 1. Princípios de Privacidade por Padrão (Privacy by Design)

1. **Minimização de Dados (Art. 6º, III):**
   - Coletamos apenas as informações estritamente necessárias para a gestão da fila e cálculo de rota: apelido/nome e número de pessoas.
   - **O endereço completo e as coordenadas geográficas (`latitude`, `longitude`) do cliente NUNCA são salvos no banco de dados e NUNCA são registrados em arquivos de log.**
   - O endereço é processado em memória na API no momento da solicitação para calcular o tempo de deslocamento até o restaurante (`travel_minutes`) via OpenRouteService. Imediatamente após a obtenção do tempo, o endereço é descartado da memória.

2. **Base Legal (Art. 7º, I):**
   - O tratamento é fundamentado no consentimento livre, informado e inequívoco do titular, manifestado através de checkbox explícito e obrigatório antes de ingressar na fila.

3. **Ciclo de Retenção Curta e Descarte Automático:**
   - O identificador de contato (`telegram_chat_id`) é vinculado à entrada na tabela `contacts` com uma data limite (`purge_after = now() + 24 horas`).
   - O motor periódico (`/api/tick`) executa o expurgo físico definitivo desses dados após 24 horas do atendimento ou cancelamento.
   - Dados históricos mantidos para calibração estatística do modelo preditivo (`wait_history`) são estritamente anonimizados (dia da semana, faixa horária, tamanho do grupo e tempo real de espera).

---

## 2. Direitos do Titular (Art. 18)

- **Acesso e Confirmação:** O titular pode consultar a qualquer momento o status da sua entrada e tempo previsto através do link exclusivo gerado (`link_token`) ou via comando de status no bot do Telegram.
- **Eliminação dos Dados:** O titular pode solicitar a exclusão imediata e antecipada enviando o comando `/apagar` no bot do Telegram ou acionando a opção de cancelamento na interface web.
- **Canal de Contato:** Para dúvidas ou solicitações adicionais referentes ao tratamento de dados, o titular pode entrar em contato com a equipe de desenvolvimento.
