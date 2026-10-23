import type { Activity, Status } from "./models";

export const REPORT_ALL = "Todos";

export const reportScopes = [
  { id: "INDIVIDUAL", title: "Individual", description: "Un solo evento" },
  { id: "GENERAL_PERIODIC", title: "General", description: "Resumen del periodo" },
  { id: "BY_INSTITUTION", title: "Por institución", description: "Gestión por entidad" },
  { id: "STUDENT_GENDER", title: "Participantes", description: "Alumnos y público" },
  { id: "BY_SPACE", title: "Por espacio", description: "Uso de áreas" },
  { id: "STATISTICAL", title: "Estadístico", description: "Indicadores clave" },
] as const;
export type ReportScopeId = (typeof reportScopes)[number]["id"];

export const reportPresentations = [
  { id: "EXECUTIVE_SUMMARY", label: "Resumen Ejecutivo" },
  { id: "TECHNICAL_REPORT", label: "Informe Técnico" },
  { id: "INSTITUTIONAL_REPORT", label: "Informe Institucional" },
  { id: "ACTIVITY_MEMORY", label: "Memoria de Actividades" },
  { id: "STATISTICAL_REPORT", label: "Reporte Estadístico" },
] as const;
export type ReportPresentationId =
  (typeof reportPresentations)[number]["id"];

export const reportPeriods = [
  { id: "ACTIVITY", label: "Por Actividad" },
  { id: "MONTHLY", label: "Mes Actual" },
  { id: "SPECIFIC_MONTH", label: "Mes Específico" },
  { id: "SPECIFIC_DATE", label: "Fecha Específica" },
  { id: "TRIMESTRE", label: "Trimestral" },
  { id: "SEMESTER", label: "Semestral" },
  { id: "ANNUAL", label: "Anual" },
  { id: "ALL", label: "Todo" },
] as const;
export type ReportPeriodId = (typeof reportPeriods)[number]["id"];

export const photoFrameStyles = [
  { id: "CREATIVE", label: "Creativo" },
  { id: "CLASSIC", label: "Clásico" },
  { id: "ROUNDED", label: "Redondeado" },
  { id: "POLAROID", label: "Polaroid" },
  { id: "MINIMAL", label: "Minimalista" },
  { id: "TAPE", label: "Cinta" },
] as const;
export type PhotoFrameStyleId = (typeof photoFrameStyles)[number]["id"];

export interface ReportFilters {
  space: string;
  institution: string;
  responsible: string;
  activityType: string;
  status: string;
  registeredBy: string;
  specificDate: string;
  specificMonth: number;
  specificYear: number;
}
export const defaultReportFilters = (): ReportFilters => ({
  space: REPORT_ALL,
  institution: REPORT_ALL,
  responsible: REPORT_ALL,
  activityType: REPORT_ALL,
  status: REPORT_ALL,
  registeredBy: REPORT_ALL,
  specificDate: "",
  specificMonth: -1,
  specificYear: -1,
});

export interface ReportOptions {
  includePhotos: boolean;
  includeSignatures: boolean;
  includeAnnexes: boolean;
  includeObservations: boolean;
  includeStats: boolean;
  includeParticipants: boolean;
}
export const defaultReportOptions: ReportOptions = {
  includePhotos: true,
  includeSignatures: true,
  includeAnnexes: true,
  includeObservations: true,
  includeStats: true,
  includeParticipants: true,
};

export interface ReportStyle {
  reportColor: string;
  headerTextColor: string;
  frameColor: string;
  photoFrameStyle: PhotoFrameStyleId;
}
export const defaultReportStyle: ReportStyle = {
  reportColor: "#C7AB97",
  headerTextColor: "#FFFFFF",
  frameColor: "#C7AB97",
  photoFrameStyle: "CREATIVE",
};

export function createIndividualReportConfig(): ReportConfig {
  return {
    scope: "INDIVIDUAL",
    presentation: "EXECUTIVE_SUMMARY",
    period: "ACTIVITY",
    filters: defaultReportFilters(),
    options: { ...defaultReportOptions },
    style: { ...defaultReportStyle },
  };
}

export interface ReportConfig {
  scope: ReportScopeId;
  presentation: ReportPresentationId;
  period: ReportPeriodId;
  filters: ReportFilters;
  options: ReportOptions;
  style: ReportStyle;
}

export interface ReportStats {
  activities: number;
  institutions: number;
  participants: number;
  theaterHours: number;
  mostUsedSpace: string;
  topInstitution: string;
}

export function reportStatusLabel(status: Status) {
  switch (status) {
    case "APPROVED":
      return "Realizada";
    case "DRAFT":
    case "SUBMITTED":
    case "ENVIADO":
    case "EVIADO":
      return "Programada";
    case "REJECTED":
    case "ARCHIVED":
      return "Cancelada";
  }
}

