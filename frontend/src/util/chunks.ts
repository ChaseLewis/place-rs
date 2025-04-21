import { DbConnection } from '../spacetimedb';

export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 1000;
export const CANVAS_CHUNK_SIZE = 1000;
export const CANVAS_SIZE = CANVAS_HEIGHT*CANVAS_WIDTH;
export const PIXELS_PER_CHUNK = CANVAS_CHUNK_SIZE*CANVAS_CHUNK_SIZE;
export const CANVAS_CHUNK_X_COUNT = CANVAS_WIDTH / CANVAS_CHUNK_SIZE;
export const CANVAS_CHUNK_Y_COUNT = CANVAS_HEIGHT / CANVAS_CHUNK_SIZE;
export const CHUNK_COUNT = CANVAS_CHUNK_X_COUNT*CANVAS_CHUNK_Y_COUNT;

export const pixelIdToImageOffset = (pixelId: number): number => {
    const chunkId = Math.floor(pixelId / PIXELS_PER_CHUNK);
    const chunkOffset = pixelId - chunkId*PIXELS_PER_CHUNK;
    const chunkY = Math.floor(chunkId / CANVAS_CHUNK_X_COUNT);
    const chunkX = chunkId - chunkY*CANVAS_CHUNK_X_COUNT;
    const chunkOffsetY = Math.floor(chunkOffset / CANVAS_CHUNK_SIZE);
    const chunkOffsetX = chunkOffset - chunkOffsetY*CANVAS_CHUNK_SIZE;
    const yOffset = (chunkY*CANVAS_CHUNK_SIZE + chunkOffsetY)*CANVAS_WIDTH;
    const xOffset = chunkX*CANVAS_CHUNK_SIZE + chunkOffsetX;
    return yOffset + xOffset;
}

export const imageOffsetToPixelId = (x: number,y: number): number => {
    const chunkX = Math.floor(x / CANVAS_CHUNK_SIZE);
    const chunkY = Math.floor(y / CANVAS_CHUNK_SIZE);
    const chunkPixelIdStart = (chunkY*CANVAS_CHUNK_X_COUNT + chunkX)*PIXELS_PER_CHUNK;
    const chunkOffsetY = y - chunkY*CANVAS_CHUNK_SIZE;
    const chunkOffsetX = x - chunkX*CANVAS_CHUNK_SIZE;
    return chunkPixelIdStart + chunkOffsetY*CANVAS_CHUNK_SIZE + chunkOffsetX;
}

const chunkIdToRect = (chunkId: number): [number,number,number,number]|undefined => {
    if(chunkId < 0 || chunkId >= CHUNK_COUNT) {
        return undefined;
    }

    const chunkY = Math.floor(chunkId / CANVAS_CHUNK_SIZE);
    const chunkX = chunkId - chunkY*CANVAS_CHUNK_X_COUNT;
    const left = chunkX*CANVAS_CHUNK_SIZE;
    const right = left + CANVAS_CHUNK_SIZE - 1;
    const top = chunkY*CANVAS_CHUNK_SIZE;
    const bottom = top+CANVAS_CHUNK_SIZE - 1;
    return [left,right,top,bottom];
}

const pixelPositionToChunkCoords = (x: number,y: number): [number,number]|undefined => {
    if(x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) {
        return undefined;
    }

    const chunkX = Math.floor(x / CANVAS_CHUNK_SIZE);
    const chunkY = Math.floor(y / CANVAS_CHUNK_SIZE);
    return [chunkX,chunkY];
}

const chunkIdToPixelRange = (chunkId: number): [number,number]|undefined => {
    if(chunkId < 0 || chunkId >= CHUNK_COUNT) {
        return undefined;
    }

    const pixelStart = chunkId * PIXELS_PER_CHUNK;
    return [pixelStart,pixelStart+PIXELS_PER_CHUNK];
}

export class Chunk {
    chunkId: number;
    range: [number,number];
    left: number;
    right: number;
    top: number;
    bottom: number;
    subscription!: any; 

