export interface RecurrenceRule {
    type: 'Diario' | 'Semanal' | 'Quincenal' | 'Mensual';
    dayOfWeek?: string;
    daysOfMonth?: number[];
}

export interface Salary {
    id: string;
    name: string;
    amount: number;
    recurrence: RecurrenceRule;
}

export interface IncomeRecord {
    id: string;
    type: 'Recurrente' | 'Único';
    name: string;
    source: string;
    amount: number;
    description: string;
    date?: string; // For 'Único'
    recurrence?: RecurrenceRule; // For 'Recurrente'
    salaryId?: string;
}

export interface ExpenseRecord {
    id: string;
    type: 'Recurrente' | 'Único';
    name: string;
    category: string;
    amount: number; // For 'Único', this is the total amount. For 'Recurrente', it's the installment amount.
    totalAmount?: number; // For 'Recurrente', this is the total amount of the expense.
    description: string;
    date?: string; // For 'Único'
    recurrence?: RecurrenceRule; // For 'Recurrente'
    durationInMonths?: number;
    installmentsPaid?: number;
    isInfinite?: boolean;
}

export interface SavingRecord {
    id: string;
    type: 'Recurrente' | 'Único';
    name: string;
    amount: number;
    description: string;
    date?: string; // For 'Único'
    recurrence?: RecurrenceRule; // For 'Recurrente'
    storageType: 'Banco' | 'Personal';
    bankName?: string;
    accountType?: string;
    goalAmount?: number;
}

export interface UserProfile {
    firstName?: string;
    lastName?: string;
    salaries?: Salary[];
    cloudSyncEmail?: string;
    // FIX: Updated type literals to match values used in the settings UI, fixing type errors.
    cloudSyncFrequency?: 'Nunca' | 'Cada 6 horas' | 'Cada 24 horas' | 'Cada mes';
    currency?: string;
}

export interface AppState {
    userProfile: UserProfile;
    incomeRecords: IncomeRecord[];
    expenseRecords: ExpenseRecord[];
    savingRecords: SavingRecord[];
}