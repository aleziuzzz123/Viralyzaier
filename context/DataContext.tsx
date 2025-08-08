
import React, { createContext, useReducer, useEffect, ReactNode, useCallback, useContext } from 'react';
import type { Script, Folder, WatchedTrend, Client, Trend, Notification } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';
import type { Json, Database } from '../services/database.types.ts';
import { AuthContext } from './AuthContext.tsx';

// --- STATE AND INITIAL VALUES ---
export interface DataState {
    savedScripts: Script[];
    folders: Folder[];
    watchedTrends: WatchedTrend[];
    clients: Client[];
    notifications: Notification[];
    isLoading: boolean;
    error: string | null;
}

const initialState: DataState = {
    savedScripts: [],
    folders: [],
    watchedTrends: [],
    clients: [],
    notifications: [],
    isLoading: true,
    error: null,
};

// --- ACTIONS ---
type Action =
    | { type: 'FETCH_DATA_START' }
    | { type: 'FETCH_DATA_SUCCESS'; payload: { folders: Folder[]; clients: Client[]; savedScripts: Script[]; watchedTrends: WatchedTrend[]; notifications: Notification[] } }
    | { type: 'FETCH_DATA_ERROR'; payload: string }
    | { type: 'ADD_SAVED_SCRIPT_SUCCESS'; payload: Script }
    | { type: 'UNSAVE_SCRIPT_SUCCESS'; payload: { scriptId: string } }
    | { type: 'UPDATE_SAVED_SCRIPT_VISUALS_SUCCESS'; payload: { scriptId: string; visuals: string[] } }
    | { type: 'MOVE_SCRIPT_TO_FOLDER_SUCCESS'; payload: { scriptId: string; folderId: string | null } }
    | { type: 'ADD_FOLDER_SUCCESS'; payload: Folder }
    | { type: 'RENAME_FOLDER_SUCCESS'; payload: { folderId: string; newName: string } }
    | { type: 'DELETE_FOLDER_SUCCESS'; payload: { folderId: string } }
    | { type: 'ADD_CLIENT_SUCCESS'; payload: Client }
    | { type: 'UPDATE_CLIENT_SUCCESS'; payload: { updatedClient: Client } }
    | { type: 'DELETE_CLIENT_SUCCESS'; payload: { clientId: string } }
    | { type: 'ADD_WATCHED_TREND_SUCCESS'; payload: WatchedTrend }
    | { type: 'REMOVE_WATCHED_TREND_SUCCESS'; payload: { topic: string } }
    | { type: 'BATCH_DELETE_SCRIPTS_SUCCESS'; payload: { scriptIds: string[] } }
    | { type: 'BATCH_MOVE_SCRIPTS_SUCCESS'; payload: { scriptIds: string[]; folderId: string | null } }
    | { type: 'ADD_NOTIFICATION_SUCCESS'; payload: Notification }
    | { type: 'MARK_ALL_NOTIFICATIONS_READ_SUCCESS'; payload: Notification[] };


type RequestAction =
    | { type: 'ADD_SAVED_SCRIPT_REQUEST'; payload: { script: Script } }
    | { type: 'UNSAVE_SCRIPT_REQUEST'; payload: { scriptId: string } }
    | { type: 'UPDATE_SAVED_SCRIPT_VISUALS_REQUEST'; payload: { scriptId: string; visuals: string[] } }
    | { type: 'MOVE_SCRIPT_TO_FOLDER_REQUEST'; payload: { scriptId: string; folderId: string | null } }
    | { type: 'ADD_FOLDER_REQUEST'; payload: { folder: Omit<Folder, 'id'> & { id?: string } } }
    | { type: 'RENAME_FOLDER_REQUEST'; payload: { folderId: string; newName: string } }
    | { type: 'DELETE_FOLDER_REQUEST'; payload: { folderId: string } }
    | { type: 'ADD_CLIENT_REQUEST'; payload: { clientData: Omit<Client, 'id' | 'status'> } }
    | { type: 'UPDATE_CLIENT_REQUEST'; payload: { updatedClient: Client } }
    | { type: 'DELETE_CLIENT_REQUEST'; payload: { clientId: string } }
    | { type: 'ADD_WATCHED_TREND_REQUEST'; payload: { trend: Trend } }
    | { type: 'REMOVE_WATCHED_TREND_REQUEST'; payload: { topic: string } }
    | { type: 'BATCH_DELETE_SCRIPTS_REQUEST'; payload: { scriptIds: string[] } }
    | { type: 'BATCH_MOVE_SCRIPTS_REQUEST'; payload: { scriptIds: string[]; folderId: string | null } }
    | { type: 'ADD_NOTIFICATION_REQUEST'; payload: { message: string; userId: string } }
    | { type: 'MARK_ALL_NOTIFICATIONS_READ_REQUEST'; payload: { userId: string } };

