/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may a copy of the License at
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

const root = document.getElementById('root');
const mainAppTitle = document.getElementById('app-title-main');
const statsPanel = document.getElementById('stats-panel');
const mainLayout = document.querySelector('.main-layout');
const overlay = document.getElementById('overlay');


let currentView = 'dashboard';
let currentState = {};

const viewContainers = {};

const createViewContainer = (id) => {
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

const manageViews = (activeViewId) => {
    if (mainAppTitle) {
        mainAppTitle.style.display = activeViewId === 'dashboard' ? 'block' : 'none';
    }
    Object.values(viewContainers).forEach(view => {
        view.style.display = view.id === `${activeViewId}-view` ? 'flex' : 'none';
        if(view.id === `${activeViewId}-view`){
            view.style.flexDirection = 'column';
        }
    });
};

const navigateToStatsPanel = (view) => {
    if (!statsPanel) return;

    switch (view) {
        case 'statistics':
            renderStatisticsView(statsPanel, navigateToStatsPanel);
            break;
        case 'settings':
            renderSettingsView(statsPanel, navigateToStatsPanel);
            break;
        default:
            renderStatisticsView(statsPanel, navigateToStatsPanel);
    }
};

const navigateTo = (view, state = {}) => {
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
};

// --- Swipe Gesture Logic ---
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;

const handleGesture = () => {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // We only care about horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Swipe right to left (open panel)
        if (deltaX < -50) {
            mainLayout?.classList.add('stats-open');
            document.body.classList.add('no-scroll');
        }
        // Swipe left to right (close panel)
        if (deltaX > 50) {
            mainLayout?.classList.remove('stats-open');
            document.body.classList.remove('no-scroll');
            navigateTo(currentView, currentState);
        }
    }
};

document.body.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
});

document.body.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleGesture();
});

overlay?.addEventListener('click', () => {
    mainLayout?.classList.remove('stats-open');
    document.body.classList.remove('no-scroll');
    navigateTo(currentView, currentState);
});


// --- Initial App Setup ---
if (root && mainAppTitle && statsPanel) {
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
    navigateTo('dashboard');
    navigateToStatsPanel('statistics');
}