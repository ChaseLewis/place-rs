import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSpacetimeDB } from './useSpacetimeDB';
import { EventContext, Pixel } from './spacetimedb';
import { useAnimationFrame } from 'motion/react';

export interface PixelRef {
    color: ImageData,
    colorDataView: DataView,
    version: BigUint64Array,
    dirty: boolean
}

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1000;

export const PlaceImage = (props: {
    url: string, pixelScale: number, style?: React.CSSProperties
}) => {
    console.log("Image??");
    //Queries & Module should be parameters here.
    const refPixelData = useRef<PixelRef|null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    if(refPixelData.current === null) {

        const colorBuffer = new ImageData(CANVAS_WIDTH,CANVAS_HEIGHT);
        refPixelData.current = {
            color: colorBuffer,
            colorDataView: new DataView(colorBuffer.data.buffer),
            version: new BigUint64Array(4096*4096),
            dirty: true
        } as PixelRef;
    }
    
    const spacetimeDb = useSpacetimeDB({ url: props.url });

    useEffect(() => {
        if(!spacetimeDb.conn) {
            return;
        }

        spacetimeDb.conn.db.pixels.onUpdate((_ctx: EventContext, _oldRow: Pixel, newRow: Pixel) => {
            if(!refPixelData.current) {
                return;
            }

            if(refPixelData.current.version[newRow.pixelId] < newRow.versionId) {
                console.log({ newRow });
                refPixelData.current.colorDataView.setUint32(4*newRow.pixelId,newRow.color);
                refPixelData.current.version[newRow.pixelId] = newRow.versionId;
                refPixelData.current.dirty = true;
            }
        });

    },[spacetimeDb.conn]);


    useEffect(() => {
        console.log("Checking connection...");

        if(spacetimeDb.conn) {
            console.log("conn exists!");
        }

        if(!spacetimeDb.conn || !spacetimeDb.connected || !refPixelData.current) {
            console.log({ spacetimeDb, refPixelData });
            return;
        }
        
        const query = "SELECT * FROM pixels";
        console.log("Building query ",query);

        spacetimeDb.conn.subscriptionBuilder()
        .onApplied(() => {

            console.log("Application complete!");
            if(!spacetimeDb.conn || !refPixelData.current) {
                return;
            }

            console.log("Pixel table applied...");
            console.log("Starting pixel copy...");
            for(const pixel of spacetimeDb.conn.db.pixels.iter())
            {
                if(refPixelData.current.version[pixel.pixelId] < pixel.versionId) {
                    refPixelData.current.colorDataView.setUint32(4*pixel.pixelId,pixel.color);
                    refPixelData.current.version[pixel.pixelId] = pixel.versionId;
                    refPixelData.current.dirty = true;
                }
            }
            console.log("Completed copying data to buffer");
        })
        .onError((ex) => {
            console.error(ex);
            console.error("Failed to subscribe ",query)
        })
        .subscribe(query);

    },[spacetimeDb.conn]);

    useAnimationFrame((timestamp: number, delta: number) => {
        if(!canvasRef.current || !refPixelData.current) {
            return;
        }

        const ctx = canvasRef.current.getContext('2d');
        if(!ctx || !refPixelData.current.dirty) {
            return;
        }

        console.log({ refPixelData });
        ctx.putImageData(refPixelData.current.color,0,0);
        refPixelData.current.dirty = false;
        console.log("Redrawing Canvas...");
    });

    const placePixel = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {

        if(!spacetimeDb.conn || !spacetimeDb.connected) {
            console.log({ spacetimeDb });
            return;
        }

        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const pixelX = Math.floor((e.clientX - rect.left)/ props.pixelScale);
        const pixelY = Math.floor((e.clientY - rect.top) / props.pixelScale);
        const pixelId = pixelY*CANVAS_WIDTH + pixelX;
        console.log({ pixelX, pixelY, pixelId, rect, clientX: e.clientX, clientY: e.clientY });
        spacetimeDb.conn.reducers.updatePixelCoord(pixelId,0xFFA500FF);

    },[props.pixelScale,spacetimeDb.conn,spacetimeDb.connected]);

    const style = useMemo(() => {
        return { 
            width: `${props.pixelScale*CANVAS_WIDTH}px`, 
            height: `${props.pixelScale*CANVAS_HEIGHT}px`,
            imageRendering: "pixelated"
        } as React.CSSProperties;
        
    },[props.pixelScale])

    return (
        <canvas
            className="place-image" 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT}
            onClick={placePixel}
            style={style}
        />
    );
}