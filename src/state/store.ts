import { AppState } from '../types/index.js';
import { supabaseClient } from '../services/supabase.js';

const TABLE_NAME = 'app_data';
const ROW_ID = 1;

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

export const saveState = async (state: AppState) => {
    try {
        const { error } = await supabaseClient
            .from(TABLE_NAME)
            .upsert({ id: ROW_ID, data: state }, { onConflict: 'id' });

        if (error) {
            throw error;
        }
        notify();
    } catch (error) {
        console.error("Error saving state to Supabase", error);
    }
};

const getInitialState = (): AppState => ({
    userProfile: { currency: 'USD' },
    incomeRecords: [],
    expenseRecords: [],
    savingRecords: [],
    archivedRecords: [],
});

export let appState: AppState = getInitialState();

export const initializeAppState = async () => {
    try {
        const { data, error } = await supabaseClient
            .from(TABLE_NAME)
            .select('data')
            .eq('id', ROW_ID)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: "Row not found"
            throw error;
        }

        if (data && data.data) {
            const loadedState = data.data as AppState;
            appState.userProfile = loadedState.userProfile || getInitialState().userProfile;
            appState.incomeRecords = loadedState.incomeRecords || [];
            appState.expenseRecords = loadedState.expenseRecords || [];
            appState.savingRecords = loadedState.savingRecords || [];
            appState.archivedRecords = loadedState.archivedRecords || [];
        }
        // If no data, appState already has the initial state.
        notify(); // Notify to render with loaded or initial state
    } catch (error) {
        console.error("Error loading state from Supabase", error);
        // appState will retain its initial value
    }
};