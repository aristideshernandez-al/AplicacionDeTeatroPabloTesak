"use client";
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Plus,
  Trash2,
  Check,
  Camera,
  FileText,
} from "lucide-react";
import {
  blankActivity,
  dateKey,
  emptyInstitution,
  errorMessage,
  participantLabels,
  participantTotal,
  validateActivity,
  type Activity,
  type Profile,
  type Institution,
  type Settings,
  type TechnicalInfo,
} from "@/lib/models";
import {
  emptyFiles,
  saveActivity,
  type EvidenceField,
  type EvidenceFiles,
} from "@/lib/repository";
import ActivityDetail from "./activity-detail";
import ScanInput from "./scan-input";

const steps = [
  "Actividad",
  "Espacios",
  "Instituciones",
  "Participantes",
  "Información técnica",
  "Evidencias",
  "Resumen",
];
const fields: [keyof Activity, string, boolean?][] = [
  ["nombreActividad", "Nombre de la actividad"],
  ["antecedentes", "Antecedentes", true],
  ["objetivo", "Objetivo", true],
  ["descripcion", "Descripción de la actividad", true],
  ["evaluacionSeguimiento", "Evaluación y seguimiento", true],
];
export default function ActivityForm({
  initial,
  profile,
  settings,
  institutions,
  onClose,
  onSaved,
}: {
  initial?: Activity;
  profile: Profile;
  settings: Settings;
  institutions: Institution[];
  onClose: () => void;
  onSaved: (a: Activity) => void;
}) {
  const key = `tpt-form:${profile.uid}:${initial?.id || "new"}`;
  const editingSentActivity = Boolean(initial?.id && initial.status !== "DRAFT");
  const [activity, setActivity] = useState<Activity>(
    initial || blankActivity(profile),
  );
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<EvidenceFiles>(emptyFiles);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [loaded, setLoaded] = useState(false);
  const saving = useRef(false);
  const latest = useRef(activity);
  const filesRef = useRef(files);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const value = JSON.parse(stored);
        if (value.responsibleId === profile.uid || profile.role === "ADMIN") {
          setActivity({ ...initial, ...value });
          setHint("Se recuperó el formulario guardado en este navegador.");
        }
      }
    } catch {
      setHint("El guardado local no está disponible en este navegador.");
    }
    setLoaded(true);
  }, [key, profile.uid, profile.role, initial]);
  useEffect(() => {
    latest.current = activity;
    filesRef.current = files;
    if (loaded)
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ ...activity, createdAt: null, updatedAt: null }),
        );
      } catch {
        setHint(
          "No se pudo guardar una copia local. Mantén esta pestaña abierta.",
        );
      }
  }, [activity, files, key, loaded]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (
        filesRef.current.photoUrls.length ||
        filesRef.current.attendanceListUrls.length ||
        saving.current
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  function patch(data: Partial<Activity>) {
    setActivity((previous) => ({ ...previous, ...data }));
  }
  function technical(data: Partial<TechnicalInfo>) {
    patch({ technicalInfo: { ...activity.technicalInfo, ...data } });
  }
  async function save(submit: boolean) {
    if (saving.current) return;
    if (submit) {
      const invalid = validateActivity(activity);
      if (invalid) {
        setError(invalid);
        return;
      }
    }
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const saved = await saveActivity(
        latest.current,
        submit ? "APPROVED" : "DRAFT",
        filesRef.current,
        (value, field, file) => {
          latest.current = value;
          setActivity(value);
          if (field && file)
            setFiles((old) => ({
              ...old,
              [field]: old[field].filter((f) => f !== file),
            }));
        },
      );
      localStorage.removeItem(key);
      onSaved(saved);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function addFiles(field: EvidenceField, selected: FileList | null) {
    if (!selected) return;
    const limit = field === "photoUrls" ? 8 : 4;
    const incoming = Array.from(selected);
    if (
      activity[field].length + files[field].length + incoming.length >
      limit
    ) {
      setError(`El límite es de ${limit} archivos en esta sección.`);
      return;
    }
    if (incoming.some((f) => f.size >= 25 * 1024 * 1024)) {
      setError("Cada archivo debe pesar menos de 25 MB.");
      return;
    }
    if (
      incoming.some((f) =>
        field === "photoUrls"
          ? !f.type.startsWith("image/")
          : f.type !== "application/pdf",
      )
    ) {
      setError(
        field === "photoUrls"
          ? "Selecciona imágenes."
          : "Selecciona documentos PDF.",
      );
      return;
    }
    setFiles((old) => ({ ...old, [field]: [...old[field], ...incoming] }));
    setError("");
  }
  return (
    <section className="editor">
      <div className="page-heading">
        <div>
          <button className="text-button" disabled={busy} onClick={onClose}>
            <ChevronLeft size={16} /> Volver a actividades
          </button>
          <h1>{initial ? "Editar actividad" : "Nueva actividad"}</h1>
          <p className="muted">Registra cada detalle, paso a paso.</p>
        </div>
        <span className="badge DRAFT">{activity.code || "Borrador"}</span>
      </div>
      <div className="stepper" aria-label="Pasos del formulario">
        {steps.map((name, i) => (
          <button
            key={name}
            className={step === i ? "current" : step > i ? "complete" : ""}
            disabled={busy}
            onClick={() => setStep(i)}
            aria-current={step === i ? "step" : undefined}
          >
            <span>{step > i ? <Check size={15} /> : i + 1}</span>
            <small>{name}</small>
          </button>
        ))}
      </div>
      {hint && (
        <p role="status" className="inline-note">
          {hint} Las selecciones de archivos deben repetirse si cierras la
          pestaña antes de subirlos.
        </p>
      )}
      {error && (
        <div role="alert" className="alert error">
          {error}
        </div>
      )}
      <div className="card form-card">
        <div className="section-title">
          <span className="eyebrow">PASO {step + 1} DE 7</span>
          <h2>{steps[step]}</h2>
        </div>
        <fieldset disabled={busy} className="form-fieldset">
          {step === 0 && (
            <div className="form-grid">
              <label>
                Área de incidencia
                <select
                  value={activity.areaIncidencia}
                  onChange={(e) => patch({ areaIncidencia: e.target.value })}
                >
                  <option value="">Seleccionar área</option>
                  {settings.areasIncidencia.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Tipo de actividad
                <select
                  value={activity.tipoActividad}
                  onChange={(e) => patch({ tipoActividad: e.target.value })}
                >
                  <option value="">Seleccionar tipo</option>
                  {settings.tiposActividad.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                  <option>Otro</option>
                </select>
              </label>
              {activity.tipoActividad === "Otro" && (
                <label>
                  Otro tipo
                  <input
                    value={activity.otroTipoActividad}
                    onChange={(e) =>
                      patch({ otroTipoActividad: e.target.value })
                    }
                  />
                </label>
              )}
              <label>
                Fecha
                <input
                  type="date"
                  value={dateKey(activity.fecha)}
                  onChange={(e) => patch({ fecha: e.target.value })}
                />
              </label>
              <label>
                Hora de inicio
                <input
                  type="time"
                  value={activity.horaInicio}
                  onChange={(e) => patch({ horaInicio: e.target.value })}
                />
              </label>
              <label>
                Hora de fin
                <input
                  type="time"
                  value={activity.horaFin}
                  onChange={(e) => patch({ horaFin: e.target.value })}
                />
              </label>
              {fields.map(([key, label, multiline]) => (
                <label className="span-2" key={key}>
                  {label}
                  {multiline ? (
                    <textarea
                      rows={3}
                      value={String(activity[key])}
                      onChange={(e) => patch({ [key]: e.target.value })}
                    />
                  ) : (
                    <input
                      value={String(activity[key])}
                      onChange={(e) => patch({ [key]: e.target.value })}
                    />
                  )}
                </label>
              ))}
            </div>
          )}
          {step === 1 && (
            <>
              <p className="muted">Selecciona los espacios utilizados.</p>
              <div className="choices">
                {settings.espacios.map((space) => (
                  <label className="choice" key={space}>
                    <input
                      type="checkbox"
                      checked={activity.selectedSpaces.includes(space)}
                      onChange={(e) =>
                        patch({
                          selectedSpaces: e.target.checked
                            ? [...activity.selectedSpaces, space]
                            : activity.selectedSpaces.filter(
                                (s) => s !== space,
                              ),
                        })
                      }
                    />
                    {space}
                  </label>
                ))}
              </div>
              <label>
                Otro espacio
                <input
                  value={activity.otherSpace}
                  onChange={(e) => patch({ otherSpace: e.target.value })}
                />
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <label>
                Agregar desde el catálogo
                <select
                  value=""
                  onChange={(e) => {
                    const inst = institutions.find(
                      (i) => i.name === e.target.value,
                    );
                    if (inst)
                      patch({ institutions: [...activity.institutions, inst] });
                  }}
                >
                  <option value="">Selecciona una institución</option>
                  {institutions.map((i) => (
                    <option key={i.name}>{i.name}</option>
                  ))}
                </select>
              </label>
              {activity.institutions.map((inst, index) => (
                <div className="institution-block" key={index}>
                  <div className="row">
                    <h3>Institución {index + 1}</h3>
                    <button
                      aria-label={`Quitar institución ${index + 1}`}
                      className="icon-button danger"
                      onClick={() =>
                        patch({
                          institutions: activity.institutions.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <InstitutionFields
                    institution={inst}
                    types={settings.tiposInstitucion}
                    onChange={(value) =>
                      patch({
                        institutions: activity.institutions.map((old, i) =>
                          i === index ? value : old,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <button
                className="secondary"
                onClick={() =>
                  patch({
                    institutions: [
                      ...activity.institutions,
                      { ...emptyInstitution },
                    ],
                  })
                }
              >
                <Plus size={16} /> Agregar institución
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <div className="form-grid">
                {Object.entries(participantLabels).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      min={0}
                      step={1}
                      max={100000}
                      value={
                        activity.participants[
                          key as keyof typeof participantLabels
                        ]
                      }
                      onChange={(e) =>
                        patch({
                          participants: {
                            ...activity.participants,
                            [key]: Math.min(
                              100000,
                              Math.max(0, Math.trunc(Number(e.target.value))),
                            ),
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="total-box">
                <span>Total general de participantes</span>
                <strong>{participantTotal(activity.participants)}</strong>
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={activity.technicalInfo.usedEquipment}
                  onChange={(e) =>
                    technical({ usedEquipment: e.target.checked })
                  }
                />
                Se utilizó equipo técnico
              </label>
              <div className="choices">
                {[
                  "Sistema de sonido",
                  "Micrófonos inalámbricos",
                  "Iluminación escénica",
                  "Consola de audio",
                  "Consola de iluminación",
                  "Vestuario",
                ].map((equipment) => (
                  <label className="choice" key={equipment}>
                    <input
                      type="checkbox"
                      checked={activity.technicalInfo.equipment.includes(
                        equipment,
                      )}
                      onChange={(e) =>
                        technical({
                          equipment: e.target.checked
                            ? [...activity.technicalInfo.equipment, equipment]
                            : activity.technicalInfo.equipment.filter(
                                (v) => v !== equipment,
                              ),
                        })
                      }
                    />
                    {equipment}
                  </label>
                ))}
              </div>
              {(
                [
                  ["otherEquipment", "Otro equipo"],
                  ["observations", "Observaciones técnicas"],
                  ["failures", "Fallas detectadas"],
                  ["requiresReview", "Equipo que requiere revisión"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <textarea
                    rows={2}
                    value={activity.technicalInfo[key]}
                    onChange={(e) => technical({ [key]: e.target.value })}
                  />
                </label>
              ))}
            </>
          )}
          {step === 5 && (
            <>
              <ScanInput
                onReady={(file) => {
                  if (
                    activity.attendanceListUrls.length +
                      files.attendanceListUrls.length >=
                    4
                  ) {
                    setError("El límite es de 4 listas PDF.");
                    return;
                  }
                  if (file.size >= 25 * 1024 * 1024) {
                    setError("El PDF debe pesar menos de 25 MB.");
                    return;
                  }
                  setFiles((old) => ({
                    ...old,
                    attendanceListUrls: [...old.attendanceListUrls, file],
                  }));
                }}
              />
              <p className="muted">
                Adjunta fotografías o listas de asistencia. En el teléfono
                puedes tomar fotos desde el selector de archivos.
              </p>
              {(
                [
                  "photoUrls",
                  "attendanceListUrls",
                ] as EvidenceField[]
              ).map((field) => (
                <div className="upload-section" key={field}>
                  <h3>
                    {field === "photoUrls" ? (
                      <Camera size={18} />
                    ) : (
                      <FileText size={18} />
                    )}{" "}
                    {field === "photoUrls"
                      ? "Fotografías (máximo 8)"
                      : "Listas de asistencia (máximo 4 PDFs)"}
                  </h3>
                  <input
                    aria-label={`Adjuntar ${field === "photoUrls" ? "fotografías" : field === "attendanceListUrls" ? "listas de asistencia" : "otros anexos"}`}
                    type="file"
                    accept={
                      field === "photoUrls" ? "image/*" : "application/pdf"
                    }
                    multiple
                    onChange={(e) => {
                      addFiles(field, e.target.files);
                      e.target.value = "";
                    }}
                  />
                  {activity[field].map((url, i) => (
                    <div className="attachment-row" key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        Archivo guardado {i + 1}
                      </a>
                      <button
                        className="text-button danger"
                        onClick={() =>
                          patch({
                            [field]: activity[field].filter((v) => v !== url),
                          })
                        }
                      >
                        Quitar de actividad
                      </button>
                    </div>
                  ))}
                  {files[field].map((file, i) => (
                    <div className="attachment-row" key={`${file.name}-${i}`}>
                      <span>
                        {file.name} · {(file.size / 1048576).toFixed(1)} MB
                      </span>
                      <button
                        className="icon-button danger"
                        aria-label={`Quitar ${file.name}`}
                        onClick={() =>
                          setFiles((old) => ({
                            ...old,
                            [field]: old[field].filter(
                              (_, index) => index !== i,
                            ),
                          }))
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
          {step === 6 && (
            <>
              <ActivityDetail
                activity={{
                  ...activity,
                  participants: {
                    ...activity.participants,
                    totalGeneral: participantTotal(activity.participants),
                  },
                }}
              />
              {Object.values(files).some((list) => list.length > 0) && (
                <p className="alert">
                  Hay{" "}
                  {Object.values(files).reduce(
                    (sum, list) => sum + list.length,
                    0,
                  )}{" "}
                  archivos pendientes de subir. Se enviarán al guardar.
                </p>
              )}
            </>
          )}
        </fieldset>
        <div className="form-actions">
          <button
            className="secondary"
            disabled={busy || step === 0}
            onClick={() => setStep(step - 1)}
          >
            <ChevronLeft size={16} />
            Anterior
          </button>
          <div>
            {!editingSentActivity && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => save(false)}
              >
                <Save size={16} />
                {busy ? "Guardando…" : "Guardar borrador"}
              </button>
            )}
            {step < 6 ? (
              <button
                className="primary"
                disabled={busy}
                onClick={() => setStep(step + 1)}
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                className="primary"
                disabled={busy}
                onClick={() => save(true)}
              >
                <Send size={16} />
                {busy
                  ? editingSentActivity
                    ? "Guardando…"
                    : "Enviando…"
                  : editingSentActivity
                    ? "Guardar cambios"
                    : "Enviar actividad"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
export function InstitutionFields({
  institution,
  types,
  onChange,
}: {
  institution: Institution;
  types: string[];
  onChange: (i: Institution) => void;
}) {
  return (
    <div className="form-grid">
      {(
        [
          ["name", "Nombre de la institución"],
          ["type", "Tipo de institución"],
          ["department", "Departamento"],
          ["municipality", "Municipio"],
          ["district", "Distrito"],
          ["infrastructureCode", "Código de infraestructura"],
          ["contactName", "Persona de contacto"],
          ["contactPhone", "Teléfono de contacto"],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          {label}
          {key === "type" ? (
            <select
              value={institution[key]}
              onChange={(e) =>
                onChange({ ...institution, [key]: e.target.value })
              }
            >
              <option value="">Seleccionar tipo</option>
              {institution[key] && !types.includes(institution[key]) && (
                <option value={institution[key]}>{institution[key]}</option>
              )}
              {types.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          ) : (
            <input
              type={key === "contactPhone" ? "tel" : "text"}
              value={institution[key]}
              onChange={(e) =>
                onChange({ ...institution, [key]: e.target.value })
              }
            />
          )}
        </label>
      ))}
    </div>
  );
}
