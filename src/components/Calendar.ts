import { appState } from '../state/store.js';
import { IncomeRecord, ExpenseRecord, SavingRecord, ExpenseSubItem, RecurrenceRule } from '../types/index.js';
import { formatCurrency } from '../utils/currency.js';

// Helper to map Spanish day names to JS getDay() indices (0=Sun, 1=Mon, etc.)
const dayNameToIndex: { [key: string]: number } = {
    'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
};

// Helper function to get all records (unique and recurring) for a specific date
const getRecordsForDate = (dateString: string) => {
    const records = {
        incomes: [] as IncomeRecord[],
        expenses: [] as ExpenseRecord[],
        savings: [] as SavingRecord[],
    };

    const checkDate = new Date(dateString + 'T12:00:00'); // Use noon to avoid timezone shifts
    const dayOfMonth = checkDate.getDate();
    const dayOfWeek = checkDate.getDay();

    // Generic helper to check if a recurrence rule matches a specific date
    const isRecurringOnDate = (recurrence: RecurrenceRule, checkDayOfMonth: number, checkDayOfWeek: number) => {
        switch (recurrence.type) {
            case 'Diario':
                return true;
            case 'Semanal':
                const targetDayIndex = dayNameToIndex[recurrence.dayOfWeek!];
                return checkDayOfWeek === targetDayIndex;
            case 'Quincenal':
            case 'Mensual':
                return recurrence.daysOfMonth?.includes(checkDayOfMonth) ?? false;
            default:
                return false;
        }
    };

    // --- Process Incomes ---
    appState.incomeRecords.forEach(r => {
        if ((r.type === 'Único' && r.date === dateString) || (r.type === 'Recurrente' && r.recurrence && isRecurringOnDate(r.recurrence, dayOfMonth, dayOfWeek))) {
            records.incomes.push(r);
        }
    });

    // --- Process Savings ---
    appState.savingRecords.forEach(r => {
        if ((r.type === 'Único' && r.date === dateString) || (r.type === 'Recurrente' && r.recurrence && isRecurringOnDate(r.recurrence, dayOfMonth, dayOfWeek))) {
            records.savings.push(r);
        }
    });

    // --- Process Expenses (including groups) ---
    appState.expenseRecords.forEach(record => {
        if (record.isGroup && record.items) {
            // It's a group, so we check each sub-item
            record.items.forEach(item => {
                let itemMatches = false;
                if (record.type === 'Único' && item.date === dateString) {
                    itemMatches = true;
                } else if (record.type === 'Recurrente' && item.recurrence && isRecurringOnDate(item.recurrence, dayOfMonth, dayOfWeek)) {
                    // Check if this specific recurring item is completed
                    if (!item.isInfinite && item.durationInMonths && (item.installmentsPaid ?? 0) >= item.durationInMonths) {
                        return; // Skip this completed item
                    }
                    itemMatches = true;
                }

                if (itemMatches) {
                    // Create a synthetic record to display in the modal
                    const syntheticRecord: ExpenseRecord = {
                        id: `group-item-${Math.random()}`, // A temp id is fine as it's not interactive
                        name: item.name,
                        amount: item.amount,
                        type: record.type,
                        category: `Grupo: ${record.name}`,
                        description: record.description, // Can use group description
                        date: item.date,
                        recurrence: item.recurrence,
                    };
                    records.expenses.push(syntheticRecord);
                }
            });
        } else {
            // It's a single record, check it directly
            if ((record.type === 'Único' && record.date === dateString) || (record.type === 'Recurrente' && record.recurrence && isRecurringOnDate(record.recurrence, dayOfMonth, dayOfWeek))) {
                // Check if this recurring expense is completed
                if (record.type === 'Recurrente' && !record.isInfinite && record.durationInMonths && (record.installmentsPaid ?? 0) >= record.durationInMonths) {
                    return; // Skip completed single record
                }
                records.expenses.push(record);
            }
        }
    });
    
    return records;
};