export type DataDispatchableAction = Action | RequestAction;

// --- REDUCER ---
const dataReducer = (state: DataState, action: Action): DataState => {
    switch (action.type) {
        case 'FETCH_DATA_START': return { ...state, isLoading: true, error: null };
        case 'FETCH_DATA_SUCCESS': return { ...state, isLoading: false, ...action.payload };
        case 'FETCH_DATA_ERROR': return { ...state, isLoading: false, error: action.payload };

        case 'ADD_SAVED_SCRIPT_SUCCESS': return { ...state, savedScripts: [action.payload, ...state.savedScripts] };
        case 'UNSAVE_SCRIPT_SUCCESS': return { ...state, savedScripts: state.savedScripts.filter(s => s.id !== action.payload.scriptId) };
        case 'UPDATE_SAVED_SCRIPT_VISUALS_SUCCESS': return { ...state, savedScripts: state.savedScripts.map(s => s.id === action.payload.scriptId ? { ...s, visuals: action.payload.visuals } : s) };
        case 'MOVE_SCRIPT_TO_FOLDER_SUCCESS': return { ...state, savedScripts: state.savedScripts.map(s => s.id === action.payload.scriptId ? { ...s, folder_id: action.payload.folderId } : s)};
        
        case 'ADD_FOLDER_SUCCESS': return { ...state, folders: [...state.folders, action.payload] };
        case 'RENAME_FOLDER_SUCCESS': return { ...state, folders: state.folders.map(f => f.id === action.payload.folderId ? { ...f, name: action.payload.newName } : f) };
        case 'DELETE_FOLDER_SUCCESS': return { ...state, folders: state.folders.filter(f => f.id !== action.payload.folderId), savedScripts: state.savedScripts.map(s => s.folder_id === action.payload.folderId ? {...s, folder_id: null} : s) };

        case 'ADD_CLIENT_SUCCESS': return { ...state, clients: [action.payload, ...state.clients] };
        case 'UPDATE_CLIENT_SUCCESS': return { ...state, clients: state.clients.map(c => c.id === action.payload.updatedClient.id ? action.payload.updatedClient : c) };
        case 'DELETE_CLIENT_SUCCESS': return { ...state, clients: state.clients.filter(c => c.id !== action.payload.clientId) };
        
        case 'ADD_WATCHED_TREND_SUCCESS': return { ...state, watchedTrends: [action.payload, ...state.watchedTrends] };
        case 'REMOVE_WATCHED_TREND_SUCCESS': return { ...state, watchedTrends: state.watchedTrends.filter(t => t.trend_data.topic !== action.payload.topic) };
        
        case 'BATCH_DELETE_SCRIPTS_SUCCESS': return { ...state, savedScripts: state.savedScripts.filter(s => !action.payload.scriptIds.includes(s.id)) };
        case 'BATCH_MOVE_SCRIPTS_SUCCESS': return { ...state, savedScripts: state.savedScripts.map(s => action.payload.scriptIds.includes(s.id) ? { ...s, folder_id: action.payload.folderId } : s) };

        case 'ADD_NOTIFICATION_SUCCESS': return { ...state, notifications: [action.payload, ...state.notifications] };
        case 'MARK_ALL_NOTIFICATIONS_READ_SUCCESS': return { ...state, notifications: action.payload };

        default: return state;
    }
};

