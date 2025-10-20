import { appState, saveState } from '../../state/store.js';
import { ExpenseRecord, RecurrenceRule } from '../../types/index.js';
import { parseCurrency, formatCurrency, handleNumericInputFormatting } from '../../utils/currency.js';
import { showToast } from '../../components/Toast.js';

type NavigateFunction = (view: string) => void;

export const renderExpenseFormView = (
    container: HTMLElement, 
    navigate: NavigateFunction, 
    type: 'Recurrente' | 'Único', 
    recordId?: string,
    onSave?: () => void,
) => {
    container.innerHTML = ''; // Clear previous content

    const isEditMode = !!recordId;
    const recordToEdit = isEditMode ? appState.expenseRecords.find(rec => rec.id === recordId) : null;

    const header = document.createElement('div');
    header.className = 'income-page-header';

    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.innerHTML = '&larr; Volver'; // Left arrow
    backButton.onclick = () => navigate('expenseList');

    const saveButton = document.createElement('button');
    saveButton.className = 'btn btn-add';
    saveButton.textContent = 'Guardar';

    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = isEditMode ? `Editar Gasto (${type})` : `Registro de Gasto (${type})`;
    
    header.appendChild(backButton);
    header.appendChild(saveButton);
    
    container.appendChild(header);
    container.appendChild(title);

    const form = document.createElement('form');
    form.id = 'register-expense-form';
    form.className = 'income-form';
    form.onsubmit = (e) => e.preventDefault();

    const createFormField = (labelText: string, inputType: string, inputId: string, placeholder: string = '') => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        const label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = inputId;
        label.textContent = labelText;
        let input: HTMLInputElement | HTMLTextAreaElement;
        if (inputType === 'textarea') {
            input = document.createElement('textarea');
            input.rows = 3;
        } else {
            input = document.createElement('input');
            if (inputType === 'number') {
                (input as HTMLInputElement).type = 'text';
                (input as HTMLInputElement).inputMode = 'decimal';
                input.addEventListener('input', handleNumericInputFormatting);
            } else {
                (input as HTMLInputElement).type = inputType;
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

    const nameField = createFormField('Nombre del gasto', 'text', 'expense-name');
    const categoryField = createFormField('Categoría', 'text', 'expense-category', 'Ej: Comida, Transporte');
    const descriptionField = createFormField('Descripción', 'textarea', 'expense-description');

    form.appendChild(nameField);
    form.appendChild(categoryField);
    
    if (type === 'Único') {
        const amountField = createFormField('Monto', 'number', 'expense-amount', '0');
        form.appendChild(amountField);
        const dateField = createFormField('Fecha', 'date', 'expense-date');
        form.appendChild(dateField);

        if (isEditMode && recordToEdit) {
            (amountField.querySelector('input') as HTMLInputElement).value = formatCurrency(recordToEdit.amount);
            if(recordToEdit.date) (dateField.querySelector('input') as HTMLInputElement).value = recordToEdit.date;
        }
        
        saveButton.onclick = () => {
            const formData = new FormData(form);
            const name = formData.get('expense-name') as string;
            const amountStr = formData.get('expense-amount') as string;
            const date = formData.get('expense-date') as string;

            if (!name || !amountStr || !date) {
                alert('Por favor, complete los campos Nombre, Monto y Fecha.');
                return;
            }

            const newRecord: ExpenseRecord = {
                id: recordId || `exp-${Date.now()}`,
                type: type,
                name: name,
                category: formData.get('expense-category') as string || 'General',
                amount: parseCurrency(amountStr),
                date: date,
                description: formData.get('expense-description') as string,
            };

            if (isEditMode) {
                const index = appState.expenseRecords.findIndex(rec => rec.id === recordId);
                if (index > -1) appState.expenseRecords[index] = newRecord;
            } else {
                appState.expenseRecords.push(newRecord);
            }
            saveState(appState);
            if (onSave) onSave();
            showToast(isEditMode ? 'Éxito: Gasto actualizado' : 'Éxito: Gasto guardado');

            setTimeout(() => navigate('expenseList'), 500);
        };
    } else if (type === 'Recurrente') {
        const totalAmountField = createFormField('Monto Total', 'number', 'expense-total-amount', '0');
        const installmentAmountField = createFormField('Monto de Cuota', 'number', 'expense-amount', '0');
        const durationField = createFormField('Duración (meses)', 'number', 'expense-duration', 'Ej: 24');
        const monthsPaidField = createFormField('Meses abonados', 'number', 'expense-months-paid', 'Ej: 3');
        form.appendChild(totalAmountField);
        form.appendChild(installmentAmountField);
        form.appendChild(durationField);
        form.appendChild(monthsPaidField);

        const frequencyGroup = document.createElement('div');
        frequencyGroup.className = 'form-group';
        const frequencyLabel = document.createElement('label');
        frequencyLabel.className = 'form-label';
        frequencyLabel.textContent = 'Días de pago de la cuota';
        frequencyGroup.appendChild(frequencyLabel);
        const radioContainer = document.createElement('div');
        radioContainer.className = 'radio-group-container';
        const detailsContainer = document.createElement('div');
        detailsContainer.id = 'expense-frequency-details-container';
        detailsContainer.className = 'frequency-details';
        const frequencies: RecurrenceRule['type'][] = ['Diario', 'Semanal', 'Quincenal', 'Mensual'];
        frequencies.forEach(freq => {
            const option = document.createElement('div');
            option.className = 'radio-option';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.id = `exp-freq-${freq}`;
            radio.name = 'expense-frequency';
            radio.value = freq;
            const label = document.createElement('label');
            label.htmlFor = `exp-freq-${freq}`;
            label.textContent = freq;
            option.appendChild(radio);
            option.appendChild(label);
            radioContainer.appendChild(option);
        });
        radioContainer.onchange = (e) => {
            const target = e.target as HTMLInputElement;
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
                const day1Input = day1Group.querySelector('input') as HTMLInputElement;
                day1Input.name = 'daysOfMonth';
                day1Input.min = '1';
                day1Input.max = '31';
                const day2Group = createFormField('Día 2', 'number', 'dayOfMonth2', '0');
                const day2Input = day2Group.querySelector('input') as HTMLInputElement;
                day2Input.name = 'daysOfMonth';
                day2Input.min = '1';
                day2Input.max = '31';
                detailsContainer.appendChild(day1Group);
                detailsContainer.appendChild(day2Group);
            } else if (target.value === 'Mensual') {
                const dayGroup = createFormField('Día del mes', 'number', 'dayOfMonth1', '0');
                const dayInput = dayGroup.querySelector('input') as HTMLInputElement;
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
            const freqRadio = form.querySelector(`input[name="expense-frequency"][value="${recordToEdit.recurrence.type}"]`) as HTMLInputElement;
            if (freqRadio) {
                freqRadio.checked = true;
                freqRadio.dispatchEvent(new Event('change', { bubbles: true })); // Trigger details view
                
                const recurrence = recordToEdit.recurrence;
                if (recurrence.type === 'Semanal' && recurrence.dayOfWeek) {
                    (detailsContainer.querySelector('select') as HTMLSelectElement).value = recurrence.dayOfWeek;
                } else if (recurrence.type === 'Quincenal' && recurrence.daysOfMonth) {
                    const inputs = detailsContainer.querySelectorAll('input[name="daysOfMonth"]');
                    if (inputs[0]) (inputs[0] as HTMLInputElement).value = String(recurrence.daysOfMonth[0] || '');
                    if (inputs[1]) (inputs[1] as HTMLInputElement).value = String(recurrence.daysOfMonth[1] || '');
                } else if (recurrence.type === 'Mensual' && recurrence.daysOfMonth) {
                    (detailsContainer.querySelector('input') as HTMLInputElement).value = String(recurrence.daysOfMonth[0] || '');
                }
            }
        }

        saveButton.onclick = () => {
            const formData = new FormData(form);
            const name = formData.get('expense-name') as string;
            const totalAmountStr = formData.get('expense-total-amount') as string;
            const installmentAmountStr = formData.get('expense-amount') as string;
            const durationInMonthsStr = formData.get('expense-duration') as string;
            const monthsPaidStr = formData.get('expense-months-paid') as string;
            const frequencyType = formData.get('expense-frequency') as RecurrenceRule['type'];

            if (!name || !totalAmountStr || !installmentAmountStr || !durationInMonthsStr || !frequencyType) {
                alert('Por favor, complete Nombre, Monto Total, Monto de Cuota, Duración y Frecuencia.');
                return;
            }

            const recurrence: RecurrenceRule = { type: frequencyType };
            if (frequencyType === 'Semanal') {
                recurrence.dayOfWeek = formData.get('dayOfWeek') as string;
            } else if (frequencyType === 'Quincenal' || frequencyType === 'Mensual') {
                recurrence.daysOfMonth = (formData.getAll('daysOfMonth') as string[]).map(d => parseInt(d, 10)).filter(d => d > 0);
            }

            const newRecord: ExpenseRecord = {
                id: recordId || `exp-${Date.now()}`,
                type: type,
                name: name,
                category: formData.get('expense-category') as string || 'General',
                amount: parseCurrency(installmentAmountStr),
                totalAmount: parseCurrency(totalAmountStr),
                durationInMonths: parseCurrency(durationInMonthsStr),
                installmentsPaid: monthsPaidStr ? parseCurrency(monthsPaidStr) : 0,
                description: formData.get('expense-description') as string,
                recurrence: recurrence,
            };

            if (isEditMode) {
                const index = appState.expenseRecords.findIndex(rec => rec.id === recordId);
                if (index > -1) appState.expenseRecords[index] = newRecord;
            } else {
                appState.expenseRecords.push(newRecord);
            }
            saveState(appState);
            if (onSave) onSave();
            showToast(isEditMode ? 'Éxito: Gasto actualizado' : 'Éxito: Gasto guardado');

            setTimeout(() => navigate('expenseList'), 500);
        };
    }

    if (isEditMode && recordToEdit) {
        (nameField.querySelector('input') as HTMLInputElement).value = recordToEdit.name;
        (categoryField.querySelector('input') as HTMLInputElement).value = recordToEdit.category;
        (descriptionField.querySelector('textarea') as HTMLTextAreaElement).value = recordToEdit.description;
        if (type === 'Recurrente') {
            (form.querySelector('[name="expense-total-amount"]') as HTMLInputElement).value = formatCurrency(recordToEdit.totalAmount);
            (form.querySelector('[name="expense-amount"]') as HTMLInputElement).value = formatCurrency(recordToEdit.amount);
            (form.querySelector('[name="expense-duration"]') as HTMLInputElement).value = String(recordToEdit.durationInMonths || '');
            (form.querySelector('[name="expense-months-paid"]') as HTMLInputElement).value = String(recordToEdit.installmentsPaid || '');
        }
    }

    form.appendChild(descriptionField);
    container.appendChild(form);
};