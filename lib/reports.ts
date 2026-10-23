"use client";
import { statusLabels, type Activity, participantLabels } from "./models";
import type { jsPDF as JsPdfDocument } from "jspdf";
import {
  buildActivityDetailRows,
  calculateActivityHours,
  calculateReportStats,
  formatReportNumber,
  reportPresentations,
  reportScopes,
  type ReportConfig,
} from "./report-data";
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

const REPORT_PAGE_WIDTH = 595;
const REPORT_PAGE_HEIGHT = 842;
const REPORT_HEADER_HEIGHT = 135;
const REPORT_MARGIN = 30;
const REPORT_FOOTER_MARGIN = 45;
const REPORT_BASE_COLOR = "#C7AB97";
type ReportLogo = { data: string; width: number; height: number };

function rgb(hex: string) {
  const value = /^#[\da-f]{6}$/i.test(hex) ? hex.slice(1) : "C7AB97";
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)) as [number, number, number];
}

function reportPresentationText(config: ReportConfig) {
  return reportPresentations.find((value) => value.id === config.presentation)?.label ?? "Resumen Ejecutivo";
}

function reportScopeText(config: ReportConfig) {
  return reportScopes.find((value) => value.id === config.scope)?.title ?? "General";
}

function reportPeriodText(config: ReportConfig) {
  const labels: Record<ReportConfig["period"], string> = {
    ACTIVITY: "Por Actividad",
    MONTHLY: "Mes Actual",
    SPECIFIC_MONTH: "Mes Específico",
    SPECIFIC_DATE: "Fecha Específica",
    TRIMESTRE: "Trimestral",
    SEMESTER: "Semestral",
    ANNUAL: "Anual",
    ALL: "Todo",
  };
  return labels[config.period];
}

function reportToday() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/El_Salvador",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date())
    .replaceAll("/", "-");
}

async function toDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la imagen."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

async function loadTintedReportLogo(color: string) {
  try {
    const response = await fetch("/logo-mined.png");
    if (!response.ok) return null;
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    context.globalCompositeOperation = "source-in";
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
  } catch {
    return null;
  }
}

