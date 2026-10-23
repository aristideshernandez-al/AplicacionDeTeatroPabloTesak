import type { Timestamp } from "firebase/firestore";

export type Status =
  | "DRAFT"
  | "SUBMITTED"
  | "ENVIADO"
  | "EVIADO"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED";
export interface Profile {
  uid: string;
  fullName: string;
  email: string;
  role: string;
  active: boolean;
  emailVerified: boolean;
  profilePhotoUrl?: string | null;
  accountDeletionRequested?: boolean;
}
export interface Institution {
  name: string;
  type: string;
  department: string;
  municipality: string;
  district: string;
  infrastructureCode: string;
  contactName: string;
  contactPhone: string;
}
export interface Participants {
  teachers: number;
  studentsF: number;
  studentsM: number;
  community: number;
  artists: number;
  totalGeneral: number;
}
export interface TechnicalInfo {
  usedEquipment: boolean;
  equipment: string[];
  otherEquipment: string;
  observations: string;
  failures: string;
  requiresReview: string;
}
export interface Activity {
  id: string;
  code: string;
  responsibleId: string;
  responsibleName: string;
  areaIncidencia: string;
  tipoActividad: string;
  otroTipoActividad: string;
  nombreActividad: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  antecedentes: string;
  objetivo: string;
  descripcion: string;
  evaluacionSeguimiento: string;
  selectedSpaces: string[];
  otherSpace: string;
  institutions: Institution[];
  participants: Participants;
  technicalInfo: TechnicalInfo;
  photoUrls: string[];
  attendanceListUrls: string[];
  otherAnnexUrls: string[];
  status: Status;
  adminObservation: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}
export interface Notice {
  id: string;
  userId: string;
  title: string;
  message: string;
  activityId: string;
  type: string;
  isRead: boolean;
  createdAt?: Timestamp;
}
export interface Settings {
  areasIncidencia: string[];
  tiposActividad: string[];
  espacios: string[];
  tiposInstitucion: string[];
}
export const defaultSettings: Settings = {
  areasIncidencia: [
    "Arte",
    "Deporte",
    "Acción estratégica",
    "Educación",
    "Cultura",
  ],
  tiposActividad: [
    "Taller",
    "Ensayo",
    "Presentación artística",
    "Función educativa",
    "Reunión",
    "Exposición",
    "Conferencia",
  ],
  espacios: [
    "Gran Sala (Teatro)",
    "Salón de Danza",
    "Salón Multiusos",
    "Lobby",
    "Jardín / Exteriores",
    "Salón de Reuniones",
    "Área de Talleres",
  ],
  tiposInstitucion: [
    "Centro educativo",
    "Universidad",
    "ONG o fundación",
    "Empresa privada",
    "Entidad gubernamental",
  ],
};
export const emptyInstitution: Institution = {
  name: "",
  type: "",
  department: "",
  municipality: "",
  district: "",
  infrastructureCode: "",
  contactName: "",
  contactPhone: "",
};
export const statusLabels: Record<Status, string> = {
  DRAFT: "Borrador",
  SUBMITTED: "Aprobado",
  ENVIADO: "Aprobado",
  EVIADO: "Aprobado",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  ARCHIVED: "Archivado",
};
export const participantLabels = {
  teachers: "Docentes",
  studentsF: "Estudiantes mujeres",
  studentsM: "Estudiantes hombres",
  community: "Comunidad",
  artists: "Elenco / artistas",
};
export function blankActivity(profile: Profile): Activity {
  return {
    id: "",
    code: "",
    responsibleId: profile.uid,
    responsibleName: profile.fullName,
    areaIncidencia: "",
    tipoActividad: "",
    otroTipoActividad: "",
    nombreActividad: "",
    fecha: "",
    horaInicio: "",
    horaFin: "",
    antecedentes: "",
    objetivo: "",
    descripcion: "",
    evaluacionSeguimiento: "",
    selectedSpaces: [],
    otherSpace: "",
    institutions: [],
    participants: {
      teachers: 0,
      studentsF: 0,
      studentsM: 0,
      community: 0,
      artists: 0,
      totalGeneral: 0,
    },
    technicalInfo: {
      usedEquipment: false,
      equipment: [],
      otherEquipment: "",
      observations: "",
      failures: "",
      requiresReview: "",
    },
    photoUrls: [],
    attendanceListUrls: [],
    otherAnnexUrls: [],
    status: "DRAFT",
    adminObservation: "",
  };
}
export function participantTotal(p: Participants) {
  return p.teachers + p.studentsF + p.studentsM + p.community + p.artists;
}
export function formatCode(year: number, sequence: number) {
  return `TPT-${year}-${String(sequence).padStart(4, "0")}`;
}
export function isApproved(status: Status) {
  return ["APPROVED", "SUBMITTED", "ENVIADO", "EVIADO"].includes(status);
}
export function dateKey(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const m = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : "";
}
export function androidDate(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}
export function validateActivity(a: Activity) {
  if (
    !a.nombreActividad.trim() ||
    !a.fecha ||
    !a.areaIncidencia ||
    !a.tipoActividad
  )
    return "Completa nombre, fecha, área y tipo de actividad.";
  if (!a.horaInicio || !a.horaFin || a.horaFin <= a.horaInicio)
    return "Revisa las horas: el fin debe ser posterior al inicio.";
  if (!a.selectedSpaces.length && !a.otherSpace.trim())
    return "Selecciona al menos un espacio.";
  return "";
}
export function errorMessage(error: unknown) {
  const code = (error as { code?: string })?.code || "";
  if (/unavailable|network-request-failed|deadline-exceeded/.test(code))
    return "No se pudo conectar con Firebase. Revisa tu conexión y vuelve a intentar. Conservamos el formulario.";
  if (/permission-denied/.test(code))
    return "Firebase rechazó esta operación. Verifica tu rol y las reglas de seguridad del proyecto.";
  if (/unauthorized-domain/.test(code))
    return "Este dominio todavía no está autorizado en Firebase Authentication.";
  if (/popup-blocked/.test(code))
    return "Permite las ventanas emergentes para iniciar sesión con Google.";
  if (/popup-closed|cancelled-popup/.test(code))
    return "Se canceló el inicio de sesión.";
  if (/invalid-credential|wrong-password|user-not-found/.test(code))
    return "Correo o contraseña incorrectos.";
  if (/email-already-in-use/.test(code))
    return "Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.";
  if (/too-many-requests/.test(code))
    return "Demasiados intentos. Espera unos minutos antes de volver a intentar.";
  if (/weak-password/.test(code))
    return "La contraseña debe tener al menos seis caracteres.";
  return error instanceof Error
    ? error.message
    : "No se pudo completar la operación.";
}
