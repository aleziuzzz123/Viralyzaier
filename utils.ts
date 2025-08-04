// A robust utility to extract a readable message from any error type.
export const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
        if ('message' in error && typeof error.message === 'string') {
            // This handles standard Errors and Supabase errors
            let message = error.message;
            if ('details' in error && typeof error.details === 'string' && error.details) {
                message += ` (${error.details})`;
            }
             if ('hint' in error && typeof error.hint === 'string' && error.hint) {
                message += ` Hint: ${error.hint}`;
            }
            return message;
        }
        // Fallback for other object types to prevent "[object Object]"
        try {
            const str = JSON.stringify(error);
            if (str !== '{}') return str;
        } catch {
            // Fallback if stringify fails
        }
        return 'An unknown object error occurred. Check the console for details.';
    }
    return 'An unknown error occurred.';
};
