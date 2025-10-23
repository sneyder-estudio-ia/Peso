import { appState } from '../../state/store.js';
import { formatCurrency } from '../../utils/currency.js';
import { formatRecurrence } from '../../utils/helpers.js';
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
export const renderExpenseDetailsView = (container, navigate, recordId) => {
    container.innerHTML = ''; // Clear previous content
    const record = appState.expenseRecords.find(rec => rec.id === recordId);
    if (!record) {
        console.error('Record not found!');
        navigate('expenseList');
        return;
    }
    const header = document.createElement('div');
    header.className = 'income-page-header';
    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.innerHTML = '&larr; Volver';
    backButton.onclick = () => navigate('expenseList');
    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = record.isGroup ? 'Detalles del Grupo de Gastos' : 'Detalles del Gasto';
    header.appendChild(backButton);
    container.appendChild(header);
    container.appendChild(title);
    if (record.isGroup && record.items) {
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'details-container';
        detailsContainer.appendChild(createDetailItem('Nombre del Grupo:', record.name));
        detailsContainer.appendChild(createDetailItem('Monto Total:', formatCurrency(record.amount, { includeSymbol: true })));
        detailsContainer.appendChild(createDetailItem('Número de Gastos:', record.items.length));
        container.appendChild(detailsContainer);
        const itemsTitle = document.createElement('h3');
        itemsTitle.className = 'card-title';
        itemsTitle.textContent = 'Gastos Incluidos';
        itemsTitle.style.marginTop = '30px';
        container.appendChild(itemsTitle);
        const itemsListContainer = document.createElement('div');
        itemsListContainer.id = 'expense-list-container';
        container.appendChild(itemsListContainer);
        record.items.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'income-record-card';
            itemCard.style.cursor = 'default';
            const info = document.createElement('div');
            info.className = 'income-record-info';
            const name = document.createElement('span');
            name.className = 'income-record-name';
            name.textContent = item.name;
            const date = document.createElement('span');
            date.className = 'income-record-date';
            date.textContent = item.recurrence ? formatRecurrence(item.recurrence) : (item.date || '');
            info.appendChild(name);
            info.appendChild(date);
            const rightContainer = document.createElement('div');
            rightContainer.className = 'income-record-right';
            const amount = document.createElement('div');
            amount.className = 'income-record-amount expense';
            amount.textContent = formatCurrency(item.amount, { includeSymbol: true });
            rightContainer.appendChild(amount);
            itemCard.appendChild(info);
            itemCard.appendChild(rightContainer);
            itemsListContainer.appendChild(itemCard);
        });
    }
    else {
        // --- Donut Chart for Recurrent Expenses (only if not infinite) ---
        if (record.type === 'Recurrente' && !record.isInfinite && record.totalAmount && record.durationInMonths && typeof record.installmentsPaid !== 'undefined') {
            const totalPaid = (record.installmentsPaid || 0) * record.amount;
            const percentage = record.totalAmount > 0 ? (totalPaid / record.totalAmount) * 100 : 0;
            const circumference = 2 * Math.PI * 15.9154943092; // Radius that gives circumference of 100
            const offset = circumference - (percentage / 100) * circumference;
            const chartContainer = document.createElement('div');
            chartContainer.className = 'chart-container';
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 36 36');
            svg.classList.add('donut-svg');
            const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            ring.classList.add('donut-ring');
            ring.setAttribute('cx', '18');
            ring.setAttribute('cy', '18');
            ring.setAttribute('r', '15.9154943092');
            const segment = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            segment.classList.add('donut-segment');
            segment.setAttribute('cx', '18');
            segment.setAttribute('cy', '18');
            segment.setAttribute('r', '15.9154943092');
            segment.setAttribute('stroke-dasharray', `${circumference} ${circumference}`);
            segment.setAttribute('stroke-dashoffset', String(offset));
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.classList.add('donut-text');
            text.setAttribute('x', '50%');
            text.setAttribute('y', '50%');
            text.setAttribute('dy', '0.3em');
            text.textContent = `${Math.round(percentage)}%`;
            svg.appendChild(ring);
            svg.appendChild(segment);
            svg.appendChild(text);
            chartContainer.appendChild(svg);
            container.appendChild(chartContainer);
        }
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'details-container';
        detailsContainer.appendChild(createDetailItem('Nombre:', record.name));
        detailsContainer.appendChild(createDetailItem('Tipo:', record.type));
        detailsContainer.appendChild(createDetailItem('Categoría:', record.category));
        if (record.type === 'Recurrente' && record.totalAmount && !record.isInfinite) {
            detailsContainer.appendChild(createDetailItem('Monto Total:', formatCurrency(record.totalAmount, { includeSymbol: true })));
            detailsContainer.appendChild(createDetailItem('Monto de Cuota:', formatCurrency(record.amount, { includeSymbol: true })));
        }
        else {
            detailsContainer.appendChild(createDetailItem('Monto:', formatCurrency(record.amount, { includeSymbol: true })));
        }
        if (record.date) {
            detailsContainer.appendChild(createDetailItem('Fecha:', record.date));
        }
        if (record.recurrence) {
            detailsContainer.appendChild(createDetailItem('Frecuencia:', formatRecurrence(record.recurrence)));
        }
        if (record.durationInMonths && !record.isInfinite) {
            detailsContainer.appendChild(createDetailItem('Duración:', `${record.durationInMonths} meses`));
        }
        if (typeof record.installmentsPaid !== 'undefined' && !record.isInfinite) {
            detailsContainer.appendChild(createDetailItem('Meses Abonados:', record.installmentsPaid));
            if (record.durationInMonths) {
                const monthsRemaining = record.durationInMonths - record.installmentsPaid;
                detailsContainer.appendChild(createDetailItem('Meses Restantes:', monthsRemaining >= 0 ? monthsRemaining : 0));
            }
        }
        detailsContainer.appendChild(createDetailItem('Descripción:', record.description || 'N/A'));
        container.appendChild(detailsContainer);
    }
};