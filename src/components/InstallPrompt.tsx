import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
};

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !deferred) return null;

  const onInstall = async () => {
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      setVisible(false);
      setDeferred(null);
    }
  };

  const onClose = () => {
    setVisible(false);
  };

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
      <div style={{ margin: "0 auto", maxWidth: 640, padding: 12 }}>
        <div style={{ background: "#111", color: "#fff", borderRadius: 12, padding: 12, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
          <img src="/logo.jpg" alt="App" width={32} height={32} style={{ borderRadius: 6 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Install League Loom</div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Get quick access from your home screen.</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: 0, color: "#bbb", padding: 8, cursor: "pointer" }}>Not now</button>
          <button onClick={onInstall} style={{ background: "#16a34a", color: "white", border: 0, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 600 }}>Install</button>
        </div>
      </div>
    </div>
  );
}
