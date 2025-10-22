const STORAGE_KEY = 'pesoAppData';

export const saveState = (state) => {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem(STORAGE_KEY, serializedState);
    } catch (error) {
        console.error("Error saving state to localStorage", error);
    }
};

export const loadState = () => {
    try {
        const serializedState = localStorage.getItem(STORAGE_KEY);
        if (serializedState === null) {
            return { userProfile: { currency: 'USD' }, incomeRecords: [], expenseRecords: [], savingRecords: [] }; // Return initial state if nothing is stored
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
        };
    } catch (error) {
        console.error("Error loading state from localStorage", error);
        return { userProfile: { currency: 'USD' }, incomeRecords: [], expenseRecords: [], savingRecords: [] }; // Return initial state on error
    }
};

export let appState = loadState();