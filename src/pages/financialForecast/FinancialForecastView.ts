import { appState } from '../../state/store.js';
import { formatCurrency } from '../../utils/currency.js';
import { ExpenseRecord, IncomeRecord, ExpenseSubItem, SavingRecord } from '../../types/index.js';

type NavigateFunction = (view: string, state?: object) => void;

type MonthlyTransaction = { 
    type: 'income' | 'expense', 
    recordType: 'Recurrente' | 'Único',
    date: Date, 
    name: string, 
    amount: number, 
    category: string 
};

const dayNameToIndex: { [key: string]: number } = {
    'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
};

const getDetailedTransactionsForMonth = (year: number, month: number): MonthlyTransaction[] => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const transactions: MonthlyTransaction[] = [];

    appState.incomeRecords.forEach(record => {
        if (record.type === 'Único' && record.date) {
            const [recYear, recMonth, recDay] = record.date.split('-').map(Number);
            if (recYear === year && recMonth === month + 1) {
                transactions.push({ type: 'income', recordType: 'Único', date: new Date(year, month, recDay), name: record.name, amount: record.amount, category: record.source || 'General' });
            }
        } else if (record.type === 'Recurrente' && record.recurrence) {
            for (let day = 1; day <= daysInMonth; day++) {
                const checkDate = new Date(year, month, day);
                let eventHappens = false;
                switch (record.recurrence.type) {
                    case 'Diario': eventHappens = true; break;
                    case 'Semanal': eventHappens = checkDate.getDay() === dayNameToIndex[record.recurrence.dayOfWeek!]; break;
                    case 'Mensual': case 'Quincenal': eventHappens = record.recurrence.daysOfMonth?.includes(day) ?? false; break;
                }
                if (eventHappens) {
                    transactions.push({ type: 'income', recordType: 'Recurrente', date: checkDate, name: record.name, amount: record.amount, category: record.source || 'General' });
                }
            }
        }
    });

    appState.expenseRecords.forEach(record => {
        const category = record.isGroup ? record.name : (record.category || 'General');
        const itemsToCheck: (ExpenseRecord | ExpenseSubItem)[] = record.isGroup ? record.items || [] : [record];
        itemsToCheck.forEach(item => {
            if (record.type === 'Único' && item.date) {
                const [recYear, recMonth, recDay] = item.date.split('-').map(Number);
                if (recYear === year && recMonth === month + 1) {
                    transactions.push({ type: 'expense', recordType: 'Único', date: new Date(year, month, recDay), name: item.name, amount: item.amount, category });
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
                            transactions.push({ type: 'expense', recordType: 'Recurrente', date: checkDate, name: item.name, amount: item.amount, category });
                        }
                    }
                }
            }
        });
    });
    return transactions;
}

const createCashflowBarChart = (income: number, expense: number, savings: number) => {
    const container = document.createElement('div');
    container.className = 'cashflow-chart-container';
    
    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = 'Flujo de Caja Proyectado';
    container.appendChild(title);

    const chart = document.createElement('div');
    chart.className = 'cashflow-chart';

    const maxVal = Math.max(income, expense, savings, 1);

    const createBar = (label: string, value: number, type: 'income' | 'expense' | 'savings') => {
        const group = document.createElement('div');
        group.className = 'chart-bar-group';
        
        const valueEl = document.createElement('div');
        valueEl.className = 'label';
        valueEl.textContent = formatCurrency(value, { includeSymbol: true });
        valueEl.style.marginBottom = '4px';

        const bar = document.createElement('div');
        bar.className = `chart-bar ${type}`;
        bar.style.height = `${(value / maxVal) * 100}%`;
        
        const labelEl = document.createElement('div');
        labelEl.className = 'chart-label';
        labelEl.textContent = label;

        group.appendChild(valueEl);
        group.appendChild(bar);
        group.appendChild(labelEl);
        return group;
    };

    chart.appendChild(createBar('Ingresos', income, 'income'));
    chart.appendChild(createBar('Gastos', expense, 'expense'));
    chart.appendChild(createBar('Ahorros', savings, 'savings'));

    container.appendChild(chart);
    return container;
};

