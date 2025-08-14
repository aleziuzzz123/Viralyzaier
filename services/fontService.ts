// services/fontService.ts
import { invokeEdgeFunction } from './supabaseService';

export interface GoogleFont {
    family: string;
    variants: string[];
    subsets: string[];
    version: string;
    lastModified: string;
    files: { [variant: string]: string };
    category: string;
    kind: string;
}

/**
 * Fetches a list of popular Google Fonts from our secure proxy.
 */
export const fetchGoogleFonts = async (): Promise<GoogleFont[]> => {
    // We expect the proxy to return the 'items' array directly.
    return await invokeEdgeFunction<GoogleFont[]>('google-fonts-proxy', {});
};

/**
 * Dynamically loads a Google Font into the document's head if it's not already there.
 * @param fontFamily The name of the font family to load (e.g., "Roboto").
 */
export const loadGoogleFont = (fontFamily: string): void => {
    if (!fontFamily || fontFamily.includes('sans-serif')) return; // Don't load system fonts
    
    const fontId = `google-font-${fontFamily.replace(/\s+/g, '-')}`;
    
    if (document.getElementById(fontId)) {
        // Font is already loaded or is being loaded.
        return;
    }

    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@400;700;800;900&display=swap`;
    
    document.head.appendChild(link);
};