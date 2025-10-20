import { RecurrenceRule } from '../types/index.js';

export const formatRecurrence = (recurrence: RecurrenceRule): string => {
    switch (recurrence.type) {
        case 'Diario':
            return 'Diario';
        case 'Semanal':
            return `Semanal (${recurrence.dayOfWeek})`;
        case 'Quincenal':
            return `Quincenal (Días ${recurrence.daysOfMonth?.join(' y ')})`;
        case 'Mensual':
            return `Mensual (Día ${recurrence.daysOfMonth?.[0]})`;
        default:
            return 'Recurrente';
    }
};
