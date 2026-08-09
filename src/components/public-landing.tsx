import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X, MoreHorizontal, Share, Plus, CheckCircle2, Smartphone, ExternalLink } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { BoraZeIntroAnimation } from "@/components/boraze-intro-animation";

interface Config {
  persona: string;
  title: string;
  subtitle: string;
  iconUrl: string;
  accent: string;
  manifestHref: string;
  themeColor: string;
  /** Se definido, exibe uma opção discreta "Já tenho conta" que navega para esta rota. */
  loginHref?: string;
}

type SafariMode = "safari-share-visible" | "safari-three-dots" | "in-app-browser" | "other";

function detectEnvironment(): { isIOS: boolean; mode: SafariMode; inAppName?: string } {
  if (typeof navigator === "undefined") return { isIOS: false, mode: "other" };
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  if (!isIOS) return { isIOS: false, mode: "other" };

  // In-app browsers on iOS
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return { isIOS, mode: "in-app-browser", inAppName: "Facebook" };
  if (/Instagram/i.test(ua)) return { isIOS, mode: "in-app-browser", inAppName: "Instagram" };
  if (/WhatsApp/i.test(ua)) return { isIOS, mode: "in-app-browser", inAppName: "WhatsApp" };
  if (/Line\//i.test(ua)) return { isIOS, mode: "in-app-browser", inAppName: "Line" };
  if (/GSA\//i.test(ua)) return { isIOS, mode: "in-app-browser", inAppName: "Google" };

  // Detect Safari layout: iOS 15+ moved the address bar to the bottom with a "•••" menu.
  // Heuristic: modern iOS (>=15) Safari uses the three-dots menu when address bar is at bottom.
  // We can't reliably detect bar position, so we assume three-dots for iOS >= 15 (dominant flow),
  // and share-visible for older iOS.
  const iosVersionMatch = ua.match(/OS (\d+)_/);
  const iosMajor = iosVersionMatch ? parseInt(iosVersionMatch[1], 10) : 0;
  if (iosMajor >= 15) return { isIOS, mode: "safari-three-dots" };
  return { isIOS, mode: "safari-share-visible" };
}

export function PublicLanding({ persona, title, subtitle, iconUrl, accent, manifestHref, themeColor, loginHref }: Config) {
  const { canInstall, installed, install } = usePwaInstall();
  const [showIos, setShowIos] = useState(false);

  const env = useMemo(() => detectEnvironment(), []);

  // Dynamic head config per persona: manifest, theme-color, apple-mobile-web-app-title, apple-touch-icon.
  useEffect(() => {
    if (typeof document === "undefined") return;

    const setLink = (rel: string, href: string, extra?: Record<string, string>) => {
      let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement("link");
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.href = href;
      if (extra) for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v);
    };
    const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setLink("manifest", manifestHref);
    setLink("apple-touch-icon", iconUrl);
    setMeta("theme-color", themeColor);
    setMeta("apple-mobile-web-app-title", title);
    setMeta("apple-mobile-web-app-capable", "yes");
    setMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    setMeta("mobile-web-app-capable", "yes");
  }, [manifestHref, iconUrl, themeColor, title]);

  async function onClick() {
    if (installed) {
      toast.info("Este app já está instalado — abra pelo ícone na tela do celular.");
      return;
    }
    if (canInstall) {
      const ok = await install();
      if (ok) toast.success("App instalado! Abra pelo ícone no celular.");
      return;
    }
    if (env.isIOS) {
      setShowIos(true);
      return;
    }
    toast.info("Seu navegador ainda não ofereceu a instalação. Toque no menu do navegador e escolha 'Instalar app' ou 'Adicionar à tela inicial'.");
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "calc(env(safe-area-inset-top,0px) + 24px) 24px calc(env(safe-area-inset-bottom,0px) + 24px)",
        background: "var(--background)",
        color: "var(--foreground)",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          margin: "0 auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 32,
        }}
      >
        <header className="animate-apple-rise stagger-1" style={{ width: "100%", textAlign: "center", paddingTop: 8 }}>
          <p style={{ color: "var(--muted-foreground)", fontSize: 12, letterSpacing: "0.22em", fontWeight: 590 }}>
            INTERGO
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 8, color: accent, lineHeight: 1.1 }}>
            {title}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 16, marginTop: 8, lineHeight: 1.4 }}>{subtitle}</p>
        </header>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
          <BoraZeIntroAnimation storageKey={`boraze.intro.${persona}`} />
        </div>

        <div style={{ width: "100%", paddingBottom: 8 }}>
          <button
            onClick={onClick}
            className="animate-apple-rise stagger-2"
            style={{
              width: "100%",
              borderRadius: 18,
              padding: "18px 24px",
              fontWeight: 600,
              fontSize: 17,
              letterSpacing: "-0.01em",
              background: installed ? "var(--card)" : accent,
              color: installed ? accent : "#FFFFFF",
              border: installed ? `1px solid ${accent}55` : "none",
              boxShadow: installed ? "none" : `0 10px 28px -12px ${accent}99`,
              transition: "transform 180ms cubic-bezier(0.32,0.72,0,1), filter 180ms cubic-bezier(0.32,0.72,0,1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              minHeight: 56,
            }}
          >
            {installed && <CheckCircle2 style={{ width: 20, height: 20 }} />}
            Baixe agora
          </button>
          {loginHref && (
            <a
              href={loginHref}
              className="animate-apple-fade stagger-3"
              style={{
                display: "block",
                textAlign: "center",
                marginTop: 16,
                fontSize: 15,
                color: "var(--muted-foreground)",
                textDecoration: "none",
              }}
            >
              Já tenho conta
            </a>
          )}
        </div>
      </div>

      {showIos && (
        <IosInstallModal
          title={title}
          iconUrl={iconUrl}
          accent={accent}
          mode={env.mode}
          inAppName={env.inAppName}
          onClose={() => setShowIos(false)}
        />
      )}
    </main>
  );
}

