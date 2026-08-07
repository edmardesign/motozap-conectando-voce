import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, CreditCard, HelpCircle, LogOut, ChevronRight, User, Bike } from "lucide-react";

export const Route = createFileRoute("/mercado/perfil")({ component: Perfil });

const BRAND = "var(--dz-brand)";
const BRAND_STRONG = "var(--dz-brand-strong)";
const BRAND_INK = "var(--dz-brand-ink)";
const BG = "var(--dz-bg)";
const CARD = "var(--dz-surface)";
const BORDER = "var(--dz-line)";
const TEXT = "var(--dz-ink)";
const MUTED = "var(--dz-muted)";

function Perfil() {
  return (
    <div style={{ background: BG, color: TEXT, fontFamily: "var(--dz-font)", minHeight: "100dvh" }}>
      <header style={{ background: BG, padding: "20px 16px", borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: BRAND }}>
            <User size={26} color={BRAND_INK} />
          </div>
          <div>
            <p className="text-base font-bold" style={{ color: TEXT }}>Olá, cliente Bora Zé!</p>
            <p className="text-[11px]" style={{ color: MUTED }}>Perfil demonstrativo</p>
          </div>
        </div>
      </header>

      <main className="p-4 flex flex-col gap-3">
        <Item icon={<MapPin size={18} color={BRAND_STRONG} />} label="Endereços" />
        <Item icon={<CreditCard size={18} color={BRAND_STRONG} />} label="Formas de pagamento" />
        <Item icon={<HelpCircle size={18} color={BRAND_STRONG} />} label="Ajuda e suporte" />
        <Link to="/passageiro/home" className="flex items-center gap-3 rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BRAND}`, boxShadow: "var(--dz-shadow-1)" }}>
          <Bike size={18} color={BRAND_STRONG} />
          <span className="flex-1 text-sm font-semibold" style={{ color: TEXT }}>Ir para Mototáxi</span>
          <ChevronRight size={18} style={{ color: MUTED }} />
        </Link>
        <Item icon={<LogOut size={18} color={BRAND_STRONG} />} label="Sair" />
      </main>
    </div>
  );
}

function Item({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-3 rounded-xl p-4 w-full text-left" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "var(--dz-shadow-1)" }}>
      {icon}
      <span className="flex-1 text-sm font-semibold" style={{ color: TEXT }}>{label}</span>
      <ChevronRight size={18} style={{ color: MUTED }} />
    </button>
  );
}
