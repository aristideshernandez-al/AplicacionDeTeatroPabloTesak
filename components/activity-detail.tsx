import { participantLabels, statusLabels, type Activity } from "@/lib/models";
export default function ActivityDetail({
  activity: a,
}: {
  activity: Activity;
}) {
  return (
    <article className="activity-detail">
      <header>
        <span className={`badge ${a.status}`}>{statusLabels[a.status]}</span>
        <h2>{a.nombreActividad || "Actividad sin título"}</h2>
        <p className="muted">
          {a.code || "Sin código oficial"} · {a.responsibleName}
        </p>
      </header>
      <section>
        <h3>1. Información de la actividad</h3>
        <dl>
          <dt>Área / tipo</dt>
          <dd>
            {a.areaIncidencia} · {a.tipoActividad} {a.otroTipoActividad}
          </dd>
          <dt>Fecha y horario</dt>
          <dd>
            {a.fecha} · {a.horaInicio} – {a.horaFin}
          </dd>
          {(
            [
              ["antecedentes", "Antecedentes"],
              ["objetivo", "Objetivo"],
              ["descripcion", "Descripción"],
              ["evaluacionSeguimiento", "Evaluación y seguimiento"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{a[key] || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section>
        <h3>2. Espacios utilizados</h3>
        <p>
          {[...a.selectedSpaces, a.otherSpace].filter(Boolean).join(", ") ||
            "—"}
        </p>
      </section>
      <section>
        <h3>3. Instituciones participantes</h3>
        {a.institutions.length ? (
          a.institutions.map((i, index) => (
            <div className="institution-summary" key={index}>
              <strong>{i.name}</strong>
              <p>
                {i.type} ·{" "}
                {[i.department, i.municipality, i.district]
                  .filter(Boolean)
                  .join(" / ")}
              </p>
              <p>
                {i.infrastructureCode && `Código: ${i.infrastructureCode} · `}
                {i.contactName} {i.contactPhone}
              </p>
            </div>
          ))
        ) : (
          <p className="muted">Sin instituciones registradas</p>
        )}
      </section>
      <section>
        <h3>4. Participantes</h3>
        <table>
          <tbody>
            {Object.entries(participantLabels).map(([key, label]) => (
              <tr key={key}>
                <td>{label}</td>
                <td>{a.participants[key as keyof typeof participantLabels]}</td>
              </tr>
            ))}
            <tr className="total-row">
              <th>Total general</th>
              <th>{a.participants.totalGeneral}</th>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <h3>5. Información técnica</h3>
        <p>
          {[...a.technicalInfo.equipment, a.technicalInfo.otherEquipment]
            .filter(Boolean)
            .join(", ") || "Sin equipo registrado"}
        </p>
        <dl>
          <dt>Observaciones</dt>
          <dd>{a.technicalInfo.observations || "—"}</dd>
          <dt>Fallas</dt>
          <dd>{a.technicalInfo.failures || "—"}</dd>
          <dt>Requiere revisión</dt>
          <dd>{a.technicalInfo.requiresReview || "—"}</dd>
        </dl>
      </section>
      <section>
        <h3>6. Evidencias</h3>
        {(
          [
            ["photoUrls", "Fotografías"],
            ["attendanceListUrls", "Listas de asistencia"],
            ["otherAnnexUrls", "Otros anexos"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <h4>
              {label}: {a[key].length}
            </h4>
            <div
              className={
                key === "photoUrls" ? "photo-grid" : "attachment-links"
              }
            >
              {a[key].map((url, i) => (
                <a href={url} target="_blank" rel="noreferrer" key={url}>
                  {key === "photoUrls" ? (
                    <img
                      src={url}
                      alt={`Fotografía ${i + 1} de ${a.nombreActividad}`}
                      loading="lazy"
                    />
                  ) : (
                    `Abrir documento ${i + 1}`
                  )}
                </a>
              ))}
            </div>
          </div>
        ))}
      </section>
    </article>
  );
}
