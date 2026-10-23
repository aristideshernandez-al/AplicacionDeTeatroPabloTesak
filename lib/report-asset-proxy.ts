const STORAGE_HOST = "firebasestorage.googleapis.com";

export function validateReportAssetUrl(value: unknown, bucket: string) {
  if (typeof value !== "string" || value.length > 4096) {
    throw new Error("La dirección del archivo no es válida.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("La dirección del archivo no es válida.");
  }

  const objectPrefix = `/v0/b/${bucket}/o/activities%2F`;
  if (
    url.protocol !== "https:" ||
    url.hostname !== STORAGE_HOST ||
    url.port ||
    !url.pathname.startsWith(objectPrefix) ||
    url.searchParams.get("alt") !== "media" ||
    !url.searchParams.get("token") ||
    [...url.searchParams.keys()].some((key) => key !== "alt" && key !== "token")
  ) {
    throw new Error("El archivo no pertenece al almacenamiento de actividades.");
  }
  return url;
}

export const REPORT_ASSET_MAX_BYTES = 25 * 1024 * 1024;
export const REPORT_ASSET_CHUNK_BYTES = 4 * 1024 * 1024;

export async function readReportAssetBody(response: Response, maxBytes = REPORT_ASSET_CHUNK_BYTES) {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) {
    throw new Error("El tramo del archivo supera el límite permitido.");
  }
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("El tramo del archivo supera el límite permitido.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
