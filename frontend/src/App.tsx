import './App.css'
import { PlaceImage } from './place';
import { useEffect, useRef, useState } from 'react';

function App() {

  const [pixelScale,setPixelScale] = useState(1);
  useEffect(() => {
    const wheelHandler = (e: WheelEvent) => {
      if(e.ctrlKey)
      {
        e.preventDefault();
        const deltaValue = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        //We need to put this into place Image -> then we need to handle the appropriate scroll
        //offset we want to get to
        setPixelScale((old) => { 
          return Math.min(Math.max(0.5,old - 0.1*deltaValue),25.0); 
        });
        return false;
      }
    };

    window.addEventListener("wheel",wheelHandler,{ passive: false });

    return () => {
      window.removeEventListener("wheel",wheelHandler);
    };
  },[]);

  return <PlaceImage url={"http://localhost:3001"} pixelScale={pixelScale} setPixelScale={setPixelScale}/>;
}

export default App
