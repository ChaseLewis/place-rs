import { Dayjs } from 'dayjs';
import { create } from 'zustand';
import { ClickMode } from '../util/types';

export interface PlaceStore {
    color: string;
    colorPickerOpen: boolean;
    eyeDropColor: string;
    clickMode: ClickMode;
    nextRestoreTimestamp: Dayjs|null
    setColor: (color: string) => void;
    setEyeDropColor: (color: string) => void;
    setClickMode: (clickMode: ClickMode) => void;
    setColorPickerOpen: (open: boolean) => void;
    setNextRestoreTimestamp: (timestamp: Dayjs|null) => void;
}

export const usePlaceStore = create<PlaceStore>((set) => ({
    colorPickerOpen: false,
    clickMode: "Pixel",
    color: localStorage.getItem("selectedColor") || "#FFFFFF",
    eyeDropColor: localStorage.getItem("selectedColor") || "#000000",
    nextRestoreTimestamp: null,
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
    setNextRestoreTimestamp: (nextRestoreTimestamp: Dayjs|null) => { set((state) => ({ ...state, nextRestoreTimestamp }))}
}));