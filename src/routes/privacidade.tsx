import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — InterGO" },
      { name: "description", content: "Política de Privacidade do aplicativo InterGO em conformidade com a LGPD." },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-4 leading-relaxed">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
        <h1 className="text-3xl">Política de Privacidade</h1>
        <p className="text-muted-foreground text-sm">Versão 1.0 — Última atualização: 19/07/2026</p>

        <section className="flex flex-col gap-3 text-foreground/85 text-[15px]">
          <p className="mt-2">
            Esta Política descreve como o <strong>InterGO</strong> coleta, usa, armazena e compartilha dados
            pessoais de seus usuários, em conformidade com a{" "}
            <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)</strong>.
          </p>

          <h2 className="text-xl mt-4">1. Dados que coletamos</h2>
          <ul className="list-disc pl-6 flex flex-col gap-1">
            <li><strong>Cadastrais:</strong> nome, telefone, cidade e estado, data de aniversário.</li>
            <li><strong>Mototaxistas:</strong> adicionalmente CPF, endereço, CNH, dados da moto (modelo, placa, CRLV) e foto.</li>
            <li><strong>Localização:</strong> latitude e longitude coletadas apenas durante uma corrida ativa, para conectar passageiro e mototaxista.</li>
            <li><strong>Uso do app:</strong> histórico de corridas, avaliações, mensagens do chat (armazenadas por até 12 horas após o fim da corrida).</li>
          </ul>

          <h2 className="text-xl mt-4">2. Finalidade do tratamento</h2>
          <ul className="list-disc pl-6 flex flex-col gap-1">
            <li>Conectar passageiros a mototaxistas próximos.</li>
            <li>Calcular tarifas, distâncias e rotas.</li>
            <li>Prevenir fraudes e garantir a segurança da comunidade.</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
          </ul>

          <h2 className="text-xl mt-4">3. Compartilhamento de dados</h2>
          <p>
            Seus dados são compartilhados <strong>exclusivamente com o mototaxista da corrida solicitada</strong>{" "}
            (nome e telefone do passageiro; nome, foto, telefone e dados da moto do mototaxista), na medida
            necessária à realização do serviço. Não vendemos nem cedemos dados a terceiros para fins de marketing.
          </p>
          <p>
            Podemos compartilhar dados com autoridades públicas quando exigido por lei, ordem judicial ou para
            proteger direitos, propriedade ou segurança dos usuários.
          </p>

          <h2 className="text-xl mt-4">4. Armazenamento e segurança</h2>
          <p>
            Os dados são armazenados em servidores com criptografia em trânsito e em repouso. Aplicamos controles
            de acesso, autenticação e políticas de segurança para proteger informações contra acesso não
            autorizado, perda ou vazamento.
          </p>

          <h2 className="text-xl mt-4">5. Retenção</h2>
          <p>
            Mantemos seus dados cadastrais enquanto sua conta estiver ativa. Mensagens de chat expiram
            automaticamente em até 12 horas após o fim da corrida. Histórico de corridas é mantido por até 5 anos
            para fins fiscais e de segurança.
          </p>

          <h2 className="text-xl mt-4">6. Seus direitos como titular (LGPD)</h2>
          <p>Você pode, a qualquer momento, solicitar:</p>
          <ul className="list-disc pl-6 flex flex-col gap-1">
            <li><strong>Confirmação e acesso</strong> aos dados que temos sobre você.</li>
            <li><strong>Correção</strong> de dados incompletos, inexatos ou desatualizados.</li>
            <li><strong>Exclusão</strong> dos dados pessoais tratados com base no seu consentimento.</li>
            <li><strong>Portabilidade</strong> dos dados a outro fornecedor de serviço.</li>
            <li><strong>Anonimização, bloqueio ou eliminação</strong> de dados desnecessários ou tratados em desconformidade com a LGPD.</li>
            <li><strong>Revogação do consentimento</strong> a qualquer momento.</li>
          </ul>
          <p>
            Para exercer esses direitos, entre em contato pelo e-mail abaixo. Responderemos em até 15 dias úteis.
          </p>

          <h2 className="text-xl mt-4">7. Cookies e tecnologias similares</h2>
          <p>
            Utilizamos armazenamento local (localStorage) apenas para manter sua sessão autenticada e preferências
            do app. Não usamos cookies de rastreamento publicitário.
          </p>

          <h2 className="text-xl mt-4">8. Alterações desta Política</h2>
          <p>
            Podemos atualizar esta Política periodicamente. A data da última atualização estará sempre visível no
            topo desta página. Alterações relevantes serão comunicadas no aplicativo.
          </p>

          <h2 className="text-xl mt-4">9. Encarregado (DPO) e contato</h2>
          <p>
            Para dúvidas, solicitações ou exercício de direitos previstos na LGPD:
          </p>
          <p>
            <a href="mailto:privacidade@borazeapp.com.br" className="underline" style={{ color: "#3DB54A" }}>
              privacidade@borazeapp.com.br
            </a>
          </p>
        </section>

        <p className="text-muted-foreground text-xs mt-6">
          Ao usar o InterGO, você declara ter lido e concordado com esta Política de Privacidade.
        </p>
      </div>
    </main>
  );
}
