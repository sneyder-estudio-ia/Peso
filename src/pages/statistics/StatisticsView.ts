import { appState } from '../../state/store.js';
import { createSimpleCard } from '../../components/common.js';
import { createExpenseBreakdownChart } from '../../components/charts.js';
import { createCalendar } from '../../components/Calendar.js';
import { ExpenseRecord, ExpenseSubItem, IncomeRecord } from '../../types/index.js';
import { formatCurrency } from '../../utils/currency.js';

const categoryColors = [
    '#388bfd', '#238636', '#d29922', '#f85149', '#a371f7', '#1f6feb', '#da3633', '#e36209'
];

const dayNameToIndex: { [key: string]: number } = {
    'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
};

const calculateProjectedMonthValue = (
    records: ExpenseRecord[],
    year: number,
    month: number // 0-11
): number => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let total = 0;

    records.forEach(record => {
        if (record.isGroup && record.items) {
            record.items.forEach((item: ExpenseSubItem) => {
                if (record.type === 'Único' && item.date) {
                    const [recYear, recMonth] = item.date.split('-').map(Number);
                    if (recYear === year && recMonth === month + 1) {
                        total += item.amount;
                    }
                } else if (record.type === 'Recurrente' && item.recurrence) {
                    let isCompleted = false;
                    if ('durationInMonths' in item && typeof item.durationInMonths === 'number' && item.durationInMonths > 0 && !item.isInfinite) {
                        if ((item.installmentsPaid ?? 0) >= item.durationInMonths!) {
                            isCompleted = true;
                        }
                    }
    
                    if (!isCompleted) {
                        switch (item.recurrence.type) {
                            case 'Diario':
                                total += item.amount * daysInMonth;
                                break;
                            case 'Semanal':
                                if (item.recurrence.dayOfWeek) {
                                    const targetDayIndex = dayNameToIndex[item.recurrence.dayOfWeek];
                                    if (targetDayIndex !== undefined) {
                                        let count = 0;
                                        for (let day = 1; day <= daysInMonth; day++) {
                                            const date = new Date(year, month, day);
                                            if (date.getDay() === targetDayIndex) count++;
                                        }
                                        total += item.amount * count;
                                    }
                                }
                                break;
                            case 'Quincenal':
                            case 'Mensual':
                                if (item.recurrence.daysOfMonth) {
                                    total += item.amount * item.recurrence.daysOfMonth.filter(d => d <= daysInMonth).length;
                                }
                                break;
                        }
                    }
                }
            });
        } else {
            if (record.type === 'Único' && record.date) {
                const [recYear, recMonth] = record.date.split('-').map(Number);
                if (recYear === year && recMonth === month + 1) {
                    total += record.amount;
                }
            } else if (record.type === 'Recurrente' && record.recurrence) {
                let isCompleted = false;

                if ('durationInMonths' in record && typeof record.durationInMonths === 'number' && record.durationInMonths > 0 && !record.isInfinite) {
                    if ((record.installmentsPaid ?? 0) >= record.durationInMonths!) {
                        isCompleted = true;
                    }
                }

                if (!isCompleted) {
                    switch (record.recurrence.type) {
                        case 'Diario':
                            total += record.amount * daysInMonth;
                            break;
                        case 'Semanal':
                            if (record.recurrence.dayOfWeek) {
                                const targetDayIndex = dayNameToIndex[record.recurrence.dayOfWeek];
                                if (targetDayIndex !== undefined) {
                                    let count = 0;
                                    for (let day = 1; day <= daysInMonth; day++) {
                                        const date = new Date(year, month, day);
                                        if (date.getDay() === targetDayIndex) {
                                            count++;
                                        }
                                    }
                                    total += record.amount * count;
                                }
                            }
                            break;
                        case 'Quincenal':
                        case 'Mensual':
                            if (record.recurrence.daysOfMonth) {
                                total += record.amount * record.recurrence.daysOfMonth.filter(d => d <= daysInMonth).length;
                            }
                            break;
                    }
                }
            }
        }
    });

    return total;
};

