import './tileBar.css';
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, ColorPicker, Flex, Tooltip } from "antd";
import { useAnimationFrame } from "motion/react";
import { usePlaceStore } from "../store/usePlaceStore";
import { ColorFormatType } from "antd/es/color-picker/interface";
import { ClockCircleOutlined, CloudDownloadOutlined } from '@ant-design/icons';

interface TileBarStateRef {
    complete: boolean,
    nextRestoreTimestamp: Dayjs | null;
}

export const TileBar = (props: { hide: boolean, downloadImage?: () => void }) => {

    const placeStore = usePlaceStore();
    const [active,setActive] = useState(false);
    const dateRef = useRef<TileBarStateRef>(null);
    const [displayText,setDisplayText] = useState("");
    const [colorFormat,setColorFormat] = useState<ColorFormatType|undefined>("rgb");
    if(dateRef.current === null) {
        dateRef.current = { nextRestoreTimestamp: placeStore.nextRestoreTimestamp, complete: false };
    }
    dateRef.current.nextRestoreTimestamp = placeStore.nextRestoreTimestamp;
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


    useEffect(() => {
        if(active) {
            placeStore.setCooldownClick(false);
        }
    },[active,placeStore.setCooldownClick]);

    const titleBarClass = useMemo(() => {
        let className = "tile-bar";
        if(placeStore.cooldownClick) {
            className += " cooldown"
        }
        return className;
    },[placeStore.cooldownClick]);

    if(!placeStore.nextRestoreTimestamp || props.hide) {
        return null;
    }

    return (
        <Flex gap="4px" className={titleBarClass}
            onClick={((e) => {
                e.stopPropagation();
                return false;
            })}
        >   
            <div className="color-picker-section">
                <Tooltip title="Pick Color From Image">
                    <Button type="text" style={{ "padding": "0px 4px", background: placeStore.clickMode === "EyeDropper" ? "rgba(0,0,0,0.08)" : undefined }} onClick={() => {
                        placeStore.setClickMode(placeStore.clickMode === "EyeDropper" ? "Pixel" : "EyeDropper");
                    }}>
                        <img src="/eyedropper.svg" alt="eye dropper" width="25px" />
                    </Button>
                </Tooltip>
            </div>
            <div className="color-section">
                <ColorPicker
                    disabledAlpha
                    format={colorFormat}
                    onFormatChange={setColorFormat} 
                    value={placeStore.clickMode === "Pixel" ? placeStore.color : placeStore.eyeDropColor} 
                    onChangeComplete={(val) => {
                        placeStore.setColor(val.toHexString());
                    }} 
                    onOpenChange={(open) => {
                        //We need to set 'open' or 'close' on the store to prevent the mouse move
                        //from exploding everything while dragging on the color.
                        placeStore.setColorPickerOpen(open);

                        if(open && placeStore.clickMode === "EyeDropper") {
                            placeStore.setClickMode("Pixel");
                        } 
                    }}
                    destroyTooltipOnHide
                />
            </div>
            <Flex flex={1} align="center" justify="center" style={{ fontFamily: "monospace" }}>
                {active ? "Place a pixel" : null}
                {!active ? <span className="cooldown-timer"><ClockCircleOutlined/> {displayText }</span>: null }
            </Flex>
            {!!props.downloadImage && (
                <Tooltip title="Download Image">
                    <Button 
                        type="text"
                        icon={<CloudDownloadOutlined style={{ fontSize: "25px", position: "relative", top: "2px" }} />} 
                        onClick={props.downloadImage}
                        style={{ padding: "0px" }} 
                    />
                </Tooltip>
            )}
        </Flex>
    );
}