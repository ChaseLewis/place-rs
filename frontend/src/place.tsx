import { Flex } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSpacetimeDB } from './useSpacetimeDB';
import { EventContext, Pixel, Player } from './spacetimedb';
import { useAnimationFrame } from 'motion/react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './util/chunks';
import { MouseInfo, MouseInfoRef } from './components/mouseInfo';
import { usePlaceStore } from './store/usePlaceStore';
import dayjs from 'dayjs';
import { TileBar } from './components/tileBar';
import useMouse from '@react-hook/mouse-position';
export interface PixelRef {
    color: ImageData,
    colorDataView: DataView,
    dirty: boolean
}

const useRefInit = function<T>(init: () => T) {
    const ref = useRef<T|null>(null)
    if(ref.current === null) {
        ref.current = init();
    }
    return ref;
}

export const PlaceImage = (props: {
    url: string, 
    pixelScale: number, 
    setPixelScale?: (scale: number) => void;
    style?: React.CSSProperties
}) => { 
    
    const [loading,setLoading] = useState(true);
    const placeStore = usePlaceStore();
    const mouseInfoRef = useRef<MouseInfoRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    mouseInfoRef.current?.setCanvasRef(canvasRef.current);
    mouseInfoRef.current?.setContainerRef(containerRef.current);

    const spacetimeDb = useSpacetimeDB({ url: props.url });
    const refPixelData = useRefInit<PixelRef>(() => {
        const colorBuffer = new ImageData(CANVAS_WIDTH,CANVAS_HEIGHT);
        return {
            color: colorBuffer,
            colorDataView: new DataView(colorBuffer.data.buffer),
            dirty: true
        } as PixelRef;
    });

    useEffect(() => {
        //Don't want to accidentally navigate away
        window.onbeforeunload = () => { return true; }
        return () => { window.onbeforeunload = null };
    },[]);

    useEffect(() => {
        if(!spacetimeDb.conn) {
            return;
        }

        const playerInsert = (_ctx: EventContext,row: Player) => {
            placeStore.setNextRestoreTimestamp(dayjs(row.nextAction.toDate()));
        };
        spacetimeDb.conn.db.players.onInsert(playerInsert);

        const playerUpdate = (_ctx: EventContext,_oldRow: Player,newRow: Player) => {
            placeStore.setNextRestoreTimestamp(dayjs(newRow.nextAction.toDate()));    
        };
        spacetimeDb.conn.db.players.onUpdate(playerUpdate);

        const pixelsUpdate = (_ctx: EventContext, _oldRow: Pixel, newRow: Pixel) => {
            console.log('pixels update!');
            if(refPixelData.current) {
                refPixelData.current?.colorDataView.setUint32(4*newRow.pixelId,newRow.color);
                refPixelData.current.dirty = true;
            }
        };
        spacetimeDb.conn.db.pixels.onUpdate(pixelsUpdate);

        const playerSub = spacetimeDb.conn.subscriptionBuilder()
        .onApplied(() => {}) 
        .onError((ex: any) => {
            console.error(ex);
            console.error("Failed to subscribe to players table");
        })
        .subscribe("SELECT * FROM players");

        const startTime = performance.now();
        const pixelSub = spacetimeDb.conn.subscriptionBuilder()
        .onApplied((ctx) => {
            const current = performance.now();
            console.log("Pixel subscription ",current-startTime,"ms");
            if(refPixelData.current)
            {
                for(const pixel of ctx.db.pixels.iter()) { 
                    refPixelData.current?.colorDataView.setUint32(4*pixel.pixelId,pixel.color); 
                }
                refPixelData.current.dirty = true;
            }
            setLoading(false);
        }) 
        .onError((ex: any) => {
            console.error(ex);
            console.error("Failed to subscribe to pixel table");
        })
        .subscribe("SELECT * FROM pixels");

        return () => { 
            console.log("clear sub use effect!");
            playerSub.unsubscribe();
            pixelSub.unsubscribe();
            spacetimeDb.conn?.db.players.removeOnInsert(playerInsert);
            spacetimeDb.conn?.db.players.removeOnUpdate(playerUpdate);
            spacetimeDb.conn?.db.pixels.removeOnUpdate(pixelsUpdate);
        };
    },[spacetimeDb.conn]);

    useAnimationFrame(() => {
        if(!canvasRef.current || !refPixelData.current) {
            return;
        }

        const ctx = canvasRef.current.getContext('2d');
        if(!ctx || !refPixelData.current.dirty) {
            return;
        }

        ctx.putImageData(refPixelData.current.color,0,0);
        refPixelData.current.dirty = false;
    });

    const placePixel = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if(!spacetimeDb.conn || !spacetimeDb.connected || !containerRef.current || !mouseInfoRef.current) {
            return;
        }

        if(!dayjs().isAfter(placeStore.nextRestoreTimestamp)) {
            console.log("Still on cooldown!");
            return;
        }

        const position = mouseInfoRef.current.canvasPosition();
        const pixelX = position[0];
        const pixelY = position[1];
        const pixelId = pixelY*CANVAS_WIDTH + pixelX;
        if(placeStore.clickMode === "EyeDropper") 
        {
            if(refPixelData.current) {
                const pixel = refPixelData.current?.colorDataView.getUint32(4*pixelId);
                const r = ((pixel >> 24) & 0xFF).toString(16);
                const g = ((pixel >> 16) & 0xFF).toString(16);
                const b = ((pixel >> 8) & 0xFF).toString(16);
                placeStore.setColor(`#${r}${g}${b}`);
            }
            placeStore.setClickMode("Pixel");
            return;
        }
        //Convert the hex string to a proper color
        //for some reason things are kept in little-endian?
        const trimmedNumber = placeStore.color.replace("#","");
        const r = trimmedNumber.substring(0,2);
        const g = trimmedNumber.substring(2,4);
        const b = trimmedNumber.substring(4,6);
        const colorNumber = parseInt(r,16) << 24 | parseInt(g,16) << 16 | parseInt(b,16) << 8 | 0xFF;
        spacetimeDb.conn.reducers.updatePixelCoord(pixelId,colorNumber);

    },[placeStore.color,placeStore.clickMode,placeStore.nextRestoreTimestamp,props.pixelScale,spacetimeDb.conn,spacetimeDb.connected]);

    const style = useMemo(() => {
        return { 
            width: `${props.pixelScale*CANVAS_WIDTH}px`, 
            height: `${props.pixelScale*CANVAS_HEIGHT}px`,
            imageRendering: "pixelated",
            margin: "100px",
            display: loading ? "none" : undefined
        } as React.CSSProperties;
        
    },[props.pixelScale,loading]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        
        if(placeStore.colorPickerOpen) {
            return;
        }

        //This should be a handler passed into the mouse info
        if(placeStore.clickMode === "EyeDropper" && mouseInfoRef.current) {
            const position = mouseInfoRef.current.canvasPosition();
            const pixelX = position[0];
            const pixelY = position[1];
            const pixelId = pixelY*CANVAS_WIDTH + pixelX;
            if(refPixelData.current) {
                const pixel = refPixelData.current?.colorDataView.getUint32(4*pixelId);
                const r = ((pixel >> 24) & 0xFF).toString(16);
                const g = ((pixel >> 16) & 0xFF).toString(16);
                const b = ((pixel >> 8) & 0xFF).toString(16);
                placeStore.setEyeDropColor(`#${r}${g}${b}`);
            }
        }
        mouseInfoRef.current?.onMouseMove(e);
    },[placeStore]);

    return (
        <div className="app-container"
            ref={containerRef}
            onMouseMove={handleMouseMove}
        >
            <div
                className="place-image-container"
            >
                {loading && (<Flex justify='center' align='center' style={{ width: "100vw", height: "100vh", background: "#333333"}}>
                    <LoadingOutlined style={{ fontSize: "4em", color: "#1372ed" }}/>
                </Flex>)}
                <TileBar hide={loading} />
                <MouseInfo 
                    ref={mouseInfoRef} 
                    hide={loading} 
                    pixelScale={props.pixelScale} 
                    setPixelScale={props.setPixelScale}
                />
                <canvas
                    ref={canvasRef} 
                    className="place-image" 
                    width={CANVAS_WIDTH} 
                    height={CANVAS_HEIGHT}
                    onClick={placePixel}
                    style={style}
                />
            </div>
    </div>
    );
}