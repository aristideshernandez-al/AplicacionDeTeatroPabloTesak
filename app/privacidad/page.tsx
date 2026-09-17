import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de privacidad | Escáner Teatro Pablo Tesak',
  description: 'Información sobre los datos que se procesan en Escáner Teatro Pablo Tesak.',
  robots: { index: true, follow: true },
}

const sections = [
  {
    title: 'Quién administra la aplicación',
    paragraphs: [
      'Escáner Teatro Pablo Tesak es una aplicación complementaria para escanear documentos, revisar archivos PDF y adjuntar documentos a actividades registradas en la aplicación web del Teatro Pablo Tesak. Para consultas sobre privacidad, puedes escribir a alex909w@gmail.com.',
    ],
  },
  {
    title: 'Datos que se procesan',
    paragraphs: [
      'Cuando inicias sesión con Google, Supabase Auth procesa el identificador de tu cuenta y los datos básicos de perfil que Google comparte, como tu correo electrónico. La aplicación usa esa sesión para comprobar que corresponde a la cuenta que preparó el código QR.',
      'Al escanear un documento, el escáner de documentos de Google genera un PDF en el dispositivo. Si llegaste desde un código QR de una actividad, la aplicación envía ese PDF a Supabase Storage para adjuntarlo a la actividad. Los documentos pueden incluir datos personales que aparezcan en sus páginas.',
      'Si abres un PDF desde el dispositivo con el selector de archivos, la aplicación lo muestra localmente y no lo sube automáticamente. La aplicación no incluye anuncios ni herramientas propias de analítica.',
    ],
  },
  {
    title: 'Para qué se usan los datos',
    paragraphs: [
      'La información de la cuenta se usa para iniciar sesión y limitar la carga del documento a la cuenta que generó el código QR. Los PDF escaneados se usan para adjuntarlos al registro de actividad que seleccionaste en la aplicación web.',
    ],
  },
  {
    title: 'Servicios que intervienen',
    paragraphs: [
      'La autenticación se realiza con Google y Supabase Auth. Los documentos enviados desde el escáner se almacenan en el bucket privado de Supabase Storage configurado para la aplicación. La transferencia de documentos se realiza mediante HTTPS y un permiso temporal asociado al código QR.',
    ],
  },
  {
    title: 'Almacenamiento y conservación',
    paragraphs: [
      'La sesión de acceso se conserva en el dispositivo para que no tengas que iniciar sesión cada vez. La aplicación mantiene temporalmente en su caché el PDF necesario para mostrarlo; Android puede eliminar esos archivos temporales al limpiar el almacenamiento de la aplicación.',
      'Los documentos que subes se conservan como adjuntos de la actividad en Supabase Storage y se gestionan junto con el registro correspondiente en la aplicación web. Para solicitar la revisión o eliminación de información asociada a tu cuenta, escribe al correo de contacto indicado en esta política.',
    ],
  },
  {
    title: 'Tus opciones y contacto',
    paragraphs: [
      'Puedes cerrar sesión desde la aplicación. Para consultas, solicitudes relacionadas con tus datos o ayuda para localizar un documento, escribe a alex909w@gmail.com e indica el correo de la cuenta utilizada y la actividad relacionada. No incluyas contraseñas ni códigos de acceso en el mensaje.',
    ],
  },
  {
    title: 'Público de la aplicación',
    paragraphs: [
      'La aplicación es una herramienta de trabajo para personas que gestionan actividades del Teatro Pablo Tesak. No está diseñada específicamente para niñas y niños.',
    ],
  },
  {
    title: 'Cambios a esta política',
    paragraphs: [
      'Si cambia la forma en que la aplicación procesa datos, esta página se actualizará con la nueva información y su fecha de vigencia.',
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#f4f7f7', padding: '40px 20px', color: '#17242b' }}>
      <article style={{ maxWidth: 820, margin: '0 auto', padding: 'clamp(24px, 5vw, 48px)', background: '#fff', border: '1px solid #dfe8e8', borderRadius: 16, boxShadow: '0 16px 48px rgba(16,47,56,.08)' }}>
        <a href="/" style={{ color: '#147b70', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>← Volver a Teatro Pablo Tesak</a>
        <p style={{ margin: '34px 0 8px', color: '#159d8d', fontSize: 12, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase' }}>Escáner Teatro Pablo Tesak</p>
        <h1 style={{ margin: 0, fontSize: 'clamp(30px, 5vw, 42px)', lineHeight: 1.15 }}>Política de privacidad</h1>
        <p style={{ margin: '12px 0 34px', color: '#75838b', fontSize: 14 }}>Vigente desde el 17 de septiembre de 2026</p>
        <p style={{ marginBottom: 30, fontSize: 16, lineHeight: 1.75 }}>Esta política explica qué información procesa Escáner Teatro Pablo Tesak cuando inicias sesión, escaneas un documento o abres un PDF.</p>
        {sections.map((section) => (
          <section key={section.title} style={{ padding: '23px 0', borderTop: '1px solid #e7eeee' }}>
            <h2 style={{ margin: '0 0 10px', fontSize: 19 }}>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} style={{ margin: '9px 0 0', color: '#42545b', fontSize: 15, lineHeight: 1.75 }}>{paragraph}</p>
            ))}
          </section>
        ))}
        <footer style={{ paddingTop: 18, borderTop: '1px solid #e7eeee', color: '#75838b', fontSize: 13 }}>Teatro Pablo Tesak · Escáner Android</footer>
      </article>
    </main>
  )
}
