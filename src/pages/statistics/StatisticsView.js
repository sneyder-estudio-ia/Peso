import { appState } from '../../state/store.js';
import { createCard, createSimpleCard } from '../../components/common.js';
import { formatCurrency } from '../../utils/currency.js';
import { createExpenseBreakdownChart } from '../../components/charts.js';
import { createCalendar } from '../../components/Calendar.js';
const categoryColors = [
    '#388bfd', '#238636', '#d29922', '#f85149', '#a371f7', '#1f6feb', '#da3633', '#e36209'
];
const dayNameToIndex = {
    'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
};
const calculateValueInDateRange = (records, startDate, endDate) => {
    let total = 0;
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (start > end) {
        return 0;
    }
    records.forEach(record => {
        if (record.isGroup && record.items) {
            record.items.forEach(item => {
                if (record.type === 'Único' && item.date) {
                    const dateParts = item.date.split('-').map(Number);
                    const recordDateNum = dateParts[0] * 10000 + dateParts[1] * 100 + dateParts[2];
                    const startDateNum = start.getFullYear() * 10000 + (start.getMonth() + 1) * 100 + start.getDate();
                    const endDateNum = end.getFullYear() * 10000 + (end.getMonth() + 1) * 100 + end.getDate();
                    if (recordDateNum >= startDateNum && recordDateNum <= endDateNum) {
                        total += item.amount;
                    }
                }
                else if (record.type === 'Recurrente' && item.recurrence) {
                    const isItemWithDuration = 'durationInMonths' in item && typeof item.durationInMonths === 'number' && item.durationInMonths > 0;
                    let isCompleted = false;
                    if (isItemWithDuration && !item.isInfinite) {
                        if ((item.installmentsPaid ?? 0) >= item.durationInMonths) {
                            isCompleted = true;
                        }
                    }
                    if (!isCompleted) {
                        let currentDate = new Date(start);
                        while (currentDate <= end) {
                            let eventHappens = false;
                            switch (item.recurrence.type) {
                                case 'Diario':
                                    eventHappens = true;
                                    break;
                                case 'Semanal':
                                    const targetDayIndex = dayNameToIndex[item.recurrence.dayOfWeek];
                                    if (currentDate.getDay() === targetDayIndex)
                                        eventHappens = true;
                                    break;
                                case 'Quincenal':
                                case 'Mensual':
                                    const dayOfMonth = currentDate.getDate();
                                    if (item.recurrence.daysOfMonth?.includes(dayOfMonth))
                                        eventHappens = true;
                                    break;
                            }
                            if (eventHappens)
                                total += item.amount;
                            currentDate.setDate(currentDate.getDate() + 1);
                        }
                    }
                }
            });
        }
        else {
            if (record.type === 'Único' && record.date) {
                const dateParts = record.date.split('-').map(Number);
                const recordDateNum = dateParts[0] * 10000 + dateParts[1] * 100 + dateParts[2];
                const startDateNum = start.getFullYear() * 10000 + (start.getMonth() + 1) * 100 + start.getDate();
                const endDateNum = end.getFullYear() * 10000 + (end.getMonth() + 1) * 100 + end.getDate();
                if (recordDateNum >= startDateNum && recordDateNum <= endDateNum) {
                    total += record.amount;
                }
            }
            else if (record.type === 'Recurrente' && record.recurrence) {
                const expenseRecord = record;
                const isExpenseWithDuration = 'durationInMonths' in expenseRecord && typeof expenseRecord.durationInMonths === 'number' && expenseRecord.durationInMonths > 0;
                let isCompleted = false;
                if (isExpenseWithDuration && !expenseRecord.isInfinite) {
                    if ((expenseRecord.installmentsPaid ?? 0) >= expenseRecord.durationInMonths) {
                        isCompleted = true;
                    }
                }
                if (!isCompleted) {
                    let currentDate = new Date(start);
                    while (currentDate <= end) {
                        let eventHappens = false;
                        switch (record.recurrence.type) {
                            case 'Diario':
                                eventHappens = true;
                                break;
                            case 'Semanal':
                                const targetDayIndex = dayNameToIndex[record.recurrence.dayOfWeek];
                                if (currentDate.getDay() === targetDayIndex) {
                                    eventHappens = true;
                                }
                                break;
                            case 'Quincenal':
                            case 'Mensual':
                                const dayOfMonth = currentDate.getDate();
                                if (record.recurrence.daysOfMonth?.includes(dayOfMonth)) {
                                    eventHappens = true;
                                }
                                break;
                        }
                        if (eventHappens) {
                            total += record.amount;
                        }
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                }
            }
        }
    });
    return total;
};
export const renderStatisticsView = (container, navigate) => {
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
    const rerenderCalendar = (newDate) => {
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
    const now = new Date();
    // Get earliest date from record creation IDs and unique record dates
    const timestampsFromIds = [...appState.incomeRecords, ...appState.expenseRecords]
        .map(r => {
        const parts = r.id.split('-');
        const lastPart = parts.pop();
        if (!lastPart)
            return null;
        // Handle cases like 'inc-sal-sal-TIMESTAMP'
        const potentialTimestampStr = lastPart.split('-').pop();
        if (potentialTimestampStr) {
            const timestamp = parseInt(potentialTimestampStr, 10);
            if (!isNaN(timestamp))
                return timestamp;
        }
        return null;
    })
        .filter(ts => ts !== null);
    const datesFromUniqueRecords = [];
    const processRecordsForDates = (records) => {
        records.forEach(record => {
            if (record.type === 'Único') {
                if (record.isGroup) {
                    record.items?.forEach(item => {
                        if (item.date) {
                            datesFromUniqueRecords.push(new Date(item.date + 'T00:00:00').getTime());
                        }
                    });
                }
                else if (record.date) {
                    datesFromUniqueRecords.push(new Date(record.date + 'T00:00:00').getTime());
                }
            }
        });
    };
    processRecordsForDates(appState.incomeRecords);
    processRecordsForDates(appState.expenseRecords);
    const allHistoricalTimestamps = [...timestampsFromIds, ...datesFromUniqueRecords];
    const startOfTime = allHistoricalTimestamps.length > 0 ? new Date(Math.min(...allHistoricalTimestamps)) : now;
    const totalIncome = calculateValueInDateRange(appState.incomeRecords, startOfTime, now);
    const totalExpense = calculateValueInDateRange(appState.expenseRecords, startOfTime, now);
    const balance = totalIncome - totalExpense;
    const balanceCard = createCard('Balance General (Histórico)', formatCurrency(balance, { includeSymbol: true }), balance >= 0 ? 'income' : 'expense', 'Ingresos vs Gastos Totales', `${formatCurrency(totalIncome, { includeSymbol: true })} / ${formatCurrency(totalExpense, { includeSymbol: true })}`);
    balanceCard.classList.add('balance-card');
    balanceSection.appendChild(balanceCard);
    // --- Expense Breakdown ---
    const expenseSection = document.createElement('div');
    expenseSection.className = 'stats-section';
    const expenseCard = createSimpleCard('Desglose de Gastos');
    const totalExpenseForChart = appState.expenseRecords.reduce((sum, record) => sum + record.amount, 0);
    if (appState.expenseRecords.length > 0) {
        const expenseByCategory = appState.expenseRecords.reduce((acc, record) => {
            if (record.isGroup) {
                // For a group, use its name as the category label.
                const category = record.name || 'Grupo';
                acc[category] = (acc[category] || 0) + record.amount;
            }
            else {
                // For a normal expense, use its category.
                const category = record.category || 'General';
                acc[category] = (acc[category] || 0) + record.amount;
            }
            return acc;
        }, {});
        const chartData = Object.entries(expenseByCategory)
            .map(([label, value], index) => ({
            label,
            value,
            color: categoryColors[index % categoryColors.length]
        }))
            .sort((a, b) => b.value - a.value);
        const breakdownChart = createExpenseBreakdownChart(chartData, totalExpenseForChart, appState.expenseRecords);
        expenseCard.appendChild(breakdownChart);
    }
    else {
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
