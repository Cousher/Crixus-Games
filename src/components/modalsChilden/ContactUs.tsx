import { useTranslation } from "react-i18next";

const ContactUs = () => {
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  return (
    <div className="p-4">
      <span className="text-2xl font-bold mb-4">{es ? "Contacto" : "Contact Us"}</span>
      <p className="text-lg mb-4">
        {es ? "¿Tenés preguntas o necesitás ayuda? Escribinos por estos canales:" : "Have questions or need assistance? Feel free to reach out to us through the following channels:"}
      </p>
      <div className="mb-4">
        <span className="text-xl font-bold mb-2">{es ? "Correo" : "Email"}</span>
        <p className="text-lg">
          {es ? "Escribinos a " : "Send us an email at "}
          <a href="mailto:soporte@crixus.com.ar" className="text-blue-500">soporte@crixus.com.ar</a>.
        </p>
      </div>
    </div>
  );
};

export default ContactUs;

