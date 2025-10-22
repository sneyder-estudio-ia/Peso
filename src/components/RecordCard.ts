import { IncomeRecord, ExpenseRecord, SavingRecord } from '../types/index.js';
import { formatCurrency } from '../utils/currency.js';
import { formatRecurrence } from '../utils/helpers.js';
import { appState, saveState } from '../state/store.js';
import { showConfirmationModal } from './common.js';

// This is a simplified navigate function type for this component's needs
type NavigateFunction = (view: string, state: { recordType?: 'Recurrente' | 'Único', recordId?: string }) => void;

const deleteIncomeRecord = (id: string, rerenderCallback: () => void) => {
    showConfirmationModal(
        'Confirmar Borrado',
        '¿Estás seguro de que quieres borrar este ingreso? Esta acción no se puede deshacer.',
        () => {
            const recordIndex = appState.incomeRecords.findIndex(rec => rec.id === id);
            if (recordIndex > -1) {
                appState.incomeRecords.splice(recordIndex, 1);
                saveState(appState);
                rerenderCallback();
            }
        }
    );
};

const deleteExpenseRecord = (id: string, rerenderCallback: () => void) => {
    showConfirmationModal(
        'Confirmar Borrado',
        '¿Estás seguro de que quieres borrar este gasto? Esta acción no se puede deshacer.',
        () => {
            const recordIndex = appState.expenseRecords.findIndex(rec => rec.id === id);
            if (recordIndex > -1) {
                appState.expenseRecords.splice(recordIndex, 1);
                saveState(appState);
                rerenderCallback();
            }
        }
    );
};

const deleteSavingRecord = (id: string, rerenderCallback: () => void) => {
    showConfirmationModal(
        'Confirmar Borrado',
        '¿Estás seguro de que quieres borrar este ahorro? Esta acción no se puede deshacer.',
        () => {
            const recordIndex = appState.savingRecords.findIndex(rec => rec.id === id);
            if (recordIndex > -1) {
                appState.savingRecords.splice(recordIndex, 1);
                saveState(appState);
                rerenderCallback();
            }
        }
    );
};


export const createIncomeRecordCard = (record: IncomeRecord, navigate: NavigateFunction, rerenderCallback: () => void) => {
    const card = document.createElement('div');
    card.className = 'income-record-card';

    const info = document.createElement('div');
    info.className = 'income-record-info';

    const name = document.createElement('span');
    name.className = 'income-record-name';
    name.textContent = record.name;

    const date = document.createElement('span');
    date.className = 'income-record-date';
    date.textContent = record.recurrence ? formatRecurrence(record.recurrence) : record.date;

    info.appendChild(name);
    info.appendChild(date);

    const rightContainer = document.createElement('div');
    rightContainer.className = 'income-record-right';

    const amount = document.createElement('div');
    amount.className = 'income-record-amount';
    amount.textContent = `$ ${formatCurrency(record.amount)}`;

    if (record.salaryId) {
        // It's a salary, managed from settings. Don't show edit/delete buttons.
        date.textContent = `Salario: ${formatRecurrence(record.recurrence!)}`;
        rightContainer.appendChild(amount);
    } else {
        // It's a regular income record.
        const editButton = document.createElement('button');
        editButton.className = 'btn-edit';
        editButton.innerHTML = '&#x270F;'; // Pencil icon
        editButton.setAttribute('aria-label', `Editar ingreso ${record.name}`);
        editButton.onclick = (e) => {
            e.stopPropagation();
            showConfirmationModal(
                'Confirmar Edición',
                '¿Estás seguro de que quieres editar este ingreso?',
                () => navigate('incomeForm', { recordType: record.type, recordId: record.id }),
                'btn-add',
                'Editar'
            );
        };
    
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn-delete';
        deleteButton.innerHTML = '&#x1F5D1;'; // Trash can icon
        deleteButton.setAttribute('aria-label', `Borrar ingreso ${record.name}`);
        deleteButton.onclick = (e) => {
            e.stopPropagation(); // Prevent any parent click events
            deleteIncomeRecord(record.id, rerenderCallback);
        };
    
        rightContainer.appendChild(amount);
        rightContainer.appendChild(editButton);
        rightContainer.appendChild(deleteButton);
    }


    card.appendChild(info);
    card.appendChild(rightContainer);

    card.onclick = () => {
        navigate('incomeDetails', { recordId: record.id });
    };

    return card;
};