const calculateValueInDateRange = (
    records: (IncomeRecord[] | ExpenseRecord[]),
    startDate: Date,
    endDate: Date
): number => {
    let total = 0;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
        return 0;
    }

    records.forEach(record => {
        if ((record as ExpenseRecord).isGroup && (record as ExpenseRecord).items) {
            (record as ExpenseRecord).items!.forEach(item => {
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
                        if ((item.installmentsPaid ?? 0) >= item.durationInMonths!) {
                            isCompleted = true;
                        }
                    }
    
                    if (!isCompleted) {
                        let currentDate = new Date(start);
                        while (currentDate <= end) {
                            let eventHappens = false;
                            switch (item.recurrence.type) {
                                case 'Diario': eventHappens = true; break;
                                case 'Semanal':
                                    const targetDayIndex = dayNameToIndex[item.recurrence.dayOfWeek!];
                                    if (currentDate.getDay() === targetDayIndex) eventHappens = true;
                                    break;
                                case 'Quincenal': case 'Mensual':
                                    const dayOfMonth = currentDate.getDate();
                                    if (item.recurrence.daysOfMonth?.includes(dayOfMonth)) eventHappens = true;
                                    break;
                            }
                            if (eventHappens) total += item.amount;
                            currentDate.setDate(currentDate.getDate() + 1);
                        }
                    }
                }
            });
        } else {
            if (record.type === 'Único' && record.date) {
                const dateParts = record.date.split('-').map(Number);
                const recordDateNum = dateParts[0] * 10000 + dateParts[1] * 100 + dateParts[2];
                const startDateNum = start.getFullYear() * 10000 + (start.getMonth() + 1) * 100 + start.getDate();
                const endDateNum = end.getFullYear() * 10000 + (end.getMonth() + 1) * 100 + end.getDate();
                if (recordDateNum >= startDateNum && recordDateNum <= endDateNum) {
                    total += record.amount;
                }
            } else if (record.type === 'Recurrente' && record.recurrence) {
                const expenseRecord = record as ExpenseRecord;
                const isExpenseWithDuration = 'durationInMonths' in expenseRecord && typeof expenseRecord.durationInMonths === 'number' && expenseRecord.durationInMonths > 0;
                let isCompleted = false;
                if (isExpenseWithDuration && !expenseRecord.isInfinite) {
                    if ((expenseRecord.installmentsPaid ?? 0) >= expenseRecord.durationInMonths!) {
                        isCompleted = true;
                    }
                }
                if (!isCompleted) {
                    let currentDate = new Date(start);
                    while (currentDate <= end) {
                        let eventHappens = false;
                        switch (record.recurrence.type) {
                            case 'Diario': eventHappens = true; break;
                            case 'Semanal':
                                const targetDayIndex = dayNameToIndex[record.recurrence.dayOfWeek!];
                                if (currentDate.getDay() === targetDayIndex) eventHappens = true;
                                break;
                            case 'Quincenal': case 'Mensual':
                                const dayOfMonth = currentDate.getDate();
                                if (record.recurrence.daysOfMonth?.includes(dayOfMonth)) eventHappens = true;
                                break;
                        }
                        if (eventHappens) total += record.amount;
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                }
            }
        }
    });
    return total;
};


