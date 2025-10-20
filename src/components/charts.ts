import { formatCurrency } from '../utils/currency.js';

interface ChartData {
    label: string;
    value: number;
    color: string;
}

export const createPieChart = (data: ChartData[], total: number) => {
    const container = document.createElement('div');
    const chartContainer = document.createElement('div');
    chartContainer.className = 'pie-chart-container';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 36 36');
    svg.classList.add('pie-chart');

    let accumulatedPercentage = 0;
    const radius = 15.9154943092; // Radius for a circumference of 100
    const circumference = 2 * Math.PI * radius;

    data.forEach(item => {
        const percentage = (item.value / total) * 100;
        const offset = circumference - (accumulatedPercentage / 100) * circumference;

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', String(radius));
        circle.setAttribute('cx', '18');
        circle.setAttribute('cy', '18');
        circle.setAttribute('fill', 'transparent');
        circle.setAttribute('stroke', item.color);
        circle.setAttribute('stroke-width', '3');
        circle.setAttribute('stroke-dasharray', `${percentage} ${100 - percentage}`);
        circle.setAttribute('stroke-dashoffset', String(-accumulatedPercentage));
        circle.style.transform = `rotate(-90deg)`;
        circle.style.transformOrigin = 'center';
        
        svg.appendChild(circle);
        accumulatedPercentage += percentage;
    });

    chartContainer.appendChild(svg);

    const legend = document.createElement('ul');
    legend.className = 'pie-chart-legend';

    data.forEach(item => {
        const percentage = (item.value / total) * 100;

        const li = document.createElement('li');
        
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
        value.textContent = `($ ${formatCurrency(item.value)})`;

        li.appendChild(colorBox);
        li.appendChild(label);
        li.appendChild(percentageEl);
        li.appendChild(value);
        legend.appendChild(li);
    });
    
    container.appendChild(chartContainer);
    container.appendChild(legend);

    return container;
};
