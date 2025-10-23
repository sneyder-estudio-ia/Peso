/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { appState, saveState } from '../../state/store.js';
import { ExpenseRecord, RecurrenceRule, ExpenseSubItem } from '../../types/index.js';
import { parseCurrency, formatCurrency, handleNumericInputFormatting } from '../../utils/currency.js';
import { showToast } from '../../components/Toast.js';

type NavigateFunction = (view: string) => void;

// Helper to create form fields, to avoid repetition
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


export const renderExpenseFormView = (
    container: HTMLElement, 
    navigate: NavigateFunction, 
    type: 'Recurrente' | 'Único', 
    recordId?: string,
) => {
    const isEditMode = !!recordId;
    const recordToEdit = isEditMode ? appState.expenseRecords.find(rec => rec.id === recordId) : null;
    let isMultipleMode = false;
    let multipleExpenseEntries: { id: number }[] = [{ id: Date.now() }];

    const render = () => {
        container.innerHTML = ''; // Clear everything on re-render

        // --- Header (always present) ---
        const header = document.createElement('div');
        header.className = 'income-page-header';

        const backButton = document.createElement('button');
        backButton.className = 'btn btn-back';
        backButton.innerHTML = '&larr; Volver';
        backButton.onclick = () => navigate('expenseList');

        const saveButton = document.createElement('button');
        saveButton.className = 'btn btn-add';
        saveButton.textContent = 'Guardar';
        saveButton.onclick = handleSave;

        const title = document.createElement('h2');
        title.className = 'card-title';
        title.textContent = isEditMode ? `Editar Gasto (${type})` : `Registro de Gasto (${type})`;
        
        header.appendChild(backButton);
        header.appendChild(saveButton);
        container.appendChild(header);
        container.appendChild(title);

        // --- Form ---
        const form = document.createElement('form');
        form.id = 'register-expense-form';
        form.className = 'income-form';
        form.onsubmit = (e) => e.preventDefault();
        container.appendChild(form);

        // --- Checkbox for Multiple Mode (only for new expenses) ---
        if (!isEditMode) {
            const multipleModeGroup = document.createElement('div');
            multipleModeGroup.className = 'form-group radio-option';
            const multipleModeCheckbox = document.createElement('input');
            multipleModeCheckbox.type = 'checkbox';
            multipleModeCheckbox.id = 'expense-is-multiple';
            multipleModeCheckbox.checked = isMultipleMode;
            multipleModeCheckbox.onchange = () => {
                isMultipleMode = multipleModeCheckbox.checked;
                render(); // Re-render the view
            };
            const multipleModeLabel = document.createElement('label');
            multipleModeLabel.htmlFor = 'expense-is-multiple';
            multipleModeLabel.textContent = 'Múltiples Gastos';
            multipleModeLabel.style.cursor = 'pointer';
            multipleModeGroup.appendChild(multipleModeCheckbox);
            multipleModeGroup.appendChild(multipleModeLabel);
            form.appendChild(multipleModeGroup);
        }

        // --- Conditional Form Rendering ---
        if (isMultipleMode) {
            if (type === 'Único') {
                renderMultipleUniqueForm(form);
            } else {
                renderMultipleRecurrentForm(form);
            }
        } else {
            if (type === 'Único') {
                renderSingleUniqueForm(form);
            } else {
                renderSingleRecurrentForm(form);
            }
        }
    };
    
    const renderMultipleUniqueForm = (form: HTMLFormElement) => {
        const groupTitleField = createFormField('Título del Grupo de Gastos', 'text', 'expense-group-title', 'Ej: Gastos de Viaje');
        form.appendChild(groupTitleField);
    
        const itemsContainer = document.createElement('div');
        itemsContainer.id = 'multiple-items-container';
        itemsContainer.style.display = 'flex';
        itemsContainer.style.flexDirection = 'column';
        itemsContainer.style.gap = '20px';
        form.appendChild(itemsContainer);
    
        const renderItems = () => {
            // 1. Preserve values before wiping
            const values = new Map<string, string>();
            itemsContainer.querySelectorAll('input').forEach(input => {
                values.set(input.id, input.value);
            });
    
            itemsContainer.innerHTML = ''; // Wipe only the items container
    
            multipleExpenseEntries.forEach((entry, index) => {
                const itemWrapper = document.createElement('div');
                itemWrapper.className = 'frequency-details'; // Reuse style
                itemWrapper.dataset.id = String(entry.id);
    
                const itemHeader = document.createElement('div');
                itemHeader.style.display = 'flex';
                itemHeader.style.justifyContent = 'space-between';
                itemHeader.style.alignItems = 'center';
                itemHeader.style.marginBottom = '10px';
                
                const itemTitle = document.createElement('h4');
                itemTitle.textContent = `Gasto #${index + 1}`;
                itemTitle.style.margin = '0';
                itemTitle.className = 'form-label';
                itemHeader.appendChild(itemTitle);
                
                if (multipleExpenseEntries.length > 1) {
                    const removeButton = document.createElement('button');
                    removeButton.textContent = 'Quitar';
                    removeButton.type = 'button';
                    removeButton.className = 'btn btn-expense';
                    removeButton.style.padding = '2px 8px';
                    removeButton.style.fontSize = '0.8rem';
                    removeButton.onclick = () => {
                        multipleExpenseEntries = multipleExpenseEntries.filter(e => e.id !== entry.id);
                        renderItems();
                    };
                    itemHeader.appendChild(removeButton);
                }
                
                itemWrapper.appendChild(itemHeader);
                itemWrapper.appendChild(createFormField('Nombre del gasto', 'text', `expense-name-${entry.id}`));
                itemWrapper.appendChild(createFormField('Fecha', 'date', `expense-date-${entry.id}`));
                itemWrapper.appendChild(createFormField('Monto', 'number', `expense-amount-${entry.id}`, '0'));
                
                itemsContainer.appendChild(itemWrapper);
            });
    
            // 2. Restore values
            values.forEach((value, id) => {
                const input = itemsContainer.querySelector(`#${id}`) as HTMLInputElement;
                if (input) {
                    input.value = value;
                }
            });
        };
    
        const addAnotherButton = document.createElement('button');
        addAnotherButton.textContent = 'Agregar Otro Gasto';
        addAnotherButton.type = 'button';
        addAnotherButton.className = 'btn btn-option';
        addAnotherButton.style.width = '100%';
        addAnotherButton.style.marginTop = '10px';
        addAnotherButton.onclick = () => {
            multipleExpenseEntries.push({ id: Date.now() });
            renderItems();
        };
        form.appendChild(addAnotherButton);
        
        renderItems();
    };

    const renderSingleUniqueForm = (form: HTMLFormElement) => {
        const nameField = createFormField('Nombre del gasto', 'text', 'expense-name');
        const categoryField = createFormField('Categoría', 'text', 'expense-category', 'Ej: Comida, Transporte');
        const amountField = createFormField('Monto', 'number', 'expense-amount', '0');
        const dateField = createFormField('Fecha', 'date', 'expense-date');
        const descriptionField = createFormField('Descripción', 'textarea', 'expense-description');
        
        form.appendChild(nameField);
        form.appendChild(categoryField);
        form.appendChild(amountField);
        form.appendChild(dateField);
        form.appendChild(descriptionField);

        if (isEditMode && recordToEdit) {
            (nameField.querySelector('input') as HTMLInputElement).value = recordToEdit.name;
            (categoryField.querySelector('input') as HTMLInputElement).value = recordToEdit.category;
            (amountField.querySelector('input') as HTMLInputElement).value = formatCurrency(recordToEdit.amount);
            if (recordToEdit.date) (dateField.querySelector('input') as HTMLInputElement).value = recordToEdit.date;
            (descriptionField.querySelector('textarea') as HTMLTextAreaElement).value = recordToEdit.description;
        }
    };
    
    const renderSingleRecurrentForm = (form: HTMLFormElement) => {
        const nameField = createFormField('Nombre del gasto', 'text', 'expense-name');
        const categoryField = createFormField('Categoría', 'text', 'expense-category', 'Ej: Comida, Transporte');
        const descriptionField = createFormField('Descripción', 'textarea', 'expense-description');
        const installmentAmountField = createFormField('Monto de Cuota', 'number', 'expense-amount', '0');
        
        const isInfiniteGroup = document.createElement('div');
        isInfiniteGroup.className = 'form-group radio-option';
        const isInfiniteCheckbox = document.createElement('input');
        isInfiniteCheckbox.type = 'checkbox';
        isInfiniteCheckbox.id = 'expense-is-infinite';
        isInfiniteCheckbox.name = 'expense-is-infinite';
        const isInfiniteLabel = document.createElement('label');
        isInfiniteLabel.htmlFor = 'expense-is-infinite';
        isInfiniteLabel.textContent = 'Gasto Fijo (Sin Límite)';
        isInfiniteLabel.style.cursor = 'pointer';
        isInfiniteGroup.appendChild(isInfiniteCheckbox);
        isInfiniteGroup.appendChild(isInfiniteLabel);

        const totalAmountField = createFormField('Monto Total', 'number', 'expense-total-amount', '0');
        const durationField = createFormField('Duración (meses)', 'number', 'expense-duration', 'Ej: 24');
        const monthsPaidField = createFormField('Meses abonados', 'number', 'expense-months-paid', 'Ej: 3');
        
        form.appendChild(nameField);
        form.appendChild(categoryField);
        form.appendChild(installmentAmountField);
        form.appendChild(isInfiniteGroup);
        form.appendChild(totalAmountField);
        form.appendChild(durationField);
        form.appendChild(monthsPaidField);

        const toggleInfiniteFields = (isInfinite: boolean) => {
            totalAmountField.style.display = isInfinite ? 'none' : 'flex';
            durationField.style.display = isInfinite ? 'none' : 'flex';
            monthsPaidField.style.display = isInfinite ? 'none' : 'flex';
        };

        isInfiniteCheckbox.onchange = () => {
            toggleInfiniteFields(isInfiniteCheckbox.checked);
        };
        
        if (recordToEdit?.isInfinite) {
            isInfiniteCheckbox.checked = true;
        }
        toggleInfiniteFields(isInfiniteCheckbox.checked);

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
                (day1Group.querySelector('input') as HTMLInputElement).name = 'daysOfMonth';
                const day2Group = createFormField('Día 2', 'number', 'dayOfMonth2', '0');
                (day2Group.querySelector('input') as HTMLInputElement).name = 'daysOfMonth';
                detailsContainer.appendChild(day1Group);
                detailsContainer.appendChild(day2Group);
            } else if (target.value === 'Mensual') {
                const dayGroup = createFormField('Día del mes', 'number', 'dayOfMonth1', '0');
                (dayGroup.querySelector('input') as HTMLInputElement).name = 'daysOfMonth';
                detailsContainer.appendChild(dayGroup);
            }
        };
        frequencyGroup.appendChild(radioContainer);
        frequencyGroup.appendChild(detailsContainer);
        form.appendChild(frequencyGroup);
        form.appendChild(descriptionField);

        if (isEditMode && recordToEdit) {
            (nameField.querySelector('input') as HTMLInputElement).value = recordToEdit.name;
            (categoryField.querySelector('input') as HTMLInputElement).value = recordToEdit.category;
            (descriptionField.querySelector('textarea') as HTMLTextAreaElement).value = recordToEdit.description;
            (installmentAmountField.querySelector('input') as HTMLInputElement).value = formatCurrency(recordToEdit.amount);
            if (!recordToEdit.isInfinite) {
                (totalAmountField.querySelector('input') as HTMLInputElement).value = formatCurrency(recordToEdit.totalAmount);
                (durationField.querySelector('input') as HTMLInputElement).value = String(recordToEdit.durationInMonths || '');
                (monthsPaidField.querySelector('input') as HTMLInputElement).value = String(recordToEdit.installmentsPaid || '');
            }

            if (recordToEdit.recurrence) {
                const freqRadio = form.querySelector(`input[name="expense-frequency"][value="${recordToEdit.recurrence.type}"]`) as HTMLInputElement;
                if (freqRadio) {
                    freqRadio.checked = true;
                    freqRadio.dispatchEvent(new Event('change', { bubbles: true }));
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
        }
    };

    const renderMultipleRecurrentForm = (form: HTMLFormElement) => {
        const groupTitleField = createFormField('Título del Grupo de Gastos', 'text', 'expense-group-title', 'Ej: Suscripciones');
        form.appendChild(groupTitleField);
    
        const itemsContainer = document.createElement('div');
        itemsContainer.id = 'multiple-items-container';
        itemsContainer.style.display = 'flex';
        itemsContainer.style.flexDirection = 'column';
        itemsContainer.style.gap = '20px';
        form.appendChild(itemsContainer);
    
        const renderItems = () => {
            // 1. Preserve values
            const values = new Map<string, string | boolean>();
            itemsContainer.querySelectorAll('input, select').forEach(el => {
                const input = el as HTMLInputElement | HTMLSelectElement;
                if (input.type === 'checkbox' || input.type === 'radio') {
                    if ((input as HTMLInputElement).checked) {
                        values.set(input.id, true);
                    }
                } else {
                    values.set(input.id, input.value);
                }
            });
    
            itemsContainer.innerHTML = '';
    
            multipleExpenseEntries.forEach((entry, index) => {
                const itemWrapper = document.createElement('div');
                itemWrapper.className = 'frequency-details';
                itemWrapper.dataset.id = String(entry.id);
    
                const itemHeader = document.createElement('div');
                itemHeader.style.display = 'flex';
                itemHeader.style.justifyContent = 'space-between';
                itemHeader.style.alignItems = 'center';
                itemHeader.style.marginBottom = '10px';
                
                const itemTitle = document.createElement('h4');
                itemTitle.textContent = `Gasto Recurrente #${index + 1}`;
                itemTitle.style.margin = '0';
                itemTitle.className = 'form-label';
                itemHeader.appendChild(itemTitle);
    
                if (multipleExpenseEntries.length > 1) {
                    const removeButton = document.createElement('button');
                    removeButton.textContent = 'Quitar';
                    removeButton.type = 'button';
                    removeButton.className = 'btn btn-expense';
                    removeButton.style.padding = '2px 8px';
                    removeButton.style.fontSize = '0.8rem';
                    removeButton.onclick = () => {
                        multipleExpenseEntries = multipleExpenseEntries.filter(e => e.id !== entry.id);
                        renderItems();
                    };
                    itemHeader.appendChild(removeButton);
                }
    
                itemWrapper.appendChild(itemHeader);
                itemWrapper.appendChild(createFormField('Nombre del gasto', 'text', `expense-name-${entry.id}`));
                itemWrapper.appendChild(createFormField('Monto de Cuota', 'number', `expense-amount-${entry.id}`, '0'));
    
                const isInfiniteGroup = document.createElement('div');
                isInfiniteGroup.className = 'form-group radio-option';
                const isInfiniteCheckbox = document.createElement('input');
                isInfiniteCheckbox.type = 'checkbox';
                isInfiniteCheckbox.id = `expense-is-infinite-${entry.id}`;
                const isInfiniteLabel = document.createElement('label');
                isInfiniteLabel.htmlFor = `expense-is-infinite-${entry.id}`;
                isInfiniteLabel.textContent = 'Gasto Fijo (Sin Límite)';
                isInfiniteLabel.style.cursor = 'pointer';
                isInfiniteGroup.appendChild(isInfiniteCheckbox);
                isInfiniteGroup.appendChild(isInfiniteLabel);
                itemWrapper.appendChild(isInfiniteGroup);
    
                const totalAmountField = createFormField('Monto Total', 'number', `expense-total-amount-${entry.id}`, '0');
                const durationField = createFormField('Duración (meses)', 'number', `expense-duration-${entry.id}`, 'Ej: 24');
                const monthsPaidField = createFormField('Meses abonados', 'number', `expense-months-paid-${entry.id}`, 'Ej: 3');
                itemWrapper.appendChild(totalAmountField);
                itemWrapper.appendChild(durationField);
                itemWrapper.appendChild(monthsPaidField);
    
                const toggleInfiniteFields = (isInfinite: boolean) => {
                    totalAmountField.style.display = isInfinite ? 'none' : 'flex';
                    durationField.style.display = isInfinite ? 'none' : 'flex';
                    monthsPaidField.style.display = isInfinite ? 'none' : 'flex';
                };
    
                isInfiniteCheckbox.onchange = () => toggleInfiniteFields(isInfiniteCheckbox.checked);
                toggleInfiniteFields(false); // Initial state
                
                const frequencyGroup = document.createElement('div');
                frequencyGroup.className = 'form-group';
                const frequencyLabel = document.createElement('label');
                frequencyLabel.className = 'form-label';
                frequencyLabel.textContent = 'Días de pago de la cuota';
                frequencyGroup.appendChild(frequencyLabel);
                const radioContainer = document.createElement('div');
                radioContainer.className = 'radio-group-container';
                const detailsContainer = document.createElement('div');
                detailsContainer.className = 'frequency-details';
                const frequencies: RecurrenceRule['type'][] = ['Diario', 'Semanal', 'Quincenal', 'Mensual'];
                frequencies.forEach(freq => {
                    const option = document.createElement('div');
                    option.className = 'radio-option';
                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.id = `exp-freq-${freq}-${entry.id}`;
                    radio.name = `expense-frequency-${entry.id}`;
                    radio.value = freq;
                    const label = document.createElement('label');
                    label.htmlFor = `exp-freq-${freq}-${entry.id}`;
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
                        weekSelect.name = `dayOfWeek-${entry.id}`;
                        weekSelect.id = `dayOfWeek-${entry.id}`;
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
                            const dayGroup = createFormField(`Día ${i}`, 'number', `dayOfMonth${i}-${entry.id}`, '0');
                            (dayGroup.querySelector('input') as HTMLInputElement).name = `daysOfMonth-${entry.id}`;
                            detailsContainer.appendChild(dayGroup);
                        }
                    }
                };
                frequencyGroup.appendChild(radioContainer);
                frequencyGroup.appendChild(detailsContainer);
                itemWrapper.appendChild(frequencyGroup);
    
                itemsContainer.appendChild(itemWrapper);
            });
    
            // 2. Restore values
            values.forEach((value, id) => {
                const input = itemsContainer.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement;
                if (input) {
                    if (input.type === 'checkbox' || input.type === 'radio') {
                        if (value === true) {
                            (input as HTMLInputElement).checked = true;
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    } else {
                        input.value = value as string;
                    }
                }
            });
        };
    
        const addAnotherButton = document.createElement('button');
        addAnotherButton.textContent = 'Agregar Otro Gasto';
        addAnotherButton.type = 'button';
        addAnotherButton.className = 'btn btn-option';
        addAnotherButton.style.width = '100%';
        addAnotherButton.style.marginTop = '10px';
        addAnotherButton.onclick = () => {
            multipleExpenseEntries.push({ id: Date.now() });
            renderItems();
        };
        form.appendChild(addAnotherButton);
        
        renderItems();
    };


    const handleSave = async () => {
        const form = document.getElementById('register-expense-form') as HTMLFormElement;
    
        if (isMultipleMode) {
            const groupTitle = (form.querySelector('#expense-group-title') as HTMLInputElement)?.value;
            if (!groupTitle) {
                alert('Por favor, ingrese un Título para el grupo de gastos.');
                return;
            }
    
            const items: ExpenseSubItem[] = [];
            const itemWrappers = form.querySelectorAll('#multiple-items-container > div');
            let hasError = false;
    
            itemWrappers.forEach(wrapper => {
                const id = (wrapper as HTMLElement).dataset.id;
                if (!id) return;
    
                if (type === 'Único') {
                    const name = (form.querySelector(`#expense-name-${id}`) as HTMLInputElement)?.value;
                    const date = (form.querySelector(`#expense-date-${id}`) as HTMLInputElement)?.value;
                    const amountStr = (form.querySelector(`#expense-amount-${id}`) as HTMLInputElement)?.value;
                    
                    if (!name || !date || !amountStr || parseCurrency(amountStr) === 0) {
                        hasError = true;
                    } else {
                        items.push({
                            name: name,
                            amount: parseCurrency(amountStr),
                            date: date,
                        });
                    }
                } else { // Recurrente
                    const name = (form.querySelector(`#expense-name-${id}`) as HTMLInputElement)?.value;
                    const amountStr = (form.querySelector(`#expense-amount-${id}`) as HTMLInputElement)?.value;
                    const frequencyType = (form.querySelector(`input[name="expense-frequency-${id}"]:checked`) as HTMLInputElement)?.value as RecurrenceRule['type'];
                    const isInfinite = (form.querySelector(`#expense-is-infinite-${id}`) as HTMLInputElement)?.checked;

                    if (!name || !amountStr || !frequencyType) {
                        hasError = true; return;
                    }
    
                    const recurrence: RecurrenceRule = { type: frequencyType };
                    if (frequencyType === 'Semanal') {
                        recurrence.dayOfWeek = (wrapper.querySelector(`select[name="dayOfWeek-${id}"]`) as HTMLSelectElement)?.value;
                    } else if (frequencyType === 'Quincenal' || frequencyType === 'Mensual') {
                        recurrence.daysOfMonth = Array.from(wrapper.querySelectorAll(`input[name="daysOfMonth-${id}"]`))
                                                    .map(el => parseInt((el as HTMLInputElement).value, 10))
                                                    .filter(d => d > 0);
                    }
    
                    const totalAmountStr = (form.querySelector(`#expense-total-amount-${id}`) as HTMLInputElement)?.value;
                    const durationInMonthsStr = (form.querySelector(`#expense-duration-${id}`) as HTMLInputElement)?.value;
                    const monthsPaidStr = (form.querySelector(`#expense-months-paid-${id}`) as HTMLInputElement)?.value;

                    if (!isInfinite && (!totalAmountStr || !durationInMonthsStr)) {
                        hasError = true; return;
                    }

                    const duration = parseInt(durationInMonthsStr, 10);
                    const paid = parseInt(monthsPaidStr, 10);
    
                    items.push({
                        name: name,
                        amount: parseCurrency(amountStr),
                        recurrence: recurrence,
                        isInfinite: isInfinite,
                        totalAmount: isInfinite ? undefined : parseCurrency(totalAmountStr),
                        durationInMonths: isInfinite || isNaN(duration) ? undefined : duration,
                        installmentsPaid: isInfinite || isNaN(paid) ? undefined : paid,
                    });
                }
            });
    
            if (hasError) {
                alert('Por favor, complete todos los campos requeridos (nombre, monto, fecha/frecuencia) para cada gasto.');
                return;
            }
            if (items.length === 0) {
                alert('Agregue al menos un gasto válido.');
                return;
            }

            const totalAmountForGroup = items.reduce((sum, item) => sum + item.amount, 0);

            const groupRecord: ExpenseRecord = {
                id: `exp-${Date.now()}`,
                type: type,
                name: groupTitle,
                category: "Grupo",
                amount: totalAmountForGroup,
                description: `Grupo con ${items.length} gasto(s).`,
                isGroup: true,
                items: items,
            };
    
            appState.expenseRecords.unshift(groupRecord);
            showToast(`Éxito: Grupo "${groupTitle}" guardado.`);

        } else if (type === 'Único') {
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
                type: 'Único',
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
                appState.expenseRecords.unshift(newRecord);
            }
            showToast(isEditMode ? 'Éxito: Gasto actualizado' : 'Éxito: Gasto guardado');

        } else { // Recurrente
            const formData = new FormData(form);
            const name = formData.get('expense-name') as string;
            const installmentAmountStr = formData.get('expense-amount') as string;
            const frequencyType = formData.get('expense-frequency') as RecurrenceRule['type'];
            const isInfinite = (form.querySelector('#expense-is-infinite') as HTMLInputElement).checked;

            const totalAmountStr = formData.get('expense-total-amount') as string;
            const durationInMonthsStr = formData.get('expense-duration') as string;
            const monthsPaidStr = formData.get('expense-months-paid') as string;

            if (!name || !installmentAmountStr || !frequencyType) {
                alert('Por favor, complete Nombre, Monto de Cuota y Frecuencia.');
                return;
            }
            if (!isInfinite && (!totalAmountStr || !durationInMonthsStr)) {
                alert('Para un gasto con límite, debe indicar el Monto Total y la Duración.');
                return;
            }

            const recurrence: RecurrenceRule = { type: frequencyType };
            if (frequencyType === 'Semanal') {
                recurrence.dayOfWeek = formData.get('dayOfWeek') as string;
            } else if (frequencyType === 'Quincenal' || frequencyType === 'Mensual') {
                recurrence.daysOfMonth = (formData.getAll('daysOfMonth') as string[]).map(d => parseInt(d, 10)).filter(d => d > 0);
            }

            const duration = parseInt(durationInMonthsStr, 10);
            const paid = parseInt(monthsPaidStr, 10);

            const newRecord: ExpenseRecord = {
                id: recordId || `exp-${Date.now()}`,
                type: 'Recurrente',
                name: name,
                category: formData.get('expense-category') as string || 'General',
                amount: parseCurrency(installmentAmountStr),
                description: formData.get('expense-description') as string,
                recurrence: recurrence,
                isInfinite: isInfinite,
                totalAmount: isInfinite ? undefined : parseCurrency(totalAmountStr),
                durationInMonths: isInfinite || isNaN(duration) ? undefined : duration,
                installmentsPaid: isInfinite || isNaN(paid) ? undefined : paid,
            };

            if (isEditMode) {
                const index = appState.expenseRecords.findIndex(rec => rec.id === recordId);
                if (index > -1) appState.expenseRecords[index] = newRecord;
            } else {
                appState.expenseRecords.unshift(newRecord);
            }
            showToast(isEditMode ? 'Éxito: Gasto actualizado' : 'Éxito: Gasto guardado');
        }

        await saveState(appState);
        setTimeout(() => navigate('expenseList'), 100);
    };

    render(); // Initial call
};