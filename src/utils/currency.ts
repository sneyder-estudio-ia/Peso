export const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
        return '0';
    }
    // Format using Spanish locale which uses '.' for thousands and ',' for decimals.
    return new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
    }).format(value);
};

export const parseCurrency = (value: string | undefined | null): number => {
    if (!value) return 0;
    // For es-ES locale, '.' is thousand separator and ',' is decimal.
    // We convert it to a standard format for parseFloat ('.' as decimal separator).
    const sanitized = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(sanitized) || 0;
};

export const handleNumericInputFormatting = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const cursorStart = input.selectionStart;
    const originalValue = input.value;
    const originalLength = originalValue.length;

    // Remove non-numeric characters except for one comma
    let sanitized = originalValue.replace(/[^0-9,]/g, '');
    const firstComma = sanitized.indexOf(',');
    if (firstComma !== -1) {
        const afterComma = sanitized.substring(firstComma + 1).replace(/,/g, '');
        sanitized = sanitized.substring(0, firstComma + 1) + afterComma;
    }

    const parts = sanitized.split(',');
    let integerPart = parts[0].replace(/\./g, ''); // Remove existing dots before re-formatting
    const decimalPart = parts[1];

    // Format integer part with dots
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    let formattedValue = integerPart;
    if (decimalPart !== undefined) {
        formattedValue += ',' + decimalPart.substring(0, 3); // Limit decimals
    }

    if (input.value !== formattedValue) {
        input.value = formattedValue;
        
        if (cursorStart !== null) {
            const newLength = formattedValue.length;
            const diff = newLength - originalLength;
            const newCursorPos = cursorStart + diff;
            if (newCursorPos >= 0) {
                 input.setSelectionRange(newCursorPos, newCursorPos);
            }
        }
    }
};