interface ModalProps {
  title: string;
  iconUrl: string;
  accent: string;
  mode: SafariMode;
  inAppName?: string;
  onClose: () => void;
}

function IosInstallModal({ title, iconUrl, accent, mode, inAppName, onClose }: ModalProps) {
  const steps = getSteps(mode, title, accent);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Instalar ${title} no iPhone`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 0,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          maxHeight: "92dvh",
          overflowY: "auto",
          background: "#FFFFFF",
          border: `1px solid ${accent}44`,
          borderRadius: "24px 24px 0 0",
          padding: "20px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)",
          color: "#111111",
          boxShadow: `0 -20px 60px ${accent}22`,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <img
            src={iconUrl}
            alt={title}
            style={{ width: 48, height: 48, borderRadius: 12, background: "#FFFFFF", flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, letterSpacing: "0.24em", color: "var(--muted-foreground)" }}>INSTALAR</p>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: accent, lineHeight: 1.1 }}>{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              padding: 8,
              cursor: "pointer",
              display: "flex",
            }}
          >
            <X style={{ width: 22, height: 22 }} />
          </button>
        </div>

        {/* In-app browser notice */}
        {mode === "in-app-browser" && (
          <div
            style={{
              background: "#F7F7F7",
              border: `1px solid ${accent}55`,
              borderRadius: 14,
              padding: 14,
              marginBottom: 16,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <ExternalLink style={{ width: 20, height: 20, color: accent, flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 14, lineHeight: 1.4 }}>
              Você está no navegador interno do <b>{inAppName ?? "app"}</b>. Para instalar,
              abra esta página no <b>Safari</b>: toque nos três pontos <b>•••</b> e escolha
              <b> “Abrir no Safari”</b>.
            </div>
          </div>
        )}

        {/* Steps */}
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {steps.map((step, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                background: "#111",
                padding: 14,
                borderRadius: 14,
                border: "1px solid var(--card)",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: accent,
                  color: "#FFFFFF",
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 14,
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1, fontSize: 14, lineHeight: 1.45, paddingTop: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {step.icon}
                  <span>{step.text}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Final message */}
        <p style={{ marginTop: 16, fontSize: 14, color: "var(--foreground)", textAlign: "center" }}>
          O ícone <b style={{ color: accent }}>{title}</b> aparecerá na sua tela inicial.
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
          <button
            onClick={onClose}
            style={{
              width: "100%",
              borderRadius: 14,
              padding: "14px 20px",
              fontWeight: 900,
              fontSize: 15,
              letterSpacing: "0.06em",
              background: accent,
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
            }}
          >
            ENTENDI
          </button>
          <button
            onClick={onClose}
            style={{
              width: "100%",
              borderRadius: 14,
              padding: "12px 20px",
              fontWeight: 700,
              fontSize: 14,
              background: "transparent",
              color: "var(--muted-foreground)",
              border: "1px solid var(--border)",
              cursor: "pointer",
            }}
          >
            CONTINUAR PELA WEB
          </button>
        </div>
      </div>
    </div>
  );
}

function getSteps(mode: SafariMode, title: string, accent: string): { icon: React.ReactNode; text: React.ReactNode }[] {
  const iconStyle = { width: 20, height: 20, color: accent, flexShrink: 0 } as const;

  if (mode === "in-app-browser") {
    return [
      { icon: <MoreHorizontal style={iconStyle} />, text: <>Toque nos três pontos <b>•••</b> do navegador.</> },
      { icon: <ExternalLink style={iconStyle} />, text: <>Escolha <b>“Abrir no Safari”</b>.</> },
      { icon: <MoreHorizontal style={iconStyle} />, text: <>Já no Safari, toque nos três pontos <b>•••</b> no canto inferior direito.</> },
      { icon: <Share style={iconStyle} />, text: <>Toque em <b>“Compartilhar”</b>.</> },
      { icon: <Plus style={iconStyle} />, text: <>Role as opções e escolha <b>“Adicionar à Tela de Início”</b>.</> },
      { icon: <Smartphone style={iconStyle} />, text: <>Ative <b>“Abrir como App da Web”</b>.</> },
      { icon: <CheckCircle2 style={iconStyle} />, text: <>Toque em <b>“Adicionar”</b>.</> },
    ];
  }

  if (mode === "safari-share-visible") {
    return [
      { icon: <Share style={iconStyle} />, text: <>Toque no ícone <b>Compartilhar</b> na barra do Safari.</> },
      { icon: <Plus style={iconStyle} />, text: <>Role as opções e escolha <b>“Adicionar à Tela de Início”</b>.</> },
      { icon: <Smartphone style={iconStyle} />, text: <>Ative <b>“Abrir como App da Web”</b>.</> },
      { icon: <CheckCircle2 style={iconStyle} />, text: <>Toque em <b>“Adicionar”</b>.</> },
    ];
  }

  // Default modern Safari (iOS 15+): three-dots menu.
  return [
    { icon: <MoreHorizontal style={iconStyle} />, text: <>Toque nos três pontos <b>•••</b> no canto inferior direito do Safari.</> },
    { icon: <Share style={iconStyle} />, text: <>Toque em <b>“Compartilhar”</b>.</> },
    { icon: <Plus style={iconStyle} />, text: <>Role as opções e escolha <b>“Adicionar à Tela de Início”</b>.</> },
    { icon: <Smartphone style={iconStyle} />, text: <>Ative <b>“Abrir como App da Web”</b>.</> },
    { icon: <CheckCircle2 style={iconStyle} />, text: <>Toque em <b>“Adicionar”</b>.</> },
  ];
}
