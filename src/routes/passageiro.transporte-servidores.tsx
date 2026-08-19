import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Car, Bike, ChevronLeft } from 'lucide-react'

export const Route = createFileRoute('/passageiro/transporte-servidores')({
  component: TransporteServidoresPage
})

function TransporteServidoresPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans text-[#111111]">
      <header className="sticky top-0 z-50 w-full border-b border-[#E8E8E8] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-lg items-center px-6">
          <button 
            onClick={() => navigate({ to: "/passageiro/home" })}
            className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F7] text-[#6B6B6B]"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg font-bold">Transporte de Servidores</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-6 pt-8">
        <p className="mb-6 text-[#6B6B6B] animate-apple-rise">Escolha o tipo de transporte institucional desejado para o seu deslocamento.</p>
        
        <div className="grid gap-4">
          <button 
            onClick={() => navigate({ to: "/hub", search: { tipo: "automovel" } as any })}
            className="group flex w-full items-center gap-4 rounded-[24px] bg-white p-6 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] animate-apple-rise stagger-1"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#3DB54A] text-white">
              <Car size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#111111]">Solicitar Automóvel</h3>
              <p className="text-sm text-[#6B6B6B]">Carro oficial sob demanda para missões institucionais.</p>
            </div>
          </button>

          <button 
            onClick={() => navigate({ to: "/hub", search: { tipo: "moto_taxi" } as any })}
            className="group flex w-full items-center gap-4 rounded-[24px] bg-white p-6 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] animate-apple-rise stagger-2"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#3DB54A] text-white">
              <Bike size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#111111]">Solicitar Moto Táxi</h3>
              <p className="text-sm text-[#6B6B6B]">Deslocamento rápido para pequenos percursos urbanos.</p>
            </div>
          </button>
        </div>
      </main>
    </div>
  )
}
