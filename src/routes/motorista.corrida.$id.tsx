import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/motorista/corrida/$id')({
  component: MotoristaCorrida
})

function MotoristaCorrida() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Corrida em Andamento</h1>
    </div>
  )
}
