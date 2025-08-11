import { NormalizedStockAsset, JamendoTrack } from "../types.js";
import { invokeEdgeFunction } from './supabaseService.js';

const mapJamendoAsset = (track: JamendoTrack): NormalizedStockAsset => ({
    id: track.id,
    previewImageUrl: track.image,
    downloadUrl: track.audio,
    type: 'audio',
    description: `${track.name} by ${track.artist_name}`,
    duration: track.duration,
    provider: 'jamendo',
});

export const searchJamendoMusic = async (query: string): Promise<NormalizedStockAsset[]> => {
    if (!query.trim()) return [];
    const response = await invokeEdgeFunction<{ results: JamendoTrack[] }>('jamendo-proxy', {
        query,
        limit: 20
    });
    return (response.results || []).map(mapJamendoAsset);
};