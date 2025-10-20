import { createCard, createSimpleCard } from '../../components/common.js';
import { formatCurrency } from '../../utils/currency.js';
import { appState } from '../../state/store.js';
import { createIncomeRecordCard, createExpenseRecordCard } from '../../components/RecordCard.js';
import { IncomeRecord, ExpenseRecord } from '../../types/index.js';

type NavigateFunction = (view: string, state?: { recordType?: 'Recurrente' | 'Único', recordId?: string }) => void;

const dayNameToIndex: { [key: string]: number } = {
    'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
};

/**
 * Calculates the projected total value of records for a full given month and year.
 * This is kept for the "calculo por mes" display.
 */
const calculateProjectedMonthValue = (
    records: (IncomeRecord[] | ExpenseRecord[]),
    year: number,
    month: number // 0-11
): number => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let total = 0;

    records.forEach(record => {
        if (record.type === 'Único' && record.date) {
            const [recYear, recMonth] = record.date.split('-').map(Number);
            if (recYear === year && recMonth === month + 1) {
                total += record.amount;
            }
        } else if (record.type === 'Recurrente' && record.recurrence) {
            const isExpenseWithDuration = 'durationInMonths' in record && typeof record.durationInMonths === 'number' && record.durationInMonths > 0;
            let isCompleted = false;

            if (isExpenseWithDuration) {
                const expenseRecord = record as ExpenseRecord;
                if ((expenseRecord.installmentsPaid ?? 0) >= expenseRecord.durationInMonths!) {
                    isCompleted = true;
                }
            }

            if (!isCompleted) {
                switch (record.recurrence.type) {
                    case 'Diario':
                        total += record.amount * daysInMonth;
                        break;
                    case 'Semanal':
                        if (record.recurrence.dayOfWeek) {
                            const targetDayIndex = dayNameToIndex[record.recurrence.dayOfWeek];
                            if (targetDayIndex !== undefined) {
                                let count = 0;
                                for (let day = 1; day <= daysInMonth; day++) {
                                    const date = new Date(year, month, day);
                                    if (date.getDay() === targetDayIndex) {
                                        count++;
                                    }
                                }
                                total += record.amount * count;
                            }
                        }
                        break;
                    case 'Quincenal':
                    case 'Mensual':
                        if (record.recurrence.daysOfMonth) {
                            total += record.amount * record.recurrence.daysOfMonth.length;
                        }
                        break;
                }
            }
        }
    });

    return total;
};

/**
 * Calculates the total value of records within a specific date range using a robust, timezone-agnostic method.
 * Unique records are compared using a numeric YYYYMMDD format to avoid Date object inconsistencies.
 */
