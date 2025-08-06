import { ChannelStats, VideoPerformance } from '../types';
import { invokeEdgeFunction } from './supabaseService';

// This service is now a client for our secure backend proxy.
// It no longer contains any AI simulation logic.

export const fetchChannelStats = async (): Promise<ChannelStats> => {
    const data = await invokeEdgeFunction<{ items: any[] }>('youtube-api-proxy', {
        endpoint: 'channels',
        params: {
            part: 'snippet,statistics',
            mine: true
        }
    });

    if (!data.items || data.items.length === 0) {
        throw new Error("Could not fetch channel statistics.");
    }

    const stats = data.items[0].statistics;
    const snippet = data.items[0].snippet;

    // We need a top performing video, which requires another call. Let's get the most recent videos first.
    const videos = await fetchChannelVideos();
    const topVideo = videos.length > 0 ? videos.sort((a,b) => b.views - a.views)[0] : { title: 'N/A', views: 0 };

    return {
        subscriberCount: parseInt(stats.subscriberCount, 10),
        totalViews: parseInt(stats.viewCount, 10),
        totalVideos: parseInt(stats.videoCount, 10),
        topPerformingVideo: {
            title: topVideo.title,
            views: topVideo.views,
        }
    };
};

export const fetchVideoPerformance = async (videoId: string): Promise<VideoPerformance> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    const data = await invokeEdgeFunction<{ rows: any[][] }>('youtube-api-proxy', {
        endpoint: 'reports',
        isAnalytics: true,
        params: {
            ids: 'channel==MINE',
            startDate: startDate,
            endDate: new Date().toISOString().split('T')[0],
            metrics: 'views,likes,comments,averageViewDuration,estimatedMinutesWatched',
            dimensions: 'video',
            filters: `video==${videoId}`
        }
    });
    
    if (!data.rows || data.rows.length === 0) {
        // Return zeroed data if no performance metrics are available yet.
        return { views: 0, likes: 0, comments: 0, retention: 0 };
    }

    const row = data.rows[0];
    const views = row[1] || 0;
    const avgDuration = row[4] || 0; // averageViewDuration
    const totalMinutes = row[5] || 0; // estimatedMinutesWatched

    // Simplified retention calculation
    const retention = (views > 0 && totalMinutes > 0) ? Math.round((totalMinutes / views) / (avgDuration / 60) * 100) : 0;

    return {
        views: views,
        likes: row[2] || 0,
        comments: row[3] || 0,
        retention: isNaN(retention) ? 0 : retention,
    };
};

export const fetchChannelVideos = async (): Promise<{id: string, title: string, views: number, likes: number, comments: number}[]> => {
    const searchData = await invokeEdgeFunction<{ items: any[] }>('youtube-api-proxy', {
        endpoint: 'search',
        params: {
            part: 'snippet',
            forMine: true,
            type: 'video',
            order: 'date',
            maxResults: 10
        }
    });

    if (!searchData.items || searchData.items.length === 0) {
        return [];
    }
    
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

    const videoDetailsData = await invokeEdgeFunction<{ items: any[] }>('youtube-api-proxy', {
        endpoint: 'videos',
        params: {
            part: 'snippet,statistics',
            id: videoIds,
        }
    });
    
     if (!videoDetailsData.items) {
        return [];
    }

    return videoDetailsData.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        views: parseInt(item.statistics.viewCount || '0', 10),
        likes: parseInt(item.statistics.likeCount || '0', 10),
        comments: parseInt(item.statistics.commentCount || '0', 10),
    }));
};

export const publishVideo = async (
    projectId: string,
    videoFileUrl: string,
    title: string,
    description: string,
    tags: string[],
    thumbnailUrl: string
): Promise<string> => {
    const { videoUrl } = await invokeEdgeFunction<{ videoUrl: string }>('youtube-publish', {
        projectId,
        videoFileUrl,
        title,
        description,
        tags,
        thumbnailUrl
    });
    return videoUrl;
};