export function parseReportDate(value: string): Date | null {
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const slash = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const match = iso ?? slash;
  if (!match) return null;
  const year = Number(iso ? match[1] : match[3]);
  const month = Number(iso ? match[2] : match[2]);
  const day = Number(iso ? match[3] : match[1]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return null;
  return date;
}

function matchesFilter(filter: string, values: string[]) {
  return (
    filter === REPORT_ALL ||
    values.some((value) => value.toLocaleLowerCase("es-SV") === filter.toLocaleLowerCase("es-SV"))
  );
}

function matchesPeriod(
  activity: Activity,
  period: ReportPeriodId,
  filters: ReportFilters,
  now: Date,
) {
  if (period === "ALL" || period === "ACTIVITY") return true;
  const date = parseReportDate(activity.fecha);
  if (!date) return false;
  if (period === "MONTHLY")
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  if (period === "SPECIFIC_MONTH")
    return (
      (filters.specificMonth < 0 || date.getMonth() === filters.specificMonth) &&
      (filters.specificYear < 1 || date.getFullYear() === filters.specificYear)
    );
  if (period === "SPECIFIC_DATE") {
    const selectedDate = parseReportDate(filters.specificDate);
    return Boolean(
      selectedDate &&
        selectedDate.getFullYear() === date.getFullYear() &&
        selectedDate.getMonth() === date.getMonth() &&
        selectedDate.getDate() === date.getDate(),
    );
  }
  if (period === "TRIMESTRE")
    return (
      Math.floor(date.getMonth() / 3) === Math.floor(now.getMonth() / 3) &&
      date.getFullYear() === now.getFullYear()
    );
  if (period === "SEMESTER")
    return (
      (date.getMonth() < 6) === (now.getMonth() < 6) &&
      date.getFullYear() === now.getFullYear()
    );
  return date.getFullYear() === now.getFullYear();
}

export function filterReportActivities(
  activities: Activity[],
  period: ReportPeriodId,
  filters: ReportFilters,
  now = new Date(),
) {
  return activities
    .filter(
      (activity) =>
        matchesPeriod(activity, period, filters, now) &&
        matchesFilter(filters.space, [...activity.selectedSpaces, activity.otherSpace]) &&
        matchesFilter(filters.institution, activity.institutions.map((i) => i.name)) &&
        matchesFilter(filters.responsible, [activity.responsibleName]) &&
        matchesFilter(filters.activityType, [activity.tipoActividad || activity.otroTipoActividad]) &&
        matchesFilter(filters.status, [reportStatusLabel(activity.status)]) &&
        matchesFilter(filters.registeredBy, [activity.responsibleName || activity.responsibleId]),
    )
    .sort((a, b) => {
      const dateA = parseReportDate(a.fecha)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const dateB = parseReportDate(b.fecha)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return dateA - dateB || a.nombreActividad.localeCompare(b.nombreActividad, "es-SV");
    });
}

export function calculateReportStats(activities: Activity[]): ReportStats {
  const institutions = activities.flatMap((a) => a.institutions.map((i) => i.name)).filter(Boolean);
  const spaces = activities.flatMap((a) => [...a.selectedSpaces, a.otherSpace]).filter(Boolean);
  const mostUsedSpace = mostFrequent(spaces) ?? "-";
  const participationByInstitution = new Map<string, number>();
  activities.forEach((activity) =>
    activity.institutions.forEach((institution) =>
      participationByInstitution.set(
        institution.name,
        (participationByInstitution.get(institution.name) ?? 0) +
          activity.participants.totalGeneral,
      ),
    ),
  );
  const topInstitution =
    [...participationByInstitution.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
  return {
    activities: activities.length,
    institutions: new Set(institutions).size,
    participants: activities.reduce((sum, a) => sum + a.participants.totalGeneral, 0),
    theaterHours: activities.reduce((sum, a) => sum + calculateActivityHours(a.horaInicio, a.horaFin), 0),
    mostUsedSpace,
    topInstitution,
  };
}

function mostFrequent(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function calculateActivityHours(start: string, end: string) {
  const parse = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return Number.isFinite(hours) && Number.isFinite(minutes)
      ? hours * 60 + minutes
      : null;
  };
  const startMinutes = parse(start);
  let endMinutes = parse(end);
  if (startMinutes === null || endMinutes === null) return 0;
  if (endMinutes < startMinutes) endMinutes += 24 * 60;
  return Math.max(0, endMinutes - startMinutes) / 60;
}

export function formatReportNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function buildActivityDetailRows(activity: Activity) {
  const rows: [string, string][] = [];
  const add = (label: string, value: string) => {
    if (value.trim()) rows.push([label, value]);
  };
  add("Nombre", activity.nombreActividad);
  add("Código", activity.code);
  add("Fecha", activity.fecha);
  add("Horario", [activity.horaInicio, activity.horaFin].filter(Boolean).join(" - "));
  add("Área de Incidencia", activity.areaIncidencia);
  add("Tipo de Actividad", activity.tipoActividad || activity.otroTipoActividad);
  add("Responsable", activity.responsibleName);
  add(
    "Instituciones",
    activity.institutions
      .map((i) => [i.name, i.type ? `(${i.type})` : ""].filter(Boolean).join(" "))
      .join("\n"),
  );
  add("Espacios", [...activity.selectedSpaces, activity.otherSpace].filter(Boolean).join(", "));
  return rows;
}
