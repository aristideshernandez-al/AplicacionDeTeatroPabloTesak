import { test } from "node:test";
import assert from "node:assert/strict";
import { blankActivity } from "../lib/models";
import {
  calculateReportStats,
  createIndividualReportConfig,
  defaultReportFilters,
  filterReportActivities,
  reportPeriods,
  reportPresentations,
  reportOptionLabel,
  reportStatusLabel,
} from "../lib/report-data";

test("prepara por defecto un PDF individual ligado a una actividad", () => {
  const config = createIndividualReportConfig();
  assert.equal(config.scope, "INDIVIDUAL");
  assert.equal(config.period, "ACTIVITY");
  assert.equal(config.options.includePhotos, true);
  assert.equal(config.options.includeSignatures, true);
});

test("las opciones de presentación y periodo incluyen nombres y explicaciones claras", () => {
  assert.ok(reportPresentations.every((item) => item.label && item.description));
  assert.ok(reportPeriods.every((item) => item.label && item.description));
  assert.equal(reportPeriods.find((item) => item.id === "ACTIVITY")?.label, "Una actividad");
  assert.deepEqual(
    reportPeriods.map((item) => reportOptionLabel(item.id)),
    reportPeriods.map((item) => item.label),
  );
  assert.deepEqual(
    reportPresentations.map((item) => reportOptionLabel(item.id)),
    reportPresentations.map((item) => item.label),
  );
});

const profile = {
  uid: "report-test",
  email: "report@example.com",
  fullName: "Equipo de prueba",
  active: true,
  role: "USER",
  emailVerified: true,
};

function activity(overrides: Partial<ReturnType<typeof blankActivity>> = {}) {
  return {
    ...blankActivity(profile),
    id: "1",
    fecha: "22/10/2026",
    nombreActividad: "Taller de teatro",
    horaInicio: "23:30",
    horaFin: "00:30",
    tipoActividad: "Taller",
    responsibleName: "Equipo de prueba",
    selectedSpaces: ["Gran Sala"],
    institutions: [
      {
        name: "Centro Escolar Central",
        type: "Centro educativo",
        department: "San Salvador",
        municipality: "San Salvador",
        district: "Centro",
        infrastructureCode: "",
        contactName: "",
        contactPhone: "",
      },
    ],
    participants: {
      teachers: 2,
      studentsF: 4,
      studentsM: 3,
      community: 1,
      artists: 0,
      totalGeneral: 10,
    },
    status: "SUBMITTED" as const,
    ...overrides,
  };
}

test("replica los filtros de estado, espacio, actividad y fechas de Android", () => {
  const activities = [
    activity({ id: "october", fecha: "22/10/2026" }),
    activity({ id: "next-day", fecha: "2026-10-23", selectedSpaces: ["Lobby"] }),
    activity({ id: "bad-date", fecha: "31/02/2026" }),
  ];
  const filters = defaultReportFilters();
  filters.space = "Gran Sala";
  filters.status = "Programada";
  assert.deepEqual(
    filterReportActivities(activities, "SPECIFIC_DATE", {
      ...filters,
      specificDate: "2026-10-22",
    }).map((item) => item.id),
    ["october"],
  );
  assert.equal(reportStatusLabel("EVIADO"), "Programada");
  assert.equal(reportStatusLabel("APPROVED"), "Realizada");
  assert.equal(reportStatusLabel("ARCHIVED"), "Cancelada");
});

test("calcula los indicadores del encabezado con las mismas categorías de Android", () => {
  const activities = [
    activity({ id: "first" }),
    activity({ id: "second", fecha: "23/10/2026", participants: { ...activity().participants, totalGeneral: 5 } }),
    activity({ id: "third", selectedSpaces: ["Lobby"], institutions: [] }),
  ];
  assert.deepEqual(calculateReportStats(activities), {
    activities: 3,
    institutions: 1,
    participants: 25,
    theaterHours: 3,
    mostUsedSpace: "Gran Sala",
    topInstitution: "Centro Escolar Central",
  });
});
