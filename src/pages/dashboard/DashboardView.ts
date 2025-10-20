import { createCard, createSimpleCard } from '../../components/common.js';
import { formatCurrency } from '../../utils/currency.js';
import { appState } from '../../state/store.js';
import { createIncomeRecordCard, createExpenseRecordCard } from '../../components/RecordCard.js';
import { IncomeRecord, ExpenseRecord } from '../../types/index.js';

type NavigateFunction = (view: string, state?: { recordType?: 'Recurrente' | 'Único', recordId?: string }) => void;

export const renderDashboardView = (container: HTMLElement, navigate: NavigateFunction) => {
    container.innerHTML = ''; // Clear previous content

    const totalIncome = appState.incomeRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalExpense = appState.expenseRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalSavings = appState.savingRecords.reduce((sum, record) => sum + record.amount, 0);
    
    const incomeCard = createCard('Ingreso', `$ ${formatCurrency(totalIncome)}`, 'income', 'valor por mes', `$ ${formatCurrency(totalIncome)}`);
    incomeCard.style.cursor = 'pointer';
    incomeCard.onclick = () => navigate('incomeList');

    const expenseCard = createCard('Gasto', `$ ${formatCurrency(totalExpense)}`, 'expense', 'gasto del mes', `$ ${formatCurrency(totalExpense)}`);
    expenseCard.style.cursor = 'pointer';
    expenseCard.onclick = () => navigate('expenseList');

    const savingsCard = createCard('Ahorros', `$ ${formatCurrency(totalSavings)}`, 'savings', 'ahorros del mes', `$ ${formatCurrency(totalSavings)}`);
    savingsCard.style.cursor = 'pointer';
    savingsCard.onclick = () => navigate('savingsList');

    const geminiCard = createSimpleCard('Asistente Gemini');
    geminiCard.style.cursor = 'pointer';
    geminiCard.onclick = () => navigate('gemini');
    
    // --- New List Filter Card ---
    type FilterType = 'all' | 'income' | 'expense';
    let activeFilter: FilterType = 'all';

    const listFilterCard = createSimpleCard('Listado');
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'filter-container';
    buttonContainer.style.marginTop = '10px';
    
    const allFilterButton = document.createElement('button');
    allFilterButton.className = 'btn btn-filter active';
    allFilterButton.textContent = 'Todos';
    allFilterButton.dataset.type = 'all';

    const incomeFilterButton = document.createElement('button');
    incomeFilterButton.className = 'btn btn-filter';
    incomeFilterButton.textContent = 'Ingresos';
    incomeFilterButton.dataset.type = 'income';
    
    const expenseFilterButton = document.createElement('button');
    expenseFilterButton.className = 'btn btn-filter';
    expenseFilterButton.textContent = 'Gastos';
    expenseFilterButton.dataset.type = 'expense';

    buttonContainer.appendChild(allFilterButton);
    buttonContainer.appendChild(incomeFilterButton);
    buttonContainer.appendChild(expenseFilterButton);
    listFilterCard.appendChild(buttonContainer);

    const dashboardListContainer = document.createElement('div');
    dashboardListContainer.id = 'dashboard-list-container';

    const renderFilteredList = () => {
        dashboardListContainer.innerHTML = '';
        const rerender = () => renderFilteredList();
    
        let recordsToRender: (IncomeRecord | ExpenseRecord)[];
    
        if (activeFilter === 'income') {
            recordsToRender = [...appState.incomeRecords].sort((a,b) => parseInt(b.id.split('-')[1]) - parseInt(a.id.split('-')[1]));
        } else if (activeFilter === 'expense') {
            recordsToRender = [...appState.expenseRecords].sort((a,b) => parseInt(b.id.split('-')[1]) - parseInt(a.id.split('-')[1]));
        } else { // 'all'
            const combined = [
                ...appState.incomeRecords,
                ...appState.expenseRecords
            ];
            combined.sort((a, b) => {
                const timeA = parseInt(a.id.split('-')[1], 10);
                const timeB = parseInt(b.id.split('-')[1], 10);
                return timeB - timeA; // Newest first
            });
            recordsToRender = combined;
        }
    
        if (recordsToRender.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-list-message';
            let message = 'No se encontraron registros.';
            if (activeFilter === 'income') message = 'No se encontraron ingresos.';
            else if (activeFilter === 'expense') message = 'No se encontraron gastos.';
            emptyMessage.textContent = message;
            dashboardListContainer.appendChild(emptyMessage);
        } else {
            recordsToRender.forEach(record => {
                let card: HTMLElement;
                // Use 'source' property to check if it's an IncomeRecord
                if ('source' in record) {
                    card = createIncomeRecordCard(record as IncomeRecord, navigate, rerender);
                } else {
                    card = createExpenseRecordCard(record as ExpenseRecord, navigate, rerender);
                }
                dashboardListContainer.appendChild(card);
            });
        }
    };
    
    const handleFilterClick = (e: MouseEvent) => {
        const clickedButton = e.currentTarget as HTMLElement;
        const filterType = clickedButton.dataset.type as FilterType;
        
        if (activeFilter !== filterType) {
            activeFilter = filterType;
            buttonContainer.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
            clickedButton.classList.add('active');
            renderFilteredList();
        }
    };

    allFilterButton.onclick = handleFilterClick;
    incomeFilterButton.onclick = handleFilterClick;
    expenseFilterButton.onclick = handleFilterClick;

    container.appendChild(incomeCard);
    container.appendChild(expenseCard);
    container.appendChild(savingsCard);
    container.appendChild(geminiCard);
    container.appendChild(listFilterCard);
    container.appendChild(dashboardListContainer);
    
    renderFilteredList(); // Initial render with 'all' filter
};