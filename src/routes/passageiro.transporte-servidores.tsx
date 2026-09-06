import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/passageiro/transporte-servidores')({
  // Rota renomeada para "Mobilidade Urbana" — mantida apenas como redirecionamento
  beforeLoad: () => {
    throw redirect({ to: '/passageiro/mobilidade' })
  },
})
