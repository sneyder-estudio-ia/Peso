import { createSimpleCard } from '../../components/common.js';
import { appState, saveState } from '../../state/store.js';
import { showToast } from '../../components/Toast.js';
import { formatCurrency, parseCurrency, handleNumericInputFormatting } from '../../utils/currency.js';
import { formatRecurrence } from '../../utils/helpers.js';

let salariesListContainer = null;

const createFormField = (labelText, inputType, inputId, name, placeholder = '') => {
    const group = document.createElement('div');
    group.className = 'form-group';
    const label = document.createElement('label');
    label.className = 'form-label';
    label.htmlFor = inputId;
    label.textContent = labelText;
    const input = document.createElement('input');

    if (inputType === 'number') {
        input.type = 'text';
        input.inputMode = 'decimal';
        input.addEventListener('input', handleNumericInputFormatting);
    } else {
        input.type = inputType;
    }
    
    input.id = inputId;
    input.name = name;
    input.className = 'form-input';
    input.placeholder = placeholder;
    group.appendChild(label);
    group.appendChild(input);
    return group;
};

const renderSalariesList = () => {
    if (!salariesListContainer) return;
    salariesListContainer.innerHTML = '';

    const salaries = appState.userProfile.salaries || [];

    if (salaries.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'empty-list-message';
        emptyMessage.textContent = 'No hay salarios fijos registrados.';
        salariesListContainer.appendChild(emptyMessage);
        return;
    }

    salaries.forEach(salary => {
        const card = createSalaryCard(salary);
        salariesListContainer.appendChild(card);
    });
};

const deleteSalary = (salaryId) => {
    if (confirm('¿Estás seguro de que quieres borrar este salario?')) {
        appState.userProfile.salaries = (appState.userProfile.salaries || []).filter(s => s.id !== salaryId);
        // Also delete the corresponding income record
        appState.incomeRecords = appState.incomeRecords.filter(rec => rec.salaryId !== salaryId);

        saveState(appState);
        showToast('Salario borrado con éxito.');
        renderSalariesList();
    }
};

