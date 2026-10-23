import firebasePublic from "@/lib/firebase-public.json";
import {
  REPORT_ASSET_CHUNK_BYTES,
  readReportAssetBody,
  validateReportAssetUrl,
} from "@/lib/report-asset-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return jsonError("Solicitud de archivo no permitida.", 403);
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 8192) {
    return jsonError("La solicitud es demasiado grande.", 413);
  }

  let downloadUrl: URL;
  let rangeStart: number;
  let rangeEnd: number;
  try {
    const payload = await request.json();
    downloadUrl = validateReportAssetUrl(payload?.url, firebasePublic.storageBucket);
    rangeStart = payload?.rangeStart;
    rangeEnd = payload?.rangeEnd;
    if (
      !Number.isSafeInteger(rangeStart) ||
      !Number.isSafeInteger(rangeEnd) ||
      rangeStart < 0 ||
      rangeEnd < rangeStart ||
      rangeEnd - rangeStart + 1 > REPORT_ASSET_CHUNK_BYTES
    ) throw new Error("El tramo de descarga no es válido.");
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "La solicitud no es válida.", 400);
  }

  try {
    const upstream = await fetch(downloadUrl, {
      cache: "no-store",
      redirect: "error",
      headers: { Range: `bytes=${rangeStart}-${rangeEnd}` },
      signal: AbortSignal.timeout(25_000),
    });
    if (upstream.status !== 206 && upstream.status !== 200) {
      return jsonError("Firebase no pudo entregar el archivo adjunto.", 502);
    }
    const contentType = upstream.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "";
    if (!new Set(["application/pdf", "application/octet-stream", "image/jpeg", "image/png", "image/webp"]).has(contentType)) {
      return jsonError("El archivo adjunto tiene un formato no compatible.", 415);
    }
    const body = await readReportAssetBody(upstream);
    const partial = upstream.status === 206;
    const contentRange = upstream.headers.get("content-range");
    if (partial && !contentRange) return jsonError("Firebase devolvió un tramo incompleto.", 502);
    return new Response(body, {
      status: partial ? 206 : 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Length": String(body.byteLength),
        "Content-Type": contentType,
        ...(contentRange ? { "Content-Range": contentRange, "Accept-Ranges": "bytes" } : {}),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("tramo del archivo")) {
      return jsonError("Firebase no permitió descargar este archivo en partes.", 502);
    }
    if (error instanceof Error && error.message.includes("25 MB")) {
      return jsonError(error.message, 413);
    }
    return jsonError("No se pudo descargar el archivo desde Firebase. Revisa la conexión o el enlace del archivo.", 502);
  }
}
