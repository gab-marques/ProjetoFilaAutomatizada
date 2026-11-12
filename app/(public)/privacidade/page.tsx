import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="mb-6">
          <Link href="/" className="text-xs text-red-600 hover:underline">
            ← Voltar para a página inicial
          </Link>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Política de Privacidade e LGPD
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Última atualização: Novembro de 2026 • Em conformidade com a Lei Federal nº 13.709/2018 (LGPD).
        </p>

        <div className="mt-8 space-y-6 text-sm text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              1. Finalidade do Tratamento
            </h2>
            <p>
              A <strong>Fila Inteligente com Rota</strong> coleta dados exclusivamente para gerenciar
              a fila de espera do restaurante e avisar o cliente no momento ideal de deslocamento,
              reduzindo o tempo de permanência de pé na porta do estabelecimento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              2. Minimização Rigorosa de Localização
            </h2>
            <p className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900">
              <strong>Garantia de Não-Armazenamento:</strong> Seu endereço residencial e suas
              coordenadas exatas de GPS (latitude e longitude) <strong>nunca</strong> são armazenados
              em nossos servidores nem gravados em logs. Eles são processados temporariamente em memória
              apenas para calcular os minutos de trajeto até o restaurante e descartados imediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              3. Retenção e Expurgo Automático
            </h2>
            <p>
              Identificadores de contato (como o chat ID do Telegram) são excluídos automaticamente de
              forma definitiva em até <strong>24 horas</strong> após a conclusão do seu atendimento
              ou cancelamento da entrada.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              4. Seus Direitos (Como Excluir Seus Dados)
            </h2>
            <p>
              Você pode a qualquer momento cancelar sua entrada na fila pelo link recebido ou digitando
              o comando <code>/apagar</code> ou <code>desistir</code> diretamente na nossa conversa no Telegram.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
