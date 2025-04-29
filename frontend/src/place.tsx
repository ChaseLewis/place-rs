import { Flex } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSpacetimeDB } from './useSpacetimeDB';
import { EventContext, Pixel, Player, ServerStats } from './spacetimedb';
import { useAnimationFrame } from 'motion/react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './util/chunks';
import { MouseInfo, MouseInfoRef } from './components/mouseInfo';
import { usePlaceStore } from './store/usePlaceStore';
import dayjs from 'dayjs';
import { TileBar } from './components/tileBar';
import { FavoriteColorBar } from './components/favoriteColorBar';
import './place.css';

export interface PixelRef {
    color: ImageData,
    colorDataView: DataView,
    dirty: boolean,
    recentlyFocused: boolean;
}

const useRefInit = function<T>(init: () => T) {
    const ref = useRef<T|null>(null)
    if(ref.current === null) {
        ref.current = init();
    }
    return ref;
}

interface ZoomInfo {
    normXTarget: number,
    normYTarget: number,
    clientX: number,
    clientY: number
}

interface ZoomUpdate {
    newZoomValue: number
}

function processZoom(e: WheelEvent,oldZoom: number): number {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const modifier = Math.abs(delta) >= 100 ? 0.005 : 0.1;
    return Math.min(Math.max(0.5,oldZoom - modifier*delta),25.0);
}

