import { Info } from "lucide-react";

/** Texto oficial do aviso de uso da Mobilidade Urbana (não se aplica à Logística de Envios). */
export const AVISO_MOBILIDADE =
  "Uso exclusivo de servidores em exercício, restrito ao horário de expediente e com finalidade estritamente profissional. Todas as chamadas, rotas, horários, origem e destino são registrados e ficam disponíveis para auditoria e análise da administração pública.";

/** Versão discreta, usada logo abaixo do card de Mobilidade Urbana na home. */
export function AvisoMobilidadeTexto({ className = "" }: { className?: string }) {
  return (
    <p className={`px-1 text-left text-xs leading-relaxed text-[#6B6B6B] ${className}`}>
      {AVISO_MOBILIDADE}
    </p>
  );
}

/** Banner sutil com ícone, usado na tela de escolha da modalidade. */
export function AvisoMobilidadeBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#DDE7F0] bg-[#F2F7FC] p-4 text-[#2C4A63]">
      <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p className="text-xs leading-relaxed">{AVISO_MOBILIDADE}</p>
    </div>
  );
}
