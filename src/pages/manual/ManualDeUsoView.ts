
// Fix: Implement the ManualDeUsoView to be a valid module and render content.
type NavigateFunction = (view: string, state?: object) => void;

export const renderManualDeUsoView = (container: HTMLElement, navigate: NavigateFunction) => {
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

    // Title
    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = 'Manual de Uso de la Aplicación "Peso"';
    title.style.textAlign = 'center';
    container.appendChild(title);

    const content = `
        <p style="color: #8b949e; text-align: center; font-size: 0.9rem;">Versión 1.0.0</p>
        
        <h3 style="color: #c9d1d9; border-bottom: 1px solid #30363d; padding-bottom: 5px; margin-top: 30px;">1. Introducción</h3>
        <p>¡Bienvenido a Peso! Tu asistente personal para la gestión financiera. Esta guía te ayudará a sacar el máximo provecho de todas las funcionalidades de la aplicación.</p>

        <h3 style="color: #c9d1d9; border-bottom: 1px solid #30363d; padding-bottom: 5px; margin-top: 30px;">2. Panel Principal (Dashboard)</h3>
        <p>La pantalla principal te ofrece una vista rápida de tu salud financiera:</p>
        <ul>
            <li><strong>Balance Actual:</strong> Muestra el dinero restante de tu período de pago actual, considerando tus ingresos y gastos.</li>
            <li><strong>Gasto:</strong> Muestra el total de gastos para el período actual y una estimación mensual.</li>
            <li><strong>Ahorros:</strong> Muestra el total acumulado en tus registros de ahorro.</li>
            <li><strong>Listado:</strong> Un acceso rápido a tus últimos ingresos y gastos registrados. Puedes filtrar para ver solo ingresos, solo gastos o ambos.</li>
        </ul>
        <p>Puedes navegar a las listas detalladas de Ingresos, Gastos o Ahorros haciendo clic en sus respectivas tarjetas.</p>

        <h3 style="color: #c9d1d9; border-bottom: 1px solid #30363d; padding-bottom: 5px; margin-top: 30px;">3. Registrar Transacciones</h3>
        <p>Para agregar un nuevo ingreso, gasto o ahorro, navega a la sección correspondiente (ej. "Ingreso") y haz clic en el botón "Agregar". Se te pedirá que elijas entre dos tipos:</p>
        <ul>
            <li><strong>Único:</strong> Para transacciones que ocurren una sola vez (ej. una compra específica, un bono). Debes especificar una fecha.</li>
            <li><strong>Recurrente:</strong> Para transacciones que se repiten (ej. salario, suscripciones, alquiler). Debes configurar la frecuencia (Diario, Semanal, Quincenal, Mensual).</li>
        </ul>

        <h3 style="color: #c9d1d9; border-bottom: 1px solid #30363d; padding-bottom: 5px; margin-top: 30px;">4. Ver, Editar y Eliminar</h3>
        <ul>
            <li><strong>Ver Detalles:</strong> Haz clic en cualquier registro de las listas para ver toda su información en una pantalla de detalles.</li>
            <li><strong>Editar:</strong> Dentro de una lista, haz clic en el ícono del lápiz (✏️) para modificar un registro.</li>
            <li><strong>Eliminar:</strong> Haz clic en el ícono del basurero (🗑️) para enviar un registro a la Papelera de Reciclaje.</li>
        </ul>

        <h3 style="color: #c9d1d9; border-bottom: 1px solid #30363d; padding-bottom: 5px; margin-top: 30px;">5. Paneles Laterales</h3>
        <p>Desliza el dedo por la pantalla para acceder a los paneles:</p>
        <ul>
            <li><strong>Desliza a la derecha:</strong> Abre el panel de navegación y resumen del mes. Aquí puedes ver un resumen de tus períodos de pago y acceder a la Papelera, Información Financiera y este manual.</li>
            <li><strong>Desliza a la izquierda:</strong> Abre el panel de Análisis y Estadísticas, donde encontrarás el calendario de transacciones y un desglose de tus gastos por categoría.</li>
        </ul>

        <h3 style="color: #c9d1d9; border-bottom: 1px solid #30363d; padding-bottom: 5px; margin-top: 30px;">6. Papelera de Reciclaje</h3>
        <p>Los registros eliminados no se borran permanentemente de inmediato. Van a la Papelera, donde puedes:</p>
        <ul>
            <li><strong>Restaurar:</strong> Devuelve el registro a su lista original.</li>
            <li><strong>Borrar Permanentemente:</strong> Elimina el registro para siempre. Esta acción es irreversible.</li>
        </ul>
        <p>Puedes vaciar la papelera de forma selectiva o completa usando el botón "Vaciar Papelera".</p>
        
        <h3 style="color: #c9d1d9; border-bottom: 1px solid #30363d; padding-bottom: 5px; margin-top: 30px;">7. Ajustes</h3>
        <p>En el panel de Estadísticas, haz clic en el ícono de engranaje (⚙️) para acceder a los Ajustes. Aquí puedes:</p>
        <ul>
            <li><strong>Editar tu Perfil:</strong> Cambiar tu nombre y apellido.</li>
            <li><strong>Cambiar Moneda:</strong> Seleccionar la moneda que se usará en toda la aplicación.</li>
            <li><strong>Gestionar Salarios:</strong> Configurar tus salarios fijos para que los cálculos de períodos sean más precisos. Al agregar un salario aquí, se creará automáticamente un registro de ingreso recurrente.</li>
            <li><strong>Borrar Todos los Datos:</strong> Una opción para empezar de cero, eliminando todos tus registros financieros.</li>
        </ul>

        <h3 style="color: #c9d1d9; border-bottom: 1px solid #30363d; padding-bottom: 5px; margin-top: 30px;">Soporte y Contacto</h3>
        <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos a través de los canales mencionados en la sección de "Política y Condiciones".</p>
    `;

    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = content;
    container.appendChild(contentDiv);
};
