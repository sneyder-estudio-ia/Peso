import { appState, saveState } from '../../state/store.js';
import { createArchivedRecordCard } from '../../components/RecordCard.js';
import { showConfirmationModal } from '../../components/common.js';
import { showToast } from '../../components/Toast.js';

type NavigateFunction = (view: string) => void;

// Module-level state for selection mode
let selectionModeActive = false;
let selectedRecordIds = new Set<string>();

export const renderArchivedListView = (container: HTMLElement, navigate: NavigateFunction) => {
    
    // This function will be called to re-render the entire view whenever the state changes.
    const render = () => {
        const sortedRecords = [...appState.archivedRecords].sort((a, b) => b.archivedAt - a.archivedAt);
        container.innerHTML = ''; // Clear previous content

        const header = document.createElement('div');
        header.className = 'income-page-header';

        const title = document.createElement('h2');
        title.className = 'card-title';
        title.textContent = 'Papelera de Reciclaje';

        container.appendChild(header);
        container.appendChild(title);

        if (!selectionModeActive) {
            // --- NORMAL MODE ---
            const backButton = document.createElement('button');
            backButton.className = 'btn btn-back';
            backButton.innerHTML = '&larr; Volver';
            backButton.onclick = () => {
                selectionModeActive = false; // Ensure mode is reset on navigation
                selectedRecordIds.clear();
                navigate('dashboard');
            };

            const manageButton = document.createElement('button');
            manageButton.className = 'btn btn-expense btn-delete-history';
            manageButton.textContent = 'Vaciar Papelera';
            if (appState.archivedRecords.length === 0) {
                manageButton.disabled = true;
            }
            manageButton.onclick = () => {
                selectionModeActive = true;
                render();
            };
            
            header.appendChild(backButton);
            header.appendChild(manageButton);

        } else {
            // --- SELECTION MODE ---
            const cancelButton = document.createElement('button');
            cancelButton.className = 'btn btn-back';
            cancelButton.textContent = 'Cancelar';
            cancelButton.onclick = () => {
                selectionModeActive = false;
                selectedRecordIds.clear();
                render();
            };

            const deleteSelectedButton = document.createElement('button');
            deleteSelectedButton.className = 'btn btn-expense';
            deleteSelectedButton.style.marginLeft = 'auto';
            deleteSelectedButton.textContent = `Borrar (${selectedRecordIds.size})`;
            deleteSelectedButton.disabled = selectedRecordIds.size === 0;
            deleteSelectedButton.onclick = () => {
                if (selectedRecordIds.size === 0) return;

                showConfirmationModal(
                    'Borrado Permanente',
                    `Esta acción es irreversible y borrará los ${selectedRecordIds.size} registros seleccionados. ¿Estás seguro?`,
                    () => {
                        appState.archivedRecords = appState.archivedRecords.filter(
                            record => !selectedRecordIds.has(record.id)
                        );
                        saveState(appState);
                        showToast(`${selectedRecordIds.size} registro(s) borrado(s).`);
                        selectionModeActive = false;
                        selectedRecordIds.clear();
                        render();
                    }
                );
            };

            header.appendChild(cancelButton);
            header.appendChild(deleteSelectedButton);

            const selectAllContainer = document.createElement('div');
            selectAllContainer.className = 'form-group radio-option';
            selectAllContainer.style.justifyContent = 'flex-end';
            selectAllContainer.style.marginBottom = '15px';
            
            const selectAllCheckbox = document.createElement('input');
            selectAllCheckbox.type = 'checkbox';
            selectAllCheckbox.id = 'select-all-archived';
            const allRecordsCount = sortedRecords.length;
            selectAllCheckbox.checked = allRecordsCount > 0 && selectedRecordIds.size === allRecordsCount;
            selectAllCheckbox.indeterminate = selectedRecordIds.size > 0 && selectedRecordIds.size < allRecordsCount;
            selectAllCheckbox.onchange = () => {
                if (selectAllCheckbox.checked) {
                    sortedRecords.forEach(record => selectedRecordIds.add(record.id));
                } else {
                    selectedRecordIds.clear();
                }
                render();
            };

            const selectAllLabel = document.createElement('label');
            selectAllLabel.htmlFor = 'select-all-archived';
            selectAllLabel.textContent = 'Marcar Todo';
            selectAllLabel.style.cursor = 'pointer';

            selectAllContainer.appendChild(selectAllLabel);
            selectAllContainer.appendChild(selectAllCheckbox);
            container.appendChild(selectAllContainer);
        }

        const listContainer = document.createElement('div');
        listContainer.id = 'archived-list-container';
        
        if (sortedRecords.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-list-message';
            emptyMessage.textContent = 'La papelera de reciclaje está vacía.';
            listContainer.appendChild(emptyMessage);
        } else {
            sortedRecords.forEach(record => {
                const card = createArchivedRecordCard(record, {
                    selectionMode: selectionModeActive,
                    isSelected: selectedRecordIds.has(record.id),
                    onSelect: () => {
                        if (selectedRecordIds.has(record.id)) {
                            selectedRecordIds.delete(record.id);
                        } else {
                            selectedRecordIds.add(record.id);
                        }
                        render(); // Re-render on selection change
                    },
                });
                listContainer.appendChild(card);
            });
        }
        
        container.appendChild(listContainer);
    };

    render(); // Initial render call
};
