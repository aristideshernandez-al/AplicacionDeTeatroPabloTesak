"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Image as ImageIcon,
  MapPin,
  Palette,
  Printer,
  RefreshCcw,
  Share2,
  Users,
} from "lucide-react";
import type { Activity as ActivityRecord } from "@/lib/models";
import {
  buildConfiguredReportPdf,
  exportConfiguredReportCsv,
  exportConfiguredReportExcel,
  shareConfiguredReportPdf,
} from "@/lib/reports";
import {
  calculateReportStats,
  defaultReportFilters,
  defaultReportOptions,
  defaultReportStyle,
  filterReportActivities,
  photoFrameStyles,
  reportPeriods,
  reportScopes,
  reportStatusLabel,
  reportPresentations,
  type ReportConfig,
  type ReportFilters,
  type ReportOptions,
  type ReportPeriodId,
  type ReportPresentationId,
  type ReportScopeId,
  type ReportStyle,
} from "@/lib/report-data";

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const reportColors = [
  ["Institucional", "#C7AB97"],
  ["Morado", "#6650A4"],
  ["Verde", "#2E7D32"],
  ["Azul", "#1F4E79"],
  ["Rojo vino", "#7B1E3A"],
  ["Grafito", "#455A64"],
] as const;
const frameColors = [
  ["Institucional", "#C7AB97"],
  ["Blanco", "#FFFFFF"],
  ["Morado", "#6650A4"],
  ["Verde", "#2E7D32"],
  ["Dorado", "#B08D57"],
  ["Grafito", "#455A64"],
] as const;
const scopeIcons = [FileText, BarChart3, Building2, Users, MapPin, Activity];

function unique(values: string[]) {
  return [...new Set(values.filter((value) => value.trim()))].sort((a, b) =>
    a.localeCompare(b, "es-SV"),
  );
}

function ReportSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="report-field">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ColorChoice({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="report-color-choice">
      <label>{title}</label>
      <div className="report-color-options">
        {options.map(([name, color]) => (
          <button
            key={name}
            type="button"
            className={value.toUpperCase() === color ? "selected" : ""}
            title={`${name}: ${color}`}
            aria-label={`${title}: ${name}`}
            aria-pressed={value.toUpperCase() === color}
            onClick={() => onChange(color)}
            style={{ "--report-swatch": color } as React.CSSProperties}
          >
            {value.toUpperCase() === color && <Check size={14} />}
          </button>
        ))}
        <label className="report-custom-color" title="Color personalizado">
          <input
            type="color"
            aria-label={`${title}: color personalizado`}
            value={/^#[\da-f]{6}$/i.test(value) ? value : "#C7AB97"}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
          />
          <Palette size={15} />
        </label>
      </div>
      <small>{value.toUpperCase()}</small>
    </div>
  );
}

export function ReportBuilder({
  activities,
}: {
  activities: ActivityRecord[];
}) {
  const [scope, setScope] = useState<ReportScopeId>("INDIVIDUAL");
  const [presentation, setPresentation] = useState<ReportPresentationId>("EXECUTIVE_SUMMARY");
  const [period, setPeriod] = useState<ReportPeriodId>("ACTIVITY");
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [filters, setFilters] = useState<ReportFilters>(defaultReportFilters);
  const [options, setOptions] = useState<ReportOptions>(defaultReportOptions);
  const [style, setStyle] = useState<ReportStyle>(defaultReportStyle);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const spaces = useMemo(() => unique(activities.flatMap((a) => [...a.selectedSpaces, a.otherSpace])), [activities]);
  const institutions = useMemo(() => unique(activities.flatMap((a) => a.institutions.map((i) => i.name))), [activities]);
  const responsibles = useMemo(() => unique(activities.map((a) => a.responsibleName)), [activities]);
  const types = useMemo(() => unique(activities.map((a) => a.tipoActividad || a.otroTipoActividad)), [activities]);
  const registeredBy = useMemo(() => unique(activities.map((a) => a.responsibleName || a.responsibleId)), [activities]);
  const filtered = useMemo(() => filterReportActivities(activities, period, filters), [activities, period, filters]);
  const included = useMemo(
    () => scope === "INDIVIDUAL" ? filtered.filter((activity) => activity.id === selectedActivityId) : filtered,
    [filtered, scope, selectedActivityId],
  );
  const stats = useMemo(() => calculateReportStats(included), [included]);
  const canGenerate = included.length > 0 && (scope !== "INDIVIDUAL" || Boolean(selectedActivityId));
  const config: ReportConfig = { scope, presentation, period, filters, options, style };

  function changeScope(next: ReportScopeId) {
    setScope(next);
    setSelectedActivityId("");
    setPeriod(next === "INDIVIDUAL" ? "ACTIVITY" : period === "ACTIVITY" ? "MONTHLY" : period);
    if (next === "STATISTICAL") setPresentation("STATISTICAL_REPORT");
    if (next === "BY_INSTITUTION") setPresentation("INSTITUTIONAL_REPORT");
    if (next === "BY_SPACE") setPresentation("TECHNICAL_REPORT");
  }

  function closePreview() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
  }

  async function perform(label: string, task: () => Promise<unknown>, success?: string) {
    setWorking(label);
    setError("");
    setMessage("");
    try {
      await task();
      if (success) setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar la exportación.");
    } finally {
      setWorking("");
    }
  }

  async function showPdfPreview() {
    await perform("Preparando vista previa del PDF…", async () => {
      const blob = await buildConfiguredReportPdf(config, included);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
    });
  }

  return (
    <div className="report-builder">
      <section className="card report-section">
        <div className="report-section-heading"><FileText size={20} /><div><h2>Tipo de reporte</h2><p>Elige la estructura de análisis que necesitas.</p></div></div>
        <div className="report-scope-grid">
          {reportScopes.map((item, index) => {
            const Icon = scopeIcons[index];
            return (
              <button key={item.id} type="button" className={`report-scope ${scope === item.id ? "active" : ""}`} aria-pressed={scope === item.id} onClick={() => changeScope(item.id)}>
                <Icon size={22} /><strong>{item.title}</strong><small>{item.description}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card report-section">
        <div className="report-section-heading"><CalendarDays size={20} /><div><h2>Presentación y periodo</h2><p>Define el formato narrativo y el rango temporal.</p></div></div>
        <div className="report-control-grid">
          <ReportSelect label="Formato narrativo" value={presentation} options={reportPresentations.map((value) => value.id)} onChange={(value) => setPresentation(value as ReportPresentationId)} />
          <ReportSelect label="Periodo" value={period} options={reportPeriods.filter((value) => scope === "INDIVIDUAL" || value.id !== "ACTIVITY").map((value) => value.id)} onChange={(value) => setPeriod(value as ReportPeriodId)} />
        </div>
        <div className="report-selected-labels">
          <span>{reportPresentations.find((item) => item.id === presentation)?.label}</span>
          <span>{reportPeriods.find((item) => item.id === period)?.label}</span>
        </div>
        {period === "SPECIFIC_DATE" && (
          <label className="report-field report-date-field">Fecha específica<input type="date" value={filters.specificDate} onChange={(event) => setFilters({ ...filters, specificDate: event.target.value })} /></label>
        )}
        {period === "SPECIFIC_MONTH" && (
          <div className="report-control-grid report-month-controls">
            <label className="report-field">Mes<select value={filters.specificMonth} onChange={(event) => setFilters({ ...filters, specificMonth: Number(event.target.value) })}><option value={-1}>Todos</option>{monthNames.map((month, index) => <option key={month} value={index}>{month}</option>)}</select></label>
            <label className="report-field">Año<input type="number" min="2000" max="2100" placeholder="Todos" value={filters.specificYear > 0 ? filters.specificYear : ""} onChange={(event) => setFilters({ ...filters, specificYear: Number(event.target.value) || -1 })} /></label>
          </div>
        )}
      </section>

      <section className="card report-section">
        <div className="report-section-heading"><Filter size={20} /><div><h2>Filtros avanzados</h2><p>Aplica criterios sobre los registros disponibles en Firebase.</p></div></div>
        <div className="report-control-grid report-filter-grid">
          <ReportSelect label="Espacio del teatro" value={filters.space} options={["Todos", ...spaces]} onChange={(space) => setFilters({ ...filters, space })} />
          <ReportSelect label="Institución" value={filters.institution} options={["Todos", ...institutions]} onChange={(institution) => setFilters({ ...filters, institution })} />
          <ReportSelect label="Responsable" value={filters.responsible} options={["Todos", ...responsibles]} onChange={(responsible) => setFilters({ ...filters, responsible })} />
          <ReportSelect label="Tipo de actividad" value={filters.activityType} options={["Todos", ...types]} onChange={(activityType) => setFilters({ ...filters, activityType })} />
          <ReportSelect label="Estado" value={filters.status} options={["Todos", "Realizada", "Programada", "Cancelada"]} onChange={(status) => setFilters({ ...filters, status })} />
          <ReportSelect label="Usuario que registró" value={filters.registeredBy} options={["Todos", ...registeredBy]} onChange={(registeredByValue) => setFilters({ ...filters, registeredBy: registeredByValue })} />
        </div>
        <button type="button" className="text-button report-reset" onClick={() => setFilters(defaultReportFilters())}><RefreshCcw size={16} /> Limpiar filtros</button>
      </section>

      <section className="card report-section">
        <div className="report-section-heading"><CheckCircle2 size={20} /><div><h2>Opciones del reporte</h2><p>Selecciona el contenido que debe aparecer en el PDF.</p></div></div>
        <div className="report-options-grid">
          {([
            ["includePhotos", "Incluir fotografías", ImageIcon],
            ["includeSignatures", "Incluir listas de asistencia", FileText],
            ["includeAnnexes", "Incluir documentos anexos", FileSpreadsheet],
            ["includeObservations", "Incluir observaciones", FileText],
            ["includeStats", "Incluir estadísticas", BarChart3],
            ["includeParticipants", "Incluir participantes", Users],
          ] as const).map(([key, label, Icon]) => (
            <label className="report-option" key={key}><input type="checkbox" checked={options[key]} onChange={(event) => setOptions({ ...options, [key]: event.target.checked })} /><Icon size={17} /><span>{label}</span></label>
          ))}
        </div>
      </section>

      <section className="card report-section">
        <div className="report-section-heading"><Palette size={20} /><div><h2>Diseño del reporte</h2><p>Conserva la plantilla institucional y ajusta colores y marcos.</p></div></div>
        <div className="report-style-grid">
          <ColorChoice title="Fondo del encabezado" value={style.reportColor} options={reportColors} onChange={(reportColor) => setStyle({ ...style, reportColor })} />
          <ColorChoice title="Texto y logo del encabezado" value={style.headerTextColor} options={[["Blanco", "#FFFFFF"], ["Negro", "#000000"], ["Morado", "#43205F"], ["Grafito", "#455A64"]]} onChange={(headerTextColor) => setStyle({ ...style, headerTextColor })} />
          <ColorChoice title="Color del marco de evidencias" value={style.frameColor} options={frameColors} onChange={(frameColor) => setStyle({ ...style, frameColor })} />
        </div>
        <ReportSelect label="Tipo de marco para evidencias" value={style.photoFrameStyle} options={photoFrameStyles.map((item) => item.id)} onChange={(photoFrameStyle) => setStyle({ ...style, photoFrameStyle: photoFrameStyle as ReportStyle["photoFrameStyle"] })} />
        <div className="report-selected-labels"><span>{photoFrameStyles.find((item) => item.id === style.photoFrameStyle)?.label}</span></div>
      </section>

      <section className="card report-section report-stat-card">
        <div className="report-section-heading"><BarChart3 size={20} /><div><h2>Estadísticas automáticas</h2><p>Calculadas sobre las actividades incluidas.</p></div></div>
        <div className="report-stat-grid">
          {[["Actividades", stats.activities], ["Instituciones", stats.institutions], ["Participantes", stats.participants], ["Horas", stats.theaterHours % 1 ? stats.theaterHours.toFixed(1) : stats.theaterHours], ["Espacio top", stats.mostUsedSpace], ["Institución top", stats.topInstitution]].map(([label, value]) => <div key={String(label)} className="report-stat"><small>{label}</small><strong>{value}</strong></div>)}
        </div>
      </section>

      <section className="card report-section">
        <div className="report-section-heading"><Users size={20} /><div><h2>{scope === "INDIVIDUAL" ? "Seleccionar actividad específica" : `Actividades incluidas (${included.length})`}</h2><p>{scope === "INDIVIDUAL" ? "El PDF se generará solo para la actividad seleccionada." : `${included.length} registros · ${stats.participants} participantes`}</p></div></div>
        <div className="report-activity-list">
          {filtered.length === 0 ? <p className="muted report-empty">No hay actividades con los filtros seleccionados.</p> : filtered.map((activity) => {
            const selected = selectedActivityId === activity.id;
            return (
              <button type="button" key={activity.id} className={`report-activity ${selected ? "selected" : ""}`} onClick={() => scope === "INDIVIDUAL" && setSelectedActivityId(activity.id)} aria-pressed={scope === "INDIVIDUAL" ? selected : undefined}>
                {scope === "INDIVIDUAL" ? <span className={`report-radio ${selected ? "checked" : ""}`} /> : <CheckCircle2 size={18} className="report-included-check" />}
                <span className="report-activity-copy"><strong>{activity.nombreActividad || "Sin nombre"}</strong><small>{activity.fecha} · {activity.tipoActividad || activity.otroTipoActividad} · {reportStatusLabel(activity.status)}</small><small>{activity.institutions.map((item) => item.name).join(", ") || "Sin institución"} · {[...activity.selectedSpaces, activity.otherSpace].filter(Boolean).join(", ") || "Sin espacio"}</small></span>
              </button>
            );
          })}
        </div>
      </section>

      {(error || message) && <div className={`alert ${error ? "error" : "success"}`} role={error ? "alert" : "status"}>{error || message}<button type="button" onClick={() => { setError(""); setMessage(""); }}>×</button></div>}
      <section className="card report-section report-export-card">
        <div className="report-section-heading"><Download size={20} /><div><h2>Generar reporte</h2><p>El PDF usa la misma estructura institucional de Android.</p></div></div>
        <div className="report-export-actions">
          <button className="secondary" disabled={!canGenerate || Boolean(working)} onClick={showPdfPreview}><Eye size={17} /> Vista previa</button>
          <button className="secondary" disabled={!canGenerate || Boolean(working)} onClick={() => perform("Generando PDF…", async () => { const blob = await buildConfiguredReportPdf(config, included); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `Reporte_TPT_${Date.now()}.pdf`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }, "PDF generado.")}><Download size={17} /> PDF</button>
          <button className="secondary" disabled={!canGenerate || Boolean(working)} onClick={() => perform("Preparando PDF para compartir…", () => shareConfiguredReportPdf(config, included), "Reporte compartido o descargado.")}><Share2 size={17} /> Compartir</button>
          <button className="secondary" disabled={!canGenerate || Boolean(working)} onClick={() => { if (previewUrl) frameRef.current?.contentWindow?.print(); else void showPdfPreview().then(() => window.setTimeout(() => frameRef.current?.contentWindow?.print(), 500)); }}><Printer size={17} /> Imprimir</button>
          <button className="secondary" disabled={!canGenerate || Boolean(working)} onClick={() => perform("Generando Excel…", () => exportConfiguredReportExcel(config, included), "Excel generado.")}><FileSpreadsheet size={17} /> Excel</button>
          <button className="secondary" disabled={!canGenerate || Boolean(working)} onClick={() => perform("Generando CSV…", async () => exportConfiguredReportCsv(included), "CSV generado.")}><FileText size={17} /> CSV</button>
        </div>
        {working && <div className="report-progress" role="status"><span className="report-spinner" />{working}</div>}
      </section>

      {previewUrl && (
        <div className="report-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closePreview(); }}>
          <section className="report-preview-modal" role="dialog" aria-modal="true" aria-label="Vista previa del PDF">
            <div className="report-preview-heading"><div><strong>Vista previa del PDF</strong><small>{reportPresentationTextForUi(presentation)} · {included.length} actividades</small></div><div className="button-group"><button className="secondary" onClick={() => frameRef.current?.contentWindow?.print()}><Printer size={16} /> Imprimir</button><button className="icon-button" aria-label="Cerrar vista previa" onClick={closePreview}>×</button></div></div>
            <iframe ref={frameRef} title="Vista previa del reporte" src={previewUrl} />
          </section>
        </div>
      )}
    </div>
  );
}

function reportPresentationTextForUi(presentation: ReportPresentationId) {
  return reportPresentations.find((value) => value.id === presentation)?.label ?? "Resumen Ejecutivo";
}