const calculateValueInDateRange = (
    records: (IncomeRecord[] | ExpenseRecord[]),
    startDate: Date,
    endDate: Date
): number => {
    let total = 0;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
        return 0; // If the start date is after the end date, no value can be accumulated.
    }

    records.forEach(record => {
        if (record.type === 'Único' && record.date) {
            // Use a robust numeric comparison (YYYYMMDD) to avoid timezone/Date object issues.
            const dateParts = record.date.split('-').map(Number);
            const recordDateNum = dateParts[0] * 10000 + dateParts[1] * 100 + dateParts[2];
            
            const startDateNum = start.getFullYear() * 10000 + (start.getMonth() + 1) * 100 + start.getDate();
            const endDateNum = end.getFullYear() * 10000 + (end.getMonth() + 1) * 100 + end.getDate();

            if (recordDateNum >= startDateNum && recordDateNum <= endDateNum) {
                total += record.amount;
            }

        } else if (record.type === 'Recurrente' && record.recurrence) {
            const isExpenseWithDuration = 'durationInMonths' in record && typeof record.durationInMonths === 'number' && record.durationInMonths > 0;
            let isCompleted = false;

            if (isExpenseWithDuration) {
                const expenseRecord = record as ExpenseRecord;
                if ((expenseRecord.installmentsPaid ?? 0) >= expenseRecord.durationInMonths!) {
                    isCompleted = true;
                }
            }

            if (!isCompleted) {
                // Iterate through each day in the range to check for recurring events
                let currentDate = new Date(start);
                while (currentDate <= end) {
                    let eventHappens = false;
                    switch (record.recurrence.type) {
                        case 'Diario':
                            eventHappens = true;
                            break;
                        case 'Semanal':
                            const targetDayIndex = dayNameToIndex[record.recurrence.dayOfWeek!];
                            if (currentDate.getDay() === targetDayIndex) {
                                eventHappens = true;
                            }
                            break;
                        case 'Quincenal':
                        case 'Mensual':
                            const dayOfMonth = currentDate.getDate();
                            if (record.recurrence.daysOfMonth?.includes(dayOfMonth)) {
                                eventHappens = true;
                            }
                            break;
                    }
                    if (eventHappens) {
                        total += record.amount;
                    }
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
        }
    });

    return total;
};


export const renderDashboardView = (container: HTMLElement, navigate: NavigateFunction) => {
    container.innerHTML = ''; // Clear previous content

    const totalSavings = appState.savingRecords.reduce((sum, record) => sum + record.amount, 0);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // --- Calculate Most Common Income Frequency ---
    const recurringIncomes = appState.incomeRecords.filter(r => r.type === 'Recurrente' && r.recurrence);
    const frequencyCounts = recurringIncomes.reduce((acc, record) => {
        const freqType = record.recurrence!.type;
        acc[freqType] = (acc[freqType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    let mostCommonFrequency: string | null = null;
    if (Object.keys(frequencyCounts).length > 0) {
        mostCommonFrequency = Object.keys(frequencyCounts).reduce((a, b) => frequencyCounts[a] > frequencyCounts[b] ? a : b);
    }
    const dominantFrequency = mostCommonFrequency || 'Mensual';

    // --- Define the current payment period based on the dominant frequency ---
    let periodStartDate: Date;
    let periodEndDate: Date;

    const today = now.getDate();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    switch (dominantFrequency) {
        case 'Semanal':
            const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
            const diff = today - (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // Get to last Monday
            periodStartDate = new Date(currentYear, currentMonth, diff);
            periodEndDate = new Date(currentYear, currentMonth, diff + 6);
            break;
        case 'Quincenal':
            // FIX: Search for quincenal records in both income AND expenses to find user-defined paydays.
            const allRecurringRecords = [...appState.incomeRecords, ...appState.expenseRecords].filter(r => r.type === 'Recurrente' && r.recurrence);
            const quincenalRecord = allRecurringRecords.find(r => r.recurrence?.type === 'Quincenal');
            const payDays = quincenalRecord?.recurrence?.daysOfMonth?.sort((a,b) => a-b) || [15, 30];

            const firstPayDay = payDays[0] || 15;
            const secondPayDay = payDays[1] || daysInCurrentMonth;

            if (today <= firstPayDay) {
                const prevMonth = new Date(currentYear, currentMonth, 0);
                const secondPayDayLastMonth = quincenalRecord?.recurrence?.daysOfMonth?.sort((a,b) => a-b)[1] || prevMonth.getDate();
                periodStartDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), secondPayDayLastMonth + 1);
                periodEndDate = new Date(currentYear, currentMonth, firstPayDay);
            } else if (today > firstPayDay && today <= secondPayDay) {
                periodStartDate = new Date(currentYear, currentMonth, firstPayDay + 1);
                periodEndDate = new Date(currentYear, currentMonth, secondPayDay);
            } else { // today is after the second payday
                periodStartDate = new Date(currentYear, currentMonth, secondPayDay + 1);
                const nextMonth = new Date(currentYear, currentMonth + 1, 1);
                const firstPayDayNextMonth = quincenalRecord?.recurrence?.daysOfMonth?.sort((a,b) => a-b)[0] || 15;
                periodEndDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), firstPayDayNextMonth);
            }
            break;
        case 'Diario':
            periodStartDate = new Date(now.setHours(0,0,0,0));
            periodEndDate = new Date(now.setHours(23,59,59,999));
            break;
        case 'Mensual':
        default:
            periodStartDate = new Date(currentYear, currentMonth, 1);
            periodEndDate = new Date(currentYear, currentMonth, daysInCurrentMonth);
            break;
    }

    // --- Calculate values for the current period ---
    const incomeInCurrentPeriod = calculateValueInDateRange(appState.incomeRecords, periodStartDate, periodEndDate);
    const expenseInCurrentPeriod = calculateValueInDateRange(appState.expenseRecords, periodStartDate, periodEndDate);
    
    // --- Calculate "Restante" (Remaining) with carry-over logic ---

    // 1. Determine the absolute start time of any record keeping.
    const allRecordIds = [...appState.incomeRecords, ...appState.expenseRecords].map(r => r.id);
    const allTimestamps = allRecordIds
        .map(id => {
            const parts = id.split('-');
            if (parts.length > 1 && !isNaN(parseInt(parts[1], 10))) {
                return parseInt(parts[1], 10);
            }
            return null;
        })
        .filter(ts => ts !== null) as number[];

    // If there are no records, startOfTime is now, and all calculations will result in 0.
    const startOfTime = allTimestamps.length > 0 ? new Date(Math.min(...allTimestamps)) : now;

    // 2. Calculate the carry-over balance from all previous periods.
    // This is the total balance from the beginning of time up to the day before the current period starts.
    const dayBeforeCurrentPeriod = new Date(periodStartDate);
    dayBeforeCurrentPeriod.setDate(dayBeforeCurrentPeriod.getDate() - 1);
    dayBeforeCurrentPeriod.setHours(23, 59, 59, 999);

    const totalIncomeBeforeCurrentPeriod = calculateValueInDateRange(appState.incomeRecords, startOfTime, dayBeforeCurrentPeriod);
    const totalExpenseBeforeCurrentPeriod = calculateValueInDateRange(appState.expenseRecords, startOfTime, dayBeforeCurrentPeriod);
    const carryOverAmount = totalIncomeBeforeCurrentPeriod - totalExpenseBeforeCurrentPeriod;

    // 3. The remaining amount is the projected balance at the end of the current period.
    const remainingAmount = carryOverAmount + incomeInCurrentPeriod - expenseInCurrentPeriod;

    // --- Monthly projected values for the secondary display ---
    const monthlyIncome = calculateProjectedMonthValue(appState.incomeRecords, currentYear, currentMonth);
    const monthlyExpense = calculateProjectedMonthValue(appState.expenseRecords, currentYear, currentMonth);
    

    // --- Manually create the income card to add the frequency label ---
    const incomeCard = document.createElement('div');
    incomeCard.className = 'card';
    incomeCard.style.cursor = 'pointer';
    incomeCard.onclick = () => navigate('incomeList');

    const incomeCardTitle = document.createElement('h2');
    incomeCardTitle.className = 'card-title';
    incomeCardTitle.textContent = 'Ingreso';

    const primaryValueWrapper = document.createElement('div');
    primaryValueWrapper.className = 'primary-value-wrapper';

    // Add frequency label FIRST if it exists
    if (mostCommonFrequency) {
        const frequencyLabelEl = document.createElement('div');
        frequencyLabelEl.className = 'frequency-label';
        frequencyLabelEl.textContent = dominantFrequency;
        primaryValueWrapper.appendChild(frequencyLabelEl);
    }
    
    // THEN add the primary value (Net Income for the period)
    const netIncomeForPeriod = incomeInCurrentPeriod - expenseInCurrentPeriod;
    const incomePrimaryValueEl = document.createElement('div');
    incomePrimaryValueEl.className = `primary-value ${netIncomeForPeriod >= 0 ? 'income' : 'expense'}`; // Green for positive, red for negative
    incomePrimaryValueEl.textContent = `$ ${formatCurrency(netIncomeForPeriod)}`;
    primaryValueWrapper.appendChild(incomePrimaryValueEl);

    incomeCard.appendChild(incomeCardTitle);
    incomeCard.appendChild(primaryValueWrapper);
    
    // --- Create Remaining Value Row ---
    const remainingWrapper = document.createElement('div');
    remainingWrapper.style.display = 'flex';
    remainingWrapper.style.justifyContent = 'center';
    remainingWrapper.style.alignItems = 'baseline';
    remainingWrapper.style.gap = '8px';
    remainingWrapper.style.marginTop = '4px';

    const remainingLabel = document.createElement('div');
    remainingLabel.className = 'label';
    remainingLabel.textContent = 'Restante';
    remainingLabel.style.marginBottom = '0';
    remainingLabel.style.textTransform = 'capitalize';

    const remainingValueEl = document.createElement('div');
    // Using 'income-record-amount' for font size/weight and 'savings' for blue color
    remainingValueEl.className = 'income-record-amount savings'; 
    remainingValueEl.textContent = `$ ${formatCurrency(remainingAmount)}`;
    
    remainingWrapper.appendChild(remainingLabel);
    remainingWrapper.appendChild(remainingValueEl);

    incomeCard.appendChild(remainingWrapper);

    // --- Create secondary value with label on the left ---
    const secondaryValueWrapper = document.createElement('div');
    secondaryValueWrapper.style.display = 'flex';
    secondaryValueWrapper.style.justifyContent = 'center';
    secondaryValueWrapper.style.alignItems = 'baseline';
    secondaryValueWrapper.style.gap = '8px';
    secondaryValueWrapper.style.marginTop = '4px';

    const secondaryLabel = document.createElement('div');
    secondaryLabel.className = 'label';
    secondaryLabel.textContent = 'calculo por mes';
    secondaryLabel.style.marginBottom = '0'; // Override default margin from .label
    secondaryLabel.style.textTransform = 'capitalize';

    const incomeSecondaryValueEl = document.createElement('div');
    incomeSecondaryValueEl.className = 'secondary-value';
    incomeSecondaryValueEl.textContent = `$ ${formatCurrency(monthlyIncome)}`;
    
    secondaryValueWrapper.appendChild(secondaryLabel);
    secondaryValueWrapper.appendChild(incomeSecondaryValueEl);

    incomeCard.appendChild(secondaryValueWrapper);


    // --- Use createCard for other cards to keep them standard ---
    const expenseCard = createCard('Gasto', `$ ${formatCurrency(expenseInCurrentPeriod)}`, 'expense', 'gasto del mes', `$ ${formatCurrency(monthlyExpense)}`);
    expenseCard.style.cursor = 'pointer';
    expenseCard.onclick = () => navigate('expenseList');

    const savingsCard = createCard('Ahorros', `$ ${formatCurrency(totalSavings)}`, 'savings', 'ahorros del mes', `$ ${formatCurrency(totalSavings)}`);
    savingsCard.style.cursor = 'pointer';
    savingsCard.onclick = () => navigate('savingsList');

    const geminiCard = createSimpleCard('Asistente Gemini');
    geminiCard.style.cursor = 'pointer';
    geminiCard.onclick = () => navigate('gemini');
    
    // --- New List Filter Card ---
    type FilterType = 'all' | 'income' | 'expense';
    let activeFilter: FilterType = 'all';

    const listFilterCard = createSimpleCard('Listado');
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'filter-container';
    buttonContainer.style.marginTop = '10px';
    
    const allFilterButton = document.createElement('button');
    allFilterButton.className = 'btn btn-filter active';
    allFilterButton.textContent = 'Todos';
    allFilterButton.dataset.type = 'all';

    const incomeFilterButton = document.createElement('button');
    incomeFilterButton.className = 'btn btn-filter';
    incomeFilterButton.textContent = 'Ingresos';
    incomeFilterButton.dataset.type = 'income';
    
    const expenseFilterButton = document.createElement('button');
    expenseFilterButton.className = 'btn btn-filter';
    expenseFilterButton.textContent = 'Gastos';
    expenseFilterButton.dataset.type = 'expense';

    buttonContainer.appendChild(allFilterButton);
    buttonContainer.appendChild(incomeFilterButton);
    buttonContainer.appendChild(expenseFilterButton);
    listFilterCard.appendChild(buttonContainer);

    const dashboardListContainer = document.createElement('div');
    dashboardListContainer.id = 'dashboard-list-container';

    const renderFilteredList = () => {
        dashboardListContainer.innerHTML = '';
        const rerender = () => {
            // Re-render the entire dashboard to update card values after a deletion
            renderDashboardView(container, navigate);
        };
    
        let recordsToRender: (IncomeRecord | ExpenseRecord)[];
    
        if (activeFilter === 'income') {
            recordsToRender = [...appState.incomeRecords].sort((a,b) => parseInt(b.id.split('-')[1]) - parseInt(a.id.split('-')[1]));
        } else if (activeFilter === 'expense') {
            recordsToRender = [...appState.expenseRecords].sort((a,b) => parseInt(b.id.split('-')[1]) - parseInt(a.id.split('-')[1]));
        } else { // 'all'
            const combined = [
                ...appState.incomeRecords,
                ...appState.expenseRecords
            ];
            combined.sort((a, b) => {
                const timeA = parseInt(a.id.split('-')[1], 10);
                const timeB = parseInt(b.id.split('-')[1], 10);
                return timeB - timeA; // Newest first
            });
            recordsToRender = combined;
        }
    
        if (recordsToRender.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-list-message';
            let message = 'No se encontraron registros.';
            if (activeFilter === 'income') message = 'No se encontraron ingresos.';
            else if (activeFilter === 'expense') message = 'No se encontraron gastos.';
            emptyMessage.textContent = message;
            dashboardListContainer.appendChild(emptyMessage);
        } else {
            recordsToRender.forEach(record => {
                let card: HTMLElement;
                // Use 'source' property to check if it's an IncomeRecord
                if ('source' in record) {
                    card = createIncomeRecordCard(record as IncomeRecord, navigate, rerender);
                } else {
                    card = createExpenseRecordCard(record as ExpenseRecord, navigate, rerender);
                }
                dashboardListContainer.appendChild(card);
            });
        }
    };
    
    const handleFilterClick = (e: MouseEvent) => {
        const clickedButton = e.currentTarget as HTMLElement;
        const filterType = clickedButton.dataset.type as FilterType;
        
        if (activeFilter !== filterType) {
            activeFilter = filterType;
            buttonContainer.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
            clickedButton.classList.add('active');
            renderFilteredList();
        }
    };

    allFilterButton.onclick = handleFilterClick;
    incomeFilterButton.onclick = handleFilterClick;
    expenseFilterButton.onclick = handleFilterClick;

    container.appendChild(incomeCard);
    container.appendChild(expenseCard);
    container.appendChild(savingsCard);
    container.appendChild(geminiCard);
    container.appendChild(listFilterCard);
    container.appendChild(dashboardListContainer);
    
    renderFilteredList(); // Initial render with 'all' filter
};