

import { AppState } from '../types/index.js';

const STORAGE_KEY = 'pesoAppData';

export const saveState = (state: AppState) => {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem(STORAGE_KEY, serializedState);
    } catch (error) {
        console.error("Error saving state to localStorage", error);
    }
};

export const loadState = (): AppState => {
    try {
        const serializedState = localStorage.getItem(STORAGE_KEY);
        if (serializedState === null) {
            return { userProfile: {}, incomeRecords: [], expenseRecords: [], savingRecords: [] }; // Return initial state if nothing is stored
        }
        const state = JSON.parse(serializedState);
        return {
            userProfile: state.userProfile || {},
            incomeRecords: state.incomeRecords || [],
            expenseRecords: state.expenseRecords || [],
            savingRecords: state.savingRecords || [],
        };
    } catch (error) {
        console.error("Error loading state from localStorage", error);
        return { userProfile: {}, incomeRecords: [], expenseRecords: [], savingRecords: [] }; // Return initial state on error
    }
};

export let appState: AppState = loadState();