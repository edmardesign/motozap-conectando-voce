import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PassageiroTabBar } from "@/components/passageiro-tab-bar";
import { LogOut, User as UserIcon, Phone, MapPin, Cake } from "lucide-react";
import { maskPhone } from "@/lib/phone";

export const Route = createFileRoute("/passageiro/perfil")({
  component: PassageiroPerfil,
  head: () => ({
    meta: [{ title: "Meu perfil — InterGO" }],
  }),
});

type Profile = {
  id: string;
  nome: string;
  telefone: string;
  cidade: string | null;
  estado: string | null;
};

function PassageiroPerfil() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [aniversario, setAniversario] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth/passageiro" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,nome,telefone,cidade,estado")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setProfile(data as Profile);
        setNome(data.nome ?? "");
        setTelefone(maskPhone(data.telefone ?? ""));
        setCidade(data.cidade ?? "");
      }
      // aniversário fica em user metadata (chaves usadas historicamente: aniversario / data_nascimento)
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const raw =
        (typeof meta.aniversario === "string" && meta.aniversario) ||
        (typeof meta.data_nascimento === "string" && meta.data_nascimento) ||
        "";
      // Normaliza para YYYY-MM-DD exigido pelo input type="date"
      const dn = /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : "";
      setAniversario(dn);
      setLoading(false);
    })();
  }, [user]);

  async function handleSalvar() {
    if (!user) return;
    if (!nome.trim()) {
      toast.error("Informe seu nome");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome: nome.trim(), telefone: telefone.replace(/\D/g, ""), cidade: cidade.trim() || null })
      .eq("id", user.id);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      setSaving(false);
      return;
    }
    if (aniversario) {
      await supabase.auth.updateUser({
        data: { data_nascimento: aniversario, aniversario },
      });
    }
    toast.success("Perfil atualizado!");
    setSaving(false);
  }

  async function handleSair() {
    await supabase.auth.signOut();
    navigate({ to: "/splash" });
  }

  if (authLoading || loading || !profile) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="spinner-mz" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F5F7] text-[#111111]" style={{ paddingBottom: 80 }}>
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold">Meu perfil</h1>
      </header>

      <section className="px-5 space-y-3">
        <Field icon={<UserIcon size={16} />} label="Nome">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="input-mz"
            placeholder="Seu nome"
          />
        </Field>

        <Field icon={<Phone size={16} />} label="Telefone">
          <input
            value={telefone}
            onChange={(e) => setTelefone(maskPhone(e.target.value))}
            className="input-mz"
            inputMode="tel"
            placeholder="(XX) XXXXX-XXXX"
          />
        </Field>

        <Field icon={<MapPin size={16} />} label="Cidade">
          <input
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className="input-mz"
            placeholder="Sua cidade"
          />
        </Field>

        <Field icon={<Cake size={16} />} label="Aniversário">
          <input
            type="date"
            value={aniversario}
            onChange={(e) => setAniversario(e.target.value)}
            className="input-mz"
          />
        </Field>

        <button
          onClick={handleSalvar}
          disabled={saving}
          className="btn-cta w-full mt-2"
        >
          {saving ? "Salvando..." : "SALVAR ALTERAÇÕES"}
        </button>

        <button
          onClick={handleSair}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold border border-red-500/40 text-red-400 hover:bg-red-500/10 transition"
        >
          <LogOut size={16} />
          Sair da conta
        </button>
      </section>

      <PassageiroTabBar />
    </main>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
