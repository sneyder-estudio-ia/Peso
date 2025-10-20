import { appState } from '../state/store.js';

export const createCalendar = (date: Date, onDateChange: (newDate: Date) => void) => {
    const calendarContainer = document.createElement('div');
    calendarContainer.className = 'calendar-container';

    const renderMonth = (currentDate: Date) => {
        calendarContainer.innerHTML = ''; // Clear previous render

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Get all records and group them by date
        const recordsByDate: { [key: string]: { income: boolean; expense: boolean } } = {};
        
        appState.incomeRecords.forEach(record => {
            if (record.date) {
                if (!recordsByDate[record.date]) recordsByDate[record.date] = { income: false, expense: false };
                recordsByDate[record.date].income = true;
            }
        });

        appState.expenseRecords.forEach(record => {
            if (record.date) {
                if (!recordsByDate[record.date]) recordsByDate[record.date] = { income: false, expense: false };
                recordsByDate[record.date].expense = true;
            }
        });


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
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        
        let startingDay = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon, ...
        if (startingDay === 0) startingDay = 7; // Sunday is 7
        startingDay -= 1; // 0=Mon, 1=Tue, ...

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
                dayCell.appendChild(dotsContainer);
            }

            grid.appendChild(dayCell);
        }

        calendarContainer.appendChild(grid);
    };

    renderMonth(date);
    return calendarContainer;
};
