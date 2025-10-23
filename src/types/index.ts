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

export interface ExpenseSubItem {
    name: string;
    amount: number; // installment for recurrent, total for unique
    date?: string; // For 'Único' items
    recurrence?: RecurrenceRule; // For 'Recurrente' items
    isInfinite?: boolean;
    totalAmount?: number;
    durationInMonths?: number;
    installmentsPaid?: number;
}

export interface ExpenseRecord {
    id: string;
    type: 'Recurrente' | 'Único';
    name: string;
    category: string;
    amount: number; // For 'Único', this is the total amount. For 'Recurrente', it's the installment amount. For groups, it's the SUM.
    totalAmount?: number; // For 'Recurrente', this is the total amount of the expense.
    description: string;
    date?: string; // For 'Único'
    recurrence?: RecurrenceRule; // For 'Recurrente'
    durationInMonths?: number;
    installmentsPaid?: number;
    isInfinite?: boolean;
    isGroup?: boolean;
    items?: ExpenseSubItem[];
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
    cloudSyncFrequency?: 'Siempre' | 'Cada hora';
    currency?: string;
}

export type ArchivedRecord = (IncomeRecord | ExpenseRecord | SavingRecord) & {
    archivedAt: number;
    originalType: 'income' | 'expense' | 'saving';
};

export interface AppState {
    userProfile: UserProfile;
    incomeRecords: IncomeRecord[];
    expenseRecords: ExpenseRecord[];
    savingRecords: SavingRecord[];
    archivedRecords: ArchivedRecord[];
}