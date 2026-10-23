"use client";
import { compressPhoto } from "./repository";
/** Browser equivalent of Android's scan-to-PDF: selected camera photos become pages. */
export async function imagesToPdf(images: File[]): Promise<File> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  for (let i = 0; i < images.length; i++) {
    if (
      !images[i].type.startsWith("image/") ||
      images[i].size >= 25 * 1024 * 1024
    )
      throw new Error("Selecciona fotografías de menos de 25 MB por página.");
    const blob = await compressPhoto(images[i]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const bitmap = await createImageBitmap(blob);
    if (i) pdf.addPage();
    const ratio = Math.min(190 / bitmap.width, 277 / bitmap.height);
    const width = bitmap.width * ratio,
      height = bitmap.height * ratio;
    pdf.addImage(
      bytes,
      "JPEG",
      (210 - width) / 2,
      (297 - height) / 2,
      width,
      height,
    );
    bitmap.close();
  }
  return new File([pdf.output("blob")], `lista-asistencia-${Date.now()}.pdf`, {
    type: "application/pdf",
  });
}
