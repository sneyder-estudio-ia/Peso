import { appState, saveState } from '../../state/store.js';
import { parseCurrency, formatCurrency, handleNumericInputFormatting } from '../../utils/currency.js';
import { showToast } from '../../components/Toast.js';
export const renderSavingsFormView = (container, navigate, type, recordId) => {
    container.innerHTML = ''; // Clear previous content
    const isEditMode = !!recordId;
    const recordToEdit = isEditMode ? appState.savingRecords.find(rec => rec.id === recordId) : null;
    const header = document.createElement('div');
    header.className = 'income-page-header';
    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.innerHTML = '&larr; Volver'; // Left arrow
    backButton.onclick = () => navigate('savingsList');
    const saveButton = document.createElement('button');
    saveButton.className = 'btn btn-add';
    saveButton.textContent = 'Guardar';
    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = isEditMode ? `Editar Ahorro (${type})` : `Registro de Ahorro (${type})`;
    header.appendChild(backButton);
    header.appendChild(saveButton);
    container.appendChild(header);
    container.appendChild(title);
    const form = document.createElement('form');
    form.id = 'register-savings-form';
    form.className = 'income-form';
    form.onsubmit = (e) => e.preventDefault();
    const createFormField = (labelText, inputType, inputId, placeholder = '') => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        const label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = inputId;
        label.textContent = labelText;
        let input;
        if (inputType === 'textarea') {
            input = document.createElement('textarea');
            input.rows = 3;
        }
        else {
            input = document.createElement('input');
            if (inputType === 'number') {
                input.type = 'text';
                input.inputMode = 'decimal';
                input.addEventListener('input', handleNumericInputFormatting);
            }
            else {
                input.type = inputType;
            }
        }
        input.className = 'form-input';
        input.id = inputId;
        input.name = inputId;
        input.placeholder = placeholder;
        formGroup.appendChild(label);
        formGroup.appendChild(input);
        return formGroup;
    };
    const nameField = createFormField('Nombre del ahorro', 'text', 'savings-name');
    const amountField = createFormField(type === 'Recurrente' ? 'Monto de la Cuota' : 'Monto a Ahorrar', 'number', 'savings-amount', '0');
    const goalAmountField = createFormField('Meta de Ahorro (Opcional)', 'number', 'savings-goal-amount', '0');
    // --- Storage Type ---
    const storageTypeGroup = document.createElement('div');
    storageTypeGroup.className = 'form-group';
    const storageTypeLabel = document.createElement('label');
    storageTypeLabel.className = 'form-label';
    storageTypeLabel.textContent = '¿Dónde guardarás el ahorro?';
    storageTypeGroup.appendChild(storageTypeLabel);
    const storageRadioContainer = document.createElement('div');
    storageRadioContainer.className = 'radio-group-container';
    const storageTypes = ['Banco', 'Personal'];
    storageTypes.forEach(st => {
        const option = document.createElement('div');
        option.className = 'radio-option';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.id = `storage-${st}`;
        radio.name = 'savings-storage-type';
        radio.value = st;
        const label = document.createElement('label');
        label.htmlFor = `storage-${st}`;
        label.textContent = st;
        option.appendChild(radio);
        option.appendChild(label);
        storageRadioContainer.appendChild(option);
    });
    storageTypeGroup.appendChild(storageRadioContainer);
    // --- Bank Details (Conditional) ---
    const bankDetailsContainer = document.createElement('div');
    bankDetailsContainer.id = 'bank-details-container';
    bankDetailsContainer.className = 'frequency-details';
    bankDetailsContainer.style.display = 'none';
    const bankNameField = createFormField('Nombre del Banco', 'text', 'savings-bank-name');
    const accountTypeGroup = document.createElement('div');
    accountTypeGroup.className = 'form-group';
    const accountTypeLabel = document.createElement('label');
    accountTypeLabel.htmlFor = 'savings-account-type';
    accountTypeLabel.className = 'form-label';
    accountTypeLabel.textContent = 'Tipo de Cuenta';
    const accountTypeSelect = document.createElement('select');
    accountTypeSelect.name = 'savings-account-type';
    accountTypeSelect.id = 'savings-account-type';
    accountTypeSelect.className = 'form-input';
    const accountTypes = ['Caja de Ahorro', 'Cuenta Corriente', 'Plazo Fijo', 'Fondo de Inversión', 'Otro'];
    accountTypes.forEach(at => {
        const opt = document.createElement('option');
        opt.value = at;
        opt.textContent = at;
        accountTypeSelect.appendChild(opt);
    });
    accountTypeGroup.appendChild(accountTypeLabel);
    accountTypeGroup.appendChild(accountTypeSelect);
    bankDetailsContainer.appendChild(bankNameField);
    bankDetailsContainer.appendChild(accountTypeGroup);
    storageTypeGroup.appendChild(bankDetailsContainer);
    storageRadioContainer.onchange = (e) => {
        const target = e.target;
        if (target.value === 'Banco') {
            bankDetailsContainer.style.display = 'flex';
        }
        else {
            bankDetailsContainer.style.display = 'none';
        }
    };
    const descriptionField = createFormField('Descripción', 'textarea', 'savings-description');
    form.appendChild(nameField);
    form.appendChild(amountField);
    form.appendChild(goalAmountField);
    form.appendChild(storageTypeGroup);
    if (type === 'Único') {
        const dateField = createFormField('Fecha', 'date', 'savings-date');
        form.appendChild(dateField);
        if (isEditMode && recordToEdit && recordToEdit.date) {
            dateField.querySelector('input').value = recordToEdit.date;
        }
        saveButton.onclick = async () => {
            const formData = new FormData(form);
            const name = formData.get('savings-name');
            const amountStr = formData.get('savings-amount');
            const date = formData.get('savings-date');
            const storageType = form.querySelector('input[name="savings-storage-type"]:checked')?.value;
            if (!name || !amountStr || !date) {
                alert('Por favor, complete los campos Nombre, Monto y Fecha.');
                return;
            }
            if (!storageType) {
                alert('Por favor, seleccione si el ahorro es en Banco o Personal.');
                return;
            }
            const newRecord = {
                id: recordId || `sav-${Date.now()}`,
                type: type,
                name: name,
                amount: parseCurrency(amountStr),
                date: date,
                description: formData.get('savings-description'),
                storageType: storageType,
                bankName: storageType === 'Banco' ? formData.get('savings-bank-name') : undefined,
                accountType: storageType === 'Banco' ? formData.get('savings-account-type') : undefined,
                goalAmount: parseCurrency(formData.get('savings-goal-amount')) || undefined,
            };
            if (isEditMode) {
                const index = appState.savingRecords.findIndex(rec => rec.id === recordId);
                if (index > -1)
                    appState.savingRecords[index] = newRecord;
            }
            else {
                appState.savingRecords.unshift(newRecord);
            }
            await saveState(appState);
            showToast(isEditMode ? 'Éxito: Ahorro actualizado' : 'Éxito: Ahorro guardado');
            setTimeout(() => navigate('savingsList'), 100);
        };
    }
    else if (type === 'Recurrente') {
        const frequencyGroup = document.createElement('div');
        frequencyGroup.className = 'form-group';
        const frequencyLabel = document.createElement('label');
        frequencyLabel.className = 'form-label';
        frequencyLabel.textContent = 'Días de ahorro';
        frequencyGroup.appendChild(frequencyLabel);
        const radioContainer = document.createElement('div');
        radioContainer.className = 'radio-group-container';
        const detailsContainer = document.createElement('div');
        detailsContainer.id = 'savings-frequency-details-container';
        detailsContainer.className = 'frequency-details';
        const frequencies = ['Diario', 'Semanal', 'Quincenal', 'Mensual'];
        frequencies.forEach(freq => {
            const option = document.createElement('div');
            option.className = 'radio-option';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.id = `sav-freq-${freq}`;
            radio.name = 'savings-frequency';
            radio.value = freq;
            const label = document.createElement('label');
            label.htmlFor = `sav-freq-${freq}`;
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
            }
            else if (target.value === 'Quincenal') {
                const day1Group = createFormField('Día 1', 'number', 'dayOfMonth1', '0');
                const day1Input = day1Group.querySelector('input');
                day1Input.name = 'daysOfMonth';
                day1Input.min = '1';
                day1Input.max = '31';
                const day2Group = createFormField('Día 2', 'number', 'dayOfMonth2', '0');
                const day2Input = day2Group.querySelector('input');
                day2Input.name = 'daysOfMonth';
                day2Input.min = '1';
                day2Input.max = '31';
                detailsContainer.appendChild(day1Group);
                detailsContainer.appendChild(day2Group);
            }
            else if (target.value === 'Mensual') {
                const dayGroup = createFormField('Día del mes', 'number', 'dayOfMonth1', '0');
                const dayInput = dayGroup.querySelector('input');
                dayInput.name = 'daysOfMonth';
                dayInput.min = '1';
                dayInput.max = '31';
                detailsContainer.appendChild(dayGroup);
            }
        };
        frequencyGroup.appendChild(radioContainer);
        frequencyGroup.appendChild(detailsContainer);
        form.appendChild(frequencyGroup);
        if (isEditMode && recordToEdit?.recurrence) {
            const freqRadio = form.querySelector(`input[name="savings-frequency"][value="${recordToEdit.recurrence.type}"]`);
            if (freqRadio) {
                freqRadio.checked = true;
                freqRadio.dispatchEvent(new Event('change', { bubbles: true }));
                const recurrence = recordToEdit.recurrence;
                if (recurrence.type === 'Semanal' && recurrence.dayOfWeek) {
                    detailsContainer.querySelector('select').value = recurrence.dayOfWeek;
                }
                else if (recurrence.type === 'Quincenal' && recurrence.daysOfMonth) {
                    const inputs = detailsContainer.querySelectorAll('input[name="daysOfMonth"]');
                    if (inputs[0])
                        inputs[0].value = String(recurrence.daysOfMonth[0] || '');
                    if (inputs[1])
                        inputs[1].value = String(recurrence.daysOfMonth[1] || '');
                }
                else if (recurrence.type === 'Mensual' && recurrence.daysOfMonth) {
                    detailsContainer.querySelector('input').value = String(recurrence.daysOfMonth[0] || '');
                }
            }
        }
        saveButton.onclick = async () => {
            const formData = new FormData(form);
            const name = formData.get('savings-name');
            const amountStr = formData.get('savings-amount');
            const frequencyType = formData.get('savings-frequency');
            const storageType = form.querySelector('input[name="savings-storage-type"]:checked')?.value;
            if (!name || !amountStr || !frequencyType) {
                alert('Por favor, complete Nombre, Monto y Frecuencia.');
                return;
            }
            if (!storageType) {
                alert('Por favor, seleccione si el ahorro es en Banco o Personal.');
                return;
            }
            const recurrence = { type: frequencyType };
            if (frequencyType === 'Semanal') {
                recurrence.dayOfWeek = formData.get('dayOfWeek');
            }
            else if (frequencyType === 'Quincenal' || frequencyType === 'Mensual') {
                recurrence.daysOfMonth = formData.getAll('daysOfMonth').map(d => parseInt(d, 10)).filter(d => d > 0);
            }
            const newRecord = {
                id: recordId || `sav-${Date.now()}`,
                type: type,
                name: name,
                amount: parseCurrency(amountStr),
                description: formData.get('savings-description'),
                recurrence: recurrence,
                storageType: storageType,
                bankName: storageType === 'Banco' ? formData.get('savings-bank-name') : undefined,
                accountType: storageType === 'Banco' ? formData.get('savings-account-type') : undefined,
                goalAmount: parseCurrency(formData.get('savings-goal-amount')) || undefined,
            };
            if (isEditMode) {
                const index = appState.savingRecords.findIndex(rec => rec.id === recordId);
                if (index > -1)
                    appState.savingRecords[index] = newRecord;
            }
            else {
                appState.savingRecords.unshift(newRecord);
            }
            await saveState(appState);
            showToast(isEditMode ? 'Éxito: Ahorro actualizado' : 'Éxito: Ahorro guardado');
            setTimeout(() => navigate('savingsList'), 100);
        };
    }
    if (isEditMode && recordToEdit) {
        nameField.querySelector('input').value = recordToEdit.name;
        amountField.querySelector('input').value = formatCurrency(recordToEdit.amount);
        goalAmountField.querySelector('input').value = formatCurrency(recordToEdit.goalAmount);
        descriptionField.querySelector('textarea').value = recordToEdit.description;
        const storageRadio = form.querySelector(`input[name="savings-storage-type"][value="${recordToEdit.storageType}"]`);
        if (storageRadio) {
            storageRadio.checked = true;
            storageRadio.dispatchEvent(new Event('change', { bubbles: true }));
            if (recordToEdit.storageType === 'Banco') {
                bankNameField.querySelector('input').value = recordToEdit.bankName || '';
                form.querySelector('select[name="savings-account-type"]').value = recordToEdit.accountType || 'Caja de Ahorro';
            }
        }
    }
    form.appendChild(descriptionField);
    container.appendChild(form);
};
