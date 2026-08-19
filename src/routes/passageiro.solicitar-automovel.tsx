import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/passageiro/solicitar-automovel')({
  component: SolicitarAutomovel
})

function SolicitarAutomovel() {
  return <div>Fluxo de Automóvel</div>
}
