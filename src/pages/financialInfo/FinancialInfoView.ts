import { appState } from '../../state/store.js';
import { formatCurrency } from '../../utils/currency.js';
import { createExpenseBreakdownChart } from '../../components/charts.js';
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

const categoryColors = [
    '#388bfd', '#238636', '#d29922', '#f85149', '#a371f7', '#1f6feb', '#da3633', '#e36209'
];
const incomeSourceColors = [
    '#238636', '#3fb950', '#0a692c', '#034017'
];

const dayNameToIndex: { [key: string]: number } = {
    'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
};

const getDetailedTransactionsForMonth = (year: number, month: number): MonthlyTransaction[] => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const transactions: MonthlyTransaction[] = [];

    // Process Incomes
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

    // Process Expenses
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
    title.textContent = 'Flujo de Caja Mensual';
    container.appendChild(title);

    const chart = document.createElement('div');
    chart.className = 'cashflow-chart';

    const maxVal = Math.max(income, expense, savings, 1); // Avoid division by zero

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

export const renderFinancialInfoView = (container: HTMLElement, navigate: NavigateFunction) => {
    container.innerHTML = '';

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthName = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    // Header
    const header = document.createElement('div');
    header.className = 'income-page-header';
    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.innerHTML = '&larr; Volver';
    backButton.onclick = () => navigate('dashboard');
    header.appendChild(backButton);
    const forecastButton = document.createElement('button');
    forecastButton.className = 'btn btn-add';
    forecastButton.textContent = 'Ver Pronóstico';
    forecastButton.onclick = () => navigate('financialForecast');
    header.appendChild(forecastButton);
    container.appendChild(header);

    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = `Informe Financiero de ${monthName}`;
    container.appendChild(title);

    // --- DATA CALCULATION ---
    // Current Month
    const currentMonthTransactions = getDetailedTransactionsForMonth(year, month);
    const currentIncomes = currentMonthTransactions.filter(t => t.type === 'income');
    const currentExpenses = currentMonthTransactions.filter(t => t.type === 'expense');

    const totalCurrentIncome = currentIncomes.reduce((sum, t) => sum + t.amount, 0);
    const totalCurrentExpense = currentExpenses.reduce((sum, t) => sum + t.amount, 0);
    const currentBalance = totalCurrentIncome - totalCurrentExpense;

    const recurringIncome = currentIncomes.filter(t => t.recordType === 'Recurrente').reduce((sum, t) => sum + t.amount, 0);
    const uniqueIncome = totalCurrentIncome - recurringIncome;
    const recurringExpense = currentExpenses.filter(t => t.recordType === 'Recurrente').reduce((sum, t) => sum + t.amount, 0);
    const uniqueExpense = totalCurrentExpense - recurringExpense;
    
    // Previous Month for comparison
    const lastMonthDate = new Date(year, month - 1, 1);
    const lastMonthTransactions = getDetailedTransactionsForMonth(lastMonthDate.getFullYear(), lastMonthDate.getMonth());
    const totalLastMonthIncome = lastMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalLastMonthExpense = lastMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const formatComparison = (current: number, previous: number) => {
        if (previous === 0) return `<div class="summary-comparison">vs. ${formatCurrency(0, {includeSymbol: true})}</div>`;
        const change = ((current - previous) / previous) * 100;
        const symbol = change >= 0 ? '▲' : '▼';
        const colorClass = change >= 0 ? 'positive' : 'negative';
        return `<div class="summary-comparison ${colorClass}">${symbol} ${change.toFixed(1)}% vs. mes anterior</div>`;
    };

    const incomeComparisonHtml = formatComparison(totalCurrentIncome, totalLastMonthIncome);
    const expenseComparisonHtml = formatComparison(totalCurrentExpense, totalLastMonthExpense);


    // --- RENDER SUMMARY ---
    const summaryGrid = document.createElement('div');
    summaryGrid.className = 'summary-grid';
    summaryGrid.innerHTML = `
        <div class="summary-item">
            <div class="label">Total de Ingresos</div>
            <div class="primary-value income">${formatCurrency(totalCurrentIncome, { includeSymbol: true })}</div>
            ${incomeComparisonHtml}
        </div>
        <div class="summary-item">
            <div class="label">Total de Gastos</div>
            <div class="primary-value expense">${formatCurrency(totalCurrentExpense, { includeSymbol: true })}</div>
            ${expenseComparisonHtml.replace('positive', 'negative_temp').replace('negative', 'positive').replace('negative_temp', 'negative')}
        </div>
        <div class="summary-item">
            <div class="label">Balance Mensual</div>
            <div class="primary-value ${currentBalance >= 0 ? 'income' : 'expense'}">${formatCurrency(currentBalance, { includeSymbol: true })}</div>
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
    container.appendChild(createCashflowBarChart(totalCurrentIncome, totalCurrentExpense, 0)); // Savings not implemented here yet


    // --- RENDER DETAILED LIST SECTION ---
    const listSection = document.createElement('div');
    listSection.className = 'report-section';
    const listTitle = document.createElement('h3');
    listTitle.className = 'card-title';
    listTitle.textContent = 'Movimientos del Mes';
    listSection.appendChild(listTitle);

    if (currentMonthTransactions.length > 0) {
        const groupedTransactions = currentMonthTransactions.reduce((groups, trx) => {
            const date = trx.date.toISOString().split('T')[0];
            if (!groups[date]) groups[date] = [];
            groups[date].push(trx);
            return groups;
        }, {} as Record<string, MonthlyTransaction[]>);

        const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

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
        emptyMessage.textContent = 'No se registraron transacciones este mes.';
        listSection.appendChild(emptyMessage);
    }
    
    container.appendChild(listSection);
};