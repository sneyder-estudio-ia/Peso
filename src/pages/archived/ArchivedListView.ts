import { appState, saveState } from '../../state/store.js';
import { createArchivedRecordCard } from '../../components/RecordCard.js';
import { showConfirmationModal } from '../../components/common.js';
import { showToast } from '../../components/Toast.js';

type NavigateFunction = (view: string) => void;

export const renderArchivedListView = (container: HTMLElement, navigate: NavigateFunction) => {
    container.innerHTML = ''; // Clear previous content

    const header = document.createElement('div');
    header.className = 'income-page-header';

    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.innerHTML = '&larr; Volver';
    backButton.onclick = () => navigate('dashboard');

    const deleteHistoryButton = document.createElement('button');
    deleteHistoryButton.className = 'btn btn-expense btn-delete-history';
    deleteHistoryButton.textContent = 'Borrar historial antiguo';
    if (appState.archivedRecords.length === 0) {
        deleteHistoryButton.disabled = true;
    }
    deleteHistoryButton.onclick = () => {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const hasOldRecords = appState.archivedRecords.some(record => record.archivedAt < thirtyDaysAgo);

        if (!hasOldRecords) {
            showToast('No hay registros antiguos para borrar.');
            return;
        }

        showConfirmationModal(
            'Borrar Historial Antiguo',
            'Esta acción borrará permanentemente todos los registros archivados con más de 30 días de antigüedad. ¿Deseas continuar?',
            () => {
                appState.archivedRecords = appState.archivedRecords.filter(record => record.archivedAt >= thirtyDaysAgo);
                saveState(appState);
                showToast('Historial antiguo borrado.');
            }
        );
    };


    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = 'Historial';
    
    header.appendChild(backButton);
    header.appendChild(deleteHistoryButton);
    
    container.appendChild(header);
    container.appendChild(title);
    
    const listContainer = document.createElement('div');
    listContainer.id = 'archived-list-container';
    
    const sortedRecords = [...appState.archivedRecords].sort((a, b) => b.archivedAt - a.archivedAt);

    if (sortedRecords.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'empty-list-message';
        emptyMessage.textContent = 'No hay elementos archivados actualmente.';
        listContainer.appendChild(emptyMessage);
    } else {
        sortedRecords.forEach(record => {
            const card = createArchivedRecordCard(record);
            listContainer.appendChild(card);
        });
    }
    
    container.appendChild(listContainer);
};