// Creates and displays the modal with details for a given day
const openDayDetailsModal = async (dateString: string) => {
    const dailyRecords = getRecordsForDate(dateString);

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay calendar-day-modal-overlay';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content calendar-day-modal-content';
    modalContent.onclick = e => e.stopPropagation();

    const [year, month, day] = dateString.split('-');
    const modalTitle = document.createElement('h3');
    modalTitle.className = 'modal-title';
    modalTitle.textContent = `Registros del ${day}/${month}/${year}`;
    modalContent.appendChild(modalTitle);

    const createRecordListSection = (
        title: string, 
        records: (IncomeRecord | ExpenseRecord | SavingRecord)[], 
        type: 'income' | 'expense' | 'savings'
    ) => {
        const section = document.createElement('div');
        section.className = 'calendar-modal-section';
        
        const sectionTitle = document.createElement('h4');
        sectionTitle.className = 'calendar-modal-section-title';
        sectionTitle.textContent = title;
        section.appendChild(sectionTitle);

        const list = document.createElement('ul');
        list.className = 'calendar-modal-list';
        
        if (records.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'calendar-modal-empty-item';
            emptyItem.textContent = 'No hay registros este día.';
            list.appendChild(emptyItem);
        } else {
            records.forEach(record => {
                const item = document.createElement('li');
                item.className = 'calendar-modal-list-item';
                
                const mainInfo = document.createElement('div');
                mainInfo.className = 'record-main-info';
                
                const name = document.createElement('span');
                name.className = 'record-name';
                name.textContent = record.name;
                
                const amount = document.createElement('span');
                amount.className = `record-amount ${type}`;
                amount.textContent = `${type === 'expense' ? '-' : ''}${formatCurrency(record.amount, { includeSymbol: true })}`;
                
                mainInfo.appendChild(name);
                mainInfo.appendChild(amount);

                const subInfo = document.createElement('div');
                subInfo.className = 'record-sub-info';
                let subText = record.type === 'Recurrente' ? 'Recurrente' : 'Único';
                if (type === 'income') subText += ` • Fuente: ${(record as IncomeRecord).source || 'N/A'}`;
                if (type === 'expense') subText += ` • Cat: ${(record as ExpenseRecord).category || 'General'}`;
                if (type === 'savings' && (record as SavingRecord).goalAmount) subText += ` • Meta: ${formatCurrency((record as SavingRecord).goalAmount, { includeSymbol: true })}`;

                subInfo.textContent = subText;
                
                item.appendChild(mainInfo);
                item.appendChild(subInfo);
                list.appendChild(item);
            });
        }
        
        section.appendChild(list);
        return section;
    };

    modalContent.appendChild(createRecordListSection('Ingresos', dailyRecords.incomes, 'income'));
    modalContent.appendChild(createRecordListSection('Gastos', dailyRecords.expenses, 'expense'));
    modalContent.appendChild(createRecordListSection('Ahorros', dailyRecords.savings, 'savings'));

    const closeModal = () => {
        if (document.body.contains(modalOverlay)) {
            document.body.removeChild(modalOverlay);
        }
    };
    modalOverlay.onclick = closeModal;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    modalOverlay.style.display = 'flex';
};

