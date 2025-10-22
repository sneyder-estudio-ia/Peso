/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may not use this file except in compliance with the License.
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
import { IncomeRecord, ExpenseRecord } from './src/types/index.js';
import { appState } from './src/state/store.js';
import { formatCurrency } from './src/utils/currency.js';

const root = document.getElementById('root');
const mainAppTitle = document.getElementById('app-title-main');
const statsPanel = document.getElementById('stats-panel');
const mainLayout = document.querySelector('.main-layout');
const overlay = document.getElementById('overlay');
const navPanel = document.getElementById('nav-panel');


type ViewType = 
    | 'dashboard'
    | 'incomeList'
    | 'expenseList'
    | 'savingsList'
    | 'incomeForm'
    | 'expenseForm'
    | 'savingsForm'
    | 'incomeDetails'
    | 'expenseDetails'
    | 'savingsDetails';

type StatsPanelViewType = 'statistics' | 'settings';

interface NavigationState {
    recordType?: 'Recurrente' | 'Único';
    recordId?: string;
}

let currentView: ViewType = 'dashboard';
let currentState: NavigationState = {};

const viewContainers: { [key: string]: HTMLElement } = {};

const createViewContainer = (id: string): HTMLElement => {
    const view = document.createElement('div');
    view.id = `${id}-view`;
    view.style.display = 'none';
    view.className = id.includes('dashboard') ? '' : 'card';
    if (id.includes('dashboard')){
        view.style.display = 'flex';
        view.style.flexDirection = 'column';
        view.style.gap = '20px';
        view.style.width = '100%';
    }
    root?.appendChild(view);
    viewContainers[id] = view;
    return view;
};

const manageViews = (activeViewId: string) => {
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
        if(view.id === `${activeViewId}-view`){
            view.style.flexDirection = 'column';
        }
    });
};

