import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      toast.success("Santo Antônio Agro instalado com sucesso.");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setPromptEvent(null);
      if (choice.outcome === "accepted") setInstalled(true);
      return;
    }
    if (isIos) {
      toast.info("Para instalar no iPhone: toque em Compartilhar no Safari e escolha “Adicionar à Tela de Início”.", { duration: 7000 });
    } else {
      toast.info("Abra o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.", { duration: 7000 });
    }
  }

  return (
    <Button size="sm" variant="outline" className="h-10 gap-2 px-3" onClick={install} aria-label="Instalar Santo Antônio Agro">
      {isIos ? <Smartphone className="h-4 w-4" /> : <Download className="h-4 w-4" />}
      <span className="hidden sm:inline">Instalar app</span>
    </Button>
  );
}
