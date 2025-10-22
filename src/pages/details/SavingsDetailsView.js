import { appState } from '../../state/store.js';
import { formatCurrency } from '../../utils/currency.js';
import { formatRecurrence } from '../../utils/helpers.js';

export const renderSavingsDetailsView = (container, navigate, recordId) => {
    container.innerHTML = ''; // Clear previous content

    const record = appState.savingRecords.find(rec => rec.id === recordId);
    if (!record) {
        console.error('Record not found!');
        navigate('savingsList');
        return;
    }

    const header = document.createElement('div');
    header.className = 'income-page-header';

    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.innerHTML = '&larr; Volver';
    backButton.onclick = () => navigate('savingsList');

    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = 'Detalles del Ahorro';

    header.appendChild(backButton);
    
    container.appendChild(header);
    container.appendChild(title);

    // --- Progress Bar for Savings Goal ---
    if (record.goalAmount && record.goalAmount > 0) {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';

        const progressLabel = document.createElement('div');
        progressLabel.className = 'progress-label';
        const percentage = Math.round((record.amount / record.goalAmount) * 100);
        progressLabel.innerHTML = `<span>Progreso de la Meta</span><span>${percentage}%</span>`;

        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-bar-fill';
        progressFill.style.width = `${Math.min(percentage, 100)}%`;

        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressLabel);
        progressContainer.appendChild(progressBar);
        container.appendChild(progressContainer);
    }

    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'details-container';

    const createDetailItem = (label, value) => {
        if (value === undefined || value === null) return document.createDocumentFragment(); // Return empty fragment if value is not set
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
    detailsContainer.appendChild(createDetailItem('Monto Ahorrado:', formatCurrency(record.amount, { includeSymbol: true })));
    if (record.goalAmount && record.goalAmount > 0) {
        detailsContainer.appendChild(createDetailItem('Meta de Ahorro:', formatCurrency(record.goalAmount, { includeSymbol: true })));
    }
    if (record.date) {
        detailsContainer.appendChild(createDetailItem('Fecha:', record.date));
    }
    if (record.recurrence) {
        detailsContainer.appendChild(createDetailItem('Frecuencia:', formatRecurrence(record.recurrence)));
    }
    detailsContainer.appendChild(createDetailItem('Ubicación:', record.storageType));
    if (record.storageType === 'Banco') {
        detailsContainer.appendChild(createDetailItem('Nombre del Banco:', record.bankName || 'N/A'));
        detailsContainer.appendChild(createDetailItem('Tipo de Cuenta:', record.accountType || 'N/A'));
    }
    detailsContainer.appendChild(createDetailItem('Descripción:', record.description || 'N/A'));

    container.appendChild(detailsContainer);
};