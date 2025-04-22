import { useAnimationFrame } from "motion/react";
import { usePlaceStore } from "../store/usePlaceStore"
import { useRef, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import './tileBar.css';

interface TileBarStateRef {
    complete: boolean,
    nextRestoreTimestamp: Dayjs | null;
}


export const TileBar = () => {

    const placeStore = usePlaceStore();
    const [active,setActive] = useState(false);
    const [displayText,setDisplayText] = useState("");
    const dateRef = useRef<TileBarStateRef>(null);

    if(dateRef.current === null) {
        dateRef.current = { nextRestoreTimestamp: placeStore.nextRestoreTimestamp, complete: false };
    }
    dateRef.current.nextRestoreTimestamp = placeStore.nextRestoreTimestamp;;


    useAnimationFrame(() => {
        if(!dateRef.current?.nextRestoreTimestamp) {
            return;
        }

        const now = dayjs();
        const timestamp = dateRef.current.nextRestoreTimestamp;
        if(!now.isBefore(timestamp)) {

            if(!dateRef.current.complete) {
                setActive(true);
                dateRef.current.complete = true;
            }
        }
        else {

            if(dateRef.current.complete) {
                setActive(false);
                dateRef.current.complete = false;
            }

            let diff = timestamp.diff(now,"seconds");
            let minutes = Math.floor((diff / 60));
            let seconds = Math.ceil(diff - minutes*60);
            const text = minutes.toString().padStart(2,"0") + ":" + seconds.toString().padStart(2,"0");
            setDisplayText((old) => {
                return old === text ? old : text;
            });
        }
    });

    if(!placeStore.nextRestoreTimestamp) {
        return null;
    }

    return (
        <div className="tile-bar">
            {active ? "Place a tile" : null}
            {!active ? displayText : null }
        </div>
    );
}