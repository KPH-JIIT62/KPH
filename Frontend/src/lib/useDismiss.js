import { useEffect } from "react";

export function useDismiss(open, ref, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event) {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    }
    function onKey(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, ref, onClose]);
}
