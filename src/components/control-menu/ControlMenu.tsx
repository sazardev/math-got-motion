import { useEffect, useRef, useState, type ReactNode } from "react";

import "./ControlMenu.css";

interface ControlMenuProps {
  /** Rótulo traducido del control ("Tema", "Exportar"). */
  label: string;
  /** Valor actual que se muestra junto al rótulo. */
  value: string;
  /** Contenido del panel; recibe `close` para cerrar tras elegir. */
  children: (close: () => void) => ReactNode;
}

/**
 * Botón de control + panel desplegable, el patrón compartido por el selector
 * de tema y el exportador de wallpapers. El panel se pinta invertido
 * (`--fg` de fondo, `--bg` de texto): da límite visual sin bordes ni sombras,
 * que DESIGN.md prohíbe. Cierra con Escape, click afuera o al elegir.
 */
export function ControlMenu({ label, value, children }: ControlMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Foco al primer control del panel (el activo, si lo hay) para que el
    // teclado siga el orden visual sin tener que tabular por el chrome.
    const initial =
      panelRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ??
      panelRef.current?.querySelector<HTMLButtonElement>("button");
    initial?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    globalThis.addEventListener("pointerdown", handlePointerDown);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
      globalThis.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  return (
    <div className="control-menu">
      <button
        ref={triggerRef}
        type="button"
        className="control-button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        {label}: {value}
      </button>

      {open && (
        <div ref={panelRef} className="control-menu__panel" role="group" aria-label={label}>
          {children(() => {
            setOpen(false);
          })}
        </div>
      )}
    </div>
  );
}
