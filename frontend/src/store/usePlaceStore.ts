import { Dayjs } from 'dayjs';
import { create } from 'zustand';
import { ClickMode } from '../util/types';
import { isMobile } from '../util/mobile';

export interface BarPosition {
    x: number;
    y: number;
    isPinned: boolean;
}

export interface PlaceStore {
    color: string;
    colorPickerOpen: boolean;
    eyeDropColor: string;
    clickMode: ClickMode;
    nextRestoreTimestamp: Dayjs|null;
    cooldownClick: boolean;
    activeUserCount: bigint;
    favoriteColors: string[];
    colorHistory: string[];
    colorHistoryIndex: number;
    tileBarPosition: BarPosition;
    favoriteBarPosition: BarPosition;
    showResetLayoutButton: boolean;
    isMobile: boolean;
    setColor: (color: string) => void;
    setEyeDropColor: (color: string) => void;
    setClickMode: (clickMode: ClickMode) => void;
    setColorPickerOpen: (open: boolean) => void;
    setNextRestoreTimestamp: (timestamp: Dayjs|null) => void;
    setCooldownClick: (value: boolean) => void;
    setActiveUserCount: (value: bigint) => void;
    addFavoriteColor: (color: string) => void;
    removeFavoriteColor: (color: string) => void;
    goBackColorHistory: () => void;
    goForwardColorHistory: () => void;
    makeHistoryCurrent: () => void;
    updateTileBarPosition: (position: BarPosition) => void;
    updateFavoriteBarPosition: (position: BarPosition) => void;
    setShowResetLayoutButton: (show: boolean) => void;
    resetLayout: () => void;
}

export const usePlaceStore = create<PlaceStore>((set) => ({
    colorPickerOpen: false,
    clickMode: "Pixel",
    cooldownClick: false,
    colorHistoryIndex: -1,
    color: localStorage.getItem("selectedColor") || "#000000",
    eyeDropColor: localStorage.getItem("selectedColor") || "#000000",
    nextRestoreTimestamp: null,
    activeUserCount: BigInt(1),
    favoriteColors: JSON.parse(localStorage.getItem("favoriteColors") || "[]"),
    colorHistory: JSON.parse(localStorage.getItem("colorHistory") || "[]"),
    tileBarPosition: JSON.parse(localStorage.getItem("tileBarPosition") || '{"x": 50, "y": 95, "isPinned": false}'),
    favoriteBarPosition: JSON.parse(localStorage.getItem("favoriteBarPosition") || '{"x": 50, "y": 85, "isPinned": false}'),
    showResetLayoutButton: JSON.parse(localStorage.getItem("showResetLayoutButton") || "false"),
    isMobile: isMobile(),
    setColorPickerOpen: (open: boolean) => {
        set((state) => ({ ...state, colorPickerOpen: open }));
    },
    setColor: (color: string) => { 
        localStorage.setItem("selectedColor",color);
        set((state) => {

            let colorHistory = state.colorHistory;
            if(state.colorHistory.length === 0 || state.colorHistory[state.colorHistory.length-1] !== color) {
                if(state.colorHistory.length > 100) {
                    colorHistory = [ ...state.colorHistory.slice(1), color];
                } else {
                    colorHistory = [...state.colorHistory, color];
                }
            }

            return { ...state, color, eyeDropColor: color, colorHistory, colorHistoryIndex: -1 };
        });
    },
    setEyeDropColor: (color: string) => {
        set((state) => ({ ...state, eyeDropColor: color }));       
    },
    setClickMode: (clickMode: ClickMode) => {
        set((state) => ({ ...state, clickMode }));
    },
    setNextRestoreTimestamp: (nextRestoreTimestamp: Dayjs|null) => { set((state) => ({ ...state, nextRestoreTimestamp }))},
    setCooldownClick: (value: boolean) => { set((state) => ({ ...state, cooldownClick: value }))},
    setActiveUserCount: (value: bigint) => { set((state) => ({ ...state, activeUserCount: value }))},
    addFavoriteColor: (color: string) => {
        set((state) => {
            const updatedFavorites = [...state.favoriteColors];
            if (!updatedFavorites.includes(color)) {
                updatedFavorites.push(color);
                localStorage.setItem("favoriteColors", JSON.stringify(updatedFavorites));
            }
            return { ...state, favoriteColors: updatedFavorites };
        });
    },
    removeFavoriteColor: (color: string) => {
        set((state) => {
            const updatedFavorites = state.favoriteColors.filter(c => c !== color);
            localStorage.setItem("favoriteColors", JSON.stringify(updatedFavorites));
            return { ...state, favoriteColors: updatedFavorites };
        });
    },
    goBackColorHistory: () => {
        set((state) => {
            if(state.colorHistory.length === 0 || state.colorHistoryIndex === 0 || state.clickMode !== "Pixel") {
                return state;
            }

            let index = state.colorHistoryIndex < 0 ? state.colorHistory.length-2 : state.colorHistoryIndex - 1;
            return { ...state, colorHistoryIndex: index, color: state.colorHistory[index] };
        });
    },
    goForwardColorHistory: () => {
        set((state) => {
            if(state.colorHistory.length === 0 
                || state.colorHistoryIndex < 0 
                || state.colorHistoryIndex >= state.colorHistory.length - 1 
                || state.clickMode !== "Pixel") {
                return state;
            }
            const newIndex = state.colorHistoryIndex + 1;
            return { ...state, colorHistoryIndex: newIndex, color: state.colorHistory[newIndex] };
        });       
    },
    makeHistoryCurrent: () => {
        set((state) => {
            if(state.colorHistoryIndex > 0 && state.colorHistoryIndex < state.colorHistory.length - 1 && state.colorHistory.length > 1) {
                let newHistory = [...state.colorHistory.slice(0,state.colorHistoryIndex)];
                newHistory = newHistory.concat([...state.colorHistory.slice(state.colorHistoryIndex+1)]);
                newHistory.push(state.colorHistory[state.colorHistoryIndex]);

                return { ...state, colorHistoryIndex: -1, }
            }

            return state;
        });
    },
    updateTileBarPosition: (position: BarPosition) => {
        set((state) => {
            localStorage.setItem("tileBarPosition", JSON.stringify(position));
            return { ...state, tileBarPosition: position };
        });
    },
    updateFavoriteBarPosition: (position: BarPosition) => {
        set((state) => {
            localStorage.setItem("favoriteBarPosition", JSON.stringify(position));
            return { ...state, favoriteBarPosition: position };
        });
    },
    setShowResetLayoutButton: (show: boolean) => {
        set((state) => {
            localStorage.setItem("showResetLayoutButton", JSON.stringify(show));
            return { ...state, showResetLayoutButton: show };
        });
    },
    resetLayout: () => {
        const defaultTileBarPosition = { x: 50, y: 95, isPinned: false };
        const defaultFavoriteBarPosition = { x: 50, y: 85, isPinned: false };
        localStorage.setItem("tileBarPosition", JSON.stringify(defaultTileBarPosition));
        localStorage.setItem("favoriteBarPosition", JSON.stringify(defaultFavoriteBarPosition));
        localStorage.setItem("showResetLayoutButton", JSON.stringify(false));
        set((state) => ({
            ...state,
            tileBarPosition: defaultTileBarPosition,
            favoriteBarPosition: defaultFavoriteBarPosition,
            showResetLayoutButton: false
        }));
    }
}));