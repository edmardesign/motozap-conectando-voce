import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — InterGO" },
      { name: "description", content: "Termos de Uso do aplicativo InterGO." },
    ],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-4 leading-relaxed">
        <Link to="/" className="text-sm text-white/60 hover:text-white">← Voltar</Link>
        <h1 className="text-3xl">Termos de Uso</h1>
        <p className="text-white/60 text-sm">Versão 1.0 — Última atualização: 19/07/2026</p>

        <section className="flex flex-col gap-3 text-white/85 text-[15px]">
          <h2 className="text-xl mt-4">1. Sobre o InterGO</h2>
          <p>
            O <strong>InterGO</strong> é uma plataforma tecnológica que conecta passageiros, mototaxistas
            autônomos e estabelecimentos de delivery em cidades do interior. O InterGO não é uma empresa de
            transporte: atuamos exclusivamente como intermediário digital.
          </p>

          <h2 className="text-xl mt-4">2. Cadastro</h2>
          <p>
            Para usar o aplicativo, você deve ter no mínimo 16 anos (passageiros) ou 18 anos e CNH categoria A
            ativa (mototaxistas). As informações fornecidas devem ser verdadeiras. O uso de dados falsos pode
            resultar no bloqueio da conta.
          </p>

          <h2 className="text-xl mt-4">3. Responsabilidades do Passageiro</h2>
          <ul className="list-disc pl-6 flex flex-col gap-1">
            <li>Fornecer endereço de origem e destino corretos.</li>
            <li>Efetuar o pagamento acordado diretamente ao mototaxista (dinheiro ou Pix).</li>
            <li>Respeitar o mototaxista, o veículo e as leis de trânsito.</li>
            <li>Utilizar capacete durante toda a corrida.</li>
          </ul>

          <h2 className="text-xl mt-4">4. Responsabilidades do Mototaxista</h2>
          <ul className="list-disc pl-6 flex flex-col gap-1">
            <li>Possuir CNH categoria A válida e documentos da moto em dia.</li>
            <li>Manter capacete disponível para o passageiro.</li>
            <li>Cumprir as leis de trânsito e conduzir com segurança.</li>
            <li>Manter a mensalidade do plano em dia para ter acesso à fila de corridas.</li>
          </ul>

          <h2 className="text-xl mt-4">5. Pagamentos e Mensalidades</h2>
          <p>
            Mototaxistas pagam mensalidade conforme o plano contratado (Mensal, Semestral ou Anual). Empresas de
            delivery pagam mensalidade fixa. As corridas em si são pagas diretamente pelo passageiro ao
            mototaxista, fora do aplicativo. O InterGO não retém valores de corrida.
          </p>

          <h2 className="text-xl mt-4">6. Cancelamento e Suspensão</h2>
          <p>
            O InterGO pode suspender ou encerrar contas que violem estes Termos, incluindo mas não se limitando
            a: fraudes, uso de dados falsos, comportamento abusivo, descumprimento de leis de trânsito, ou
            avaliações persistentemente negativas.
          </p>

          <h2 className="text-xl mt-4">7. Limitação de Responsabilidade</h2>
          <p>
            O InterGO não se responsabiliza por danos, acidentes, furtos, atrasos ou qualquer prejuízo ocorrido
            durante a corrida ou entrega. A responsabilidade civil recai sobre o mototaxista e as partes
            envolvidas, conforme legislação vigente.
          </p>

          <h2 className="text-xl mt-4">8. Alterações destes Termos</h2>
          <p>
            Podemos atualizar estes Termos a qualquer momento. Alterações relevantes serão comunicadas no
            aplicativo. O uso contínuo após a comunicação implica aceite da nova versão.
          </p>

          <h2 className="text-xl mt-4">9. Contato</h2>
          <p>
            Dúvidas ou solicitações:{" "}
            <a href="mailto:suporte@borazeapp.com.br" className="underline" style={{ color: "#00FF1A" }}>
              suporte@borazeapp.com.br
            </a>
          </p>
        </section>

        <p className="text-white/50 text-xs mt-6">
          Ao usar o InterGO, você declara ter lido e concordado com estes Termos de Uso.
        </p>
      </div>
    </main>
  );
}
