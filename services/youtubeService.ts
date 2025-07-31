import { ChannelStats, VideoDetails, VideoPerformance } from '../types';

const mockDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const fetchChannelStats = async (): Promise<ChannelStats> => {
    await mockDelay(1200);
    return {
        subscriberCount: 125000,
        totalViews: 15000000,
        totalVideos: 250,
        topPerformingVideo: {
            title: "My Morning Routine (2023)",
            views: 1200000
        }
    };
};

export const fetchVideoPerformance = async (projectId: string): Promise<VideoPerformance> => {
    await mockDelay(800);
    console.log(`Fetching performance for project ${projectId}`);
    return {
        views: Math.floor(Math.random() * 50000) + 1000,
        likes: Math.floor(Math.random() * 2000) + 100,
        comments: Math.floor(Math.random() * 200) + 10,
        retention: Math.floor(Math.random() * 40) + 30
    };
};

export const fetchVideoPerformanceByUrl = async (url: string): Promise<VideoPerformance> => {
     await mockDelay(800);
     console.log(`Fetching performance for url ${url}`);
     return {
        views: Math.floor(Math.random() * 50000) + 1000,
        likes: Math.floor(Math.random() * 2000) + 100,
        comments: Math.floor(Math.random() * 200) + 10,
        retention: Math.floor(Math.random() * 40) + 30
    };
}

export const fetchChannelVideos = async (): Promise<{id: string, title: string, views: number, likes: number, comments: number}[]> => {
    await mockDelay(1500);
    return [
        { id: 'vid1', title: 'My Most Productive Day Ever', views: 54000, likes: 2300, comments: 150 },
        { id: 'vid2', title: 'React JS for Beginners in 2 hours', views: 120000, likes: 8000, comments: 450 },
        { id: 'vid3', title: 'I built a SaaS with an AI co-pilot', views: 250000, likes: 15000, comments: 800 },
        { id: 'vid4', title: 'Unboxing the new M3 MacBook Pro', views: 89000, likes: 4100, comments: 200 },
        { id: 'vid5', title: 'What\'s on my iPhone? (2024)', views: 32000, likes: 1800, comments: 120 },
    ];
};