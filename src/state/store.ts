import { AppState } from '../types/index.js';

const STORAGE_KEY = 'pesoAppData';

let listeners: Array<() => void> = [];

export const subscribe = (callback: () => void) => {
    listeners.push(callback);
    // Optional: return an unsubscribe function
    return () => {
        listeners = listeners.filter(l => l !== callback);
    };
};

const notify = () => {
    listeners.forEach(callback => callback());
};

export const saveState = (state: AppState) => {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem(STORAGE_KEY, serializedState);
        notify();
    } catch (error) {
        console.error("Error saving state to localStorage", error);
    }
};

export const loadState = (): AppState => {
    try {
        const serializedState = localStorage.getItem(STORAGE_KEY);
        if (serializedState === null) {
            return { userProfile: { currency: 'USD' }, incomeRecords: [], expenseRecords: [], savingRecords: [], archivedRecords: [] }; // Return initial state if nothing is stored
        }
        const state = JSON.parse(serializedState);
        
        const userProfile = state.userProfile || {};
        if (!userProfile.currency) {
            userProfile.currency = 'USD'; // Default currency
        }

        return {
            userProfile: userProfile,
            incomeRecords: state.incomeRecords || [],
            expenseRecords: state.expenseRecords || [],
            savingRecords: state.savingRecords || [],
            archivedRecords: state.archivedRecords || [],
        };
    } catch (error) {
        console.error("Error loading state from localStorage", error);
        return { userProfile: { currency: 'USD' }, incomeRecords: [], expenseRecords: [], savingRecords: [], archivedRecords: [] }; // Return initial state on error
    }
};

export let appState: AppState = loadState();