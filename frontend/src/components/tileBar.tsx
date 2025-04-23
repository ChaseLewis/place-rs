import './tileBar.css';
import dayjs, { Dayjs } from "dayjs";
import { useRef, useState } from "react";
import { Button, ColorPicker, Flex } from "antd";
import { useAnimationFrame } from "motion/react";
import { usePlaceStore } from "../store/usePlaceStore";
import { ColorFormatType } from "antd/es/color-picker/interface";

interface TileBarStateRef {
    complete: boolean,
    nextRestoreTimestamp: Dayjs | null;
}


export const TileBar = (props: { hide: boolean }) => {

    const placeStore = usePlaceStore();
    const [active,setActive] = useState(false);
    const dateRef = useRef<TileBarStateRef>(null);
    const [displayText,setDisplayText] = useState("");
    const [colorFormat,setColorFormat] = useState<ColorFormatType|undefined>("rgb");
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

            let diff = timestamp.diff(now,"milliseconds");
            let minutes = Math.floor(diff / 60000);
            let seconds = Math.ceil((diff - minutes*60000)/1000);
            const text = minutes.toString().padStart(2,"0") + ":" + seconds.toString().padStart(2,"0");
            setDisplayText((old) => {
                return old === text ? old : text;
            });
        }
    });

    if(!placeStore.nextRestoreTimestamp || props.hide) {
        return null;
    }

    return (
        <Flex gap="4px" className="tile-bar">
            <div className="color-picker-section">
                <Button type="text" style={{ "padding": "0px" }}><img src="/eyedropper.svg" alt="eye dropper" width="25px" /></Button>
            </div>
            <div className="color-section">
                <ColorPicker
                    disabledAlpha
                    format={colorFormat}
                    onFormatChange={setColorFormat} 
                    value={placeStore.color} 
                    onChange={(val) => {
                        placeStore.setColor(val.toHexString());
                    }} 
                />
            </div>
            <Flex flex={1} align="center" justify="center" style={{ fontFamily: "monospace" }}>
                {active ? "Place a tile" : null}
                {!active ? displayText : null }
            </Flex>
        </Flex>
    );
}