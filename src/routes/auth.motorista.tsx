import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Mail, Lock, LogIn, ChevronLeft } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import wordmarkAsset from "@/assets/intergo-wordmark.png.asset.json";

export const Route = createFileRoute('/auth/motorista')({
  component: MotoristaAuth
})

function MotoristaAuth() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      // We assume roles are handled via profiles or user_roles as per instruction
      // For now, simple redirect
      navigate({ to: '/motorista/home' })
      toast.success("Bem-vindo de volta, motorista!")
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans text-[#111111]">
      <header className="p-6">
        <button 
          onClick={() => navigate({ to: '/splash' as any })}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F7] text-[#6B6B6B]"
        >
          <ChevronLeft size={20} />
        </button>
      </header>

      <main className="mx-auto max-w-lg px-6 pt-8">
        <div className="mb-10 text-center">
          <img src={wordmarkAsset.url} alt="Intergo" className="mx-auto mb-6 h-8 w-auto" />
          <h1 className="text-2xl font-bold tracking-tight">Área do Motorista</h1>
          <p className="text-[#6B6B6B]">Entre com suas credenciais para trabalhar.</p>
        </div>

        <form onSubmit={handleLogin} className="grid gap-4 animate-apple-rise">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D9D9D9]" size={20} />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[20px] bg-[#F5F5F7] py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#3DB54A]/20"
              required
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D9D9D9]" size={20} />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[20px] bg-[#F5F5F7] py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#3DB54A]/20"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[20px] bg-[#3DB54A] py-4 font-bold text-white shadow-lg shadow-[#3DB54A]/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : (
              <>
                <LogIn size={20} />
                Acessar Painel
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  )
}