import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Power, MapPin, History, User, Bell, LogOut } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

export const Route = createFileRoute('/motorista/home')({
  component: MotoristaHome
})

function MotoristaHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [online, setOnline] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    
    // Check current status
    const checkStatus = async () => {
      const { data } = await supabase
        .from('drivers' as any)
        .select('is_online')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (data) setOnline((data as any).is_online)
    }
    
    checkStatus()
  }, [user])

  const toggleOnline = async () => {
    if (!user) return
    setLoading(true)
    
    try {
      const newStatus = !online
      const { error } = await supabase
        .from('drivers' as any)
        .upsert({ 
          user_id: user.id, 
          is_online: newStatus,
          updated_at: new Date().toISOString() 
        })
      
      if (error) throw error
      
      setOnline(newStatus)
      toast.success(newStatus ? "Você está ONLINE!" : "Você está OFFLINE.")
    } catch (error) {
      toast.error("Erro ao alterar status.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate({ to: '/auth/motorista' as any })
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans text-[#111111]">
      <header className="sticky top-0 z-50 w-full border-b border-[#E8E8E8] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-6">
          <h1 className="text-lg font-bold">Painel do Motorista</h1>
          <button 
            onClick={handleLogout}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F7] text-[#6B6B6B]"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-6 pt-8">
        <div className="mb-8 rounded-[32px] bg-white p-8 text-center shadow-sm animate-apple-rise">
          <div className="mb-4 flex justify-center">
            <button
              onClick={toggleOnline}
              disabled={loading}
              className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-all active:scale-95 ${
                online 
                  ? 'bg-[#3DB54A] text-white shadow-[0_0_30px_rgba(61,181,74,0.4)]' 
                  : 'bg-[#F5F5F7] text-[#6B6B6B]'
              }`}
            >
              <Power size={40} className={loading ? 'animate-pulse' : ''} />
            </button>
          </div>
          <h2 className={`text-xl font-bold ${online ? 'text-[#3DB54A]' : 'text-[#111111]'}`}>
            {online ? 'Você está Online' : 'Você está Offline'}
          </h2>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            {online 
              ? 'Aguardando novas solicitações de transporte...' 
              : 'Fique online para começar a receber pedidos.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 animate-apple-rise stagger-1">
          <DashboardButton icon={History} label="Histórico" onClick={() => {}} />
          <DashboardButton icon={User} label="Meu Perfil" onClick={() => {}} />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E8E8E8] bg-white px-6 pb-safe-area pt-2 flex items-center justify-around shadow-[0_-1px_12px_rgba(0,0,0,0.05)]">
        <NavButton icon={Power} label="Status" active onClick={() => {}} />
        <NavButton icon={Bell} label="Alertas" onClick={() => {}} />
        <NavButton icon={User} label="Conta" onClick={() => {}} />
      </nav>
    </div>
  )
}

function DashboardButton({ icon: Icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 rounded-[24px] bg-white p-6 shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F5F7] text-[#111111]">
        <Icon size={24} />
      </div>
      <span className="font-bold text-[#111111]">{label}</span>
    </button>
  )
}

function NavButton({ icon: Icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2 ${active ? 'text-[#3DB54A]' : 'text-[#6B6B6B]'}`}
    >
      <Icon size={22} />
      <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
    </button>
  )
}
