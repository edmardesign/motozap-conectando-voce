import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/passageiro/solicitar-moto-taxi')({
  component: SolicitarMotoTaxi
})

function SolicitarMotoTaxi() {
  return <div>Fluxo de Moto Táxi</div>
}
