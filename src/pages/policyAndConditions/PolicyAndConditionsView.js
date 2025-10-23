
export const renderPolicyAndConditionsView = (container, navigate) => {
    container.innerHTML = '';
    container.style.textAlign = 'left';
    // Header
    const header = document.createElement('div');
    header.className = 'income-page-header';
    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.innerHTML = '&larr; Volver';
    backButton.onclick = () => navigate('dashboard');
    header.appendChild(backButton);
    container.appendChild(header);
    // Logo
    const logoContainer = document.createElement('div');
    logoContainer.style.textAlign = 'center';
    logoContainer.style.marginBottom = '20px';
    const logo = document.createElement('img');
    logo.src = 'https://i.postimg.cc/mDgqGyw3/Picsart-25-03-28-04-00-43-410.png';
    logo.alt = 'Logo de Sneyder Estudio';
    logo.style.maxWidth = '150px';
    logo.style.height = 'auto';
    logo.style.borderRadius = '50%';
    logoContainer.appendChild(logo);
    container.appendChild(logoContainer);
    // Title
    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = 'Política de Privacidad y Términos de Uso';
    title.style.textAlign = 'center';
    container.appendChild(title);
    const content = `
        <p style="color: #8b949e; text-align: center; font-size: 0.9rem;">Última actualización: 25 de Julio de 2024</p>
        
        <h3 style="color: #c9d1d9; border-bottom: 1px solid #30363d; padding-bottom: 5px; margin-top: 30px;">Política de Privacidad</h3>

        <h4>1. Introducción</h4>
        <p>Bienvenido a Peso, una aplicación desarrollada por Sneyder Estudio. Nos comprometemos a proteger tu privacidad. Esta política explica qué información recopilamos, cómo la usamos y las opciones que tienes sobre tus datos.</p>

        <h4>2. Información que Recopilamos</h4>
        <p>Peso está diseñado para ser tu herramienta financiera personal y privada. La información que ingresas se maneja de la siguiente manera:</p>
        <ul>
            <li><strong>Datos Financieros:</strong> Todos los datos sobre tus ingresos, gastos, ahorros y perfil (nombre, moneda, etc.) son almacenados de forma segura en una base de datos de Supabase, un servicio de backend confiable que cumple con altos estándares de seguridad.</li>
            <li><strong>Datos No Personales:</strong> No recopilamos datos de telemetría, análisis de uso, ni información de tu dispositivo de forma automática.</li>
        </ul>

        <h4>3. Uso de la Información</h4>
        <p>Utilizamos la información que nos proporcionas exclusivamente para:</p>
        <ul>
            <li>Permitir el funcionamiento de las características de la aplicación Peso (cálculos, reportes, etc.).</li>
            <li>Sincronizar tus datos de forma segura a través de Supabase para que puedas acceder a ellos.</li>
            <li>No compartimos, vendemos ni alquilamos tu información personal o financiera con terceros bajo ninguna circunstancia.</li>
        </ul>

        <h4>4. Almacenamiento y Seguridad de Datos</h4>
        <p>La seguridad de tus datos es nuestra máxima prioridad. Tu información se almacena en una base de datos segura gestionada por Supabase. Aunque ninguna transmisión por internet es 100% segura, tomamos medidas razonables para proteger tu información, confiando en las robustas medidas de seguridad que Supabase proporciona.</p>

        <h4>5. Tus Derechos</h4>
        <p>Tienes control total sobre tus datos. Desde la sección de "Ajustes" de la aplicación, puedes:</p>
        <ul>
            <li><strong>Borrar todos tus datos:</strong> Existe una opción para eliminar permanentemente todos tus registros financieros de la base de datos. Esta acción es irreversible.</li>
            <li><strong>Gestionar tu perfil:</strong> Puedes editar la información de tu perfil en cualquier momento.</li>
        </ul>

        <h3 style="color: #c9d1d9; border-bottom: 1px solid #30363d; padding-bottom: 5px; margin-top: 30px;">Términos y Condiciones de Uso</h3>

        <h4>1. Aceptación de los Términos</h4>
        <p>Al usar la aplicación Peso, aceptas cumplir con estos Términos y Condiciones. Si no estás de acuerdo, por favor no utilices la aplicación.</p>

        <h4>2. Uso de la Aplicación</h4>
        <p>Peso se proporciona "tal cual". Eres responsable de la exactitud de los datos que ingresas. Sneyder Estudio no se hace responsable de decisiones financieras tomadas basadas en la información presentada en la aplicación.</p>

        <h4>3. Limitación de Responsabilidad</h4>
        <p>En la máxima medida permitida por la ley, Sneyder Estudio no será responsable de ninguna pérdida o daño directo, indirecto, incidental o consecuente que surja del uso o la incapacidad de usar la aplicación.</p>
        
        <h4>4. Cambios en los Términos</h4>
        <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Se te notificará de los cambios importantes. El uso continuado de la aplicación después de los cambios constituye tu aceptación de los nuevos términos.</p>
        
        <h3 style="color: #c9d1d9; border-bottom: 1px solid #30363d; padding-bottom: 5px; margin-top: 30px;">Soporte y Contacto</h3>
        <p>Si tienes alguna pregunta, inquietud o necesitas soporte técnico, no dudes en contactarnos:</p>
        <ul>
            <li><strong>Correo Electrónico:</strong> <a href="mailto:sneyderestudio@gmail.com" style="color: #388bfd;">sneyderestudio@gmail.com</a></li>
            <li><strong>WhatsApp:</strong> <a href="https://wa.me/50672712037" target="_blank" style="color: #388bfd;">Envía un mensaje a Sneyder Estudio</a></li>
        </ul>
        <p>Gracias por confiar en Peso.</p>
    `;
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = content;
    container.appendChild(contentDiv);
};