// --- CONTEXT & PROVIDER ---
export const DataContext = createContext<{ state: DataState; dispatch: React.Dispatch<DataDispatchableAction> }>({
    state: initialState,
    dispatch: () => null
});

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { state: authState } = useContext(AuthContext);
    const { user } = authState;
    const [state, dispatch] = useReducer(dataReducer, initialState);
    
    const isGuest = user?.id.startsWith('guest-') ?? false;

    useEffect(() => {
        if (!user || isGuest) {
            // Clear data if user logs out or is a guest
            dispatch({ type: 'FETCH_DATA_SUCCESS', payload: {
                folders: [{ id: 'all', name: 'All Scripts' }] as Folder[], 
                clients: [], 
                savedScripts: [], 
                watchedTrends: [], 
                notifications: []
            }});
            return;
        }

        const fetchData = async () => {
            dispatch({ type: 'FETCH_DATA_START' });
            try {
                const [foldersRes, clientsRes, scriptsRes, watchedTrendsRes, notificationsRes] = await Promise.all([
                    supabase.from('folders').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
                    supabase.from('clients').select('*').eq('agency_owner_id', user.id).order('created_at', { ascending: false }),
                    supabase.from('scripts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                    supabase.from('watched_trends').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                    supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
                ]);

                if (foldersRes.error) throw foldersRes.error;
                if (clientsRes.error) throw clientsRes.error;
                if (scriptsRes.error) throw scriptsRes.error;
                if (watchedTrendsRes.error) throw watchedTrendsRes.error;
                if (notificationsRes.error) throw notificationsRes.error;
                
                dispatch({ type: 'FETCH_DATA_SUCCESS', payload: {
                    folders: [{ id: 'all', name: 'All Scripts' }, ...(foldersRes.data || [])] as Folder[],
                    clients: (clientsRes.data || []) as unknown as Client[],
                    savedScripts: (scriptsRes.data || []) as unknown as Script[],
                    watchedTrends: (watchedTrendsRes.data || []) as unknown as WatchedTrend[],
                    notifications: (notificationsRes.data || []) as unknown as Notification[],
                }});
            } catch (error: any) {
                dispatch({ type: 'FETCH_DATA_ERROR', payload: error.message });
                console.error("Data context fetching error:", error);
            }
        };

        fetchData();
    }, [user, isGuest]);
    
    const handleAsyncAction = useCallback(async (action: RequestAction) => {
        if (!user || isGuest) {
            if (action.type.endsWith('_REQUEST')) {
                // For guests, create a local notification instead of a DB call
                const tempNotification: Notification = {
                    id: crypto.randomUUID(),
                    message: "Please sign up to save your work!",
                    created_at: new Date().toISOString(),
                    read: false,
                };
                dispatch({ type: 'ADD_NOTIFICATION_SUCCESS', payload: tempNotification });
            }
            return;
        }
        const userId = user.id;
        
        try {
            switch(action.type) {
                case 'ADD_SAVED_SCRIPT_REQUEST': {
                    const { isNew, ...scriptToInsert } = action.payload.script;
                    const payload = { ...scriptToInsert, user_id: userId, viral_score_breakdown: scriptToInsert.viral_score_breakdown as unknown as Json ?? null };
                    const { data, error } = await supabase.from('scripts').insert([payload]).select().single();
                    if (error) throw error;
                    if (data) dispatch({ type: 'ADD_SAVED_SCRIPT_SUCCESS', payload: data as unknown as Script });
                    break;
                }
                // ... (rest of the cases are the same as before)
                case 'UNSAVE_SCRIPT_REQUEST': {
                    const { error } = await supabase.from('scripts').delete().eq('id', action.payload.scriptId);
                    if(error) throw error;
                    dispatch({ type: 'UNSAVE_SCRIPT_SUCCESS', payload: action.payload });
                    break;
                }
                 case 'MOVE_SCRIPT_TO_FOLDER_REQUEST': {
                    const { error } = await supabase.from('scripts').update({ folder_id: action.payload.folderId }).eq('id', action.payload.scriptId);
                    if (error) throw error;
                    dispatch({ type: 'MOVE_SCRIPT_TO_FOLDER_SUCCESS', payload: action.payload });
                    break;
                }
                case 'ADD_FOLDER_REQUEST': {
                    const payload = { ...action.payload.folder, user_id: userId };
                    const { data, error } = await supabase.from('folders').insert([payload]).select().single();
                    if (error) throw error;
                    if (data) dispatch({ type: 'ADD_FOLDER_SUCCESS', payload: data as unknown as Folder });
                    break;
                }
                case 'RENAME_FOLDER_REQUEST': {
                    const { error } = await supabase.from('folders').update({ name: action.payload.newName }).eq('id', action.payload.folderId);
                    if (error) throw error;
                    dispatch({ type: 'RENAME_FOLDER_SUCCESS', payload: action.payload });
                    break;
                }
                case 'DELETE_FOLDER_REQUEST': {
                    await supabase.from('scripts').update({ folder_id: null }).eq('user_id', userId).eq('folder_id', action.payload.folderId);
                    await supabase.from('folders').delete().eq('id', action.payload.folderId).eq('user_id', userId);
                    dispatch({ type: 'DELETE_FOLDER_SUCCESS', payload: action.payload });
                    break;
                }
                case 'ADD_CLIENT_REQUEST': {
                    const payload = { ...action.payload.clientData, agency_owner_id: userId, status: 'Pending' as const };
                    const { data, error } = await supabase.from('clients').insert([payload]).select().single();
                    if (error) throw error;
                    if (data) dispatch({ type: 'ADD_CLIENT_SUCCESS', payload: data as unknown as Client });
                    break;
                }
                case 'UPDATE_CLIENT_REQUEST': {
                    const { updatedClient } = action.payload;
                    const payload = { name: updatedClient.name, email: updatedClient.email, status: updatedClient.status };
                    const { data, error } = await supabase.from('clients').update(payload).eq('id', updatedClient.id).eq('agency_owner_id', userId).select().single();
                    if (error) throw error;
                    if (data) dispatch({ type: 'UPDATE_CLIENT_SUCCESS', payload: { updatedClient: data as unknown as Client } });
                    break;
                }
                case 'DELETE_CLIENT_REQUEST': {
                    const { error } = await supabase.from('clients').delete().eq('id', action.payload.clientId).eq('agency_owner_id', userId);
                    if (error) throw error;
                    dispatch({ type: 'DELETE_CLIENT_SUCCESS', payload: action.payload });
                    break;
                }
                case 'ADD_WATCHED_TREND_REQUEST': {
                    const payload = { user_id: userId, trend_data: action.payload.trend as unknown as Json };
                    const { data, error } = await supabase.from('watched_trends').insert([payload]).select().single();
                    if (error) throw error;
                    if (data) dispatch({ type: 'ADD_WATCHED_TREND_SUCCESS', payload: data as unknown as WatchedTrend });
                    break;
                }
                case 'REMOVE_WATCHED_TREND_REQUEST': {
                    const { error } = await supabase.from('watched_trends').delete().eq('user_id', userId).eq('trend_data->>topic', action.payload.topic);
                    if (error) throw error;
                    dispatch({ type: 'REMOVE_WATCHED_TREND_SUCCESS', payload: action.payload });
                    break;
                }
                case 'UPDATE_SAVED_SCRIPT_VISUALS_REQUEST': {
                    const { error } = await supabase.from('scripts').update({ visuals: action.payload.visuals }).eq('id', action.payload.scriptId);
                    if(error) throw error;
                    dispatch({ type: 'UPDATE_SAVED_SCRIPT_VISUALS_SUCCESS', payload: action.payload });
                    break;
                }
                case 'BATCH_DELETE_SCRIPTS_REQUEST': {
                    const { error } = await supabase.from('scripts').delete().in('id', action.payload.scriptIds);
                    if(error) throw error;
                    dispatch({ type: 'BATCH_DELETE_SCRIPTS_SUCCESS', payload: action.payload });
                    break;
                }
                case 'BATCH_MOVE_SCRIPTS_REQUEST': {
                    const { error } = await supabase.from('scripts').update({ folder_id: action.payload.folderId }).in('id', action.payload.scriptIds);
                    if (error) throw error;
                    dispatch({ type: 'BATCH_MOVE_SCRIPTS_SUCCESS', payload: action.payload });
                    break;
                }
                case 'ADD_NOTIFICATION_REQUEST': {
                    const payload = { message: action.payload.message, user_id: userId };
                    const { data, error } = await supabase.from('notifications').insert([payload]).select().single();
                    if (error) throw error;
                    if (data) dispatch({ type: 'ADD_NOTIFICATION_SUCCESS', payload: data as unknown as Notification });
                    break;
                }
                case 'MARK_ALL_NOTIFICATIONS_READ_REQUEST': {
                     const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
                     if (error) throw error;
                     const updatedNotifications = state.notifications.map(n => ({...n, read: true}));
                     dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ_SUCCESS', payload: updatedNotifications });
                     break;
                }
            }
        } catch (error: any) {
            console.error(`Error in async dispatch for ${action.type}:`, error);
        }
    }, [user, isGuest, dispatch, state.notifications]);

    const enhancedDispatch = useCallback((action: DataDispatchableAction) => {
        if (action.type.endsWith('_REQUEST')) {
            handleAsyncAction(action as RequestAction);
        } else {
            dispatch(action as Action);
        }
    }, [handleAsyncAction, dispatch]);

    return (
        <DataContext.Provider value={{ state, dispatch: enhancedDispatch }}>
            {children}
        </DataContext.Provider>
    );
};
