import { useTranslation } from "react-i18next";

const Row = ({ title, content }: { title: string, content: any }) => (
  <div className="mb-2">
    <span className="font-bold text-base">{title}:</span>
    <span className="ml-2 text-justify">{content}</span>
  </div>
);

const TermsOfPrivacy = () => {
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  const heading = es ? "Política de Privacidad de Crixus Games" : "Privacy Policy for Crixus Games";
  const updated = es ? "Última actualización: 14/06/2026" : "Last Updated: 06/14/2026";
  const intro = es
    ? "¡Bienvenido a Crixus Games! Esta Política de Privacidad explica cómo recopilamos, usamos y protegemos tu información personal cuando usás nuestro casino social en crixus.com.ar."
    : "Welcome to Crixus Games! This Privacy Policy outlines how we collect, use, and protect your personal information when you use our social casino at crixus.com.ar.";
  const rows = es ? [
    { title: '1. Información que recopilamos', content: 'No recopilamos información que te identifique personalmente (nombres, direcciones o datos de contacto), ya que Crixus Games no involucra transacciones con dinero real. Podemos almacenar datos de tu juego (estadísticas y acciones) para mejorar tu experiencia.' },
    { title: '2. Uso de la información', content: 'Usamos los datos de juego para optimizar la experiencia, mejorar funciones y resolver problemas. Si nos proporcionás un correo, podemos usarlo para comunicaciones importantes.' },
    { title: '3. Seguridad de los datos', content: 'Tomamos medidas razonables para proteger la información que recopilamos y prevenir accesos no autorizados.' },
    { title: '4. Servicios de terceros', content: 'Crixus Games puede usar servicios de terceros para análisis, alojamiento u otros fines. Esos servicios tienen sus propias políticas de privacidad.' },
    { title: '5. Cambios en esta política', content: 'Esta política puede actualizarse periódicamente. Los cambios se reflejarán en esta página.' },
    { title: '6. Contacto', content: 'Si tenés preguntas sobre esta política, escribinos a soporte@crixus.com.ar.' },
  ] : [
    { title: '1. Information We Collect', content: 'We do not collect personally identifiable information, as Crixus Games does not involve real money transactions. We may store gameplay data (statistics and actions) to enhance your experience.' },
    { title: '2. Use of Information', content: 'We use gameplay data to optimize the experience, improve features, and troubleshoot issues. If you provide an email, we may use it for important communications.' },
    { title: '3. Data Security', content: 'We take reasonable measures to safeguard the information we collect and prevent unauthorized access.' },
    { title: '4. Third-Party Services', content: 'Crixus Games may use third-party services for analytics, hosting, or other purposes. These services have their own privacy policies.' },
    { title: '5. Changes to Privacy Policy', content: 'This Privacy Policy may be updated from time to time. Changes will be reflected on this page.' },
    { title: '6. Contact Us', content: 'If you have questions about this Privacy Policy, contact us at soporte@crixus.com.ar.' },
  ];

  return (
    <div className="flex flex-col text-sm">
      <span className="font-bold text-lg mb-4">{heading}</span>
      <span className="mb-2 italic">{updated}</span>
      <span className="mb-2">{intro}</span>
      {rows.map((s, i) => <Row key={i} title={s.title} content={s.content} />)}
      <span className="mt-4">{es ? "Al usar Crixus Games, aceptás los términos de esta Política de Privacidad." : "By using Crixus Games, you agree to the terms outlined in this Privacy Policy."}</span>
    </div>
  );
};

export default TermsOfPrivacy;

