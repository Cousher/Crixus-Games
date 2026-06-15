import { useTranslation } from "react-i18next";

const FAQ = () => {
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  const heading = es ? "Preguntas frecuentes" : "Frequently Asked Questions";
  const data = es ? [
    { q: '¿Mis datos personales están seguros?', a: 'Sí, priorizamos la seguridad de tu información. Usamos cifrado estándar de la industria y buenas prácticas para mantener tus datos protegidos.' },
    { q: '¿Puedo mejorar los ítems de mi inventario?', a: 'Sí, podés mejorar ítems seleccionándolos y eligiendo un ítem objetivo de mayor rareza. La probabilidad de éxito depende de la rareza de los ítems.' },
    { q: '¿Cómo contacto al soporte?', a: 'Si necesitás ayuda o tenés preguntas, escribinos a soporte@crixus.com.ar.' },
  ] : [
    { q: 'Is my personal information safe?', a: 'Yes, we prioritize the security of your personal information. We use industry-standard encryption and best practices to keep your data safe and secure.' },
    { q: 'Can I upgrade items in my inventory?', a: 'Yes, you can upgrade items by selecting them and choosing a target item with a higher rarity. The success rate depends on the rarity of the items.' },
    { q: 'How can I contact support?', a: 'If you need assistance or have any questions, you can contact us via email at soporte@crixus.com.ar.' },
  ];

  return (
    <div className="p-4">
      <span className="text-2xl font-bold mb-4">{heading}</span>
      <div className="flex flex-col gap-4 mt-2">
        {data.map((item, i) => (
          <div key={i} className="mb-6">
            <span className="text-xl font-bold mb-2">{item.q}</span>
            <p>{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;

