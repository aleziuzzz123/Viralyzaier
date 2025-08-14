import { GiphyAsset } from '../types';
import { invokeEdgeFunction } from './supabaseService';

export const searchGiphy = async (query: string, type: 'stickers' | 'gifs' = 'stickers'): Promise<GiphyAsset[]> => {
    if (!query.trim()) return [];
    const response = await invokeEdgeFunction<GiphyAsset[]>('giphy-proxy', { query, type });
    return response || [];
};