export const PlaceImage = (props: {
    url: string, 
    style?: React.CSSProperties
}) => { 
    
    const [loading,setLoading] = useState(true);
    const [pixelScale,setPixelScale] = useState(1);
    const placeStore = usePlaceStore();
    const mouseInfoRef = useRef<MouseInfoRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const zoomInfo = useRef<ZoomInfo|null>(null);
    const deferredZoomUpdate = useRef<ZoomUpdate>({ newZoomValue: 1.0 });
    mouseInfoRef.current?.setCanvasRef(canvasRef.current);
    mouseInfoRef.current?.setContainerRef(containerRef.current);
    const spacetimeDb = useSpacetimeDB({ url: props.url });
    const refPixelData = useRefInit<PixelRef>(() => {
        const colorBuffer = new ImageData(CANVAS_WIDTH,CANVAS_HEIGHT);
        return {
            color: colorBuffer,
            colorDataView: new DataView(colorBuffer.data.buffer),
            dirty: true,
            recentlyFocused: false
        } as PixelRef;
    });

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if(e.key === "ArrowLeft") {
                placeStore.goBackColorHistory();
                e.preventDefault();
                return;
            }

            if(e.key === "ArrowRight") {
                placeStore.goForwardColorHistory();
                e.preventDefault();
                return;
            }

            if(e.key >= "1" && e.key <= "9") {
                let offset = parseInt(e.key) - 1;
                if(offset < placeStore.favoriteColors.length) {
                    placeStore.setColor(placeStore.favoriteColors[offset]);
                }
                return;
            }
        };
        window.addEventListener("keydown",handleKeys);

        return () => {
            window.removeEventListener("keydown",handleKeys);
        };
    },[placeStore]);

    useEffect(() => {
        //Don't want to accidentally navigate away
        window.onbeforeunload = () => { return true; }
        const handleInitialFocus = () => {
            if(refPixelData.current && !refPixelData.current.recentlyFocused) {
                refPixelData.current.recentlyFocused = true;
                setTimeout(() => { 
                    if(refPixelData.current) {
                        refPixelData.current.recentlyFocused = false;
                    }
                },100);
            }

        };
        window.addEventListener("focus",handleInitialFocus);

        return () => { 
            window.onbeforeunload = null;
            window.removeEventListener("focus",handleInitialFocus);
        };
    },[]);

    useEffect(() => {
        const wheelHandler = (e: WheelEvent) => {
          if(e.ctrlKey)
          {
            e.preventDefault();
            const target = (e.target as HTMLElement);
            if(target.matches("canvas") && canvasRef.current)
            {
                const canvasBox = canvasRef.current.getBoundingClientRect();
                const normXTarget = e.offsetX/canvasBox.width;
                const normYTarget = e.offsetY/canvasBox.height;
                if(!zoomInfo.current)
                {
                    zoomInfo.current = {
                        normXTarget,
                        normYTarget,
                        clientX: e.clientX,
                        clientY: e.clientY
                    };
                }
            }

            deferredZoomUpdate.current.newZoomValue = processZoom(e,deferredZoomUpdate.current.newZoomValue);
            return false;
          }
          else
          {
            zoomInfo.current = null;
          }
        };

        const clearZoomInfo = () => {
            zoomInfo.current = null;
        };
    
        window.addEventListener("wheel",wheelHandler,{ passive: false });
        window.addEventListener("mousemove",clearZoomInfo,{ passive: false });
        window.addEventListener("mouseleave",clearZoomInfo,{ passive: false });
        window.addEventListener("mouseenter",clearZoomInfo,{ passive: false });
    
        return () => {
          window.removeEventListener("wheel",wheelHandler);
          window.removeEventListener("mousemove",clearZoomInfo);
          window.removeEventListener("mouseenter",clearZoomInfo);
          window.removeEventListener("mouseleave",clearZoomInfo);
        };
      },[]);
  
    useEffect(() => {
        if(!spacetimeDb.conn || !spacetimeDb.identity) {
            return;
        }

        const statsInsert = (_ctx: EventContext,row: ServerStats) => {
            placeStore.setActiveUserCount(row.activePlayers);
            console.log({ type: "insert", row });
        }
        spacetimeDb.conn.db.serverStats.onInsert(statsInsert);

        const statsUpdate = (_ctx: EventContext,row: ServerStats) => {
            placeStore.setActiveUserCount(row.activePlayers);
            console.log({ type: "update", row });
        }
        spacetimeDb.conn.db.serverStats.onUpdate(statsUpdate);

        const playerInsert = (_ctx: EventContext,row: Player) => {
            if(spacetimeDb.identity && row.identity.isEqual(spacetimeDb.identity)) {
                placeStore.setNextRestoreTimestamp(dayjs(row.nextAction.toDate()));
            }
        };
        spacetimeDb.conn.db.players.onInsert(playerInsert);

        const playerUpdate = (_ctx: EventContext,_oldRow: Player,newRow: Player) => {
            if(spacetimeDb.identity && newRow.identity.isEqual(spacetimeDb.identity)) {
                placeStore.setNextRestoreTimestamp(dayjs(newRow.nextAction.toDate()));    
            }
        };
        spacetimeDb.conn.db.players.onUpdate(playerUpdate);

        const pixelsUpdate = (_ctx: EventContext, _oldRow: Pixel, newRow: Pixel) => {
            if(refPixelData.current) {
                refPixelData.current?.colorDataView.setUint32(4*newRow.pixelId,newRow.color);
                refPixelData.current.dirty = true;
            }
        };
        spacetimeDb.conn.db.pixels.onUpdate(pixelsUpdate);

        const playerSub = spacetimeDb.conn.subscriptionBuilder()
        .onApplied(() => {
            console.log("Players sub applied!");
        }) 
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
            spacetimeDb.conn?.db.serverStats.removeOnInsert(statsInsert);
            spacetimeDb.conn?.db.serverStats.removeOnUpdate(statsUpdate);
            spacetimeDb.conn?.db.players.removeOnInsert(playerInsert);
            spacetimeDb.conn?.db.players.removeOnUpdate(playerUpdate);
            spacetimeDb.conn?.db.pixels.removeOnUpdate(pixelsUpdate);
        };
    },[spacetimeDb.conn,spacetimeDb.identity]);

    useAnimationFrame(() => {

        //We handle the zoom like this since handling it in different events
        //causes a lot of jittering. We can get a smoothly animated zoom this way.
        //Also you can get multiple wheel/zoom commands per animation frame which
        //can make react very very very unhappy with draw calls if we handle it there.
        setPixelScale(() => {
            return deferredZoomUpdate.current.newZoomValue;
        });

        //If we are in a zoom operation we want to keep the mouse over the same pixel
        //and that pixel in the same relative position on screen. This moves the scroll wheel
        //to manage that.
        if(containerRef.current && canvasRef.current && zoomInfo.current) {
            const zoom = zoomInfo.current;
            const canvasRect = canvasRef.current.getBoundingClientRect();
            const offsetX = zoom.normXTarget*canvasRect.width + Math.abs(canvasRef.current.offsetLeft) - zoom.clientX;
            const offsetY = zoom.normYTarget*canvasRect.height + Math.abs(canvasRef.current.offsetTop) - zoom.clientY;
            containerRef.current.scrollLeft = offsetX;
            containerRef.current.scrollTop = offsetY;
            return;
        }


        if(!canvasRef.current || !refPixelData.current) {
            return;
        }

        const ctx = canvasRef.current.getContext('2d');
        if(!ctx || !refPixelData.current.dirty) {
            return;
        }

        //We have new data so lets draw it to screen!
        ctx.putImageData(refPixelData.current.color,0,0);
        refPixelData.current.dirty = false;
    });

    //We need to use the mouse position here to actually calculate the pixel placement
    const placePixel = useCallback((_e: React.MouseEvent<HTMLCanvasElement>) => {
        if(!spacetimeDb.conn || !spacetimeDb.conn.isActive|| !containerRef.current || !mouseInfoRef.current || refPixelData.current?.recentlyFocused) {
            return;
        }

        if(!dayjs().isAfter(placeStore.nextRestoreTimestamp)) {
            placeStore.setCooldownClick(true);
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
                const r = ((pixel >> 24) & 0xFF).toString(16).padStart(2,"0");
                const g = ((pixel >> 16) & 0xFF).toString(16).padStart(2,"0");
                const b = ((pixel >> 8) & 0xFF).toString(16).padStart(2,"0");
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
        placeStore.makeHistoryCurrent();
    },[placeStore,placeStore.nextRestoreTimestamp,pixelScale,spacetimeDb.conn]);

    const style = useMemo(() => {
        return { 
            width: `${pixelScale*CANVAS_WIDTH}px`, 
            height: `${pixelScale*CANVAS_HEIGHT}px`,
            imageRendering: "pixelated",
            margin: "100px",
            display: loading ? "none" : undefined
        } as React.CSSProperties;
        
    },[pixelScale,loading]);

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
                const r = ((pixel >> 24) & 0xFF).toString(16).padStart(2,"0");
                const g = ((pixel >> 16) & 0xFF).toString(16).padStart(2,"0");
                const b = ((pixel >> 8) & 0xFF).toString(16).padStart(2,"0");
                placeStore.setEyeDropColor(`#${r}${g}${b}`);
            }
        }

        mouseInfoRef.current?.onMouseMove(e);
    },[placeStore]);

    const downloadImage = useCallback(() => {
        if(canvasRef.current)
            {
                var download = document.createElement("a");
                var image = canvasRef.current.toDataURL("image/png");
                download.setAttribute("download","pixelz.png");
                download.setAttribute("href", image);
                download.click();
            }
    },[]);

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
                <TileBar hide={loading} downloadImage={downloadImage}/>
                <MouseInfo 
                    ref={mouseInfoRef} 
                    hide={loading} 
                    pixelScale={pixelScale} 
                    setPixelScale={(scale: number) => {
                        deferredZoomUpdate.current.newZoomValue = scale;
                    }}
                />
                <FavoriteColorBar hide={loading}/>
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