function drawReportHeader(
  pdf: JsPdfDocument,
  logoData: ReportLogo | null,
  date: string,
  config: ReportConfig,
) {
  const textColor = config.style.headerTextColor;
  pdf.setFillColor(config.style.reportColor);
  pdf.rect(0, 0, REPORT_PAGE_WIDTH, REPORT_HEADER_HEIGHT, "F");
  pdf.setDrawColor(textColor);
  pdf.setLineWidth(1.5);
  pdf.line(205, 20, 205, 115);
  pdf.line(445, 20, 445, 115);
  if (logoData) {
    const width = logoData.width;
    const height = logoData.height;
    const scale = Math.min(160 / width, 100 / height);
    const renderedWidth = width * scale;
    const renderedHeight = height * scale;
    pdf.addImage(
      logoData.data,
      "PNG",
      (205 - renderedWidth) / 2,
      (REPORT_HEADER_HEIGHT - renderedHeight) / 2 - 5,
      renderedWidth,
      renderedHeight,
      undefined,
      "FAST",
    );
  }
  pdf.setTextColor(textColor);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text("DIRECCION DE", 325, 35, { align: "center" });
  pdf.text("ADMINISTRACION Y", 325, 55, { align: "center" });
  pdf.text("GESTION TERRITORIAL", 325, 75, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text("Teatro del Ministerio de Educacion,", 325, 95, { align: "center" });
  pdf.text("Pablo Tesak", 325, 110, { align: "center" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("INFORME", 520, 60, { align: "center" });
  pdf.text(date, 520, 80, { align: "center" });
  pdf.setDrawColor(textColor);
  pdf.setLineWidth(3);
  pdf.line(0, REPORT_HEADER_HEIGHT - 8, REPORT_PAGE_WIDTH, REPORT_HEADER_HEIGHT - 8);
}

class ReportPdfLayout {
  private y = REPORT_HEADER_HEIGHT + 28;

  constructor(
    private readonly pdf: JsPdfDocument,
    private readonly logoData: ReportLogo | null,
    private readonly date: string,
    private readonly config: ReportConfig,
  ) {
    drawReportHeader(pdf, logoData, date, config);
  }

  newPage() {
    this.pdf.addPage("a4", "portrait");
    drawReportHeader(this.pdf, this.logoData, this.date, this.config);
    this.y = REPORT_HEADER_HEIGHT + 28;
  }

  ensure(space: number) {
    if (this.y + space > REPORT_PAGE_HEIGHT - REPORT_FOOTER_MARGIN) this.newPage();
  }

  text(value: string, size: number, bold: boolean, color = "#000000") {
    this.pdf.setFont("helvetica", bold ? "bold" : "normal");
    this.pdf.setFontSize(size);
    this.pdf.setTextColor(color);
    this.pdf.text(value, REPORT_MARGIN, this.y);
  }

  paragraph(title: string, text: string) {
    if (!text.trim()) return;
    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFontSize(10);
    const lines = this.pdf.splitTextToSize(text, 535) as string[];
    const lineHeight = 12;
    this.ensure(lines.length * lineHeight + 25);
    this.text(title, 12, true, "#424242");
    this.y += 8;
    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFontSize(10);
    this.pdf.setTextColor("#000000");
    lines.forEach((line) => {
      this.pdf.text(line, REPORT_MARGIN, this.y + 6);
      this.y += lineHeight;
    });
    this.y += 22;
  }

  table(
    columns: string[],
    rows: string[][],
    widths: number[],
    options: { headerSize?: number; bodySize?: number; bodyColor?: string } = {},
  ) {
    const headerSize = options.headerSize ?? 9.5;
    const bodySize = options.bodySize ?? 10;
    const bodyColor = options.bodyColor ?? "#000000";
    const tableWidth = widths.reduce((sum, width) => sum + width, 0);
    const drawHeader = () => {
      this.pdf.setFillColor(this.config.style.reportColor);
      this.pdf.rect(REPORT_MARGIN, this.y, tableWidth, 20, "F");
      this.pdf.setFont("helvetica", "bold");
      this.pdf.setFontSize(headerSize);
      this.pdf.setTextColor("#FFFFFF");
      let x = REPORT_MARGIN;
      columns.forEach((column, index) => {
        this.pdf.text(column, x + 4, this.y + 15, {
          maxWidth: Math.max(10, widths[index] - 8),
        });
        x += widths[index];
      });
      this.y += 20;
    };
    if (this.y + 25 > REPORT_PAGE_HEIGHT - REPORT_FOOTER_MARGIN) this.newPage();
    drawHeader();
    rows.forEach((row, rowIndex) => {
      const wrapped = row.map((cell, index) => {
        this.pdf.setFont("helvetica", "normal");
        this.pdf.setFontSize(bodySize);
        return this.pdf.splitTextToSize(String(cell ?? ""), Math.max(20, widths[index] - 8)) as string[];
      });
      const rowHeight = Math.max(
        ...wrapped.map((lines) => lines.length * bodySize * 1.2 + 8),
        18,
      );
      if (this.y + rowHeight > REPORT_PAGE_HEIGHT - REPORT_FOOTER_MARGIN) {
        this.pdf.setDrawColor(this.config.style.reportColor);
        this.pdf.setLineWidth(0.5);
        this.pdf.line(REPORT_MARGIN, this.y, REPORT_MARGIN + tableWidth, this.y);
        this.newPage();
        drawHeader();
      }
      if (rowIndex % 2 === 0) {
        this.pdf.setFillColor("#F5F5F5");
        this.pdf.rect(REPORT_MARGIN, this.y, tableWidth, rowHeight, "F");
      }
      this.pdf.setFont("helvetica", "normal");
      this.pdf.setFontSize(bodySize);
      this.pdf.setTextColor(bodyColor);
      this.pdf.setDrawColor(this.config.style.reportColor);
      this.pdf.setLineWidth(0.5);
      this.pdf.line(REPORT_MARGIN, this.y, REPORT_MARGIN + tableWidth, this.y);
      let x = REPORT_MARGIN;
      wrapped.forEach((lines, index) => {
        lines.forEach((line, lineIndex) =>
          this.pdf.text(line, x + 4, this.y + 4 + bodySize + lineIndex * bodySize * 1.2),
        );
        this.pdf.line(x, this.y, x, this.y + rowHeight);
        x += widths[index];
      });
      this.pdf.line(x, this.y, x, this.y + rowHeight);
      this.y += rowHeight;
    });
    this.pdf.setDrawColor(this.config.style.reportColor);
    this.pdf.line(REPORT_MARGIN, this.y, REPORT_MARGIN + tableWidth, this.y);
    this.y += 6;
  }

  section(title: string, before = 40) {
    this.ensure(before);
    this.text(title, 12, true, "#424242");
    this.y += 18;
  }

  advance(value: number) {
    this.y += value;
  }

  get cursorY() {
    return this.y;
  }

  get pageNumber() {
    return this.pdf.getNumberOfPages();
  }
}

function presentationDescription(config: ReportConfig) {
  const descriptions: Record<ReportConfig["presentation"], string> = {
    EXECUTIVE_SUMMARY: "Resumen ejecutivo con los principales resultados para toma de decisiones administrativas.",
    TECHNICAL_REPORT: "Informe tecnico con informacion operativa, espacios, responsables, evidencias y observaciones.",
    INSTITUTIONAL_REPORT: "Informe institucional agrupado por entidades participantes.",
    ACTIVITY_MEMORY: "Memoria de actividades con acciones, participantes, evidencias y resultados.",
    STATISTICAL_REPORT: "Reporte estadistico con indicadores, volumen, participacion y uso del teatro.",
  };
  return descriptions[config.presentation];
}

function buildScopeTable(config: ReportConfig, activities: Activity[]) {
  if (config.scope === "BY_INSTITUTION") {
    const groups = new Map<string, Activity[]>();
    activities.forEach((activity) =>
      activity.institutions.forEach((institution) => {
        groups.set(institution.name, [...(groups.get(institution.name) ?? []), activity]);
      }),
    );
    return {
      columns: ["Institución", "Actividades", "Participantes", "Espacios"],
      widths: [190, 70, 80, 180],
      rows: [...groups.entries()].map(([institution, values]) => {
        const unique = [...new Map(values.map((value) => [value.id, value])).values()];
        return [
          institution,
          String(unique.length),
          String(values.reduce((sum, activity) => sum + activity.participants.totalGeneral, 0)),
          [...new Set(values.flatMap((a) => [...a.selectedSpaces, a.otherSpace]).filter(Boolean))]
            .join(", ")
            .slice(0, 45),
        ];
      }),
    };
  }
  if (config.scope === "BY_SPACE") {
    const groups = new Map<string, Activity[]>();
    activities.forEach((activity) =>
      [...activity.selectedSpaces, activity.otherSpace]
        .filter(Boolean)
        .forEach((space) => groups.set(space, [...(groups.get(space) ?? []), activity])),
    );
    return {
      columns: ["Espacio", "Actividades", "Horas", "Ocupación"],
      widths: [220, 90, 90, 120],
      rows: [...groups.entries()].map(([space, values]) => {
        const unique = [...new Map(values.map((value) => [value.id, value])).values()];
        const hours = values.reduce(
          (sum, activity) => sum + calculateActivityHours(activity.horaInicio, activity.horaFin),
          0,
        );
        const occupancy = Math.min((hours / 108) * 100, 100);
        return [space, String(unique.length), formatReportNumber(hours), `${Math.round(occupancy)}%`];
      }),
    };
  }
  if (config.scope === "STUDENT_GENDER") {
    return {
      columns: ["Categoría", "Cantidad"],
      widths: [260, 120],
      rows: [
        ["Docentes", String(activities.reduce((sum, a) => sum + a.participants.teachers, 0))],
        ["Estudiantes femeninos", String(activities.reduce((sum, a) => sum + a.participants.studentsF, 0))],
        ["Estudiantes masculinos", String(activities.reduce((sum, a) => sum + a.participants.studentsM, 0))],
        ["Comunidad", String(activities.reduce((sum, a) => sum + a.participants.community, 0))],
        ["Elenco / Artista", String(activities.reduce((sum, a) => sum + a.participants.artists, 0))],
        ["Total general", String(activities.reduce((sum, a) => sum + a.participants.totalGeneral, 0))],
      ],
    };
  }
  if (config.scope === "STATISTICAL") {
    const groups = new Map<string, Activity[]>();
    activities.forEach((activity) => {
      const type = activity.tipoActividad || "Sin tipo";
      groups.set(type, [...(groups.get(type) ?? []), activity]);
    });
    return {
      columns: ["Tipo", "Actividades", "Participantes"],
      widths: [260, 110, 150],
      rows: [...groups.entries()].map(([type, values]) => [
        type,
        String(values.length),
        String(values.reduce((sum, a) => sum + a.participants.totalGeneral, 0)),
      ]),
    };
  }
  return null;
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

async function makePhotoFrame(
  url: string,
  index: number,
  config: ReportConfig,
): Promise<{ data: string; height: number } | null> {
  try {
    const blob = await fetchReportAsset(url);
    const bitmap = await createImageBitmap(blob);
    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;
    const factor = Math.min(1, 1600 / Math.max(sourceWidth, sourceHeight));
    const contentWidth = 252;
    const contentHeight = Math.min((sourceHeight * factor * contentWidth) / (sourceWidth * factor), 185);
    const bottomExtra = config.style.photoFrameStyle === "POLAROID" ? 22 : 7;
    const outerWidth = contentWidth + 14;
    const outerHeight = contentHeight + bottomExtra + 14;
    const rotation =
      config.style.photoFrameStyle === "CREATIVE"
        ? [-2.5, 1.8, 0, -1.2][index % 4]
        : config.style.photoFrameStyle === "TAPE"
          ? [ -1.8, 1.4 ][index % 2]
          : 0;
    const corner =
      config.style.photoFrameStyle === "ROUNDED"
        ? 18
        : config.style.photoFrameStyle === "MINIMAL"
          ? 2
          : config.style.photoFrameStyle === "POLAROID"
            ? 3
            : [4, 12, 2][index % 3];
    const rotatedMargin = 20;
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil((outerWidth + rotatedMargin * 2) * scale);
    canvas.height = Math.ceil((outerHeight + rotatedMargin * 2) * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return null;
    }
    context.scale(scale, scale);
    context.translate(rotatedMargin + outerWidth / 2, rotatedMargin + outerHeight / 2);
    context.rotate((rotation * Math.PI) / 180);
    context.translate(-outerWidth / 2, -outerHeight / 2);
    const accent = config.style.frameColor;
    context.fillStyle = "rgba(0,0,0,0.22)";
    roundedRectPath(context, 5, 6, outerWidth, outerHeight, corner + 3);
    context.fill();
    const outerColor = ["MINIMAL", "POLAROID", "TAPE"].includes(config.style.photoFrameStyle)
      ? "#FFFFFF"
      : accent;
    context.fillStyle = outerColor;
    roundedRectPath(context, 0, 0, outerWidth - 0, outerHeight - 0, corner + 3);
    context.fill();
    context.fillStyle = "#FFFFFF";
    roundedRectPath(
      context,
      4,
      4,
      contentWidth + 6,
      contentHeight + (config.style.photoFrameStyle === "POLAROID" ? 18 : 3),
      corner + 1,
    );
    context.fill();
    context.drawImage(bitmap, 7, 7, contentWidth, contentHeight);
    bitmap.close();
    context.lineWidth = config.style.photoFrameStyle === "MINIMAL" ? 1.5 : 0.7;
    context.strokeStyle = accent;
    roundedRectPath(context, 7, 7, contentWidth, contentHeight, corner);
    context.stroke();
    if (config.style.photoFrameStyle === "TAPE") {
      context.fillStyle = "rgba(245,231,190,0.82)";
      roundedRectPath(context, outerWidth / 2 - 34, -8, 68, 16, 2);
      context.fill();
      roundedRectPath(context, outerWidth / 2 - 30, outerHeight - 7, 60, 14, 2);
      context.fill();
    }
    return {
      data: canvas.toDataURL("image/png"),
      height: canvas.height / scale,
    };
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : "el archivo no se pudo procesar";
    throw new Error(`No se pudo incluir la fotografía ${index + 1}: ${detail}`);
  }
}

async function fetchReportAsset(url: string) {
  const chunkBytes = 4 * 1024 * 1024;
  const fetchChunk = async (rangeStart: number, rangeEnd: number) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch("/api/report-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, rangeStart, rangeEnd }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Firebase no pudo entregar el archivo.");
      }
      return response;
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") {
        throw new Error("La descarga tardó demasiado. Revisa tu conexión y vuelve a intentar.");
      }
      throw cause;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const first = await fetchChunk(0, chunkBytes - 1);
  const contentType = first.headers.get("content-type") || "application/octet-stream";
  const range = first.headers.get("content-range");
  if (first.status !== 206 || !range) {
    const body = await first.blob();
    if (body.size > chunkBytes) throw new Error("Firebase no permite descargar este archivo en partes.");
    return body;
  }
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(range);
  if (!match || Number(match[1]) !== 0) throw new Error("Firebase devolvió un tramo de archivo no válido.");
  const total = Number(match[3]);
  if (!Number.isSafeInteger(total) || total > 25 * 1024 * 1024) {
    throw new Error("El archivo supera el límite de 25 MB para incluirlo en el reporte.");
  }
  const parts: BlobPart[] = [await first.arrayBuffer()];
  let nextStart = Number(match[2]) + 1;
  while (nextStart < total) {
    const nextEnd = Math.min(total - 1, nextStart + chunkBytes - 1);
    const response = await fetchChunk(nextStart, nextEnd);
    const nextRange = response.headers.get("content-range");
    const nextMatch = nextRange && /^bytes (\d+)-(\d+)\/(\d+)$/.exec(nextRange);
    if (response.status !== 206 || !nextMatch || Number(nextMatch[1]) !== nextStart || Number(nextMatch[3]) !== total) {
      throw new Error("Firebase no pudo completar la descarga del archivo adjunto.");
    }
    parts.push(await response.arrayBuffer());
    nextStart = Number(nextMatch[2]) + 1;
  }
  return new Blob(parts, { type: contentType });
}

function drawReportPhotoPages(
  layout: ReportPdfLayout,
  photoCount: number,
) {
  if (!photoCount) return null;
  layout.section("EVIDENCIAS FOTOGRAFICAS", 30);
  let start: { page: number; y: number } | null = null;
  for (let index = 0; index < photoCount; index += 2) {
    layout.ensure(210);
    if (!start) start = { page: layout.pageNumber, y: layout.cursorY };
    layout.advance(205);
  }
  return start;
}

function makeReportActivityPdf(
  pdf: JsPdfDocument,
  logoData: ReportLogo | null,
  config: ReportConfig,
  activities: Activity[],
  photoCount: number,
) {
  const layout = new ReportPdfLayout(pdf, logoData, reportToday(), config);
  const stats = calculateReportStats(activities);
  if (config.scope !== "INDIVIDUAL") {
    layout.text(reportPresentationText(config).toLocaleUpperCase("es-SV"), 16, true, "#424242");
    layout.advance(22);
    layout.text(
      `Tipo: ${reportScopeText(config)} | Periodo: ${reportPeriodText(config)} | Actividades: ${activities.length}`,
      10,
      false,
    );
    layout.advance(24);
    if (config.options.includeStats && stats.activities > 0) {
      layout.table(
        ["Indicador", "Valor"],
        [
          ["Actividades", String(stats.activities)],
          ["Instituciones", String(stats.institutions)],
          ["Participantes", String(stats.participants)],
          ["Horas de uso del teatro", formatReportNumber(stats.theaterHours)],
          ["Espacio mas utilizado", stats.mostUsedSpace],
          ["Institucion con mayor participacion", stats.topInstitution],
        ],
        [260, 260],
      );
      layout.advance(16);
    }
    layout.paragraph("ENFOQUE DEL REPORTE", presentationDescription(config));
  }

  if (config.scope === "INDIVIDUAL") {
    const activity = activities[0];
    if (activity) {
      layout.paragraph("ANTECEDENTES", activity.antecedentes);
      layout.paragraph("OBJETIVO", activity.objetivo);
      layout.paragraph("DESCRIPCION / LOGISTICA", activity.descripcion);
      if (config.options.includeObservations) {
        layout.paragraph("EVALUACION Y SEGUIMIENTO", activity.evaluacionSeguimiento);
        layout.paragraph("OBSERVACIONES TECNICAS", activity.technicalInfo.observations);
        layout.paragraph("OBSERVACION ADMINISTRATIVA", activity.adminObservation);
      }
      const detailRows = buildActivityDetailRows(activity);
      if (detailRows.length) {
        layout.section("DETALLE DE ACTIVIDAD");
        layout.table(["Campo", "Valor"], detailRows, [150, 370]);
        layout.advance(16);
      }
      if (config.options.includeParticipants && activity.participants.totalGeneral > 0) {
        layout.section("ESTADISTICAS DE PARTICIPACION");
        layout.table(
          ["Categoria", "Cantidad"],
          [
            ["Docentes", String(activity.participants.teachers)],
            ["Estudiantes femeninos", String(activity.participants.studentsF)],
            ["Estudiantes masculinos", String(activity.participants.studentsM)],
            ["Comunidad", String(activity.participants.community)],
            ["Elenco / Artista", String(activity.participants.artists)],
            ["Total general", String(activity.participants.totalGeneral)],
          ],
          [260, 120],
        );
        layout.advance(18);
      }
    }
  } else {
    const scopeTable = buildScopeTable(config, activities);
    if (scopeTable) {
      layout.table(scopeTable.columns, scopeTable.rows, scopeTable.widths, { headerSize: 9 });
      layout.advance(18);
    }
    layout.section("LISTADO DE ACTIVIDADES");
    layout.advance(-10);
    layout.table(
      ["Fecha", "Actividad", "Institucion", "Espacio", "Part."],
      activities.map((activity) => [
        activity.fecha,
        activity.nombreActividad,
        activity.institutions.map((i) => i.name).join(", "),
        activity.selectedSpaces.join(", ") || activity.otherSpace,
        String(activity.participants.totalGeneral),
      ]),
      [70, 170, 120, 100, 60],
      { headerSize: 8.5, bodySize: 8.5, bodyColor: "#424242" },
    );
    layout.advance(14);
  }

  const photoGrid = drawReportPhotoPages(layout, photoCount);

  const annexRows = config.options.includeAnnexes
    ? activities.flatMap((activity) =>
        activity.otherAnnexUrls.map((url) => [activity.nombreActividad, "Anexo", url]),
      )
    : [];
  if (annexRows.length) {
    layout.section("DOCUMENTOS ANEXOS");
    layout.advance(-10);
    layout.table(["Actividad", "Tipo", "Referencia"], annexRows, [170, 80, 270], {
      headerSize: 8.5,
      bodySize: 8.5,
      bodyColor: "#424242",
    });
  }
  return {
    layout,
    photoGrid,
  };
}

function drawPhotoData(
  pdf: JsPdfDocument,
  frames: Array<{ data: string; height: number; index: number }>,
  photoGrid: { page: number; y: number } | null,
) {
  if (!frames.length || !photoGrid) return;
  let page = photoGrid.page;
  let y = photoGrid.y;
  frames.forEach((frame, index) => {
    const positionInRow = index % 2;
    if (positionInRow === 0 && index > 0 && y + 210 > REPORT_PAGE_HEIGHT - REPORT_FOOTER_MARGIN) {
      page += 1;
      y = REPORT_HEADER_HEIGHT + 28;
    }
    const x = positionInRow === 0 ? 24 : 318;
    pdf.setPage(page);
    pdf.addImage(frame.data, "PNG", x - 27, y - 27, 252 + 14 + 40, frame.height, undefined, "FAST");
    if (positionInRow === 1 || index === frames.length - 1) {
      y += 205;
    }
  });
}

function dataUrlBytes(dataUrl: string) {
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function pdfLibColor(pdfLib: typeof import("pdf-lib"), hex: string) {
  const [red, green, blue] = rgb(hex);
  return pdfLib.rgb(red / 255, green / 255, blue / 255);
}

function drawPdfLibHeader(
  page: import("pdf-lib").PDFPage,
  logo: import("pdf-lib").PDFImage | null,
  font: import("pdf-lib").PDFFont,
  boldFont: import("pdf-lib").PDFFont,
  date: string,
  config: ReportConfig,
) {
  const pdfLib = requirePdfLib();
  const color = pdfLibColor(pdfLib, config.style.reportColor);
  const textColor = pdfLibColor(pdfLib, config.style.headerTextColor);
  const height = page.getHeight();
  page.drawRectangle({ x: 0, y: height - REPORT_HEADER_HEIGHT, width: REPORT_PAGE_WIDTH, height: REPORT_HEADER_HEIGHT, color });
  const lineY1 = height - 20;
  const lineY2 = height - 115;
  page.drawLine({ start: { x: 205, y: lineY1 }, end: { x: 205, y: lineY2 }, thickness: 1.5, color: textColor, opacity: 0.7 });
  page.drawLine({ start: { x: 445, y: lineY1 }, end: { x: 445, y: lineY2 }, thickness: 1.5, color: textColor, opacity: 0.7 });
  if (logo) {
    const scale = Math.min(160 / logo.width, 100 / logo.height);
    const width = logo.width * scale;
    const logoHeight = logo.height * scale;
    page.drawImage(logo, {
      x: (205 - width) / 2,
      y: height - ((REPORT_HEADER_HEIGHT - logoHeight) / 2 - 5) - logoHeight,
      width,
      height: logoHeight,
    });
  }
  const drawCentered = (text: string, baseline: number, size: number, selectedFont: import("pdf-lib").PDFFont) => {
    const width = selectedFont.widthOfTextAtSize(text, size);
    page.drawText(text, { x: 325 - width / 2, y: height - baseline, size, font: selectedFont, color: textColor });
  };
  drawCentered("DIRECCION DE", 35, 15, boldFont);
  drawCentered("ADMINISTRACION Y", 55, 15, boldFont);
  drawCentered("GESTION TERRITORIAL", 75, 15, boldFont);
  drawCentered("Teatro del Ministerio de Educacion,", 95, 11, font);
  drawCentered("Pablo Tesak", 110, 11, font);
  drawCentered("INFORME", 60, 14, boldFont);
  const dateWidth = boldFont.widthOfTextAtSize(date, 14);
  page.drawText(date, { x: 520 - dateWidth / 2, y: height - 80, size: 14, font: boldFont, color: textColor });
  page.drawLine({ start: { x: 0, y: height - (REPORT_HEADER_HEIGHT - 8) }, end: { x: REPORT_PAGE_WIDTH, y: height - (REPORT_HEADER_HEIGHT - 8) }, thickness: 3, color: textColor });
}

function requirePdfLib() {
  // This helper only returns the statically imported module once loadPdfLib has run.
  if (!pdfLibModule) throw new Error("No se pudo preparar el documento PDF.");
  return pdfLibModule;
}

let pdfLibModule: typeof import("pdf-lib") | null = null;

function drawFittedPdfImage(
  page: import("pdf-lib").PDFPage,
  image: import("pdf-lib").PDFImage,
  top: number,
  slotHeight: number,
) {
  const left = 36;
  const width = REPORT_PAGE_WIDTH - left * 2;
  const scale = Math.min(width / image.width, slotHeight / image.height);
  const renderedWidth = image.width * scale;
  const renderedHeight = image.height * scale;
  const x = left + (width - renderedWidth) / 2;
  const y = REPORT_PAGE_HEIGHT - top - (slotHeight + renderedHeight) / 2;
  page.drawRectangle({
    x: x - 4,
    y: y - 4,
    width: renderedWidth + 8,
    height: renderedHeight + 8,
    color: requirePdfLib().rgb(1, 1, 1),
    borderColor: requirePdfLib().rgb(0.83, 0.83, 0.83),
    borderWidth: 0.8,
  });
  page.drawImage(image, { x, y, width: renderedWidth, height: renderedHeight });
}

async function appendAttendancePages(
  document: import("pdf-lib").PDFDocument,
  urls: string[],
  config: ReportConfig,
  logoBytes: Uint8Array | null,
  date: string,
) {
  const pdfLib = requirePdfLib();
  const font = await document.embedFont(pdfLib.StandardFonts.Helvetica);
  const boldFont = await document.embedFont(pdfLib.StandardFonts.HelveticaBold);
  const logo = logoBytes ? await document.embedPng(logoBytes).catch(() => null) : null;
  const imageAssets: Uint8Array[] = [];
  const pdfAssets: Array<{ document: import("pdf-lib").PDFDocument; pages: import("pdf-lib").PDFPage[] }> = [];
  for (const [index, url] of urls.entries()) {
    try {
      const blob = await fetchReportAsset(url);
      if (url.split("?")[0].toLocaleLowerCase("en-US").endsWith(".pdf")) {
        const source = await pdfLib.PDFDocument.load(await blob.arrayBuffer());
        pdfAssets.push({ document: source, pages: source.getPages() });
      } else {
        const bitmap = await createImageBitmap(blob);
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        const canvas = window.document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          bitmap.close();
          continue;
        }
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        imageAssets.push(dataUrlBytes(canvas.toDataURL("image/jpeg", 0.9)));
      }
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "el archivo no se pudo procesar";
      throw new Error(`No se pudo incluir el archivo de asistencia ${index + 1}: ${detail}`);
    }
  }
  const header = (page: import("pdf-lib").PDFPage) => drawPdfLibHeader(page, logo, font, boldFont, date, config);
  const margin = 32;
  const gap = 14;
  const slotHeight = (REPORT_PAGE_HEIGHT - REPORT_HEADER_HEIGHT - 48 - gap) / 2;
  for (let index = 0; index < imageAssets.length; index += 2) {
    const page = document.addPage([REPORT_PAGE_WIDTH, REPORT_PAGE_HEIGHT]);
    header(page);
    for (let slot = 0; slot < 2 && index + slot < imageAssets.length; slot++) {
      const image = await document.embedJpg(imageAssets[index + slot]);
      const top = REPORT_HEADER_HEIGHT + 18 + slot * (slotHeight + gap);
      drawFittedPdfImage(page, image, top, slotHeight);
    }
  }
  const availableWidth = REPORT_PAGE_WIDTH - margin * 2;
  const pdfSlotHeight = (REPORT_PAGE_HEIGHT - REPORT_HEADER_HEIGHT - 54 - 18) / 2;
  for (const asset of pdfAssets) {
    for (let index = 0; index < asset.pages.length; index += 2) {
      const page = document.addPage([REPORT_PAGE_WIDTH, REPORT_PAGE_HEIGHT]);
      header(page);
      for (let slot = 0; slot < 2 && index + slot < asset.pages.length; slot++) {
        const copied = await document.copyPages(asset.document, [index + slot]);
        const [embedded] = await document.embedPages(copied);
        const scale = Math.min(availableWidth / embedded.width, pdfSlotHeight / embedded.height);
        const width = embedded.width * scale;
        const height = embedded.height * scale;
        const top = REPORT_HEADER_HEIGHT + 22 + slot * (pdfSlotHeight + 18);
        const x = margin + (availableWidth - width) / 2;
        const y = REPORT_PAGE_HEIGHT - top - (pdfSlotHeight + height) / 2;
        page.drawRectangle({
          x: x - 4,
          y: y - 4,
          width: width + 8,
          height: height + 8,
          color: pdfLib.rgb(1, 1, 1),
          borderColor: pdfLib.rgb(0.83, 0.83, 0.83),
          borderWidth: 0.8,
        });
        page.drawPage(embedded, { x, y, width, height });
      }
    }
  }
}

export async function buildConfiguredReportPdf(
  config: ReportConfig,
  activities: Activity[],
) {
  if (!activities.length) throw new Error("No hay actividades con los filtros seleccionados.");
  const [{ jsPDF }, pdfLib] = await Promise.all([import("jspdf"), import("pdf-lib")]);
  pdfLibModule = pdfLib;
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait", compress: true });
  const date = reportToday();
  const logoData = await loadTintedReportLogo(config.style.headerTextColor);
  const photoUrls = config.options.includePhotos
    ? activities.flatMap((activity) => activity.photoUrls.slice(0, 8)).slice(0, 20)
    : [];
  const downloadedFrames = await Promise.all(
    photoUrls.map(async (url, index) => {
      const frame = await makePhotoFrame(url, index, config);
      if (!frame) throw new Error(`No se pudo preparar la fotografía ${index + 1} para el reporte.`);
      return { ...frame, index };
    }),
  );
  const frames = downloadedFrames;
  const basePages = makeReportActivityPdf(pdf, logoData, config, activities, frames.length);
  // Draw photos on their correct pages once each frame has been fetched.
  drawPhotoData(pdf, frames, basePages.photoGrid);
  if (config.options.includeSignatures) {
    const attendanceUrls = activities.flatMap((activity) => activity.attendanceListUrls);
    if (attendanceUrls.length) {
      const document = await pdfLib.PDFDocument.load(pdf.output("arraybuffer"));
      const logoBytes = logoData ? dataUrlBytes(logoData.data) : null;
      await appendAttendancePages(document, attendanceUrls, config, logoBytes, date);
      const bytes = await document.save();
      return new Blob([bytes as BlobPart], { type: "application/pdf" });
    }
  }
  return pdf.output("blob") as Blob;
}

export async function exportConfiguredReportPdf(config: ReportConfig, activities: Activity[]) {
  const blob = await buildConfiguredReportPdf(config, activities);
  download(blob, `Reporte_TPT_${Date.now()}.pdf`);
  return blob;
}

export async function exportConfiguredReportCsv(activities: Activity[]) {
  const rows = [
    ["Codigo", "Fecha", "Actividad", "Tipo", "Estado", "Responsable", "Instituciones", "Espacios", "Participantes", "Horas"],
    ...activities.map((activity) => [
      activity.code,
      activity.fecha,
      activity.nombreActividad,
      activity.tipoActividad,
      reportStatusLabelForExport(activity),
      activity.responsibleName,
      activity.institutions.map((institution) => institution.name).join(", "),
      activity.selectedSpaces.join(", ") || activity.otherSpace,
      String(activity.participants.totalGeneral),
      formatReportNumber(calculateActivityHours(activity.horaInicio, activity.horaFin)),
    ]),
  ];
  const content = rows.map((values) => values.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  download(new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" }), "reporte-actividades-teatro.csv");
}

function reportStatusLabelForExport(activity: Activity) {
  switch (activity.status) {
    case "APPROVED":
      return "Realizada";
    case "DRAFT":
    case "SUBMITTED":
    case "ENVIADO":
    case "EVIADO":
      return "Programada";
    default:
      return "Cancelada";
  }
}

export async function exportConfiguredReportExcel(
  config: ReportConfig,
  activities: Activity[],
) {
  const stats = calculateReportStats(activities);
  const { Workbook } = await import("exceljs");
  const book = new Workbook();
  book.creator = "Teatro Pablo Tesak";
  const summary = book.addWorksheet("Resumen");
  summary.addRow([`${reportPresentationText(config)} - ${reportScopeText(config)}`]);
  summary.addRow(["Tipo de reporte", reportScopeText(config), "Periodo", reportPeriodText(config)]);
  summary.addRow(["Actividades", stats.activities, "Instituciones", stats.institutions]);
  summary.addRow(["Participantes", stats.participants, "Horas", formatReportNumber(stats.theaterHours)]);
  summary.addRow(["Espacio más utilizado", stats.mostUsedSpace, "Institución principal", stats.topInstitution]);
  summary.getRow(1).font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  summary.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${config.style.reportColor.slice(1)}` } };
  summary.columns = [{ width: 32 }, { width: 36 }, { width: 26 }, { width: 36 }];
  const sheet = book.addWorksheet("Actividades");
  const columns = ["Codigo", "Fecha", "Actividad", "Tipo", "Estado", "Responsable", "Instituciones", "Espacios", "Participantes", "Horas"];
  sheet.addRow(columns);
  activities.forEach((activity) =>
    sheet.addRow([
      activity.code,
      activity.fecha,
      activity.nombreActividad,
      activity.tipoActividad || activity.otroTipoActividad,
      reportStatusLabelForExport(activity),
      activity.responsibleName,
      activity.institutions.map((institution) => institution.name).join(", "),
      activity.selectedSpaces.join(", ") || activity.otherSpace,
      activity.participants.totalGeneral,
      formatReportNumber(calculateActivityHours(activity.horaInicio, activity.horaFin)),
    ]),
  );
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${config.style.reportColor.slice(1)}` } };
  [18, 14, 42, 24, 18, 30, 42, 36, 16, 14].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.autoFilter = { from: "A1", to: `J${activities.length + 1}` };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const buffer = await book.xlsx.writeBuffer();
  download(new Blob([buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "reporte-actividades-teatro.xlsx");
}

export async function shareConfiguredReportPdf(config: ReportConfig, activities: Activity[]) {
  const blob = await buildConfiguredReportPdf(config, activities);
  const file = new File([blob], `Reporte_TPT_${Date.now()}.pdf`, { type: "application/pdf" });
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({ title: "Reporte Teatro Pablo Tesak", files: [file] });
  } else {
    download(blob, file.name);
  }
}
