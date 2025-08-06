// A robust utility to extract a readable message from any error type.
export const getErrorMessage = (error: unknown): string => {
    // Start with a fallback message
    let message = 'An unknown error occurred.';

    if (error instanceof Error) {
        // Standard JavaScript errors, including Supabase errors
        message = error.message;
    } else if (typeof error === 'string' && error.length > 0) {
        // Plain string errors
        message = error;
    } else if (error && typeof error === 'object') {
        // Handles other objects with a 'message' property
        if ('message' in error && typeof (error as any).message === 'string' && (error as any).message) {
            message = (error as any).message;
        } else {
            // If no message property, try to stringify
            try {
                const str = JSON.stringify(error);
                if (str !== '{}') {
                    message = str;
                }
            } catch {
                // Ignore stringify errors, fallback message will be used
            }
        }
    }
    
    // Append extra Supabase details if they exist on the object
    if (error && typeof error === 'object') {
        if ('details' in error && typeof (error as any).details === 'string' && (error as any).details) {
            message += ` (${(error as any).details})`;
        }
        if ('hint' in error && typeof (error as any).hint === 'string' && (error as any).hint) {
            message += ` Hint: ${(error as any).hint}`;
        }
    }

    // Final sanity check to prevent "[object Object]"
    if (message === '[object Object]') {
        return 'An unknown object error occurred. Please check the console for details.';
    }

    return message;
};
