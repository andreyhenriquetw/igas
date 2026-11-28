"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type Props = {
  appName: string;
  className?: string;
};

export function PwaInstallButton({ appName, className = "" }: Props) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installError, setInstallError] = useState("");

  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const updateInstalledState = () => setIsInstalled(standaloneQuery.matches);
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    updateInstalledState();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    standaloneQuery.addEventListener("change", updateInstalledState);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      standaloneQuery.removeEventListener("change", updateInstalledState);
    };
  }, []);

  if (isInstalled) return null;

  async function handleInstallClick() {
    setInstallError("");
    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === "accepted") setIsInstalled(true);
    } catch {
      setInstallError("Não foi possível abrir a instalação agora. Siga as instruções abaixo.");
      setShowInstructions(true);
    }
  }

  return (
    <>
      <button
        className={`pwa-install-button ${className}`.trim()}
        type="button"
        onClick={handleInstallClick}
        aria-label={`Instalar ${appName}`}
      >
        <Download size={17} aria-hidden="true" />
        <span>Instalar app</span>
      </button>
      {showInstructions && (
        <div className="pwa-install-backdrop">
          <section
            className="pwa-install-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
          >
            <button
              className="pwa-install-close"
              type="button"
              onClick={() => setShowInstructions(false)}
              aria-label="Fechar instruções"
            >
              <X size={20} />
            </button>
            <h2 id="pwa-install-title">Instalar {appName}</h2>
            {installError && <p role="alert">{installError}</p>}
            {!window.isSecureContext ? (
              <p>A instalação precisa que o site esteja aberto em uma conexão segura (HTTPS).</p>
            ) : (
              <>
                <p><strong>Android (Chrome):</strong> toque em ⋮ e escolha “Instalar app” ou “Adicionar à tela inicial”.</p>
                <p><strong>iPhone (Safari):</strong> toque em Compartilhar e escolha “Adicionar à Tela de Início”.</p>
              </>
            )}
            <button
              className="pwa-install-confirm"
              type="button"
              onClick={() => setShowInstructions(false)}
            >
              Entendi
            </button>
          </section>
        </div>
      )}
    </>
  );
}
