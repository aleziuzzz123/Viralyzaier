
import React, { createContext, useReducer, ReactNode } from 'react';

// --- STATE AND INITIAL VALUES ---
export interface UIState {
    movingScriptId: string | null;
    isNewDfyAvailable: boolean;
    quotaError: string | null;
    runTour: boolean;
}

const initialState: UIState = {
    movingScriptId: null,
    isNewDfyAvailable: true,
    quotaError: null,
    runTour: false,
};

// --- ACTIONS ---
export type UIAction =
    | { type: 'SET_MOVING_SCRIPT_ID'; payload: string | null }
    | { type: 'SET_NEW_DFY_UNAVAILABLE' }
    | { type: 'SET_QUOTA_ERROR'; payload: string | null }
    | { type: 'CLEAR_QUOTA_ERROR' }
    | { type: 'START_TOUR' }
    | { type: 'STOP_TOUR' };

// --- REDUCER ---
const uiReducer = (state: UIState, action: UIAction): UIState => {
    switch (action.type) {
        case 'SET_MOVING_SCRIPT_ID': return { ...state, movingScriptId: action.payload };
        case 'SET_NEW_DFY_UNAVAILABLE': return { ...state, isNewDfyAvailable: false };
        case 'SET_QUOTA_ERROR': return { ...state, quotaError: action.payload };
        case 'CLEAR_QUOTA_ERROR': return { ...state, quotaError: null };
        case 'START_TOUR': return { ...state, runTour: true };
        case 'STOP_TOUR': return { ...state, runTour: false };
        default: return state;
    }
};

// --- CONTEXT & PROVIDER ---
export const UIContext = createContext<{
    state: UIState;
    dispatch: React.Dispatch<UIAction>;
}>({
    state: initialState,
    dispatch: () => null
});

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(uiReducer, initialState);

    return (
        <UIContext.Provider value={{ state, dispatch }}>
            {children}
        </UIContext.Provider>
    );
};