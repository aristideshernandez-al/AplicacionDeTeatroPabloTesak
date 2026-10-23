import { test } from "node:test";
import assert from "node:assert/strict";
import {
  androidDate,
  dateKey,
  formatCode,
  participantTotal,
  isSubmitted,
  errorMessage,
  blankActivity,
  validateActivity,
} from "../lib/models";
import { csvCell } from "../lib/reports";
test("conserva el formato de códigos Android sin truncar secuencias", () => {
  assert.equal(formatCode(2026, 1), "TPT-2026-0001");
  assert.equal(formatCode(2026, 12345), "TPT-2026-12345");
});
test("fechas de Android y web se filtran juntas", () => {
  assert.equal(dateKey("22/10/2026"), "2026-10-22");
  assert.equal(dateKey("2026-10-22"), "2026-10-22");
  assert.equal(androidDate("2026-10-22"), "22/10/2026");
});
test("incluye los estados históricos Android en pendientes", () => {
  for (const s of ["SUBMITTED", "ENVIADO", "EVIADO"] as const)
    assert.equal(isSubmitted(s), true);
  assert.equal(isSubmitted("DRAFT"), false);
});
test("suma todas las categorías de participantes", () =>
  assert.equal(
    participantTotal({
      teachers: 13,
      studentsF: 40,
      studentsM: 40,
      community: 20,
      artists: 18,
      totalGeneral: 0,
    }),
    131,
  ));
test("un formulario incompleto se conserva como borrador pero no se envía", () => {
  const a = blankActivity({
    uid: "test",
    email: "test@example.com",
    fullName: "Prueba",
    active: true,
    role: "USER",
    emailVerified: true,
  });
  assert.ok(validateActivity(a));
  Object.assign(a, {
    nombreActividad: "Taller",
    fecha: "22/10/2026",
    areaIncidencia: "Arte",
    tipoActividad: "Taller",
    horaInicio: "09:00",
    horaFin: "10:00",
    selectedSpaces: ["Gran Sala (Teatro)"],
  });
  assert.equal(validateActivity(a), "");
  a.horaFin = "08:00";
  assert.ok(validateActivity(a));
});
test("errores de conexión y permisos se explican en español", () => {
  assert.match(errorMessage({ code: "unavailable" }), /conexión/);
  assert.match(errorMessage({ code: "firestore/permission-denied" }), /reglas/);
});
test("CSV neutraliza fórmulas y escapa comillas", () => {
  assert.equal(csvCell('=HYPERLINK("url")'), '"\'=HYPERLINK(""url"")"');
  assert.equal(csvCell("Teatro, arte"), '"Teatro, arte"');
});
