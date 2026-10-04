import { useTranslation } from "react-i18next";

const PrivacyPolicySection = ({ title, content }: { title: string, content: string | JSX.Element[] }) => (
    <div className="mb-2">
        <span className="font-bold text-base">{title}:</span>
        <span className="ml-2 text-justify">{content}</span>
    </div>
);

const PrivacyPolicy = () => {
    const { i18n } = useTranslation();
    const es = (i18n.language || "es").startsWith("es");

    const heading = es ? "Política de Privacidad de Crixus Games" : "Privacy Policy for Crixus Games";
    const updated = es ? "Última actualización: 14/06/2026" : "Last Updated: 06/14/2026";
    const intro = es 
        ? <>¡Bienvenido a Crixus Games! Esta Política de Privacidad explica cómo recopilamos, usamos y protegemos tu información personal cuando usás nuestro casino social en <span className="text-blue-500">crixus.com.ar</span>.</>
        : <>Welcome to Crixus Games! This Privacy Policy outlines how we collect, use, and protect your personal information when you use our social casino at <span className="text-blue-500">crixus.com.ar</span>.</>;

    const sections = es ? [
        {
            title: '1. Información que recopilamos', content: [
                { title: '1.1 Información Personal', content: 'No recopilamos información que te identifique personalmente, como nombres, direcciones o datos de contacto, ya que Crixus Games no involucra transacciones con dinero real.' },
                { title: '1.2 Datos de Juego', content: 'Podemos recopilar y almacenar datos relacionados con tu juego (estadísticas, acciones y otra información) para mejorar tu experiencia.' },
            ]
        },
        {
            title: '2. Uso de la información', content: [
                { title: '2.1 Optimización', content: 'Usamos los datos para optimizar la experiencia, mejorar funciones y resolver problemas.' },
                { title: '2.2 Comunicación', content: 'Si nos proporcionás un correo, podemos usarlo para comunicaciones importantes o responder consultas.' },
            ]
        },
        { title: '3. Seguridad de los datos', content: 'Tomamos medidas razonables para proteger la información que recopilamos y prevenir accesos no autorizados.' },
        { title: '4. Servicios de terceros', content: 'Crixus Games puede usar servicios de terceros para análisis o alojamiento. Esos servicios tienen sus propias políticas.' },
        { title: '5. Cambios en esta política', content: 'Esta política puede actualizarse periódicamente. Los cambios se reflejarán en esta página.' },
        { title: '6. Contacto', content: 'Si tenés preguntas sobre esta Política, escribinos a soporte@crixus.com.ar' },
    ] : [
        {
            title: '1. Information We Collect', content: [
                { title: '1.1 Personal Information', content: 'We do not collect any personally identifiable information, such as names, addresses, or contact details, as Crixus Games does not involve real money transactions.' },
                { title: '1.2 Gameplay Data', content: 'We may collect and store data related to your gameplay, including game statistics, in-game actions, and other relevant information to enhance your gaming experience and improve our services.' },
            ]
        },
        {
            title: '2. Use of Information', content: [
                { title: '2.1 Gameplay Optimization', content: 'We use the collected gameplay data to optimize the user experience, provide better game features, and troubleshoot any issues that may arise during gameplay.' },
                { title: '2.2 Communication', content: 'We may use your contact information if provided (e.g., email address) to communicate important updates, notifications, or respond to inquiries related to Crixus Games.' },
            ]
        },
        { title: '3. Data Security', content: 'We take reasonable measures to safeguard the information we collect to prevent unauthorized access, disclosure, alteration, or destruction of your data.' },
        { title: '4. Third-Party Services', content: 'Crixus Games may utilize third-party services for analytics, hosting, or other purposes. These services have their own privacy policies, and we encourage you to review them.' },
        { title: '5. Changes to Privacy Policy', content: 'This Privacy Policy may be updated from time to time. Any changes will be reflected on this page, and it is your responsibility to review this policy periodically.' },
        { title: '6. Contact Us', content: 'If you have any questions or concerns about this Privacy Policy, please contact us at soporte@crixus.com.ar' },
    ];

    return (
       <div className='flex items-center justify-center w-full'>
         <div className="flex flex-col text-sm text-gray-200">
            <span className="font-bold text-lg mb-4">{heading}</span>
            <span className="mb-2 italic">{updated}</span>
            <span className="mb-2">{intro}</span>

            {sections.map((section, index) => (
                <PrivacyPolicySection key={index} title={section.title} content={Array.isArray(section.content) ? section.content.map((item, i) => (<PrivacyPolicySection key={i} title={item.title} content={item.content} />)) : section.content} />
            ))}

            <span className="mt-4">
                {es ? "Al usar Crixus Games, aceptás los términos delineados en esta Política de Privacidad." : "By using Crixus Games, you agree to the terms outlined in this Privacy Policy."}
            </span>
        </div>
       </div>
    );
};

export default PrivacyPolicy;