const openSalaryModal = (salaryId) => {
    const isEditMode = !!salaryId;
    const salaryToEdit = isEditMode ? appState.userProfile.salaries?.find(s => s.id === salaryId) : null;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.display = 'flex';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.onclick = e => e.stopPropagation();

    const modalTitle = document.createElement('h3');
    modalTitle.className = 'modal-title';
    modalTitle.textContent = isEditMode ? 'Editar Salario' : 'Agregar Salario';

    const form = document.createElement('form');
    form.className = 'income-form';
    form.onsubmit = e => e.preventDefault();

    const nameField = createFormField('Nombre del Salario', 'text', 'salary-name', 'name', 'Ej: Trabajo Principal');
    const amountField = createFormField('Monto', 'number', 'salary-amount', 'amount', '0');
    form.appendChild(nameField);
    form.appendChild(amountField);
    
    // Frequency section from income form
    const frequencyGroup = document.createElement('div');
    frequencyGroup.className = 'form-group';
    const frequencyLabel = document.createElement('label');
    frequencyLabel.className = 'form-label';
    frequencyLabel.textContent = 'Frecuencia de pago';
    frequencyGroup.appendChild(frequencyLabel);
    const radioContainer = document.createElement('div');
    radioContainer.className = 'radio-group-container';
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'frequency-details';
    const frequencies = ['Diario', 'Semanal', 'Quincenal', 'Mensual'];
    frequencies.forEach(freq => {
        const option = document.createElement('div');
        option.className = 'radio-option';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.id = `sal-freq-${freq}`;
        radio.name = 'salary-frequency';
        radio.value = freq;
        const label = document.createElement('label');
        label.htmlFor = `sal-freq-${freq}`;
        label.textContent = freq;
        option.appendChild(radio);
        option.appendChild(label);
        radioContainer.appendChild(option);
    });
    radioContainer.onchange = (e) => {
        const target = e.target;
        detailsContainer.innerHTML = '';
        if (target.value === 'Semanal') {
            const weekSelect = document.createElement('select');
            weekSelect.name = 'dayOfWeek';
            weekSelect.className = 'form-input';
            const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            days.forEach(day => {
                const opt = document.createElement('option');
                opt.value = day;
                opt.textContent = day;
                weekSelect.appendChild(opt);
            });
            detailsContainer.appendChild(weekSelect);
        } else if (target.value === 'Quincenal' || target.value === 'Mensual') {
            const numDays = target.value === 'Quincenal' ? 2 : 1;
            for (let i = 1; i <= numDays; i++) {
                const dayGroup = createFormField(`Día ${i}`, 'number', `dayOfMonth${i}`, 'daysOfMonth');
                const input = dayGroup.querySelector('input');
                input.min = '1';
                input.max = '31';
                detailsContainer.appendChild(dayGroup);
            }
        }
    };
    frequencyGroup.appendChild(radioContainer);
    frequencyGroup.appendChild(detailsContainer);
    form.appendChild(frequencyGroup);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';

    const closeModal = () => {
        document.body.classList.remove('no-scroll');
        if (document.body.contains(modalOverlay)) {
            document.body.removeChild(modalOverlay);
        }
    };

    modalOverlay.onclick = closeModal;

    const saveButton = document.createElement('button');
    saveButton.className = 'btn btn-add';
    saveButton.textContent = 'Guardar';
    saveButton.onclick = () => {
        const formData = new FormData(form);
        const name = formData.get('name');
        const amountStr = formData.get('amount');
        const frequencyType = formData.get('salary-frequency');

        if (!name || !amountStr || !frequencyType) {
            alert('Por favor, complete todos los campos.');
            return;
        }

        const recurrence = { type: frequencyType };
        if (frequencyType === 'Semanal') {
            recurrence.dayOfWeek = formData.get('dayOfWeek');
        } else if (frequencyType === 'Quincenal' || frequencyType === 'Mensual') {
            recurrence.daysOfMonth = (formData.getAll('daysOfMonth')).map(d => parseInt(d, 10)).filter(d => d > 0);
        }

        const newSalary = {
            id: salaryId || `sal-${Date.now()}`,
            name,
            amount: parseCurrency(amountStr),
            recurrence,
        };

        if (!appState.userProfile.salaries) {
            appState.userProfile.salaries = [];
        }

        if (isEditMode) {
            const index = appState.userProfile.salaries.findIndex(s => s.id === salaryId);
            if (index > -1) {
                appState.userProfile.salaries[index] = newSalary;
            }
        } else {
            appState.userProfile.salaries.push(newSalary);
        }
        
        // Sync with income records
        const correspondingIncome = appState.incomeRecords.find(rec => rec.salaryId === newSalary.id);
        
        if (correspondingIncome) {
            // Update existing income record
            correspondingIncome.name = newSalary.name;
            correspondingIncome.amount = newSalary.amount;
            correspondingIncome.recurrence = newSalary.recurrence;
        } else {
            // Create new income record
            const newIncomeRecord = {
                id: `inc-sal-${newSalary.id}`,
                type: 'Recurrente',
                name: newSalary.name,
                source: 'Salario Fijo',
                amount: newSalary.amount,
                description: `Ingreso recurrente del salario "${newSalary.name}" gestionado desde Ajustes.`,
                recurrence: newSalary.recurrence,
                salaryId: newSalary.id,
            };
            appState.incomeRecords.push(newIncomeRecord);
        }

        saveState(appState);
        showToast(isEditMode ? 'Salario actualizado' : 'Salario guardado');
        renderSalariesList();
        closeModal();
    };
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn btn-option';
    cancelButton.textContent = 'Cancelar';
    cancelButton.onclick = closeModal;

    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(saveButton);
    
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(form);
    modalContent.appendChild(buttonContainer);
    modalOverlay.appendChild(modalContent);

    document.body.classList.add('no-scroll');
    document.body.appendChild(modalOverlay);

    // Pre-fill form if editing, otherwise set a default
    if (isEditMode && salaryToEdit) {
        form.querySelector('[name="name"]').value = salaryToEdit.name;
        form.querySelector('[name="amount"]').value = formatCurrency(salaryToEdit.amount);
        const freqRadio = form.querySelector(`input[name="salary-frequency"][value="${salaryToEdit.recurrence.type}"]`);
        if (freqRadio) {
            freqRadio.checked = true;
            freqRadio.dispatchEvent(new Event('change', { bubbles: true }));
            const rec = salaryToEdit.recurrence;
            if (rec.type === 'Semanal' && rec.dayOfWeek) {
                detailsContainer.querySelector('select').value = rec.dayOfWeek;
            } else if ((rec.type === 'Quincenal' || rec.type === 'Mensual') && rec.daysOfMonth) {
                const inputs = detailsContainer.querySelectorAll('input[name="daysOfMonth"]');
                inputs.forEach((input, index) => {
                    input.value = String(rec.daysOfMonth[index] || '');
                });
            }
        }
    } else {
        // Set a default for new entries
        const defaultFrequencyRadio = form.querySelector('input[name="salary-frequency"][value="Mensual"]');
        if (defaultFrequencyRadio) {
            defaultFrequencyRadio.checked = true;
            defaultFrequencyRadio.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
};

const createSalaryCard = (salary) => {
    const card = document.createElement('div');
    card.className = 'income-record-card'; // Reuse style

    const info = document.createElement('div');
    info.className = 'income-record-info';

    const name = document.createElement('span');
    name.className = 'income-record-name';
    name.textContent = salary.name;

    const details = document.createElement('span');
    details.className = 'income-record-date'; // Reuse style
    details.textContent = formatRecurrence(salary.recurrence);

    info.appendChild(name);
    info.appendChild(details);

    const rightContainer = document.createElement('div');
    rightContainer.className = 'income-record-right';

    const amount = document.createElement('div');
    amount.className = 'income-record-amount income'; // Reuse style
    amount.textContent = `$ ${formatCurrency(salary.amount)}`;

    const editButton = document.createElement('button');
    editButton.className = 'btn-edit';
    editButton.innerHTML = '&#x270F;';
    editButton.setAttribute('aria-label', `Editar salario ${salary.name}`);
    editButton.onclick = (e) => {
        e.stopPropagation();
        openSalaryModal(salary.id);
    };

    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-delete';
    deleteButton.innerHTML = '&#x1F5D1;';
    deleteButton.setAttribute('aria-label', `Borrar salario ${salary.name}`);
    deleteButton.onclick = (e) => {
        e.stopPropagation();
        deleteSalary(salary.id);
    };

    rightContainer.appendChild(amount);
    rightContainer.appendChild(editButton);
    rightContainer.appendChild(deleteButton);

    card.appendChild(info);
    card.appendChild(rightContainer);

    return card;
};

export const renderSettingsView = (container, navigate) => {
    container.innerHTML = '';

    const titleContainer = document.createElement('div');
    titleContainer.className = 'stats-title-container';
    const title = document.createElement('h2');
    title.className = 'stats-title';
    title.textContent = 'Ajustes';
    const backButton = document.createElement('button');
    backButton.className = 'btn-settings btn-back-panel';
    backButton.innerHTML = '&larr;';
    backButton.setAttribute('aria-label', 'Volver');
    backButton.onclick = () => navigate('statistics');
    titleContainer.appendChild(title);
    titleContainer.appendChild(backButton);
    container.appendChild(titleContainer);

    const profileSection = document.createElement('div');
    profileSection.className = 'stats-section';
    const profileCard = createSimpleCard('Perfil de Usuario');
    
    const profileForm = document.createElement('form');
    profileForm.className = 'income-form';
    profileForm.style.marginTop = '15px';
    profileForm.onsubmit = (e) => e.preventDefault();
    
    const firstNameField = createFormField('Nombre', 'text', 'user-firstname', 'firstName');
    const lastNameField = createFormField('Apellido', 'text', 'user-lastname', 'lastName');
    
    const saveProfileButton = document.createElement('button');
    saveProfileButton.textContent = 'Guardar Perfil';
    saveProfileButton.className = 'btn btn-add';
    saveProfileButton.style.width = '100%';
    saveProfileButton.style.marginTop = '20px';
    saveProfileButton.onclick = () => {
        appState.userProfile.firstName = profileForm.querySelector('#user-firstname').value;
        appState.userProfile.lastName = profileForm.querySelector('#user-lastname').value;
        saveState(appState);
        showToast('Perfil guardado con éxito');
    };

    profileForm.appendChild(firstNameField);
    profileForm.appendChild(lastNameField);
    profileForm.appendChild(saveProfileButton);
    profileCard.appendChild(profileForm);
    profileSection.appendChild(profileCard);
    container.appendChild(profileSection);

    // --- Cloud Sync Section ---
    const syncSection = document.createElement('div');
    syncSection.className = 'stats-section';
    const syncCard = createSimpleCard('Sincronización en la Nube');

    const syncForm = document.createElement('form');
    syncForm.className = 'income-form';
    syncForm.style.marginTop = '15px';
    syncForm.onsubmit = (e) => e.preventDefault();

    const emailField = createFormField('Correo Electrónico', 'email', 'user-sync-email', 'syncEmail', 'tu.correo@ejemplo.com');
    
    const frequencyGroup = document.createElement('div');
    frequencyGroup.className = 'form-group';
    const frequencyLabel = document.createElement('label');
    frequencyLabel.className = 'form-label';
    frequencyLabel.htmlFor = 'user-sync-frequency';
    frequencyLabel.textContent = 'Frecuencia de Sincronización';
    const frequencySelect = document.createElement('select');
    frequencySelect.id = 'user-sync-frequency';
    frequencySelect.name = 'syncFrequency';
    frequencySelect.className = 'form-input';
    const frequencies = ['Nunca', 'Cada 6 horas', 'Cada 24 horas', 'Cada mes'];
    frequencies.forEach(freq => {
        const option = document.createElement('option');
        option.value = freq || 'Nunca';
        option.textContent = freq || 'Nunca';
        frequencySelect.appendChild(option);
    });
    frequencyGroup.appendChild(frequencyLabel);
    frequencyGroup.appendChild(frequencySelect);
    
    const saveSyncButton = document.createElement('button');
    saveSyncButton.textContent = 'Guardar Ajustes de Sincronización';
    saveSyncButton.className = 'btn btn-add';
    saveSyncButton.style.width = '100%';
    saveSyncButton.style.marginTop = '20px';
    saveSyncButton.onclick = () => {
        const email = syncForm.querySelector('#user-sync-email').value;
        const frequency = syncForm.querySelector('#user-sync-frequency').value;
        appState.userProfile.cloudSyncEmail = email;
        appState.userProfile.cloudSyncFrequency = frequency;
        saveState(appState);
        showToast('Ajustes de sincronización guardados.');
    };

    syncForm.appendChild(emailField);
    syncForm.appendChild(frequencyGroup);
    syncForm.appendChild(saveSyncButton);
    syncCard.appendChild(syncForm);
    syncSection.appendChild(syncCard);
    container.appendChild(syncSection);

    // --- Salaries Section ---
    const salariesSection = document.createElement('div');
    salariesSection.className = 'stats-section';
    const salariesCard = createSimpleCard('Salarios Fijos');
    const salaryForm = document.createElement('div');
    salaryForm.className = 'income-form';
    salaryForm.style.marginTop = '15px';

    const salaryLabelContainer = document.createElement('div');
    salaryLabelContainer.className = 'form-label-container';
    const salaryLabel = document.createElement('label');
    salaryLabel.className = 'form-label';
    salaryLabel.textContent = 'Gestionar Salarios';
    const addSalaryButton = document.createElement('button');
    addSalaryButton.className = 'btn-add-small';
    addSalaryButton.textContent = '+';
    addSalaryButton.type = 'button';
    addSalaryButton.setAttribute('aria-label', 'Agregar nuevo salario');
    addSalaryButton.onclick = () => openSalaryModal();
    
    salaryLabelContainer.appendChild(salaryLabel);
    salaryLabelContainer.appendChild(addSalaryButton);
    
    salariesListContainer = document.createElement('div');
    salariesListContainer.id = 'salaries-list-container';
    salariesListContainer.style.marginTop = '15px';
    
    salaryForm.appendChild(salaryLabelContainer);
    salaryForm.appendChild(salariesListContainer);
    salariesCard.appendChild(salaryForm);
    salariesSection.appendChild(salariesCard);
    container.appendChild(salariesSection);
    
    // Load existing profile data
    const currentUserProfile = appState.userProfile;
    if (currentUserProfile) {
        firstNameField.querySelector('input').value = currentUserProfile.firstName || '';
        lastNameField.querySelector('input').value = currentUserProfile.lastName || '';
        emailField.querySelector('input').value = currentUserProfile.cloudSyncEmail || '';
        frequencySelect.value = currentUserProfile.cloudSyncFrequency || 'Nunca';
    }
    
    // Initial render of salaries
    renderSalariesList();

    // --- Data Management Section ---
    const dataSection = document.createElement('div');
    dataSection.className = 'stats-section';
    const dataCard = createSimpleCard('Gestión de Datos');

    const deleteAllButton = document.createElement('button');
    deleteAllButton.textContent = 'Borrar Todos los Datos';
    deleteAllButton.className = 'btn btn-expense';
    deleteAllButton.style.width = '100%';
    deleteAllButton.style.marginTop = '15px';
    deleteAllButton.onclick = () => {
        if (confirm('¿Estás seguro de que quieres borrar todos los datos de registros? Tu perfil no será modificado. Esta acción no se puede deshacer.')) {
            appState.incomeRecords = [];
            appState.expenseRecords = [];
            appState.savingRecords = [];
            saveState(appState);
            showToast('Todos los registros han sido borrados.');
            
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    dataCard.appendChild(deleteAllButton);
    dataSection.appendChild(dataCard);
    container.appendChild(dataSection);
};