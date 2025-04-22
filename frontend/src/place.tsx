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
    url: string, pixelScale: number, style?: React.CSSProperties
}) => { 
    
    const [loading,setLoading] = useState(true);
    const placeStore = usePlaceStore();
    const mouseInfoRef = useRef<MouseInfoRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
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
        window.onbeforeunload = () => { return true; }
        return () => { window.onbeforeunload = null };
    },[]);

    useEffect(() => {
        if(!spacetimeDb.conn) {
            return;
        }

        spacetimeDb.conn.db.players.onInsert((_ctx,row: Player) => {
            placeStore.setNextRestoreTimestamp(dayjs(row.nextAction.toDate()));
        });

        spacetimeDb.conn.db.players.onUpdate((_ctx,_oldRow: Player,newRow: Player) => {
            placeStore.setNextRestoreTimestamp(dayjs(newRow.nextAction.toDate()));    
        });

        spacetimeDb.conn.db.pixels.onUpdate((_ctx: EventContext, _oldRow: Pixel, newRow: Pixel) => {
            if(refPixelData.current) {
                refPixelData.current?.colorDataView.setUint32(4*newRow.pixelId,newRow.color);
                refPixelData.current.dirty = true;
            }
        });
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
            playerSub.unsubscribe();
            pixelSub.unsubscribe() 
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
        if(!spacetimeDb.conn || !spacetimeDb.connected || !containerRef.current) {
            console.log({ spacetimeDb });
            return;
        }

        const pixelX = Math.floor((containerRef.current.scrollLeft + e.clientX)/props.pixelScale);
        const pixelY = Math.floor((containerRef.current.scrollTop + e.clientY)/props.pixelScale);
        const pixelId = pixelY*CANVAS_WIDTH + pixelX;
        spacetimeDb.conn.reducers.updatePixelCoord(pixelId,0xFFA500FF);

    },[props.pixelScale,spacetimeDb.conn,spacetimeDb.connected]);

    const style = useMemo(() => {
        return { 
            width: `${props.pixelScale*CANVAS_WIDTH}px`, 
            height: `${props.pixelScale*CANVAS_HEIGHT}px`,
            imageRendering: "pixelated",
            display: loading ? "none" : undefined
        } as React.CSSProperties;
        
    },[props.pixelScale,loading]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        mouseInfoRef.current?.setMousePosition(e.clientX,e.clientY);
    },[]);

    const handleScroll = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const element = (e.target as HTMLDivElement);
        mouseInfoRef.current?.setScrollPosition(element.scrollLeft,element.scrollTop);
    },[]);

    return (
        <div
            ref={containerRef}
            className="place-image-container"
            onMouseMove={handleMouseMove}
            onScroll={handleScroll}
        >
            {loading && (<Flex justify='center' align='center' style={{ width: "100%", height: "100%", background: "#333333"}}>
                <LoadingOutlined style={{ fontSize: "4em", color: "#1372ed" }}/>
            </Flex>)}
            <TileBar />
            <MouseInfo ref={mouseInfoRef} hide={loading} pixelScale={props.pixelScale}/>
            <canvas
                className="place-image" 
                ref={canvasRef} 
                width={CANVAS_WIDTH} 
                height={CANVAS_HEIGHT}
                onClick={placePixel}
                style={style}
            />
        </div>
    );
}