import { formatCurrency } from '../utils/currency.js';
import { ExpenseRecord } from '../types/index.js';
import { formatRecurrence } from '../utils/helpers.js';

interface ChartData {
    label: string;
    value: number;
    color: string;
}

export const createExpenseBreakdownChart = (data: ChartData[], total: number, allExpenses: ExpenseRecord[]) => {
    const mainContainer = document.createElement('div');

    const chartContainer = document.createElement('div');
    chartContainer.className = 'pie-chart-container';
    chartContainer.style.marginTop = '20px';
    chartContainer.style.marginBottom = '0'; // Let parent control space below


    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 42 42');
    svg.classList.add('pie-chart');

    const cx = 21;
    const cy = 21;
    const radius = 15.9154943092;
    const strokeWidth = 5;

    // Background track
    const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    track.setAttribute('cx', String(cx));
    track.setAttribute('cy', String(cy));
    track.setAttribute('r', String(radius));
    track.setAttribute('fill', 'transparent');
    track.setAttribute('stroke', '#30363d');
    track.setAttribute('stroke-width', String(strokeWidth));
    svg.appendChild(track);

    let accumulatedPercentage = 0;
    data.forEach(item => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        if (percentage === 0) return;

        const segment = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        segment.setAttribute('cx', String(cx));
        segment.setAttribute('cy', String(cy));
        segment.setAttribute('r', String(radius));
        segment.setAttribute('fill', 'transparent');
        segment.setAttribute('stroke', item.color);
        segment.setAttribute('stroke-width', String(strokeWidth));
        segment.setAttribute('stroke-linecap', 'round');

        const segmentLength = percentage > 0.5 ? percentage - 0.5 : percentage; // Gap
        segment.setAttribute('stroke-dasharray', `${segmentLength} ${100 - segmentLength}`);
        segment.setAttribute('stroke-dashoffset', String(25 - accumulatedPercentage)); // Start at top and offset
        segment.classList.add('pie-segment');
        segment.dataset.label = item.label;

        svg.appendChild(segment);
        accumulatedPercentage += percentage;
    });

    chartContainer.appendChild(svg);

    const legend = document.createElement('ul');
    legend.className = 'pie-chart-legend';

    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'expense-details-container';
    detailsContainer.style.display = 'none';

    let activeLabel: string | null = null;

    data.forEach(item => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;

        const li = document.createElement('li');
        li.dataset.label = item.label;
        
        const colorBox = document.createElement('span');
        colorBox.className = 'legend-color-box';
        colorBox.style.backgroundColor = item.color;

        const label = document.createElement('span');
        label.className = 'legend-label';
        label.textContent = item.label;

        const percentageEl = document.createElement('span');
        percentageEl.className = 'legend-percentage';
        percentageEl.textContent = `${percentage.toFixed(1)}%`;
        
        const value = document.createElement('span');
        value.className = 'legend-value';
        value.textContent = `(${formatCurrency(item.value, { includeSymbol: true })})`;

        li.appendChild(colorBox);
        li.appendChild(label);
        li.appendChild(percentageEl);
        li.appendChild(value);
        legend.appendChild(li);

        // --- Interactivity ---
        const segment = svg.querySelector(`.pie-segment[data-label="${item.label}"]`);

        li.onmouseenter = () => {
            segment?.classList.add('highlight');
        };
        li.onmouseleave = () => {
            segment?.classList.remove('highlight');
        };
        li.onclick = () => {
            if (activeLabel === item.label) {
                detailsContainer.style.display = 'none';
                activeLabel = null;
                li.classList.remove('active');
                return;
            }
            activeLabel = item.label;

            // Update legend active state
            legend.querySelector('.active')?.classList.remove('active');
            li.classList.add('active');

            // Populate details
            const categoryExpenses = allExpenses
                .filter(exp => (exp.isGroup ? exp.name : (exp.category || 'General')) === item.label)
                .sort((a,b) => b.amount - a.amount);

            detailsContainer.innerHTML = '';
            const detailsTitle = document.createElement('h4');
            detailsTitle.className = 'expense-details-title';
            detailsTitle.textContent = `Transacciones en "${item.label}"`;
            detailsContainer.appendChild(detailsTitle);

            const list = document.createElement('div');
            list.className = 'expense-details-list';

            if (categoryExpenses.length > 0) {
                categoryExpenses.forEach(exp => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'expense-details-list-item';
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'details-item-name';
                    nameSpan.textContent = exp.name;

                    const dateSpan = document.createElement('span');
                    dateSpan.className = 'details-item-date';
                    dateSpan.textContent = exp.date || (exp.recurrence ? formatRecurrence(exp.recurrence) : '');

                    const amountSpan = document.createElement('span');
                    amountSpan.className = 'details-item-amount';
                    amountSpan.textContent = `-${formatCurrency(exp.amount, { includeSymbol: true })}`;

                    itemEl.appendChild(nameSpan);
                    itemEl.appendChild(dateSpan);
                    itemEl.appendChild(amountSpan);
                    list.appendChild(itemEl);
                });
            } else {
                list.textContent = 'No se encontraron transacciones.';
            }

            detailsContainer.appendChild(list);
            detailsContainer.style.display = 'block';
        };
    });
    
    mainContainer.appendChild(chartContainer);
    mainContainer.appendChild(legend);
    mainContainer.appendChild(detailsContainer);

    return mainContainer;
};