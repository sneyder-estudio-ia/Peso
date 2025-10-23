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
import { renderDashboardView } from './src/pages/dashboard/DashboardView.js';
import { renderIncomeListView } from './src/pages/income/IncomeListView.js';
import { renderExpenseListView } from './src/pages/expenses/ExpenseListView.js';
import { renderSavingsListView } from './src/pages/savings/SavingsListView.js';
import { renderIncomeFormView } from './src/pages/income/IncomeFormView.js';
import { renderExpenseFormView } from './src/pages/expenses/ExpenseFormView.js';
import { renderSavingsFormView } from './src/pages/savings/SavingsFormView.js';
import { renderIncomeDetailsView } from './src/pages/details/IncomeDetailsView.js';
import { renderExpenseDetailsView } from './src/pages/details/ExpenseDetailsView.js';
import { renderSavingsDetailsView } from './src/pages/details/SavingsDetailsView.js';
import { renderStatisticsView } from './src/pages/statistics/StatisticsView.js';
import { renderSettingsView } from './src/pages/settings/SettingsView.js';
import { renderArchivedListView } from './src/pages/archived/ArchivedListView.js';
import { renderFinancialInfoView } from './src/pages/financialInfo/FinancialInfoView.js';
import { renderFinancialForecastView } from './src/pages/financialForecast/FinancialForecastView.js';
import { renderPolicyAndConditionsView } from './src/pages/policyAndConditions/PolicyAndConditionsView.js';
import { renderManualDeUsoView } from './src/pages/manual/ManualDeUsoView.js';
import { appState, subscribe, initializeAppState, saveState } from './src/state/store.js';
import { formatCurrency } from './src/utils/currency.js';
import { showToast } from './src/components/Toast.js';
const root = document.getElementById('root');
const mainAppTitle = document.getElementById('app-title-main');
const statsPanel = document.getElementById('stats-panel');
const mainLayout = document.querySelector('.main-layout');
const overlay = document.getElementById('overlay');
const navPanel = document.getElementById('nav-panel');
let currentView = 'dashboard';
let currentState = {};
let currentStatsPanelView = 'statistics';
const viewContainers = {};
const createViewContainer = (id) => {
    const view = document.createElement('div');
    view.id = `${id}-view`;
    view.style.display = 'none';
    view.className = id.includes('dashboard') ? '' : 'card';
    if (id.includes('dashboard')) {
        view.style.display = 'flex';
        view.style.flexDirection = 'column';
        view.style.gap = '20px';
        view.style.width = '100%';
    }
    root?.appendChild(view);
    viewContainers[id] = view;
    return view;
};
const manageViews = (activeViewId) => {
    const isDashboard = activeViewId === 'dashboard';
    if (mainAppTitle) {
        // The title is now inside a flex header, so we adjust visibility of parent.
        const header = mainAppTitle.parentElement;
        if (header) {
            // We want to hide the whole header except the button on non-dashboard views
            // But the button is only for mobile. Let's simplify and just hide the title text.
            mainAppTitle.style.display = isDashboard ? 'block' : 'none';
        }
    }
    Object.values(viewContainers).forEach(view => {
        view.style.display = view.id === `${activeViewId}-view` ? 'flex' : 'none';
        if (view.id === `${activeViewId}-view`) {
            view.style.flexDirection = 'column';
        }
    });
};
const dayNameToIndex = {
    'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
};
const calculateValueInDateRange = (records, startDate, endDate) => {
    let total = 0;
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (start > end) {
        return 0;
    }
    records.forEach(record => {
        if (record.isGroup && record.items) {
            record.items.forEach(item => {
                // Logic for unique items in a group
                if (record.type === 'Único' && item.date) {
                    const dateParts = item.date.split('-').map(Number);
                    const recordDateNum = dateParts[0] * 10000 + dateParts[1] * 100 + dateParts[2];
                    const startDateNum = start.getFullYear() * 10000 + (start.getMonth() + 1) * 100 + start.getDate();
                    const endDateNum = end.getFullYear() * 10000 + (end.getMonth() + 1) * 100 + end.getDate();
                    if (recordDateNum >= startDateNum && recordDateNum <= endDateNum) {
                        total += item.amount;
                    }
                }
                // Logic for recurrent items in a group
                else if (record.type === 'Recurrente' && item.recurrence) {
                    const isItemWithDuration = 'durationInMonths' in item && typeof item.durationInMonths === 'number' && item.durationInMonths > 0;
                    let isCompleted = false;
                    if (isItemWithDuration && !item.isInfinite) {
                        if ((item.installmentsPaid ?? 0) >= item.durationInMonths) {
                            isCompleted = true;
                        }
                    }
                    if (!isCompleted) {
                        let currentDate = new Date(start);
                        while (currentDate <= end) {
                            let eventHappens = false;
                            switch (item.recurrence.type) {
                                case 'Diario':
                                    eventHappens = true;
                                    break;
                                case 'Semanal':
                                    const targetDayIndex = dayNameToIndex[item.recurrence.dayOfWeek];
                                    if (currentDate.getDay() === targetDayIndex)
                                        eventHappens = true;
                                    break;
                                case 'Quincenal':
                                case 'Mensual':
                                    const dayOfMonth = currentDate.getDate();
                                    if (item.recurrence.daysOfMonth?.includes(dayOfMonth))
                                        eventHappens = true;
                                    break;
                            }
                            if (eventHappens)
                                total += item.amount;
                            currentDate.setDate(currentDate.getDate() + 1);
                        }
                    }
                }
            });
        }
        else {
            if (record.type === 'Único' && record.date) {
                const dateParts = record.date.split('-').map(Number);
                const recordDateNum = dateParts[0] * 10000 + dateParts[1] * 100 + dateParts[2];
                const startDateNum = start.getFullYear() * 10000 + (start.getMonth() + 1) * 100 + start.getDate();
                const endDateNum = end.getFullYear() * 10000 + (end.getMonth() + 1) * 100 + end.getDate();
                if (recordDateNum >= startDateNum && recordDateNum <= endDateNum) {
                    total += record.amount;
                }
            }
            else if (record.type === 'Recurrente' && record.recurrence) {
                const expenseRecord = record;
                const isExpenseWithDuration = 'durationInMonths' in expenseRecord && typeof expenseRecord.durationInMonths === 'number' && expenseRecord.durationInMonths > 0;
                let isCompleted = false;
                if (isExpenseWithDuration && !expenseRecord.isInfinite) {
                    if ((expenseRecord.installmentsPaid ?? 0) >= expenseRecord.durationInMonths) {
                        isCompleted = true;
                    }
                }
                if (!isCompleted) {
                    let currentDate = new Date(start);
                    while (currentDate <= end) {
                        let eventHappens = false;
                        switch (record.recurrence.type) {
                            case 'Diario':
                                eventHappens = true;
                                break;
                            case 'Semanal':
                                const targetDayIndex = dayNameToIndex[record.recurrence.dayOfWeek];
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
        }
    });
    return total;
};
const renderNavPanel = (panel, navigate) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthName = (date) => date.toLocaleString('es-ES', { month: 'long' });
    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getPayDaysForMonth = (year, month) => {
        const payDays = [];
        const monthDays = daysInMonth(year, month);
        const salaries = appState.userProfile.salaries || [];
        salaries.forEach(salary => {
            const { recurrence } = salary;
            if (!recurrence)
                return;
            switch (recurrence.type) {
                case 'Semanal':
                    if (recurrence.dayOfWeek) {
                        const targetDayIndex = dayNameToIndex[recurrence.dayOfWeek];
                        if (targetDayIndex !== undefined) {
                            for (let day = 1; day <= monthDays; day++) {
                                const date = new Date(year, month, day);
                                if (date.getDay() === targetDayIndex) {
                                    payDays.push(day);
                                }
                            }
                        }
                    }
                    break;
                case 'Quincenal':
                case 'Mensual':
                    if (recurrence.daysOfMonth) {
                        recurrence.daysOfMonth.forEach(day => {
                            if (day > 0 && day <= monthDays) {
                                payDays.push(day);
                            }
                        });
                    }
                    break;
                case 'Diario':
                default: break;
            }
        });
        return [...new Set(payDays)].sort((a, b) => a - b);
    };
    const currentMonthPayDays = getPayDaysForMonth(currentYear, currentMonth);
    const periods = [];
    if (currentMonthPayDays.length > 0) {
        const allPayDaysAsDates = [];
        currentMonthPayDays.forEach(day => allPayDaysAsDates.push(new Date(currentYear, currentMonth, day)));
        const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
        const nextMonthPayDays = getPayDaysForMonth(nextMonthDate.getFullYear(), nextMonthDate.getMonth());
        if (nextMonthPayDays.length > 0) {
            allPayDaysAsDates.push(new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), nextMonthPayDays[0]));
        }
        else if (currentMonthPayDays.length > 0) {
            allPayDaysAsDates.push(new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), currentMonthPayDays[0]));
        }
        for (let i = 0; i < currentMonthPayDays.length; i++) {
            const p_start = new Date(currentYear, currentMonth, currentMonthPayDays[i]);
            const nextPayDayDate = allPayDaysAsDates.find(d => d.getTime() > p_start.getTime());
            if (!nextPayDayDate)
                continue;
            const p_end = new Date(nextPayDayDate);
            p_end.setDate(p_end.getDate() - 1);
            const p_income = calculateValueInDateRange(appState.incomeRecords, p_start, p_end);
            if (p_income > 0) {
                const p_expense = calculateValueInDateRange(appState.expenseRecords, p_start, p_end);
                const startDay = p_start.getDate();
                const startMonthName = monthName(p_start);
                const endDay = p_end.getDate();
                const endMonthName = monthName(p_end);
                let label = '';
                if (startMonthName === endMonthName) {
                    label = `${startDay} - ${endDay} de ${startMonthName}`;
                }
                else {
                    label = `${startDay} de ${startMonthName} - ${endDay} de ${endMonthName}`;
                }
                periods.push({
                    label: label,
                    income: p_income,
                    remaining: p_income - p_expense
                });
            }
        }
    }
    else {
        // Fallback: If no salaries are set, or only daily salaries, show a single summary for the entire current month.
        const p_start = new Date(currentYear, currentMonth, 1);
        const p_end = new Date(currentYear, currentMonth, daysInMonth(currentYear, currentMonth));
        const p_income = calculateValueInDateRange(appState.incomeRecords, p_start, p_end);
        const p_expense = calculateValueInDateRange(appState.expenseRecords, p_start, p_end);
        periods.push({
            label: `${monthName(now)} ${currentYear}`,
            income: p_income,
            remaining: p_income - p_expense
        });
    }
    panel.innerHTML = `
        <div class="nav-panel-content">
            <h2 class="nav-title">Filtro</h2>
            <div class="filter-card">
                <h3 class="filter-card-title">Resumen del Mes</h3>
                ${periods.map(p => {
        const percentage = p.income > 0 ? Math.max(0, (p.remaining / p.income) * 100) : 0;
        return `
                    <div class="period-section">
                        <div class="period-dates">${p.label}</div>
                        <div class="period-values">
                            <span class="period-income">Ingreso: ${formatCurrency(p.income, { includeSymbol: true })}</span>
                            <span class="period-remaining">Restante: ${formatCurrency(p.remaining, { includeSymbol: true })}</span>
                        </div>
                        <div class="period-progress-container">
                            <div class="period-progress-fill" style="width: ${percentage}%;"></div>
                            <span class="period-percentage">${Math.round(percentage)}%</span>
                        </div>
                    </div>
                `;
    }).join('')}
                ${currentMonthPayDays.length === 0 ? '<p class="empty-list-message" style="font-size: 0.9rem;">Configure salarios (semanal, quincenal, mensual) para un resumen detallado por períodos.</p>' : ''}
                ${currentMonthPayDays.length > 0 && periods.length === 0 ? '<p class="empty-list-message" style="font-size: 0.9rem;">No hay ingresos para los períodos de pago actuales.</p>' : ''}
            </div>
            <div class="filter-card nav-button-card" id="nav-financial-info-card">
                <h3 class="filter-card-title">Información Financiera</h3>
                <span class="nav-button-arrow">&rarr;</span>
            </div>
            <div class="filter-card nav-button-card" id="nav-archived-card">
                <h3 class="filter-card-title">Papelera de Reciclaje</h3>
                <span class="nav-button-arrow">&rarr;</span>
            </div>
            <div class="filter-card nav-button-card" id="nav-policy-card">
                <h3 class="filter-card-title">Politica y Condision</h3>
                <span class="nav-button-arrow">&rarr;</span>
            </div>
            <div class="filter-card nav-button-card" id="nav-manual-card">
                <h3 class="filter-card-title">Manual de Uso</h3>
                <span class="nav-button-arrow">&rarr;</span>
            </div>
        </div>
        <div class="nav-panel-footer">
            <hr style="border: none; height: 1px; background-color: #30363d; margin: 0 0 20px 0;">
            <div style="text-align: center;">
                <img src="https://i.postimg.cc/mDgqGyw3/Picsart-25-03-28-04-00-43-410.png" alt="Sneyder Estudio Logo" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 10px;">
                <h4 style="margin: 5px 0; color: #c9d1d9; font-weight: 600;">Sneyder Estudio</h4>
                <p style="margin: 5px 0; font-size: 0.8rem; color: #8b949e;">sneyderestudio@gmail.com</p>
                <a href="https://wa.me/50672712037" target="_blank" rel="noopener noreferrer" class="btn btn-income" style="width: 100%; margin-top: 10px; text-decoration: none; box-sizing: border-box;">
                    Contactar por WhatsApp
                </a>
                <p style="margin: 15px 0 0; font-size: 0.8rem; color: #8b949e; font-style: italic;">Hacemos apps y webs a tu medida. ¡Contáctanos!</p>
            </div>
        </div>
    `;
    const financialInfoCard = panel.querySelector('#nav-financial-info-card');
    financialInfoCard?.addEventListener('click', () => {
        navigate('financialInfo');
        mainLayout?.classList.remove('nav-open');
        document.body.classList.remove('no-scroll');
    });
    const archivedCard = panel.querySelector('#nav-archived-card');
    archivedCard?.addEventListener('click', () => {
        navigate('archivedList');
        mainLayout?.classList.remove('nav-open');
        document.body.classList.remove('no-scroll');
    });
    const policyCard = panel.querySelector('#nav-policy-card');
    policyCard?.addEventListener('click', () => {
        navigate('policyAndConditions');
        mainLayout?.classList.remove('nav-open');
        document.body.classList.remove('no-scroll');
    });
    const manualCard = panel.querySelector('#nav-manual-card');
    manualCard?.addEventListener('click', () => {
        navigate('manualDeUso');
        mainLayout?.classList.remove('nav-open');
        document.body.classList.remove('no-scroll');
    });
};
const navigateToStatsPanel = (view) => {
    currentStatsPanelView = view;
    if (!statsPanel)
        return;
    switch (view) {
        case 'statistics':
            renderStatisticsView(statsPanel, navigateToStatsPanel);
            break;
        case 'settings':
            renderSettingsView(statsPanel, navigateToStatsPanel, navigateTo);
            break;
        default:
            renderStatisticsView(statsPanel, navigateToStatsPanel);
    }
};
const renderCurrentView = () => {
    const { recordType, recordId } = currentState;
    switch (currentView) {
        case 'dashboard':
            renderDashboardView(viewContainers.dashboard, navigateTo);
            break;
        case 'incomeList':
            renderIncomeListView(viewContainers.income, navigateTo);
            break;
        case 'expenseList':
            renderExpenseListView(viewContainers.expense, navigateTo);
            break;
        case 'savingsList':
            renderSavingsListView(viewContainers.savings, navigateTo);
            break;
        case 'incomeForm':
            if (recordType)
                renderIncomeFormView(viewContainers.incomeForm, navigateTo, recordType, recordId);
            break;
        case 'expenseForm':
            if (recordType)
                renderExpenseFormView(viewContainers.expenseForm, navigateTo, recordType, recordId);
            break;
        case 'savingsForm':
            if (recordType)
                renderSavingsFormView(viewContainers.savingsForm, navigateTo, recordType, recordId);
            break;
        case 'incomeDetails':
            if (recordId)
                renderIncomeDetailsView(viewContainers.incomeDetails, navigateTo, recordId);
            break;
        case 'expenseDetails':
            if (recordId)
                renderExpenseDetailsView(viewContainers.expenseDetails, navigateTo, recordId);
            break;
        case 'savingsDetails':
            if (recordId)
                renderSavingsDetailsView(viewContainers.savingsDetails, navigateTo, recordId);
            break;
        case 'archivedList':
            renderArchivedListView(viewContainers.archived, navigateTo);
            break;
        case 'financialInfo':
            renderFinancialInfoView(viewContainers.financialInfo, navigateTo);
            break;
        case 'financialForecast':
            renderFinancialForecastView(viewContainers.financialForecast, navigateTo);
            break;
        case 'policyAndConditions':
            renderPolicyAndConditionsView(viewContainers.policyAndConditions, navigateTo);
            break;
        case 'manualDeUso':
            renderManualDeUsoView(viewContainers.manualDeUso, navigateTo);
            break;
    }
};
const navigateTo = (view, state = {}) => {
    currentView = view;
    currentState = state;
    renderCurrentView();
    manageViews(view.replace('List', '')); // Adjust for simple view IDs
};
// --- Swipe Gesture Logic ---
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;
const handleGesture = () => {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        // Swipe Right
        if (deltaX > 50) {
            if (mainLayout?.classList.contains('stats-open')) {
                mainLayout.classList.remove('stats-open');
            }
            else {
                mainLayout?.classList.add('nav-open');
                document.body.classList.add('no-scroll');
            }
        }
        // Swipe Left
        else if (deltaX < -50) {
            if (mainLayout?.classList.contains('nav-open')) {
                mainLayout.classList.remove('nav-open');
            }
            else {
                mainLayout?.classList.add('stats-open');
                document.body.classList.add('no-scroll');
            }
        }
        if (!mainLayout?.classList.contains('stats-open') && !mainLayout?.classList.contains('nav-open')) {
            document.body.classList.remove('no-scroll');
        }
    }
};
document.body.addEventListener('touchstart', (e) => {
    const target = e.target;
    if (target.closest('input, textarea, select, .pie-chart-legend, .expense-details-list')) {
        touchStartX = 0;
        return;
    }
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
});
document.body.addEventListener('touchend', (e) => {
    if (touchStartX === 0)
        return;
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleGesture();
    touchStartX = 0;
});
overlay?.addEventListener('click', () => {
    mainLayout?.classList.remove('stats-open');
    mainLayout?.classList.remove('nav-open');
    document.body.classList.remove('no-scroll');
});
// --- Initial App Setup ---
async function main() {
    await initializeAppState();
    const archiveOldUniqueRecords = async () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Compare against the start of today
        const expenseRecordsToArchive = [];
        const remainingExpenseRecords = [];
        const incomeRecordsToArchive = [];
        const remainingIncomeRecords = [];
        let stateChanged = false;
        const getPayDaysForMonth = (year, month) => {
            const payDays = [];
            const monthDays = new Date(year, month + 1, 0).getDate();
            const salaries = appState.userProfile.salaries || [];
            salaries.forEach(salary => {
                const { recurrence } = salary;
                if (!recurrence)
                    return;
                switch (recurrence.type) {
                    case 'Semanal':
                        if (recurrence.dayOfWeek) {
                            const targetDayIndex = dayNameToIndex[recurrence.dayOfWeek];
                            if (targetDayIndex !== undefined) {
                                for (let day = 1; day <= monthDays; day++) {
                                    const date = new Date(year, month, day);
                                    if (date.getDay() === targetDayIndex)
                                        payDays.push(day);
                                }
                            }
                        }
                        break;
                    case 'Quincenal':
                    case 'Mensual':
                        if (recurrence.daysOfMonth) {
                            recurrence.daysOfMonth.forEach(day => { if (day > 0 && day <= monthDays)
                                payDays.push(day); });
                        }
                        break;
                    case 'Diario':
                    default: break;
                }
            });
            return [...new Set(payDays)].sort((a, b) => a - b);
        };
        const getPeriodForDate = (dateToCheck) => {
            const year = dateToCheck.getFullYear();
            const month = dateToCheck.getMonth();
            const monthPayDays = getPayDaysForMonth(year, month);
            if (monthPayDays.length === 0) { // Fallback to monthly period if no salaries are set
                const start = new Date(year, month, 1);
                const end = new Date(year, month + 1, 0);
                end.setHours(23, 59, 59, 999);
                return { start, end };
            }
            const allPayDaysAsDates = [];
            // Check previous, current, and next month to find surrounding paydays
            for (let m = -1; m <= 1; m++) {
                const d = new Date(year, month + m, 1);
                getPayDaysForMonth(d.getFullYear(), d.getMonth()).forEach(day => {
                    allPayDaysAsDates.push(new Date(d.getFullYear(), d.getMonth(), day));
                });
            }
            allPayDaysAsDates.sort((a, b) => a.getTime() - b.getTime());
            const periodStartDate = [...allPayDaysAsDates].filter(d => d <= dateToCheck).pop();
            if (!periodStartDate)
                return null;
            const nextPayDay = allPayDaysAsDates.find(d => d > periodStartDate);
            if (!nextPayDay)
                return null;
            const periodEndDate = new Date(nextPayDay);
            periodEndDate.setDate(periodEndDate.getDate() - 1);
            periodEndDate.setHours(23, 59, 59, 999);
            return { start: periodStartDate, end: periodEndDate };
        };
        // --- Process Expenses ---
        for (const record of appState.expenseRecords) {
            if (record.type === 'Único' && !record.isGroup && record.date) {
                const expenseDate = new Date(record.date + 'T12:00:00');
                if (expenseDate < now) {
                    const period = getPeriodForDate(expenseDate);
                    if (period && period.end < now) {
                        expenseRecordsToArchive.push(record);
                        stateChanged = true;
                    }
                    else {
                        remainingExpenseRecords.push(record);
                    }
                }
                else {
                    remainingExpenseRecords.push(record);
                }
            }
            else if (record.type === 'Único' && record.isGroup && record.items) {
                const remainingItems = [];
                let totalAmountOfRemainingItems = 0;
                for (const item of record.items) {
                    if (item.date) {
                        const itemDate = new Date(item.date + 'T12:00:00');
                        if (itemDate < now) {
                            const period = getPeriodForDate(itemDate);
                            if (period && period.end < now) {
                                const syntheticRecord = {
                                    id: `exp-archived-${Date.now()}-${Math.random()}`,
                                    type: 'Único',
                                    name: item.name,
                                    category: `Grupo: ${record.name}`,
                                    amount: item.amount,
                                    date: item.date,
                                    description: record.description || `Gasto del grupo '${record.name}'`
                                };
                                expenseRecordsToArchive.push(syntheticRecord);
                                stateChanged = true;
                            }
                            else {
                                remainingItems.push(item);
                                totalAmountOfRemainingItems += item.amount;
                            }
                        }
                        else {
                            remainingItems.push(item);
                            totalAmountOfRemainingItems += item.amount;
                        }
                    }
                    else {
                        remainingItems.push(item);
                        totalAmountOfRemainingItems += item.amount;
                    }
                }
                if (remainingItems.length > 0) {
                    if (remainingItems.length < record.items.length) {
                        record.items = remainingItems;
                        record.amount = totalAmountOfRemainingItems;
                        stateChanged = true;
                    }
                    remainingExpenseRecords.push(record);
                }
                else {
                    stateChanged = true; // The group is now empty and will be removed.
                }
            }
            else {
                remainingExpenseRecords.push(record);
            }
        }
        // --- Process Incomes ---
        for (const record of appState.incomeRecords) {
            if (record.type === 'Único' && record.date) {
                const incomeDate = new Date(record.date + 'T12:00:00');
                if (incomeDate < now) {
                    const period = getPeriodForDate(incomeDate);
                    if (period && period.end < now) {
                        incomeRecordsToArchive.push(record);
                        stateChanged = true;
                    }
                    else {
                        remainingIncomeRecords.push(record);
                    }
                }
                else {
                    remainingIncomeRecords.push(record);
                }
            }
            else {
                remainingIncomeRecords.push(record);
            }
        }
        if (stateChanged) {
            appState.expenseRecords = remainingExpenseRecords;
            appState.incomeRecords = remainingIncomeRecords;
            expenseRecordsToArchive.forEach(recordToArchive => {
                appState.archivedRecords.push({
                    ...recordToArchive,
                    archivedAt: Date.now(),
                    originalType: 'expense'
                });
            });
            incomeRecordsToArchive.forEach(recordToArchive => {
                appState.archivedRecords.push({
                    ...recordToArchive,
                    archivedAt: Date.now(),
                    originalType: 'income'
                });
            });
            await saveState(appState);
            const totalArchived = expenseRecordsToArchive.length + incomeRecordsToArchive.length;
            if (totalArchived > 0) {
                showToast(`${totalArchived} registro(s) antiguo(s) ha(n) sido archivado(s).`);
            }
        }
    };
    await archiveOldUniqueRecords();
    if (root && mainAppTitle && statsPanel && navPanel) {
        // Create all view containers on startup
        createViewContainer('dashboard');
        createViewContainer('income');
        createViewContainer('expense');
        createViewContainer('savings');
        createViewContainer('incomeForm');
        createViewContainer('expenseForm');
        createViewContainer('savingsForm');
        createViewContainer('incomeDetails');
        createViewContainer('expenseDetails');
        createViewContainer('savingsDetails');
        createViewContainer('archived');
        createViewContainer('financialInfo');
        createViewContainer('financialForecast');
        createViewContainer('policyAndConditions');
        createViewContainer('manualDeUso');
        // Subscription to automatically refresh UI on state changes
        subscribe(() => {
            if (navPanel)
                renderNavPanel(navPanel, navigateTo);
            navigateToStatsPanel(currentStatsPanelView);
            renderCurrentView();
        });
        // Initial render
        renderNavPanel(navPanel, navigateTo);
        navigateTo('dashboard');
        navigateToStatsPanel('statistics');
    }
}
main().catch(console.error);