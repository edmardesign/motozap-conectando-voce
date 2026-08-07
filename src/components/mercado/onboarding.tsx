import { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import onb1 from "@/assets/onboarding/onb-1.png.asset.json";
import onb2 from "@/assets/onboarding/onb-2.png.asset.json";
import onb3 from "@/assets/onboarding/onb-3.png.asset.json";

const STORAGE_KEY = "boraze.mercado.onboardingSeen.v1";

const SLIDES = [
  { src: onb1.url, alt: "Prazer, somos o Bora Zé!" },
  { src: onb2.url, alt: "Os melhores da cidade" },
  { src: onb3.url, alt: "Acompanhe cada passo" },
];

export function MercadoOnboarding() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [askingLocation, setAskingLocation] = useState(false);

  /**
   * Autoplay: cada flyer fica 7s em tela. Qualquer avanço manual
   * (botão "Próximo") reinicia a contagem, pois o efeito depende de `index`.
   * Para no último flyer, antes da etapa de localização.
   */
  useEffect(() => {
    if (!visible) return;
    if (index >= SLIDES.length - 1) return; // último slide / etapa de localização
    const id = window.setTimeout(() => setIndex((i) => i + 1), 7000);
    return () => window.clearTimeout(id);
  }, [visible, index]);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "1") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  }

  function requestLocationAndFinish() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      finish();
      return;
    }
    setAskingLocation(true);
    navigator.geolocation.getCurrentPosition(
      () => finish(),
      () => finish(),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  if (!visible) return null;

  const isLast = index === SLIDES.length - 1;
  const isLocationStep = index === SLIDES.length; // step extra: pedir localização

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Pular */}
      {!isLocationStep && (
        <button
          type="button"
          onClick={finish}
          style={{
            position: "absolute",
            top: "calc(env(safe-area-inset-top, 0px) + 14px)",
            right: 18,
            zIndex: 2,
            background: "transparent",
            border: "none",
            color: "#00FF1A",
            fontSize: 16,
            fontWeight: 700,
            padding: 8,
            cursor: "pointer",
          }}
        >
          Pular
        </button>
      )}

      {isLocationStep ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 28px",
            textAlign: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 108,
              height: 108,
              borderRadius: "50%",
              background: "rgba(0,255,26,0.12)",
              border: "2px solid #00FF1A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MapPin size={52} color="#00FF1A" />
          </div>
          <h2 style={{ color: "#FFFFFF", fontSize: 30, fontWeight: 900, lineHeight: 1.1, margin: 0 }}>
            Ative sua <span style={{ color: "#00FF1A" }}>localização</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, lineHeight: 1.5, margin: 0, maxWidth: 320 }}>
            Precisamos saber onde você está para mostrar mercados próximos e entregar rápido no seu endereço.
          </p>
        </div>
      ) : (
        <img
          src={SLIDES[index].src}
          alt={SLIDES[index].alt}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      )}

      {/* footer com dots + botão */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "16px 24px calc(env(safe-area-inset-bottom, 0px) + 28px)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          background: isLocationStep
            ? "transparent"
            : "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.0) 100%)",
        }}
      >
        {!isLocationStep && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {SLIDES.map((_, i) => (
              <span
                key={i}
                style={{
                  height: 6,
                  width: i === index ? 26 : 8,
                  borderRadius: 999,
                  background: i === index ? "#00FF1A" : "rgba(255,255,255,0.35)",
                  transition: "all 200ms ease",
                }}
              />
            ))}
          </div>
        )}
        <button
          type="button"
          disabled={askingLocation}
          onClick={() => {
            if (isLocationStep) {
              requestLocationAndFinish();
            } else if (isLast) {
              setIndex(index + 1); // vai para tela de localização
            } else {
              setIndex(index + 1);
            }
          }}
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 999,
            border: "none",
            background: "#00FF1A",
            color: "#000000",
            fontWeight: 900,
            fontSize: 16,
            letterSpacing: "0.02em",
            boxShadow: "0 0 24px rgba(0,255,26,0.35)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: askingLocation ? 0.7 : 1,
          }}
        >
          {askingLocation ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Ativando…
            </>
          ) : isLocationStep ? (
            "Ativar localização"
          ) : (
            "Próximo"
          )}
        </button>
      </div>
    </div>
  );
}
