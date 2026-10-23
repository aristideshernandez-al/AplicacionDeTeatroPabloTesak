"use client";
import { statusLabels, type Activity, participantLabels } from "./models";
const columns = [
  "Código",
  "Actividad",
  "Fecha",
  "Inicio",
  "Fin",
  "Área",
  "Tipo",
  "Responsable",
  "Estado",
  "Docentes",
  "Estudiantes mujeres",
  "Estudiantes hombres",
  "Comunidad",
  "Artistas",
  "Total",
];
function row(a: Activity) {
  return [
    a.code,
    a.nombreActividad,
    a.fecha,
    a.horaInicio,
    a.horaFin,
    a.areaIncidencia,
    a.tipoActividad,
    a.responsibleName,
    statusLabels[a.status],
    a.participants.teachers,
    a.participants.studentsF,
    a.participants.studentsM,
    a.participants.community,
    a.participants.artists,
    a.participants.totalGeneral,
  ];
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csvCell(value: string | number) {
  const text = String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function exportCsv(activities: Activity[]) {
  download(
    new Blob(
      [
        "\ufeff" +
          [columns, ...activities.map(row)]
            .map((values) => values.map(csvCell).join(","))
            .join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    ),
    "actividades-teatro.csv",
  );
}
export async function exportExcel(activities: Activity[]) {
  const { Workbook } = await import("exceljs");
  const book = new Workbook();
  book.creator = "Teatro Pablo Tesak";
  const sheet = book.addWorksheet("Actividades");
  sheet.addRow(columns);
  activities.forEach((a) => sheet.addRow(row(a)));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF632D91" },
  };
  sheet.columns.forEach((c, i) => {
    c.width = i === 1 ? 42 : 22;
  });
  sheet.autoFilter = { from: "A1", to: `O${activities.length + 1}` };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const buffer = await book.xlsx.writeBuffer();
  download(
    new Blob([buffer as ArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "actividades-teatro.xlsx",
  );
}
export async function exportPdf(activities: Activity[], detailed = false) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const pdf = new jsPDF({ orientation: detailed ? "portrait" : "landscape" });
  pdf.setFontSize(18);
  pdf.setTextColor("#632d91");
  pdf.text("Teatro Pablo Tesak", 14, 20);
  pdf.setFontSize(10);
  pdf.setTextColor("#555555");
  pdf.text("Registro y seguimiento de actividades · MINEDUCYT", 14, 28);
  if (!detailed) {
    autoTable(pdf, {
      startY: 36,
      head: [
        [
          "Código",
          "Actividad",
          "Fecha",
          "Área",
          "Responsable",
          "Estado",
          "Total",
        ],
      ],
      body: activities.map((a) => [
        a.code,
        a.nombreActividad,
        a.fecha,
        a.areaIncidencia,
        a.responsibleName,
        statusLabels[a.status],
        a.participants.totalGeneral,
      ]),
      headStyles: { fillColor: [99, 45, 145] },
      styles: { fontSize: 9 },
      columnStyles: { 1: { cellWidth: 65 } },
    });
  } else
    for (let index = 0; index < activities.length; index++) {
      if (index) pdf.addPage();
      const a = activities[index];
      autoTable(pdf, {
        startY: index ? 18 : 36,
        head: [[a.nombreActividad, ""]],
        body: [
          ["Código", a.code || "Borrador"],
          ["Responsable", a.responsibleName],
          ["Estado", statusLabels[a.status]],
          [
            "Área / tipo",
            `${a.areaIncidencia} / ${a.tipoActividad} ${a.otroTipoActividad}`,
          ],
          ["Fecha / horario", `${a.fecha} · ${a.horaInicio} – ${a.horaFin}`],
          ["Antecedentes", a.antecedentes],
          ["Objetivo", a.objetivo],
          ["Descripción", a.descripcion],
          ["Evaluación y seguimiento", a.evaluacionSeguimiento],
          [
            "Espacios",
            [...a.selectedSpaces, a.otherSpace].filter(Boolean).join(", "),
          ],
          [
            "Instituciones",
            a.institutions
              .map(
                (i) =>
                  `${i.name} · ${i.type}\n${i.department} / ${i.municipality} / ${i.district}\n${i.infrastructureCode} · ${i.contactName} ${i.contactPhone}`,
              )
              .join("\n\n"),
          ],
          ...Object.entries(participantLabels).map(([key, label]) => [
            label,
            String(a.participants[key as keyof typeof participantLabels]),
          ]),
          ["Total general", String(a.participants.totalGeneral)],
          [
            "Equipo",
            [...a.technicalInfo.equipment, a.technicalInfo.otherEquipment]
              .filter(Boolean)
              .join(", "),
          ],
          ["Observaciones técnicas", a.technicalInfo.observations],
          ["Fallas", a.technicalInfo.failures],
          ["Requiere revisión", a.technicalInfo.requiresReview],
          ["Observación administrativa", a.adminObservation],
          [
            "Evidencias",
            `${a.photoUrls.length} fotografías · ${a.attendanceListUrls.length} listas · ${a.otherAnnexUrls.length} anexos`,
          ],
        ],
        headStyles: { fillColor: [99, 45, 145] },
        styles: { fontSize: 10, overflow: "linebreak" },
        columnStyles: { 0: { cellWidth: 48 } },
      });
      for (let i = 0; i < a.photoUrls.length; i++) {
        pdf.addPage();
        pdf.setFontSize(12);
        pdf.text(`${a.code || 'Actividad'} · Fotografía ${i + 1}`, 14, 18);
        const response = await fetch(a.photoUrls[i]);
        if (!response.ok) throw new Error('No se pudo descargar una fotografía para el PDF. Revisa tu conexión y vuelve a intentar.');
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width; canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        if (!context) {bitmap.close();throw new Error('No se pudo preparar la fotografía.');}
        context.drawImage(bitmap,0,0);
        const ratio = Math.min(182 / bitmap.width, 250 / bitmap.height);
        pdf.addImage(canvas.toDataURL('image/jpeg',0.9),'JPEG',(210-bitmap.width*ratio)/2,28,bitmap.width*ratio,bitmap.height*ratio);
        bitmap.close();
      }
      // Include links as well as embedded evidence, so originals remain accessible.
      for (const [label, urls] of [
        ["Fotografía", a.photoUrls],
        ["Lista de asistencia", a.attendanceListUrls],
        ["Anexo", a.otherAnnexUrls],
      ] as [string, string[]][]) {
        if (!urls.length) continue;
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.text(`${a.code || a.nombreActividad} · ${label}`, 14, 18);
        let y = 30;
        for (let i = 0; i < urls.length; i++) {
          if (y > 265) {
            pdf.addPage();
            y = 20;
          }
          pdf.setFontSize(10);
          pdf.setTextColor("#632d91");
          pdf.textWithLink(`Abrir ${label.toLowerCase()} ${i + 1}`, 14, y, {
            url: urls[i],
          });
          y += 10;
        }
      }
    }
  if (detailed) {
    const {PDFDocument} = await import('pdf-lib');
    const complete = await PDFDocument.load(pdf.output('arraybuffer'));
    for (const activity of activities) {
      for (const url of [...activity.attendanceListUrls,...activity.otherAnnexUrls]) {
        const response=await fetch(url);
        if(!response.ok)throw new Error('No se pudo descargar un anexo para completar el PDF. Revisa tu conexión.');
        const attachment=await PDFDocument.load(await response.arrayBuffer());
        const pages=await complete.copyPages(attachment,attachment.getPageIndices());
        pages.forEach(page=>complete.addPage(page));
      }
    }
    const bytes=await complete.save();
    download(new Blob([bytes as BlobPart],{type:'application/pdf'}),`${activities[0]?.code || 'actividad'}.pdf`);
    return;
  }
  pdf.save(
    detailed
      ? `${activities[0]?.code || "actividad"}.pdf`
      : "reporte-actividades.pdf",
  );
}