export const renderStatisticsView = (container: HTMLElement, navigate: (view: 'statistics' | 'settings') => void) => {
    container.innerHTML = `
        <div class="stats-title-container">
            <h2 class="stats-title">Análisis y Estadísticas</h2>
            <button class="btn-settings" aria-label="Configuración">&#9881;</button>
        </div>
        <div id="stats-calendar-section" class="stats-section"></div>
        <div id="stats-expense-section" class="stats-section"></div>
    `;

    container.querySelector('.btn-settings')!.addEventListener('click', () => navigate('settings'));
    
    const calendarSection = container.querySelector<HTMLElement>('#stats-calendar-section')!;
    const expenseSection = container.querySelector<HTMLElement>('#stats-expense-section')!;

    let currentDate = new Date();

    const renderExpenseChart = (date: Date) => {
        expenseSection.innerHTML = ''; // Clear previous chart
        
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthName = date.toLocaleString('es-ES', { month: 'long' });

        // --- Calculate Periodic Expense (based on today's date) ---
        const allRecurringRecords = [...appState.incomeRecords, ...appState.expenseRecords]
            .filter(r => r.type === 'Recurrente' && r.recurrence);

        let dominantFrequency = 'Mensual';
        if (allRecurringRecords.some(r => r.recurrence!.type === 'Diario')) dominantFrequency = 'Diario';
        else if (allRecurringRecords.some(r => r.recurrence!.type === 'Semanal')) dominantFrequency = 'Semanal';
        else if (allRecurringRecords.some(r => r.recurrence!.type === 'Quincenal')) dominantFrequency = 'Quincenal';

        let periodStartDate: Date;
        let periodEndDate: Date;
        const todayDate = new Date();
        const todayDay = todayDate.getDate();
        const todayYear = todayDate.getFullYear();
        const todayMonth = todayDate.getMonth();
        const daysInCurrentMonth = new Date(todayYear, todayMonth + 1, 0).getDate();

        switch (dominantFrequency) {
            case 'Diario':
                periodStartDate = new Date(todayDate.setHours(0,0,0,0));
                periodEndDate = new Date(todayDate.setHours(23,59,59,999));
                break;
            case 'Semanal':
                const dayOfWeek = todayDate.getDay();
                const diff = todayDay - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
                periodStartDate = new Date(todayYear, todayMonth, diff);
                periodEndDate = new Date(todayYear, todayMonth, diff + 6);
                break;
            case 'Quincenal':
                if (todayDay <= 15) {
                    periodStartDate = new Date(todayYear, todayMonth, 1);
                    periodEndDate = new Date(todayYear, todayMonth, 15);
                } else {
                    periodStartDate = new Date(todayYear, todayMonth, 16);
                    periodEndDate = new Date(todayYear, todayMonth, daysInCurrentMonth);
                }
                break;
            default: // Mensual
                periodStartDate = new Date(todayYear, todayMonth, 1);
                periodEndDate = new Date(todayYear, todayMonth, daysInCurrentMonth);
                break;
        }
        const periodicExpense = calculateValueInDateRange(appState.expenseRecords, periodStartDate, periodEndDate);
        
        // --- Calculate Monthly Expense (based on calendar date) ---
        const totalMonthlyExpense = calculateProjectedMonthValue(appState.expenseRecords, year, month);

        const expenseCard = createSimpleCard(`Desglose (${monthName} ${year})`);

        // --- Create Totals Container ---
        const totalsContainer = document.createElement('div');
        totalsContainer.style.display = 'flex';
        totalsContainer.style.justifyContent = 'space-around';
        totalsContainer.style.gap = '15px';
        totalsContainer.style.marginTop = '20px';
        totalsContainer.style.marginBottom = '25px';

        const periodicTotalContainer = document.createElement('div');
        periodicTotalContainer.style.textAlign = 'center';
        const periodicValueEl = document.createElement('div');
        periodicValueEl.className = 'primary-value expense';
        periodicValueEl.textContent = formatCurrency(periodicExpense, { includeSymbol: true });
        const periodicLabelEl = document.createElement('div');
        periodicLabelEl.className = 'label';
        periodicLabelEl.style.textTransform = 'capitalize';
        const dominantFrequencyLabel = dominantFrequency.charAt(0).toUpperCase() + dominantFrequency.slice(1);
        periodicLabelEl.textContent = `Gasto (${dominantFrequencyLabel})`;
        periodicTotalContainer.appendChild(periodicValueEl);
        periodicTotalContainer.appendChild(periodicLabelEl);

        const monthlyTotalContainer = document.createElement('div');
        monthlyTotalContainer.style.textAlign = 'center';
        const monthlyValueEl = document.createElement('div');
        monthlyValueEl.className = 'primary-value expense';
        monthlyValueEl.textContent = formatCurrency(totalMonthlyExpense, { includeSymbol: true });
        const monthlyLabelEl = document.createElement('div');
        monthlyLabelEl.className = 'label';
        monthlyLabelEl.style.textTransform = 'capitalize';
        monthlyLabelEl.textContent = 'Gasto Esperado (Mes)';
        monthlyTotalContainer.appendChild(monthlyValueEl);
        monthlyTotalContainer.appendChild(monthlyLabelEl);
        
        totalsContainer.appendChild(periodicTotalContainer);
        totalsContainer.appendChild(monthlyTotalContainer);


        if (totalMonthlyExpense > 0) {
            const breakdown: { [key: string]: number } = {};
            appState.expenseRecords.forEach(record => {
                const monthlyValue = calculateProjectedMonthValue([record], year, month);
                if (monthlyValue > 0) {
                    const category = record.isGroup ? record.name : (record.category || 'General');
                    breakdown[category] = (breakdown[category] || 0) + monthlyValue;
                }
            });

            const chartData = Object.entries(breakdown)
                .map(([label, value], index) => ({
                    label, value, color: categoryColors[index % categoryColors.length]
                }))
                .sort((a, b) => b.value - a.value);

            const breakdownChartAndLegend = createExpenseBreakdownChart(chartData, totalMonthlyExpense, appState.expenseRecords);
            const chartElement = breakdownChartAndLegend.querySelector('.pie-chart-container');
            chartElement?.insertAdjacentElement('afterend', totalsContainer);
            
            expenseCard.appendChild(breakdownChartAndLegend);
        } else {
             expenseCard.appendChild(totalsContainer);
             const emptyMessage = document.createElement('p');
             emptyMessage.className = 'empty-list-message';
             emptyMessage.textContent = `No hay gastos para ${monthName} ${year}.`;
             expenseCard.appendChild(emptyMessage);
        }
        
        expenseSection.appendChild(expenseCard);
    };

    const rerenderCalendar = (newDate: Date) => {
        currentDate = newDate;
        calendarSection.innerHTML = '';
        const calendar = createCalendar(currentDate, rerenderCalendar);
        calendarSection.appendChild(calendar);
        renderExpenseChart(newDate); // Update chart when calendar changes
    };

    // Initial Renders
    const calendar = createCalendar(currentDate, rerenderCalendar);
    calendarSection.appendChild(calendar);
    renderExpenseChart(currentDate);
};