import { appState } from '../../state/store.js';
import { createCard, createSimpleCard } from '../../components/common.js';
import { formatCurrency } from '../../utils/currency.js';
import { createExpenseBreakdownChart } from '../../components/charts.js';
import { createCalendar } from '../../components/Calendar.js';

const categoryColors = [
    '#388bfd', '#238636', '#d29922', '#f85149', '#a371f7', '#1f6feb', '#da3633', '#e36209'
];

export const renderStatisticsView = (container: HTMLElement, navigate: (view: 'statistics' | 'settings') => void) => {
    container.innerHTML = ''; // Clear previous content

    const titleContainer = document.createElement('div');
    titleContainer.className = 'stats-title-container';

    const title = document.createElement('h2');
    title.className = 'stats-title';
    title.textContent = 'Análisis y Estadísticas';

    const settingsButton = document.createElement('button');
    settingsButton.className = 'btn-settings';
    settingsButton.innerHTML = '&#9881;'; // Gear icon
    settingsButton.setAttribute('aria-label', 'Configuración');
    settingsButton.onclick = () => navigate('settings');

    titleContainer.appendChild(title);
    titleContainer.appendChild(settingsButton);

    // --- Calendar ---
    const calendarSection = document.createElement('div');
    calendarSection.className = 'stats-section';

    let currentDate = new Date();
    
    const rerenderCalendar = (newDate: Date) => {
        currentDate = newDate;
        calendarSection.innerHTML = '';
        const calendar = createCalendar(currentDate, rerenderCalendar);
        calendarSection.appendChild(calendar);
    };

    const calendar = createCalendar(currentDate, rerenderCalendar);
    calendarSection.appendChild(calendar);

    // --- Balance Card ---
    const balanceSection = document.createElement('div');
    balanceSection.className = 'stats-section';
    
    const totalIncome = appState.incomeRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalExpense = appState.expenseRecords.reduce((sum, record) => sum + record.amount, 0);
    const balance = totalIncome - totalExpense;

    const balanceCard = createCard(
        'Balance General',
        `$ ${formatCurrency(balance)}`,
        balance >= 0 ? 'income' : 'expense',
        'Ingresos vs Gastos',
        `$ ${formatCurrency(totalIncome)} / $ ${formatCurrency(totalExpense)}`
    );
    balanceCard.classList.add('balance-card');
    balanceSection.appendChild(balanceCard);


    // --- Expense Breakdown ---
    const expenseSection = document.createElement('div');
    expenseSection.className = 'stats-section';

    const expenseCard = createSimpleCard('Desglose de Gastos');

    if (appState.expenseRecords.length > 0) {
        const expenseByCategory = appState.expenseRecords.reduce((acc, record) => {
            const category = record.category || 'General';
            acc[category] = (acc[category] || 0) + record.amount;
            return acc;
        }, {} as { [key: string]: number });

        const chartData = Object.entries(expenseByCategory)
            .map(([label, value], index) => ({
                label,
                value,
                color: categoryColors[index % categoryColors.length]
            }))
            .sort((a, b) => b.value - a.value);

        const breakdownChart = createExpenseBreakdownChart(chartData, totalExpense, appState.expenseRecords);
        expenseCard.appendChild(breakdownChart);

    } else {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'empty-list-message';
        emptyMessage.textContent = 'No hay gastos para analizar.';
        expenseCard.appendChild(emptyMessage);
    }
    expenseSection.appendChild(expenseCard);


    container.appendChild(titleContainer);
    container.appendChild(calendarSection);
    container.appendChild(balanceSection);
    container.appendChild(expenseSection);
};