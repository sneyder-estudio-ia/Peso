import { IncomeRecord, ExpenseRecord, SavingRecord, ArchivedRecord } from '../types/index.js';
import { formatCurrency } from '../utils/currency.js';
import { formatRecurrence } from '../utils/helpers.js';
import { appState, saveState } from '../state/store.js';
import { showConfirmationModal } from './common.js';
import { showToast } from './Toast.js';

// This is a simplified navigate function type for this component's needs
type NavigateFunction = (view: string, state: { recordType?: 'Recurrente' | 'Único', recordId?: string }) => void;

const restoreRecord = (recordId: string) => {
    const recordIndex = appState.archivedRecords.findIndex(rec => rec.id === recordId);
    if (recordIndex === -1) return;

    const [recordToRestore] = appState.archivedRecords.splice(recordIndex, 1);
    const { originalType } = recordToRestore;
    
    // Clean up the archived properties before restoring
    delete (recordToRestore as Partial<ArchivedRecord>).archivedAt;
    delete (recordToRestore as Partial<ArchivedRecord>).originalType;

    switch(originalType) {
        case 'income':
            appState.incomeRecords.push(recordToRestore as IncomeRecord);
            break;
        case 'expense':
            appState.expenseRecords.push(recordToRestore as ExpenseRecord);
            break;
        case 'saving':
            appState.savingRecords.push(recordToRestore as SavingRecord);
            break;
    }

    saveState(appState);
    showToast('Registro restaurado.');
};

const deleteRecordPermanently = (recordId: string) => {
    showConfirmationModal(
        'Borrado Permanente',
        'Esta acción es irreversible y borrará el registro para siempre. ¿Estás seguro?',
        () => {
            const recordIndex = appState.archivedRecords.findIndex(rec => rec.id === recordId);
            if (recordIndex > -1) {
                appState.archivedRecords.splice(recordIndex, 1);
                saveState(appState);
                showToast('Registro borrado permanentemente.');
            }
        }
    );
};

const deleteIncomeRecord = (id: string) => {
    showConfirmationModal(
        'Confirmar Borrado',
        'El registro se moverá a "Archivado", donde podrás restaurarlo o borrarlo permanentemente. ¿Deseas continuar?',
        () => {
            const recordIndex = appState.incomeRecords.findIndex(rec => rec.id === id);
            if (recordIndex > -1) {
                const removedItems = appState.incomeRecords.splice(recordIndex, 1);
                if (removedItems && removedItems.length > 0) {
                    const recordToArchive = removedItems[0];
                    appState.archivedRecords.push({
                        ...recordToArchive,
                        archivedAt: Date.now(),
                        originalType: 'income'
                    });
                    saveState(appState);
                    showToast('Registro archivado.');
                }
            }
        }
    );
};

const deleteExpenseRecord = (id: string) => {
    showConfirmationModal(
        'Confirmar Borrado',
        'El registro se moverá a "Archivado", donde podrás restaurarlo o borrarlo permanentemente. ¿Deseas continuar?',
        () => {
            const recordIndex = appState.expenseRecords.findIndex(rec => rec.id === id);
            if (recordIndex > -1) {
                const removedItems = appState.expenseRecords.splice(recordIndex, 1);
                if (removedItems && removedItems.length > 0) {
                    const recordToArchive = removedItems[0];
                    appState.archivedRecords.push({
                        ...recordToArchive,
                        archivedAt: Date.now(),
                        originalType: 'expense'
                    });
                    saveState(appState);
                    showToast('Registro archivado.');
                }
            }
        }
    );
};

const deleteSavingRecord = (id: string) => {
    showConfirmationModal(
        'Confirmar Borrado',
        'El registro se moverá a "Archivado", donde podrás restaurarlo o borrarlo permanentemente. ¿Deseas continuar?',
        () => {
            const recordIndex = appState.savingRecords.findIndex(rec => rec.id === id);
            if (recordIndex > -1) {
                const removedItems = appState.savingRecords.splice(recordIndex, 1);
                if (removedItems && removedItems.length > 0) {
                    const recordToArchive = removedItems[0];
                    appState.archivedRecords.push({
                        ...recordToArchive,
                        archivedAt: Date.now(),
                        originalType: 'saving'
                    });
                    saveState(appState);
                    showToast('Registro archivado.');
                }
            }
        }
    );
};

export const createIncomeRecordCard = (record: IncomeRecord, navigate: NavigateFunction) => {
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
    amount.textContent = formatCurrency(record.amount, { includeSymbol: true });

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
            deleteIncomeRecord(record.id);
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

export const createExpenseRecordCard = (record: ExpenseRecord, navigate: NavigateFunction) => {
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
    amount.textContent = formatCurrency(record.amount, { includeSymbol: true });

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
        deleteExpenseRecord(record.id);
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

export const createSavingRecordCard = (record: SavingRecord, navigate: NavigateFunction) => {
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
    amount.textContent = formatCurrency(record.amount, { includeSymbol: true });

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
        deleteSavingRecord(record.id);
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

export const createArchivedRecordCard = (record: ArchivedRecord) => {
    const card = document.createElement('div');
    card.className = 'income-record-card archived-record-card';

    const info = document.createElement('div');
    info.className = 'income-record-info';

    const name = document.createElement('span');
    name.className = 'income-record-name';
    name.textContent = record.name;

    const details = document.createElement('span');
    details.className = 'income-record-date';
    const archivedDate = new Date(record.archivedAt).toLocaleDateString('es-ES');
    let originalTypeLabel = '';
    switch(record.originalType) {
        case 'income': originalTypeLabel = 'Ingreso'; break;
        case 'expense': originalTypeLabel = 'Gasto'; break;
        case 'saving': originalTypeLabel = 'Ahorro'; break;
    }
    details.textContent = `${originalTypeLabel} • Archivado: ${archivedDate}`;

    info.appendChild(name);
    info.appendChild(details);

    const rightContainer = document.createElement('div');
    rightContainer.className = 'income-record-right';

    // Restore button
    const restoreButton = document.createElement('button');
    restoreButton.className = 'btn-edit'; // reuse style
    restoreButton.innerHTML = '&#x1F504;'; // Restore icon (clockwise arrows)
    restoreButton.setAttribute('aria-label', `Restaurar ${record.name}`);
    restoreButton.onclick = (e) => {
        e.stopPropagation();
        restoreRecord(record.id);
    };

    // Permanent delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-delete';
    deleteButton.innerHTML = '&#x1F5D1;'; // Trash can
    deleteButton.setAttribute('aria-label', `Borrar permanentemente ${record.name}`);
    deleteButton.onclick = (e) => {
        e.stopPropagation();
        deleteRecordPermanently(record.id);
    };

    rightContainer.appendChild(restoreButton);
    rightContainer.appendChild(deleteButton);

    card.appendChild(info);
    card.appendChild(rightContainer);

    return card;
};