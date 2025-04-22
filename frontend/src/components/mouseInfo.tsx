import { forwardRef, useState, useImperativeHandle } from 'react';
import './mouseInfo.css';
import { CANVAS_CHUNK_Y_COUNT, CANVAS_HEIGHT, CANVAS_WIDTH } from '../util/chunks';

export interface MouseInfoRef {
    setMousePosition: (x: number,y: number) => void;
    setScrollPosition: (x: number,y: number) => void;
}

export const MouseInfo = forwardRef((props: { hide: boolean, pixelScale: number },ref) => {

    const [mousePosition,setMousePosition] = useState<[number,number]>([0,0]);
    const [scrollPosition,setScrollPosition] = useState<[number,number]>([0,0]);

    useImperativeHandle(ref,() => {
        return {
            setMousePosition: (x: number,y: number) => { setMousePosition([x,y]); },
            setScrollPosition: (x: number,y: number) => { setScrollPosition([x,y]); }
        };
    },[]);

    if(props.hide) {
        return null;
    }

    let xOffset = Math.min(Math.max(Math.floor((scrollPosition[0] + mousePosition[0])/props.pixelScale),0),CANVAS_WIDTH-1);
    let yOffset = Math.min(Math.max(Math.floor((scrollPosition[1] + mousePosition[1])/props.pixelScale),0),CANVAS_HEIGHT-1);
    let scrollText = `(${xOffset},${yOffset})`;

    return (
    <div className="mouse-position-info">
        {scrollText}
    </div>
    );
});