import { Dayjs } from 'dayjs';
import { create } from 'zustand';

export interface PlaceStore {
    color: string;
    nextRestoreTimestamp: Dayjs|null
    setColor: (color: string) => void;
    setNextRestoreTimestamp: (timestamp: Dayjs|null) => void;
}

export const usePlaceStore = create<PlaceStore>((set) => ({
    color: "#FFFFFF",
    nextRestoreTimestamp: null,
    setColor: (color: string) => { set((state) => ({ ...state, color })); },
    setNextRestoreTimestamp: (nextRestoreTimestamp: Dayjs|null) => { set((state) => ({ ...state, nextRestoreTimestamp }))}
}));