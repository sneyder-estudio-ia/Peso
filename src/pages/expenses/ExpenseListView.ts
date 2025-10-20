import { appState } from '../../state/store.js';
import { ExpenseRecord } from '../../types/index.js';
import { createExpenseRecordCard } from '../../components/RecordCard.js';
import { showExpenseTypeModal } from '../../components/common.js';

type NavigateFunction = (view: string, state?: { recordType?: 'Recurrente' | 'Único', recordId?: string }) => void;

let searchInput: HTMLInputElement | null = null;
let filterContainer: HTMLElement | null = null;
let listContainer: HTMLElement | null = null;
let localNavigate: NavigateFunction | null = null;

const renderExpenseList = (recordsToRender: ExpenseRecord[]) => {
    if (!listContainer || !localNavigate) return;
    listContainer.innerHTML = ''; // Clear previous list

    if (recordsToRender.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'empty-list-message';
        emptyMessage.textContent = 'No se encontraron gastos.';
        listContainer.appendChild(emptyMessage);
    } else {
        recordsToRender.forEach(record => {
            const card = createExpenseRecordCard(record, localNavigate!, filterAndRenderExpenseList);
            listContainer.appendChild(card);
        });
    }
};

const filterAndRenderExpenseList = () => {
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const activeFilterButton = filterContainer ? filterContainer.querySelector('.btn-filter.active') as HTMLElement : null;
    const filterType = activeFilterButton ? activeFilterButton.dataset.type : null;

    let filteredRecords = appState.expenseRecords;

    if (searchTerm) {
        filteredRecords = filteredRecords.filter(record => 
            record.name.toLowerCase().includes(searchTerm)
        );
    }

    if (filterType) {
        filteredRecords = filteredRecords.filter(record => record.type === filterType);
    }

    renderExpenseList(filteredRecords);
};


export const renderExpenseListView = (container: HTMLElement, navigate: NavigateFunction) => {
    localNavigate = navigate;
    container.innerHTML = ''; // Clear previous content

    const header = document.createElement('div');
    header.className = 'income-page-header';

    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.innerHTML = '&larr; Volver';
    backButton.onclick = () => navigate('dashboard');

    const addButton = document.createElement('button');
    addButton.className = 'btn btn-add';
    addButton.textContent = 'Agregar Gasto';
    addButton.onclick = () => {
        showExpenseTypeModal((type) => {
            navigate('expenseForm', { recordType: type });
        });
    }
    
    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = 'Gasto';
    
    header.appendChild(backButton);
    header.appendChild(addButton);
    
    container.appendChild(header);
    container.appendChild(title);

    searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.id = 'expense-search-input';
    searchInput.placeholder = 'Buscar por nombre...';
    searchInput.className = 'search-input';
    searchInput.oninput = filterAndRenderExpenseList;
    container.appendChild(searchInput);

    filterContainer = document.createElement('div');
    filterContainer.className = 'filter-container';

    const recurrentFilter = document.createElement('button');
    recurrentFilter.className = 'btn btn-filter';
    recurrentFilter.textContent = 'Recurrente';
    recurrentFilter.dataset.type = 'Recurrente';

    const uniqueFilter = document.createElement('button');
    uniqueFilter.className = 'btn btn-filter';
    uniqueFilter.textContent = 'Único';
    uniqueFilter.dataset.type = 'Único';

    const handleFilterClick = (e: MouseEvent) => {
        const clickedButton = e.currentTarget as HTMLElement;
        if (clickedButton.classList.contains('active')) {
            clickedButton.classList.remove('active');
        } else {
            const currentActive = filterContainer!.querySelector('.btn-filter.active');
            if (currentActive) {
                currentActive.classList.remove('active');
            }
            clickedButton.classList.add('active');
        }
        filterAndRenderExpenseList();
    };

    recurrentFilter.onclick = handleFilterClick;
    uniqueFilter.onclick = handleFilterClick;

    filterContainer.appendChild(recurrentFilter);
    filterContainer.appendChild(uniqueFilter);
    container.appendChild(filterContainer);

    listContainer = document.createElement('div');
    listContainer.id = 'expense-list-container';
    container.appendChild(listContainer);

    filterAndRenderExpenseList();
};