    constructor(chunkId: number) {
        if(chunkId < 0 || chunkId >= CHUNK_COUNT)
        {
            throw new Error(`chunkId ${chunkId} is out of range and does not correspond to a valid value.`);
        }
        this.chunkId = chunkId;
        this.range = chunkIdToPixelRange(chunkId) as [number,number]
        const [left,right,top,bottom] = chunkIdToRect(this.chunkId) as [number,number,number,number];
        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;
    }

    subscribe(conn: DbConnection) {
        if(this.isSubscribed()) {
            return;
        }

        const range= this.pixelRange();
        const query = `SELECT * FROM pixels WHERE pixel_id >= ${range[0]} AND pixel_id < ${range[1]}`;
    
        const launchTime = performance.now();
        this.subscription = conn.subscriptionBuilder()
        .onApplied(() => {
            const current = performance.now();
            console.log("ChunkId ",this.chunkId," applied (",current-launchTime,") ms. ",query);
        }) 
        .onError((ex) => {
            console.error(ex);
            console.error("ChunkId ",this.chunkId," failed to subscribe: ",query)
        })
        .subscribe(query);
    }

    isSubscribed() {
        return !!this.subscription;
    }

    unsubscribe() {
        if(this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }

    pixelRange(): [number,number] {
        return chunkIdToPixelRange(this.chunkId) as [number,number];
    }

    inView(viewRect: [number,number,number,number]): boolean {

        const [left,right,top,bottom] = viewRect;
        return !(
           this.left > right
        || this.right < left 
        || this.top < bottom
        || this.bottom > top
        );
    }
}


export class ChunkManager {

    margin: number;
    chunks: Map<number,Chunk>;

    constructor(margin: number = 25) {
        this.margin = margin;
        this.chunks = new Map();
    }

    release() {
        for(const [_key,item] of this.chunks.entries()) {
            item.unsubscribe();
        }   
        this.chunks.clear();
    }

    computeChunks(conn: DbConnection,viewRect: [number,number,number,number],scale: number) {

        for(let chunkId = 0;chunkId < CHUNK_COUNT;chunkId++) {
            if(!this.chunks.has(chunkId))
            {
                const chunk = new Chunk(chunkId);
                chunk.subscribe(conn);
                this.chunks.set(chunkId,chunk);
            }
        }
        // const pixelViewRect: [number,number,number,number] = [
        //     Math.floor(Math.max(viewRect[0] / scale - this.margin,0)),
        //     Math.ceil(Math.min(viewRect[1] / scale + this.margin,CANVAS_WIDTH-1)),
        //     Math.floor(Math.max(viewRect[2] / scale - this.margin,0)),
        //     Math.ceil(Math.min(viewRect[3] / scale + this.margin,CANVAS_HEIGHT-1))
        // ];

        // const invalidChunks: [number,Chunk][] = [];
        // //Check if our existing chunks are still valid
        // for(const [key,item] of this.chunks.entries()) {
        //     if(!item.inView(pixelViewRect)) {
        //         invalidChunks.push([key,item]);
        //     }
        // }

        // //Remove the chunks that are now invalid
        // for(const [key,chunk] of invalidChunks) {
        //     chunk.unsubscribe();
        //     this.chunks.delete(key);
        // }

        // const [topLeftX,topLeftY] = pixelPositionToChunkCoords(pixelViewRect[0],pixelViewRect[2]) as [number,number];
        // const [bottomRightX,bottomRightY] = pixelPositionToChunkCoords(pixelViewRect[1],pixelViewRect[3]) as [number,number];

        // for(let y = topLeftY;y <= bottomRightY;y++)
        // {
        //     for(let x = topLeftX;x <= bottomRightX;x++)
        //     {
        //         const chunkId = y*CANVAS_CHUNK_X_COUNT + x;
        //         if(!this.chunks.has(chunkId))
        //         {
        //             const chunk = new Chunk(chunkId);
        //             chunk.subscribe(conn);
        //             this.chunks.set(chunkId,chunk);
        //         }
        //     }
        // }
    }
}