import { appState } from '../../state/store.js';
import { formatCurrency } from '../../utils/currency.js';
import { formatRecurrence } from '../../utils/helpers.js';

export const renderIncomeDetailsView = (container, navigate, recordId) => {
    container.innerHTML = ''; // Clear previous content

    const record = appState.incomeRecords.find(rec => rec.id === recordId);
    if (!record) {
        console.error('Record not found!');
        navigate('incomeList');
        return;
    }

    const header = document.createElement('div');
    header.className = 'income-page-header';

    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.innerHTML = '&larr; Volver';
    backButton.onclick = () => navigate('incomeList');

    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = 'Detalles del Ingreso';

    header.appendChild(backButton);
    
    container.appendChild(header);
    container.appendChild(title);

    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'details-container';

    const createDetailItem = (label, value) => {
        const item = document.createElement('div');
        item.className = 'detail-item';
        const labelEl = document.createElement('span');
        labelEl.className = 'detail-label';
        labelEl.textContent = label;
        const valueEl = document.createElement('span');
        valueEl.className = 'detail-value';
        valueEl.textContent = String(value);
        item.appendChild(labelEl);
        item.appendChild(valueEl);
        return item;
    };
    
    detailsContainer.appendChild(createDetailItem('Nombre:', record.name));
    detailsContainer.appendChild(createDetailItem('Tipo:', record.type));
    detailsContainer.appendChild(createDetailItem('Fuente:', record.source));
    detailsContainer.appendChild(createDetailItem('Monto:', `$ ${formatCurrency(record.amount)}`));
    if (record.date) {
        detailsContainer.appendChild(createDetailItem('Fecha:', record.date));
    }
    if (record.recurrence) {
        detailsContainer.appendChild(createDetailItem('Frecuencia:', formatRecurrence(record.recurrence)));
    }
    detailsContainer.appendChild(createDetailItem('Descripción:', record.description || 'N/A'));

    container.appendChild(detailsContainer);
};
