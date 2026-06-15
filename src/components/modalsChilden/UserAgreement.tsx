import { useTranslation } from "react-i18next";

const Row = ({ title, content }: { title: string, content: string }) => (
  <div className="mb-2">
    <span className="font-bold">{title}: </span>
    <span className="ml-2 text-justify">{content}</span>
  </div>
);

const UserAgreement = () => {
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  const heading = es ? "Acuerdo de Usuario de Crixus Games" : "User Agreement for Crixus Games";
  const updated = es ? "Última actualización: 14/06/2026" : "Last Updated: 06/14/2026";
  const intro = es
    ? "¡Bienvenido a Crixus Games! Este Acuerdo de Usuario establece los términos y condiciones para usar nuestro casino social en crixus.com.ar."
    : "Welcome to Crixus Games! This User Agreement outlines the terms and conditions for using our social casino at crixus.com.ar.";
  const rows = es ? [
    { title: '1. Aceptación de los términos', content: 'Al usar Crixus Games, aceptás cumplir y quedar obligado por los términos y condiciones de este Acuerdo de Usuario.' },
    { title: '2. Elegibilidad', content: 'Debés tener la edad legal para participar de actividades de juego en tu jurisdicción. Crixus Games no está destinado a menores de la edad legal.' },
    { title: '3. Registro de cuenta', content: 'Para acceder a ciertas funciones podés tener que registrar una cuenta. Sos responsable de mantener la confidencialidad de tus datos.' },
    { title: '4. Actividades prohibidas', content: 'Aceptás no realizar actividades que violen leyes o estos términos, incluyendo trampas, fraude y abuso de la plataforma.' },
    { title: '5. Cierre de cuenta', content: 'Nos reservamos el derecho de suspender o cerrar tu cuenta si violás estos términos. También podés cerrar tu cuenta cuando quieras.' },
    { title: '6. Descargos', content: 'Crixus Games se ofrece "tal cual", sin garantías. No garantizamos la exactitud, integridad o fiabilidad del contenido.' },
    { title: '7. Solo entretenimiento', content: 'Crixus Games es una plataforma de juego social con créditos virtuales. No se juega ni se intercambia dinero real.' },
    { title: '8. Contacto', content: 'Si tenés preguntas sobre este Acuerdo, escribinos a soporte@crixus.com.ar.' },
  ] : [
    { title: '1. Acceptance of Terms', content: 'By using Crixus Games, you agree to comply with and be bound by the terms outlined in this User Agreement.' },
    { title: '2. Eligibility', content: 'You must be of legal age to participate in any form of gaming activity in your jurisdiction. Crixus Games is not intended for individuals under the legal age.' },
    { title: '3. Account Registration', content: 'To access certain features you may be required to register an account. You are responsible for maintaining the confidentiality of your account information.' },
    { title: '4. Prohibited Activities', content: 'You agree not to engage in activities that violate laws or these terms, including cheating, fraud, and abuse of the platform.' },
    { title: '5. Termination of Account', content: 'We reserve the right to terminate or suspend your account if you violate these terms. You may also close your account at any time.' },
    { title: '6. Disclaimers', content: 'Crixus Games is provided "as is" without any warranties. We do not guarantee the accuracy, completeness, or reliability of the content.' },
    { title: '7. Entertainment Only', content: 'Crixus Games is a social gaming platform using virtual credits. No real money is wagered or exchanged.' },
    { title: '8. Contact Us', content: 'If you have questions about this User Agreement, contact us at soporte@crixus.com.ar.' },
  ];

  return (
    <div className="flex flex-col text-sm text-white">
      <span className="font-bold text-lg mb-4">{heading}</span>
      <span className="mb-2">{updated}</span>
      <span className="mb-2">{intro}</span>
      {rows.map((s, i) => <Row key={i} title={s.title} content={s.content} />)}
      <span className="mt-4">{es ? "Al usar Crixus Games, aceptás los términos y condiciones de este Acuerdo de Usuario." : "By using Crixus Games, you agree to abide by the terms outlined in this User Agreement."}</span>
    </div>
  );
};

export default UserAgreement;

