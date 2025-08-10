
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
    // Handle data URL format (e.g., "data:image/jpeg;base64,...")
    if (base64.includes(',')) {
        const parts = base64.split(',');
        const mimeType = parts[0].match(/:(.*?);/)?.[1];
        base64 = parts[1];
        if (mimeType && !contentType) {
            contentType = mimeType;
        }
    }
    
    try {
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
    } catch (e) {
        console.error("Failed to decode base64 string. It might be corrupted or not properly formatted.", e);
        throw new Error("Invalid base64 string provided for blob conversion.");
    }
};

/**
 * Parses a timecode string (e.g., "0-8s") into start and duration in seconds.
 * @param timecode The string to parse.
 * @returns An object with start and duration, or null if parsing fails.
 */
export const parseTimecode = (timecode: string): { start: number; duration: number } | null => {
    const match = timecode.match(/(\d+)-(\d+)s/);
    if (match) {
        const start = parseInt(match[1], 10);
        const end = parseInt(match[2], 10);
        if (!isNaN(start) && !isNaN(end) && end > start) {
            return { start, duration: end - start };
        }
    }
    return null;
};


// --- IndexedDB Cache Utilities ---

const DB_NAME = 'ViralyzerDB';
const DB_VERSION = 1;
const STORE_NAME = 'timelineCache';

let db: IDBDatabase | null = null;

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(new Error("Failed to open IndexedDB."));
    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveTimelineToCache = async (projectId: string, timeline: any): Promise<void> => {
  try {
    const dbInstance = await getDB();
    const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(JSON.parse(JSON.stringify(timeline)), projectId); // Ensure data is cloneable
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error('Failed to save timeline to cache.'));
    });
  } catch (error) {
    console.error("IndexedDB save error:", error);
  }
};

export const loadTimelineFromCache = async (projectId: string): Promise<any | null> => {
  try {
    const dbInstance = await getDB();
    const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(projectId);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => {
            console.error("IndexedDB load error:", request.error);
            reject(new Error('Failed to load timeline from cache.'));
        };
    });
  } catch (error) {
    console.error("IndexedDB setup error:", error);
    return null;
  }
};