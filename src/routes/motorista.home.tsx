import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/motorista/home')({
  component: MotoristaHome
})

function MotoristaHome() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Painel do Motorista</h1>
      <p>Área em construção...</p>
    </div>
  )
}