export const createExpenseRecordCard = (record: ExpenseRecord, navigate: NavigateFunction, rerenderCallback: () => void) => {
    const card = document.createElement('div');
    card.className = 'income-record-card';

    const info = document.createElement('div');
    info.className = 'income-record-info';

    const name = document.createElement('span');
    name.className = 'income-record-name';
    name.textContent = record.name;

    const date = document.createElement('span');
    date.className = 'income-record-date';
    date.textContent = record.recurrence ? formatRecurrence(record.recurrence) : record.date;

    info.appendChild(name);
    info.appendChild(date);

    const rightContainer = document.createElement('div');
    rightContainer.className = 'income-record-right';

    const amount = document.createElement('div');
    amount.className = 'income-record-amount expense';
    amount.textContent = `$ ${formatCurrency(record.amount)}`;

    const editButton = document.createElement('button');
    editButton.className = 'btn-edit';
    editButton.innerHTML = '&#x270F;'; // Pencil icon
    editButton.setAttribute('aria-label', `Editar gasto ${record.name}`);
    editButton.onclick = (e) => {
        e.stopPropagation();
        showConfirmationModal(
            'Confirmar Edición',
            '¿Estás seguro de que quieres editar este gasto?',
            () => navigate('expenseForm', { recordType: record.type, recordId: record.id }),
            'btn-add',
            'Editar'
        );
    };

    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-delete';
    deleteButton.innerHTML = '&#x1F5D1;'; // Trash can icon
    deleteButton.setAttribute('aria-label', `Borrar gasto ${record.name}`);
    deleteButton.onclick = (e) => {
        e.stopPropagation(); // Prevent any parent click events
        deleteExpenseRecord(record.id, rerenderCallback);
    };

    rightContainer.appendChild(amount);
    rightContainer.appendChild(editButton);
    rightContainer.appendChild(deleteButton);

    card.appendChild(info);
    card.appendChild(rightContainer);

    card.onclick = () => {
        navigate('expenseDetails', { recordId: record.id });
    };

    return card;
};

export const createSavingRecordCard = (record: SavingRecord, navigate: NavigateFunction, rerenderCallback: () => void) => {
    const card = document.createElement('div');
    card.className = 'income-record-card';

    const info = document.createElement('div');
    info.className = 'income-record-info';

    const name = document.createElement('span');
    name.className = 'income-record-name';
    name.textContent = record.name;

    const date = document.createElement('span');
    date.className = 'income-record-date';
    date.textContent = record.recurrence ? formatRecurrence(record.recurrence) : record.date;

    info.appendChild(name);
    info.appendChild(date);

    const rightContainer = document.createElement('div');
    rightContainer.className = 'income-record-right';

    const amount = document.createElement('div');
    amount.className = 'income-record-amount savings';
    amount.textContent = `$ ${formatCurrency(record.amount)}`;

    const editButton = document.createElement('button');
    editButton.className = 'btn-edit';
    editButton.innerHTML = '&#x270F;'; // Pencil icon
    editButton.setAttribute('aria-label', `Editar ahorro ${record.name}`);
    editButton.onclick = (e) => {
        e.stopPropagation();
        showConfirmationModal(
            'Confirmar Edición',
            '¿Estás seguro de que quieres editar este ahorro?',
            () => navigate('savingsForm', { recordType: record.type, recordId: record.id }),
            'btn-add',
            'Editar'
        );
    };

    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-delete';
    deleteButton.innerHTML = '&#x1F5D1;'; // Trash can icon
    deleteButton.setAttribute('aria-label', `Borrar ahorro ${record.name}`);
    deleteButton.onclick = (e) => {
        e.stopPropagation(); // Prevent any parent click events
        deleteSavingRecord(record.id, rerenderCallback);
    };

    rightContainer.appendChild(amount);
    rightContainer.appendChild(editButton);
    rightContainer.appendChild(deleteButton);

    card.appendChild(info);
    card.appendChild(rightContainer);

    card.onclick = () => {
        navigate('savingsDetails', { recordId: record.id });
    };

    return card;
};
