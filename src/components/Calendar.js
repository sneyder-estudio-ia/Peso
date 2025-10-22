import { appState } from '../state/store.js';

// Helper to map Spanish day names to JS getDay() indices (0=Sun, 1=Mon, etc.)
const dayNameToIndex = {
    'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
};

export const createCalendar = (date, onDateChange) => {
    const calendarContainer = document.createElement('div');
    calendarContainer.className = 'calendar-container';

    const renderMonth = (currentDate) => {
        calendarContainer.innerHTML = ''; // Clear previous render

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); // 0-11
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Object to hold which days have which type of record
        const recordsByDate = {};
        
        const populateRecordsByDate = () => {
            // Helper function to process both recurrent and one-time records for a given type
            const processRecords = (
                records, 
                type
            ) => {
                records.forEach(record => {
                    // Process one-time records
                    if (record.type === 'Único' && record.date) {
                        const [recYear, recMonth] = record.date.split('-').map(Number);
                        // Check if the record is in the currently viewed month and year
                        if (recYear === year && recMonth === month + 1) {
                            if (!recordsByDate[record.date]) recordsByDate[record.date] = { income: false, expense: false, savings: false };
                            recordsByDate[record.date][type] = true;
                        }
                    }
                    // Process recurrent records
                    else if (record.type === 'Recurrente' && record.recurrence) {
                        // For fixed-duration expenses, check if they are completed
                        const expenseRecord = record;
                        if (type === 'expense' && !expenseRecord.isInfinite && expenseRecord.durationInMonths && (expenseRecord.installmentsPaid ?? 0) >= expenseRecord.durationInMonths) {
                            return; // Skip completed expenses
                        }

                        for (let day = 1; day <= daysInMonth; day++) {
                            const checkDate = new Date(year, month, day);
                            let eventHappens = false;
                            
                            switch (record.recurrence.type) {
                                case 'Diario':
                                    eventHappens = true;
                                    break;
                                case 'Semanal':
                                    const targetDayIndex = dayNameToIndex[record.recurrence.dayOfWeek];
                                    if (checkDate.getDay() === targetDayIndex) {
                                        eventHappens = true;
                                    }
                                    break;
                                case 'Quincenal':
                                case 'Mensual':
                                    if (record.recurrence.daysOfMonth?.includes(day)) {
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
            }

            grid.appendChild(dayCell);
        }

        calendarContainer.appendChild(grid);
    };

    renderMonth(date);
    return calendarContainer;
};
