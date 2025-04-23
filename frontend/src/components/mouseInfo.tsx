import './mouseInfo.css';
import { useAnimationFrame } from 'motion/react';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../util/chunks';
import { forwardRef, useState, useImperativeHandle, useRef } from 'react';
import { RollbackOutlined } from '@ant-design/icons';
import { Button, Flex } from 'antd';

export interface MouseInfoRef {
    canvasPosition(): [number,number];
    setCanvasRef: (canvas: HTMLCanvasElement|null) => void;
    setContainerRef: (container: HTMLDivElement|null) => void;
    onMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
}

export const MouseInfo = forwardRef((props: { hide: boolean, pixelScale: number, setPixelScale?: (scale: number) => void },ref) => {

    const [pixelPosition,setPixelPosition] = useState<[number,number]>([0,0]);
    const positionRef = useRef<[number,number]>([0,0]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastMousePosition = useRef<[number,number]>([0,0]);

    useAnimationFrame(() => {
        if(!canvasRef.current || !containerRef.current || !lastMousePosition.current) {
            return;
        }

        const canvas = canvasRef.current;
        const canvasBox = canvas.getBoundingClientRect();

        let x = CANVAS_WIDTH*((lastMousePosition.current[0] - canvasBox.left)/canvasBox.width);
        let y = CANVAS_HEIGHT*((lastMousePosition.current[1] - canvasBox.top)/canvasBox.height);

        x = Math.max(0,Math.min(CANVAS_WIDTH-1,Math.floor(x)))+1;
        y = Math.max(0,Math.min(CANVAS_HEIGHT-1,Math.floor(y)))+1;
        positionRef.current[0] = x - 1;
        positionRef.current[1] = y - 1;
        setPixelPosition((oldValue) => {
            if(oldValue[0] !== x || oldValue[1] !== y) {
                return [x,y];
            }
            return oldValue;
        });
    });

    useImperativeHandle(ref,() => {
        return {
            canvasPosition: () => { return positionRef.current; },
            setCanvasRef: (canvas: HTMLCanvasElement|null) => {
                canvasRef.current = canvas;
            },
            setContainerRef: (container: HTMLDivElement|null) => {
                containerRef.current = container;
            },
            onMouseMove: (e: React.MouseEvent<HTMLElement>) => {  
                lastMousePosition.current[0] = e.pageX;
                lastMousePosition.current[1] = e.pageY;
            }   
        };
    },[]);

    if(props.hide) {
        return null;
    }

    return (
    <Flex className="mouse-position-info">
        <Flex flex={1} justify="center" align="center">
            {`(${pixelPosition[0]},${pixelPosition[1]})`}
        </Flex> 
        <Flex justify="center" align="center">
            {`x${props.pixelScale.toFixed(2)}`}
        </Flex>
        <Button  style={{ marginLeft: "4px" }} type="text" onClick={() => props.setPixelScale?.(1.0)}><RollbackOutlined /></Button>
    </Flex>
    );
});