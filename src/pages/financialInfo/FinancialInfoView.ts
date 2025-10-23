import { appState } from '../../state/store.js';
import { formatCurrency } from '../../utils/currency.js';
import { createExpenseBreakdownChart } from '../../components/charts.js';
import { ExpenseRecord, IncomeRecord, ExpenseSubItem, RecurrenceRule } from '../../types/index.js';

type NavigateFunction = (view: string, state?: object) => void;

const categoryColors = [
    '#388bfd', '#238636', '#d29922', '#f85149', '#a371f7', '#1f6feb', '#da3633', '#e36209'
];

const dayNameToIndex: { [key: string]: number } = {
    'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
};

const calculateProjectedMonthValue = (
    records: (IncomeRecord[] | ExpenseRecord[]),
    year: number,
    month: number
): number => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let total = 0;

    records.forEach(record => {
        if ((record as ExpenseRecord).isGroup && (record as ExpenseRecord).items) {
            (record as ExpenseRecord).items!.forEach((item: ExpenseSubItem) => {
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
                        // Recurrence logic for sub-items...
                         switch (item.recurrence.type) {
                            case 'Diario': total += item.amount * daysInMonth; break;
                            case 'Semanal':
                                if (item.recurrence.dayOfWeek) {
                                    const targetDayIndex = dayNameToIndex[item.recurrence.dayOfWeek];
                                    let count = 0;
                                    for (let day = 1; day <= daysInMonth; day++) {
                                        if (new Date(year, month, day).getDay() === targetDayIndex) count++;
                                    }
                                    total += item.amount * count;
                                }
                                break;
                            case 'Quincenal': case 'Mensual':
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
                if ('durationInMonths' in record && typeof (record as ExpenseRecord).durationInMonths === 'number' && (record as ExpenseRecord).durationInMonths! > 0 && !(record as ExpenseRecord).isInfinite) {
                    if (((record as ExpenseRecord).installmentsPaid ?? 0) >= (record as ExpenseRecord).durationInMonths!) {
                        isCompleted = true;
                    }
                }
                if (!isCompleted) {
                    // Recurrence logic for main records...
                    switch (record.recurrence.type) {
                        case 'Diario': total += record.amount * daysInMonth; break;
                        case 'Semanal':
                            if (record.recurrence.dayOfWeek) {
                                const targetDayIndex = dayNameToIndex[record.recurrence.dayOfWeek];
                                let count = 0;
                                for (let day = 1; day <= daysInMonth; day++) {
                                    if (new Date(year, month, day).getDay() === targetDayIndex) count++;
                                }
                                total += record.amount * count;
                            }
                            break;
                        case 'Quincenal': case 'Mensual':
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


export const renderFinancialInfoView = (container: HTMLElement, navigate: NavigateFunction) => {
    container.innerHTML = '';

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthName = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // --- Header ---
    const header = document.createElement('div');
    header.className = 'income-page-header';

    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.innerHTML = '&larr; Volver';
    backButton.onclick = () => navigate('dashboard');
    header.appendChild(backButton);
    
    const forecastButton = document.createElement('button');
    forecastButton.className = 'btn btn-option';
    forecastButton.textContent = 'Ver Pronóstico';
    forecastButton.style.marginLeft = 'auto';
    forecastButton.onclick = () => navigate('financialForecast');
    header.appendChild(forecastButton);
    
    container.appendChild(header);

    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = `Informe Financiero de ${monthName}`;
    container.appendChild(title);

    // --- 1. DATA CALCULATION ---
    const totalMonthlyExpense = calculateProjectedMonthValue(appState.expenseRecords, year, month);
    const totalMonthlyIncome = calculateProjectedMonthValue(appState.incomeRecords, year, month);
    const dailyAverage = totalMonthlyExpense > 0 ? totalMonthlyExpense / daysInMonth : 0;
    const monthlyBalance = totalMonthlyIncome - totalMonthlyExpense;

    // --- 2. RENDER SUMMARY ---
    const summaryGrid = document.createElement('div');
    summaryGrid.className = 'summary-grid';
    summaryGrid.innerHTML = `
        <div class="summary-item">
            <div class="label">Total de Gastos</div>
            <div class="primary-value expense">${formatCurrency(totalMonthlyExpense, { includeSymbol: true })}</div>
        </div>
        <div class="summary-item">
            <div class="label">Gasto Promedio Diario</div>
            <div class="primary-value expense">${formatCurrency(dailyAverage, { includeSymbol: true })}</div>
        </div>
        <div class="summary-item">
            <div class="label">Total de Ingresos</div>
            <div class="primary-value income">${formatCurrency(totalMonthlyIncome, { includeSymbol: true })}</div>
        </div>
        <div class="summary-item">
            <div class="label">Balance del Mes</div>
            <div class="primary-value ${monthlyBalance >= 0 ? 'income' : 'expense'}">${formatCurrency(monthlyBalance, { includeSymbol: true })}</div>
        </div>
    `;
    container.appendChild(summaryGrid);
    
    // --- 3. DATA FOR CHART AND LISTS ---
    const expenseBreakdown: { [key: string]: number } = {};
    const detailedExpenses: { date: Date; name: string; amount: number; category: string }[] = [];
    
    appState.expenseRecords.forEach(record => {
        const category = record.isGroup ? record.name : (record.category || 'General');
        
        const itemsToCheck: (ExpenseRecord | ExpenseSubItem)[] = record.isGroup ? record.items || [] : [record];
        
        itemsToCheck.forEach(item => {
            if (record.type === 'Único' && item.date) {
                const [recYear, recMonth, recDay] = item.date.split('-').map(Number);
                if (recYear === year && recMonth === month + 1) {
                    expenseBreakdown[category] = (expenseBreakdown[category] || 0) + item.amount;
                    detailedExpenses.push({ date: new Date(year, month, recDay), name: item.name, amount: item.amount, category });
                }
            } else if (record.type === 'Recurrente' && item.recurrence) {
                 let isCompleted = !item.isInfinite && item.durationInMonths && (item.installmentsPaid ?? 0) >= item.durationInMonths;
                if (!isCompleted) {
                    for (let day = 1; day <= daysInMonth; day++) {
                        const checkDate = new Date(year, month, day);
                        let eventHappens = false;
                        switch (item.recurrence.type) {
                            case 'Diario': eventHappens = true; break;
                            case 'Semanal': eventHappens = checkDate.getDay() === dayNameToIndex[item.recurrence.dayOfWeek!]; break;
                            case 'Mensual': case 'Quincenal': eventHappens = item.recurrence.daysOfMonth?.includes(day) ?? false; break;
                        }
                        if (eventHappens) {
                            expenseBreakdown[category] = (expenseBreakdown[category] || 0) + item.amount;
                            detailedExpenses.push({ date: checkDate, name: item.name, amount: item.amount, category });
                        }
                    }
                }
            }
        });
    });

    // --- 4. RENDER CHART SECTION ---
    if (totalMonthlyExpense > 0) {
        const chartSection = document.createElement('div');
        chartSection.className = 'report-section';
        const chartTitle = document.createElement('h3');
        chartTitle.className = 'card-title';
        chartTitle.textContent = 'Desglose de Gastos por Categoría';
        chartSection.appendChild(chartTitle);

        const chartData = Object.entries(expenseBreakdown)
            .map(([label, value], index) => ({
                label, value, color: categoryColors[index % categoryColors.length]
            }))
            .sort((a, b) => b.value - a.value);

        const chartElement = createExpenseBreakdownChart(chartData, totalMonthlyExpense, appState.expenseRecords);
        chartSection.appendChild(chartElement);
        container.appendChild(chartSection);
    }

    // --- 5. RENDER DETAILED LIST SECTION ---
    const listSection = document.createElement('div');
    listSection.className = 'report-section';
    const listTitle = document.createElement('h3');
    listTitle.className = 'card-title';
    listTitle.textContent = 'Listado de Transacciones del Mes';
    listSection.appendChild(listTitle);

    if (detailedExpenses.length > 0) {
        const transactionList = document.createElement('div');
        transactionList.className = 'transaction-list';
        
        detailedExpenses.sort((a,b) => a.date.getTime() - b.date.getTime()).forEach(expense => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = `
                <div class="transaction-info">
                    <span class="transaction-name">${expense.name}</span>
                    <span class="transaction-details">${expense.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} • ${expense.category}</span>
                </div>
                <span class="transaction-amount">${formatCurrency(expense.amount, { includeSymbol: true })}</span>
            `;
            transactionList.appendChild(item);
        });
        listSection.appendChild(transactionList);
    } else {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'empty-list-message';
        emptyMessage.textContent = 'No se registraron gastos este mes.';
        listSection.appendChild(emptyMessage);
    }
    
    container.appendChild(listSection);
};