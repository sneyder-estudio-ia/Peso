import { appState, saveState } from '../../state/store.js';
import { parseCurrency, formatCurrency, handleNumericInputFormatting } from '../../utils/currency.js';
import { showToast } from '../../components/Toast.js';

export const renderIncomeFormView = (
    container, 
    navigate, 
    type, 
    recordId
) => {
    container.innerHTML = ''; // Clear previous content

    const isEditMode = !!recordId;
    const recordToEdit = isEditMode ? appState.incomeRecords.find(rec => rec.id === recordId) : null;

    const header = document.createElement('div');
    header.className = 'income-page-header';

    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.innerHTML = '&larr; Volver'; // Left arrow
    backButton.onclick = () => navigate('incomeList');

    const saveButton = document.createElement('button');
    saveButton.className = 'btn btn-add';
    saveButton.textContent = 'Guardar';

    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = isEditMode ? `Editar Ingreso (${type})` : `Registro (${type})`;
    
    header.appendChild(backButton);
    header.appendChild(saveButton);
    
    container.appendChild(header);
    container.appendChild(title);

    const form = document.createElement('form');
    form.id = 'register-income-form';
    form.className = 'income-form';
    form.onsubmit = (e) => e.preventDefault(); // Prevent default submission

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
        } else {
            input = document.createElement('input');
            if (inputType === 'number') {
                input.type = 'text';
                input.inputMode = 'decimal';
                input.addEventListener('input', handleNumericInputFormatting);
            } else {
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

    const nameField = createFormField('Nombre', 'text', 'income-name');
    const sourceField = createFormField('De dónde viene el pago', 'text', 'income-source');
    const amountField = createFormField('Monto', 'number', 'income-amount', '0');
    const descriptionField = createFormField('Descripción', 'textarea', 'income-description');

    form.appendChild(nameField);
    form.appendChild(sourceField);
    form.appendChild(amountField);
    
    if (type === 'Único') {
        const dateField = createFormField('Fecha', 'date', 'income-date');
        form.appendChild(dateField);

        if (isEditMode && recordToEdit && recordToEdit.date) {
            dateField.querySelector('input').value = recordToEdit.date;
        }
        
        saveButton.onclick = () => {
            const formData = new FormData(form);
            const name = formData.get('income-name');
            const amountStr = formData.get('income-amount');
            const date = formData.get('income-date');

            if (!name || !amountStr || !date) {
                alert('Por favor, complete los campos Nombre, Monto y Fecha.');
                return;
            }

            const newRecord = {
                id: recordId || `inc-${Date.now()}`,
                type: type,
                name: name,
                source: formData.get('income-source'),
                amount: parseCurrency(amountStr),
                date: date,
                description: formData.get('income-description'),
            };

            if (isEditMode) {
                const index = appState.incomeRecords.findIndex(rec => rec.id === recordId);
                if (index > -1) appState.incomeRecords[index] = newRecord;
            } else {
                appState.incomeRecords.push(newRecord);
            }
            showToast(isEditMode ? 'Éxito: Ingreso actualizado' : 'Éxito: Ingreso guardado');
            saveState(appState);

            setTimeout(() => navigate('incomeList'), 500);
        };
    } else if (type === 'Recurrente') {
        const frequencyGroup = document.createElement('div');
        frequencyGroup.className = 'form-group';
        const frequencyLabel = document.createElement('label');
        frequencyLabel.className = 'form-label';
        frequencyLabel.textContent = 'Días de ingreso';
        frequencyGroup.appendChild(frequencyLabel);

        const radioContainer = document.createElement('div');
        radioContainer.className = 'radio-group-container';

        const detailsContainer = document.createElement('div');
        detailsContainer.id = 'frequency-details-container';
        detailsContainer.className = 'frequency-details';

        const frequencies = ['Diario', 'Semanal', 'Quincenal', 'Mensual'];
        frequencies.forEach(freq => {
            const option = document.createElement('div');
            option.className = 'radio-option';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.id = `freq-${freq}`;
            radio.name = 'income-frequency';
            radio.value = freq;
            
            const label = document.createElement('label');
            label.htmlFor = `freq-${freq}`;
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
            } else if (target.value === 'Quincenal') {
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
            } else if (target.value === 'Mensual') {
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
            const freqRadio = form.querySelector(`input[name="income-frequency"][value="${recordToEdit.recurrence.type}"]`);
            if (freqRadio) {
                freqRadio.checked = true;
                freqRadio.dispatchEvent(new Event('change', { bubbles: true })); // Trigger details view
                
                const recurrence = recordToEdit.recurrence;
                if (recurrence.type === 'Semanal' && recurrence.dayOfWeek) {
                    detailsContainer.querySelector('select').value = recurrence.dayOfWeek;
                } else if (recurrence.type === 'Quincenal' && recurrence.daysOfMonth) {
                    const inputs = detailsContainer.querySelectorAll('input[name="daysOfMonth"]');
                    if (inputs[0]) inputs[0].value = String(recurrence.daysOfMonth[0] || '');
                    if (inputs[1]) inputs[1].value = String(recurrence.daysOfMonth[1] || '');
                } else if (recurrence.type === 'Mensual' && recurrence.daysOfMonth) {
                    detailsContainer.querySelector('input').value = String(recurrence.daysOfMonth[0] || '');
                }
            }
        }

        saveButton.onclick = () => {
            const formData = new FormData(form);
            const name = formData.get('income-name');
            const amountStr = formData.get('income-amount');
            const frequencyType = formData.get('income-frequency');

            if (!name || !amountStr || !frequencyType) {
                alert('Por favor, complete Nombre, Monto y Frecuencia.');
                return;
            }

            const recurrence = { type: frequencyType };
            if (frequencyType === 'Semanal') {
                recurrence.dayOfWeek = formData.get('dayOfWeek');
            } else if (frequencyType === 'Quincenal' || frequencyType === 'Mensual') {
                recurrence.daysOfMonth = (formData.getAll('daysOfMonth')).map(d => parseInt(d, 10)).filter(d => d > 0);
            }

            const newRecord = {
                id: recordId || `inc-${Date.now()}`,
                type: type,
                name: name,
                source: formData.get('income-source'),
                amount: parseCurrency(amountStr),
                description: formData.get('income-description'),
                recurrence: recurrence,
            };

            if (isEditMode) {
                const index = appState.incomeRecords.findIndex(rec => rec.id === recordId);
                if (index > -1) appState.incomeRecords[index] = newRecord;
            } else {
                appState.incomeRecords.push(newRecord);
            }
            showToast(isEditMode ? 'Éxito: Ingreso actualizado' : 'Éxito: Ingreso guardado');
            saveState(appState);

            setTimeout(() => navigate('incomeList'), 500);
        };
    }

    if (isEditMode && recordToEdit) {
        nameField.querySelector('input').value = recordToEdit.name;
        sourceField.querySelector('input').value = recordToEdit.source;
        amountField.querySelector('input').value = formatCurrency(recordToEdit.amount).replace(/\./g, '').replace(',', ',');
        descriptionField.querySelector('textarea').value = recordToEdit.description;
    }


    form.appendChild(descriptionField);
    container.appendChild(form);
};