const dayNameToIndex: { [key: string]: number } = {
    'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
};

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
        return 0;
    }

    records.forEach(record => {
        if (record.type === 'Único' && record.date) {
            const dateParts = record.date.split('-').map(Number);
            const recordDateNum = dateParts[0] * 10000 + dateParts[1] * 100 + dateParts[2];
            
            const startDateNum = start.getFullYear() * 10000 + (start.getMonth() + 1) * 100 + start.getDate();
            const endDateNum = end.getFullYear() * 10000 + (end.getMonth() + 1) * 100 + end.getDate();

            if (recordDateNum >= startDateNum && recordDateNum <= endDateNum) {
                total += record.amount;
            }

        } else if (record.type === 'Recurrente' && record.recurrence) {
            const expenseRecord = record as ExpenseRecord;
            const isExpenseWithDuration = 'durationInMonths' in expenseRecord && typeof expenseRecord.durationInMonths === 'number' && expenseRecord.durationInMonths > 0;
            let isCompleted = false;

            if (isExpenseWithDuration && !expenseRecord.isInfinite) {
                if ((expenseRecord.installmentsPaid ?? 0) >= expenseRecord.durationInMonths!) {
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


const renderNavPanel = (panel: HTMLElement, navigate: (view: ViewType) => void) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthName = now.toLocaleString('es-ES', { month: 'long' });
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const periods = [];
    
    const salaryPayDays = appState.userProfile.salaries
        ?.flatMap(s => s.recurrence.daysOfMonth || [])
        .filter(day => day > 0 && day <= daysInMonth) || [];

    const uniquePayDays = [...new Set(salaryPayDays)].sort((a, b) => a - b);

    if (uniquePayDays.length > 0) {
        // Build periods around configured salary dates
        const splitPoints = [1, ...uniquePayDays, daysInMonth + 1];
        const uniqueSplitPoints = [...new Set(splitPoints)].sort((a, b) => a - b);

        for (let i = 0; i < uniqueSplitPoints.length - 1; i++) {
            const startDay = uniqueSplitPoints[i];
            const endDay = uniqueSplitPoints[i+1] - 1;

            if (startDay > endDay) continue;

            const p_start = new Date(currentYear, currentMonth, startDay);
            const p_end = new Date(currentYear, currentMonth, endDay);
            
            const p_income = calculateValueInDateRange(appState.incomeRecords, p_start, p_end);
            const p_expense = calculateValueInDateRange(appState.expenseRecords, p_start, p_end);
            
            periods.push({
                label: startDay === endDay ? `${startDay} de ${monthName}` : `${startDay} - ${endDay} de ${monthName}`,
                income: p_income,
                remaining: p_income - p_expense
            });
        }
    } else {
        // Fallback: If no salaries are set, show a single summary for the entire current month.
        const p_start = new Date(currentYear, currentMonth, 1);
        const p_end = new Date(currentYear, currentMonth, daysInMonth);
        const p_income = calculateValueInDateRange(appState.incomeRecords, p_start, p_end);
        const p_expense = calculateValueInDateRange(appState.expenseRecords, p_start, p_end);
        
        periods.push({
            label: `${monthName} ${currentYear}`,
            income: p_income,
            remaining: p_income - p_expense
        });
    }

    panel.innerHTML = `
        <h2 class="nav-title">Filtro</h2>
        <div class="filter-card">
            <h3 class="filter-card-title">Resumen del Mes</h3>
            ${periods.map(p => `
                <div class="period-section">
                    <div class="period-dates">${p.label}</div>
                    <div class="period-values">
                        <span class="period-income">Ingreso: ${formatCurrency(p.income, { includeSymbol: true })}</span>
                        <span class="period-remaining">Restante: ${formatCurrency(p.remaining, { includeSymbol: true })}</span>
                    </div>
                </div>
            `).join('')}
             ${uniquePayDays.length === 0 ? '<p class="empty-list-message" style="font-size: 0.9rem;">Configure salarios para un resumen detallado por períodos.</p>' : ''}
        </div>
    `;
};

const navigateToStatsPanel = (view: StatsPanelViewType) => {
    if (!statsPanel) return;

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

const navigateTo = (view: ViewType, state: NavigationState = {}) => {
    currentView = view;
    currentState = state;
    const { recordType, recordId } = state;
    
    const rerenderStats = () => {
        if (statsPanel) navigateToStatsPanel('statistics');
    };

    switch (view) {
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
            if (recordType) renderIncomeFormView(viewContainers.incomeForm, navigateTo, recordType, recordId, rerenderStats);
            break;
        case 'expenseForm':
            if (recordType) renderExpenseFormView(viewContainers.expenseForm, navigateTo, recordType, recordId, rerenderStats);
            break;
        case 'savingsForm':
            if (recordType) renderSavingsFormView(viewContainers.savingsForm, navigateTo, recordType, recordId, rerenderStats);
            break;
        case 'incomeDetails':
            if (recordId) renderIncomeDetailsView(viewContainers.incomeDetails, navigateTo, recordId);
            break;
        case 'expenseDetails':
            if (recordId) renderExpenseDetailsView(viewContainers.expenseDetails, navigateTo, recordId);
            break;
        case 'savingsDetails':
            if (recordId) renderSavingsDetailsView(viewContainers.savingsDetails, navigateTo, recordId);
            break;
    }
    manageViews(view.replace('List', '')); // Adjust for simple view IDs
    if (navPanel) {
        renderNavPanel(navPanel, navigateTo);
    }
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
            } else {
                mainLayout?.classList.add('nav-open');
                document.body.classList.add('no-scroll');
            }
        }
        // Swipe Left
        else if (deltaX < -50) {
            if (mainLayout?.classList.contains('nav-open')) {
                mainLayout.classList.remove('nav-open');
            } else {
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
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, .pie-chart-legend, .expense-details-list')) {
        touchStartX = 0;
        return;
    }
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
});

document.body.addEventListener('touchend', (e) => {
    if (touchStartX === 0) return;
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

    // Initial render
    renderNavPanel(navPanel, navigateTo);
    navigateTo('dashboard');
    navigateToStatsPanel('statistics');
}