export const renderFinancialForecastView = (container: HTMLElement, navigate: NavigateFunction) => {
    container.innerHTML = '';

    const now = new Date();
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const year = nextMonthDate.getFullYear();
    const month = nextMonthDate.getMonth();
    const monthName = nextMonthDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    // Header
    const header = document.createElement('div');
    header.className = 'income-page-header';
    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.innerHTML = '&larr; Volver al Informe Actual';
    backButton.onclick = () => navigate('financialInfo');
    header.appendChild(backButton);
    container.appendChild(header);

    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = `Pronóstico Financiero de ${monthName}`;
    container.appendChild(title);

    // --- DATA CALCULATION ---
    // Forecast Month
    const forecastMonthTransactions = getDetailedTransactionsForMonth(year, month);
    const forecastIncomes = forecastMonthTransactions.filter(t => t.type === 'income');
    const forecastExpenses = forecastMonthTransactions.filter(t => t.type === 'expense');

    const totalForecastIncome = forecastIncomes.reduce((sum, t) => sum + t.amount, 0);
    const totalForecastExpense = forecastExpenses.reduce((sum, t) => sum + t.amount, 0);
    const forecastBalance = totalForecastIncome - totalForecastExpense;

    const recurringIncome = forecastIncomes.filter(t => t.recordType === 'Recurrente').reduce((sum, t) => sum + t.amount, 0);
    const recurringExpense = forecastExpenses.filter(t => t.recordType === 'Recurrente').reduce((sum, t) => sum + t.amount, 0);
    const uniqueExpense = totalForecastExpense - recurringExpense;
    
    // Current Month for comparison
    const currentMonthDate = new Date();
    const currentMonthTransactions = getDetailedTransactionsForMonth(currentMonthDate.getFullYear(), currentMonthDate.getMonth());
    const totalCurrentMonthIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalCurrentMonthExpense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const formatComparison = (current: number, previous: number) => {
        if (previous === 0) return `<div class="summary-comparison">vs. ${formatCurrency(0, {includeSymbol: true})}</div>`;
        const change = ((current - previous) / previous) * 100;
        const symbol = change >= 0 ? '▲' : '▼';
        const colorClass = change >= 0 ? 'positive' : 'negative';
        return `<div class="summary-comparison ${colorClass}">${symbol} ${change.toFixed(1)}% vs. mes actual</div>`;
    };

    const incomeComparisonHtml = formatComparison(totalForecastIncome, totalCurrentMonthIncome);
    const expenseComparisonHtml = formatComparison(totalForecastExpense, totalCurrentMonthExpense);

    // --- RENDER SUMMARY ---
    const summaryGrid = document.createElement('div');
    summaryGrid.className = 'summary-grid';
    summaryGrid.innerHTML = `
        <div class="summary-item">
            <div class="label">Ingresos Proyectados</div>
            <div class="primary-value income">${formatCurrency(totalForecastIncome, { includeSymbol: true })}</div>
            ${incomeComparisonHtml}
        </div>
        <div class="summary-item">
            <div class="label">Gastos Proyectados</div>
            <div class="primary-value expense">${formatCurrency(totalForecastExpense, { includeSymbol: true })}</div>
            ${expenseComparisonHtml.replace('positive', 'negative_temp').replace('negative', 'positive').replace('negative_temp', 'negative')}
        </div>
        <div class="summary-item">
            <div class="label">Balance Proyectado</div>
            <div class="primary-value ${forecastBalance >= 0 ? 'income' : 'expense'}">${formatCurrency(forecastBalance, { includeSymbol: true })}</div>
            <div class="summary-legend">Flujo de caja</div>
        </div>
        <div class="summary-item">
            <div class="label">Ingresos Recurrentes</div>
            <div class="primary-value income">${formatCurrency(recurringIncome, { includeSymbol: true })}</div>
            <div class="summary-legend">Base de ingresos</div>
        </div>
        <div class="summary-item">
            <div class="label">Gastos Fijos</div>
            <div class="primary-value expense">${formatCurrency(recurringExpense, { includeSymbol: true })}</div>
            <div class="summary-legend">Costos recurrentes</div>
        </div>
        <div class="summary-item">
            <div class="label">Gastos Variables</div>
            <div class="primary-value expense">${formatCurrency(uniqueExpense, { includeSymbol: true })}</div>
            <div class="summary-legend">Gastos únicos del mes</div>
        </div>
    `;
    container.appendChild(summaryGrid);

    // Render Bar Chart
    container.appendChild(createCashflowBarChart(totalForecastIncome, totalForecastExpense, 0));

    // --- RENDER DETAILED LIST SECTION ---
    const listSection = document.createElement('div');
    listSection.className = 'report-section';
    const listTitle = document.createElement('h3');
    listTitle.className = 'card-title';
    listTitle.textContent = `Movimientos Proyectados de ${monthName}`;
    listSection.appendChild(listTitle);

    if (forecastMonthTransactions.length > 0) {
        const groupedTransactions = forecastMonthTransactions.reduce((groups, trx) => {
            const date = trx.date.toISOString().split('T')[0];
            if (!groups[date]) groups[date] = [];
            groups[date].push(trx);
            return groups;
        }, {} as Record<string, MonthlyTransaction[]>);

        const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        const transactionListContainer = document.createElement('div');
        transactionListContainer.className = 'transaction-list';

        sortedDates.forEach(dateStr => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'transaction-group';

            const groupHeader = document.createElement('div');
            groupHeader.className = 'transaction-group-header';
            const date = new Date(dateStr + 'T12:00:00');
            groupHeader.textContent = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            groupDiv.appendChild(groupHeader);

            groupedTransactions[dateStr].forEach(trx => {
                const item = document.createElement('div');
                item.className = 'transaction-item';
                item.innerHTML = `
                    <div class="transaction-info">
                        <span class="transaction-name">${trx.name}</span>
                        <span class="transaction-details">${trx.category}</span>
                    </div>
                    <span class="transaction-amount ${trx.type}">${formatCurrency(trx.amount, { includeSymbol: true })}</span>
                `;
                groupDiv.appendChild(item);
            });
            transactionListContainer.appendChild(groupDiv);
        });
        listSection.appendChild(transactionListContainer);
    } else {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'empty-list-message';
        emptyMessage.textContent = 'No se proyectan transacciones para el próximo mes.';
        listSection.appendChild(emptyMessage);
    }
    
    container.appendChild(listSection);
};