export const createCalendar = (date: Date, onDateChange: (newDate: Date) => void) => {
    const calendarContainer = document.createElement('div');
    calendarContainer.className = 'calendar-container';

    const renderMonth = (currentDate: Date) => {
        calendarContainer.innerHTML = ''; // Clear previous render

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); // 0-11
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Object to hold which days have which type of record
        const recordsByDate: { [key: string]: { income: boolean; expense: boolean; savings: boolean } } = {};
        
        const populateRecordsByDate = () => {
            // Helper function to process both recurrent and one-time records for a given type
            const processRecords = (
                records: (IncomeRecord | ExpenseRecord | SavingRecord)[], 
                type: 'income' | 'expense' | 'savings'
            ) => {
                records.forEach(record => {
                    // Create a list of items to check. For groups, it's the sub-items. For others, it's the record itself.
                    const itemsToCheck: (IncomeRecord | ExpenseRecord | SavingRecord | ExpenseSubItem)[] = 
                        (type === 'expense' && (record as ExpenseRecord).isGroup) 
                        ? (record as ExpenseRecord).items || [] 
                        : [record];

                    itemsToCheck.forEach(item => {
                        // Process one-time records/items
                        if (record.type === 'Único' && item.date) {
                            const [recYear, recMonth] = item.date.split('-').map(Number);
                            // Check if the record is in the currently viewed month and year
                            if (recYear === year && recMonth === month + 1) {
                                if (!recordsByDate[item.date]) recordsByDate[item.date] = { income: false, expense: false, savings: false };
                                recordsByDate[item.date][type] = true;
                            }
                        }
                        // Process recurrent records/items
                        else if (record.type === 'Recurrente' && item.recurrence) {
                            // For fixed-duration expenses, check if they are completed
                            const expenseItem = item as (ExpenseRecord | ExpenseSubItem);
                            if (type === 'expense' && !expenseItem.isInfinite && expenseItem.durationInMonths && (expenseItem.installmentsPaid ?? 0) >= expenseItem.durationInMonths) {
                                return; // Skip this completed item
                            }

                            for (let day = 1; day <= daysInMonth; day++) {
                                const checkDate = new Date(year, month, day);
                                let eventHappens = false;
                                
                                switch (item.recurrence.type) {
                                    case 'Diario':
                                        eventHappens = true;
                                        break;
                                    case 'Semanal':
                                        const targetDayIndex = dayNameToIndex[item.recurrence.dayOfWeek!];
                                        if (checkDate.getDay() === targetDayIndex) {
                                            eventHappens = true;
                                        }
                                        break;
                                    case 'Quincenal':
                                    case 'Mensual':
                                        if (item.recurrence.daysOfMonth?.includes(day)) {
                                            eventHappens = true;
                                        }
                                        break;
                                }

                                if (eventHappens) {
                                    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    if (!recordsByDate[dateString]) recordsByDate[dateString] = { income: false, expense: false, savings: false };
                                    recordsByDate[dateString][type] = true;
                                }
                            }
                        }
                    });
                });
            };
            
            processRecords(appState.incomeRecords, 'income');
            processRecords(appState.expenseRecords, 'expense');
            processRecords(appState.savingRecords, 'savings');
        };
        
        populateRecordsByDate();

        // --- Header ---
        const header = document.createElement('div');
        header.className = 'calendar-header';

        const prevButton = document.createElement('button');
        prevButton.innerHTML = '&lt;';
        prevButton.className = 'calendar-nav';
        prevButton.setAttribute('aria-label', 'Mes anterior');
        prevButton.onclick = () => {
            currentDate.setMonth(month - 1);
            onDateChange(new Date(currentDate));
        };

        const monthYear = document.createElement('div');
        monthYear.className = 'calendar-month-year';
        monthYear.textContent = `${currentDate.toLocaleString('es-ES', { month: 'long' })} ${year}`;

        const nextButton = document.createElement('button');
        nextButton.innerHTML = '&gt;';
        nextButton.className = 'calendar-nav';
        nextButton.setAttribute('aria-label', 'Mes siguiente');
        nextButton.onclick = () => {
            currentDate.setMonth(month + 1);
            onDateChange(new Date(currentDate));
        };

        header.appendChild(prevButton);
        header.appendChild(monthYear);
        header.appendChild(nextButton);
        calendarContainer.appendChild(header);

        // --- Grid ---
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        // Weekday headers
        const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
        weekdays.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-weekday';
            dayHeader.textContent = day;
            grid.appendChild(dayHeader);
        });

        // Days
        const firstDayOfMonth = new Date(year, month, 1);
        
        // Calculate the number of empty cells needed before the 1st day of the month
        // getDay() is 0=Sun, 1=Mon. Our week starts on Monday.
        const startingDay = (firstDayOfMonth.getDay() + 6) % 7;

        // Empty cells for the start of the month
        for (let i = 0; i < startingDay; i++) {
            const emptyCell = document.createElement('div');
            grid.appendChild(emptyCell);
        }

        // Day cells
        const today = new Date();
        for (let i = 1; i <= daysInMonth; i++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            
            const dayNumber = document.createElement('span');
            dayNumber.textContent = String(i);
            dayCell.appendChild(dayNumber);

            if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayCell.classList.add('current-day');
            }

            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            if (recordsByDate[dateString]) {
                 const dotsContainer = document.createElement('div');
                 dotsContainer.className = 'dots-container';
                 if (recordsByDate[dateString].income) {
                     const incomeDot = document.createElement('div');
                     incomeDot.className = 'record-dot income-dot';
                     dotsContainer.appendChild(incomeDot);
                 }
                 if (recordsByDate[dateString].expense) {
                    const expenseDot = document.createElement('div');
                    expenseDot.className = 'record-dot expense-dot';
                    dotsContainer.appendChild(expenseDot);
                }
                if (recordsByDate[dateString].savings) {
                    const savingsDot = document.createElement('div');
                    savingsDot.className = 'record-dot savings-dot';
                    dotsContainer.appendChild(savingsDot);
                }
                dayCell.appendChild(dotsContainer);

                dayCell.classList.add('has-records');
                dayCell.onclick = () => openDayDetailsModal(dateString);
            }

            grid.appendChild(dayCell);
        }

        calendarContainer.appendChild(grid);
    };

    renderMonth(date);
    return calendarContainer;
};