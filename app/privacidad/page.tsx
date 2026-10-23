export default function Privacy() {
  return (
    <main className="privacy-page card">
      <a href="/">← Volver a Teatro Pablo Tesak</a>
      <h1>Privacidad y uso de datos</h1>
      <p>
        La aplicación web del Teatro Pablo Tesak permite registrar y dar
        seguimiento a actividades institucionales del MINEDUCYT. Comparte el
        proyecto Firebase utilizado por la aplicación Android.
      </p>
      <h2>Información utilizada</h2>
      <p>
        Se utiliza tu nombre, correo y fotografía de perfil para identificar tu
        cuenta; los datos de actividades, instituciones, participantes y
        evidencias que registras se guardan en Firebase Authentication, Cloud
        Firestore y Cloud Storage.
      </p>
      <h2>Acceso a la información</h2>
      <p>
        Los usuarios acceden a sus actividades. Los administradores pueden
        consultar y gestionar los registros institucionales conforme a las
        reglas de acceso del proyecto. Los archivos compartidos mediante enlaces
        de descarga deben enviarse únicamente a personas autorizadas.
      </p>
      <h2>Guardado en el navegador</h2>
      <p>
        El texto de los formularios se conserva localmente para recuperar el
        trabajo después de una interrupción. Los archivos pendientes de subir
        deben volver a seleccionarse si cierras la pestaña. Evita usar equipos
        compartidos para ingresar información personal.
      </p>
      <h2>Permisos y eliminación</h2>
      <p>
        La selección de fotografías y documentos requiere tu intervención.
        Puedes solicitar la eliminación de tu cuenta desde Configuración; el
        equipo administrador revisará la solicitud de acuerdo con los requisitos
        institucionales de conservación de registros.
      </p>
      <h2>Contacto</h2>
      <p>
        Para consultas de acceso o tratamiento de los datos, comunícate con el
        equipo administrador del Teatro Pablo Tesak por los canales
        institucionales habituales.
      </p>
    </main>
  );
}
