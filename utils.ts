// A robust utility to extract a readable message from any error type.
export const getErrorMessage = (error: unknown): string => {
    // Default fallback message
    const fallbackMessage = 'An unknown error occurred. Please check the console for details.';

    if (!error) {
        return fallbackMessage;
    }

    // Handle Supabase/Postgrest errors (which are objects, not Error instances)
    if (typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        const err = error as { message: string; details?: string; hint?: string };
        let fullMessage = err.message;
        if (err.details) {
            fullMessage += ` Details: ${err.details}`;
        }
        if (err.hint) {
            fullMessage += ` Hint: ${err.hint}`;
        }
        return fullMessage;
    }

    // Handle standard JavaScript Error objects
    if (error instanceof Error) {
        return error.message;
    }

    // Handle strings
    if (typeof error === 'string' && error.length > 0) {
        return error;
    }
    
    // As a last resort, try to stringify the object
    try {
        const str = JSON.stringify(error);
        if (str !== '{}') {
            return str;
        }
    } catch {
        // Fall through to the default fallback if stringify fails
    }

    return fallbackMessage;
};

// Converts a base64 string to a Blob object, which is safer for uploads.
export const base64ToBlob = (base64: string, contentType: string = ''): Blob => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
};