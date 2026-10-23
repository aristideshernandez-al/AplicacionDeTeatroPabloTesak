"use client";
import { useState } from "react";
import { imagesToPdf } from "@/lib/scanner";
import { errorMessage } from "@/lib/models";
export default function ScanInput({
  onReady,
}: {
  onReady: (file: File) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="scan-input">
      <label>
        Crear una lista PDF desde fotografías
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            e.target.value = "";
            if (!files.length) return;
            setBusy(true);
            setError("");
            try {
              if (files.length > 20)
                throw new Error("Selecciona hasta 20 páginas.");
              onReady(await imagesToPdf(files));
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <p className="muted">
        {busy
          ? "Creando PDF…"
          : "Selecciona fotos de las páginas en su orden. En el teléfono puedes tomarlas con la cámara; se ajustarán a páginas A4."}
      </p>
      {error && (
        <p role="alert" className="danger">
          {error}
        </p>
      )}
    </div>
  );
}
