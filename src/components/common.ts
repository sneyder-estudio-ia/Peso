export const createCard = (
    title: string,
    primaryValue: string,
    primaryValueClass: string,
    label: string,
    secondaryValue: string
) => {
    const card = document.createElement('div');
    card.className = 'card';

    const cardTitle = document.createElement('h2');
    cardTitle.className = 'card-title';
    cardTitle.textContent = title;

    const primaryValueEl = document.createElement('div');
    primaryValueEl.className = `primary-value ${primaryValueClass}`;
    primaryValueEl.textContent = primaryValue;

    const labelEl = document.createElement('div');
    labelEl.className = 'label';
    labelEl.textContent = label;

    const secondaryValueEl = document.createElement('div');
    secondaryValueEl.className = 'secondary-value';
    secondaryValueEl.textContent = secondaryValue;

    card.appendChild(cardTitle);
    card.appendChild(primaryValueEl);
    card.appendChild(labelEl);
    card.appendChild(secondaryValueEl);

    return card;
};

export const createSimpleCard = (title: string) => {
    const card = document.createElement('div');
    card.className = 'card';

    const cardTitle = document.createElement('h2');
    cardTitle.className = 'card-title';
    cardTitle.textContent = title;

    card.appendChild(cardTitle);
    return card;
}

const createTypeSelectionModal = (
    title: string, 
    onRecurrentClick: () => void, 
    onUniqueClick: () => void
) => {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.onclick = (e) => e.stopPropagation(); // Prevent closing when clicking inside
    
    const modalTitle = document.createElement('h3');
    modalTitle.className = 'modal-title';
    modalTitle.textContent = title;

    const typeButtonContainer = document.createElement('div');
    typeButtonContainer.className = 'button-container';

    const closeModal = () => {
        if (document.body.contains(modalOverlay)) {
            modalOverlay.style.display = 'none';
            document.body.removeChild(modalOverlay);
        }
    };

    const recurrentButton = document.createElement('button');
    recurrentButton.className = 'btn btn-option';
    recurrentButton.textContent = 'Recurrente';
    recurrentButton.onclick = () => {
        onRecurrentClick();
        closeModal();
    };

    const uniqueButton = document.createElement('button');
    uniqueButton.className = 'btn btn-option';
    uniqueButton.textContent = 'Único';
    uniqueButton.onclick = () => {
        onUniqueClick();
        closeModal();
    };

    typeButtonContainer.appendChild(recurrentButton);
    typeButtonContainer.appendChild(uniqueButton);

    modalContent.appendChild(modalTitle);
    modalContent.appendChild(typeButtonContainer);
    modalOverlay.appendChild(modalContent);
    
    modalOverlay.onclick = closeModal;

    document.body.appendChild(modalOverlay);
    modalOverlay.style.display = 'flex';
};

export const showIncomeTypeModal = (onSelect: (type: 'Recurrente' | 'Único') => void) => {
    createTypeSelectionModal(
        'Seleccione el tipo de ingreso',
        () => onSelect('Recurrente'),
        () => onSelect('Único')
    );
};

export const showExpenseTypeModal = (onSelect: (type: 'Recurrente' | 'Único') => void) => {
    createTypeSelectionModal(
        'Seleccione el tipo de gasto',
        () => onSelect('Recurrente'),
        () => onSelect('Único')
    );
};

export const showSavingTypeModal = (onSelect: (type: 'Recurrente' | 'Único') => void) => {
    createTypeSelectionModal(
        'Seleccione el tipo de ahorro',
        () => onSelect('Recurrente'),
        () => onSelect('Único')
    );
};