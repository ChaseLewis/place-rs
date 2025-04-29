import { Dayjs } from 'dayjs';
import { create } from 'zustand';
import { ClickMode } from '../util/types';

export interface PlaceStore {
    color: string;
    colorPickerOpen: boolean;
    eyeDropColor: string;
    clickMode: ClickMode;
    nextRestoreTimestamp: Dayjs|null;
    cooldownClick: boolean;
    activeUserCount: bigint;
    favoriteColors: string[];
    setColor: (color: string) => void;
    setEyeDropColor: (color: string) => void;
    setClickMode: (clickMode: ClickMode) => void;
    setColorPickerOpen: (open: boolean) => void;
    setNextRestoreTimestamp: (timestamp: Dayjs|null) => void;
    setCooldownClick: (value: boolean) => void;
    setActiveUserCount: (value: bigint) => void;
    addFavoriteColor: (color: string) => void;
    removeFavoriteColor: (color: string) => void;
}

export const usePlaceStore = create<PlaceStore>((set) => ({
    colorPickerOpen: false,
    clickMode: "Pixel",
    cooldownClick: false,
    color: localStorage.getItem("selectedColor") || "#000000",
    eyeDropColor: localStorage.getItem("selectedColor") || "#000000",
    nextRestoreTimestamp: null,
    activeUserCount: BigInt(1),
    favoriteColors: JSON.parse(localStorage.getItem("favoriteColors") || "[]"),
    setColorPickerOpen: (open: boolean) => {
        set((state) => ({ ...state, colorPickerOpen: open }));
    },
    setColor: (color: string) => { 
        localStorage.setItem("selectedColor",color);
        set((state) => ({ ...state, color, eyeDropColor: color })); 
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
    }
}));