import React, { useEffect, useRef } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../util/chunks';
import './pixelOverlay.css';
import { usePlaceStore } from '../store/usePlaceStore';

// Minimum zoom level at which the overlay will be shown
const ZOOM_THRESHOLD = 1;

interface PixelOverlayProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  pixelPosition: [number, number];
  hide: boolean;
  pixelScale: number;
}

export const PixelOverlay: React.FC<PixelOverlayProps> = ({ 
  canvasRef, 
  pixelPosition, 
  hide,
  pixelScale
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const placeStore = usePlaceStore();
  const prevPositionRef = useRef<[number, number]>(pixelPosition);
  // Create isScrolling ref at the top level of the component
  const isScrollingRef = useRef(false);
  const scrollTimerRef = useRef<number | null>(null);
  
  // We'll use this to track if we should apply the animation class
  const shouldAnimate = prevPositionRef.current[0] !== pixelPosition[0] || 
                         prevPositionRef.current[1] !== pixelPosition[1];

  // This effect runs on every frame to closely track mouse movement
  // Using requestAnimationFrame for smoother performance
  useEffect(() => {
    if (hide || placeStore.colorPickerOpen) {
      return;
    }
    
    let animationFrameId: number;
    
    // Scroll handling function
    const handleScroll = () => {
      // Mark that we're scrolling
      isScrollingRef.current = true;
      
      // Clear any existing timeout
      if (scrollTimerRef.current) {
        window.clearTimeout(scrollTimerRef.current);
      }
      
      // Set a timeout to indicate when scrolling has "stopped"
      scrollTimerRef.current = window.setTimeout(() => {
        isScrollingRef.current = false;
      }, 50) as unknown as number; // 50ms after last scroll event
    };
    
    // Add scroll events to the app container which is the actual scrollable element
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      appContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    const updateOverlayPosition = () => {
      if (!overlayRef.current || !canvasRef.current) {
        animationFrameId = requestAnimationFrame(updateOverlayPosition);
        return;
      }
      
      const canvas = canvasRef.current;
      const canvasRect = canvas.getBoundingClientRect();
      const overlay = overlayRef.current;
      
      // Get current pixel position
      const x = pixelPosition[0];
      const y = pixelPosition[1];
      
      // Check if position has changed, if so mark for animation
      if (prevPositionRef.current[0] !== x || prevPositionRef.current[1] !== y) {
        overlay.classList.add('animate-move');
        // Remove animation class after animation completes
        setTimeout(() => {
          if (overlayRef.current) {
            overlayRef.current.classList.remove('animate-move');
          }
        }, 300); // Animation duration
        
        // Update previous position
        prevPositionRef.current = [x, y];
      }
      
      // Only show if within canvas bounds and zoomed in enough
      // The pixelScale in place.tsx is set with a min of 0.5 and max of 25.0
      if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT || pixelScale < ZOOM_THRESHOLD) {
        overlay.style.display = 'none';
        animationFrameId = requestAnimationFrame(updateOverlayPosition);
        return;
      }
      
      // If we're currently scrolling, don't show the overlay to avoid the jumping effect
      if (isScrollingRef.current) {
        overlay.style.display = 'none';
        animationFrameId = requestAnimationFrame(updateOverlayPosition);
        return;
      }
      
      // Calculate the pixel dimensions based on current zoom level
      const pixelWidth = (canvasRect.width / CANVAS_WIDTH);
      const pixelHeight = (canvasRect.height / CANVAS_HEIGHT);
      
      // Calculate screen coordinates
      // Get the canvas position in the viewport
      const left = canvasRect.left + x * pixelWidth;
      const top = canvasRect.top + y * pixelHeight;
      
      // Check if pixel overlay would appear over any of the bars, and hide it if so
      const tileBarElem = document.querySelector('.tile-bar');
      const favoriteBarElem = document.querySelector('.favorite-color-bar');
      
      // Check if the overlay would overlap with either bar
      if (tileBarElem || favoriteBarElem) {
        const overlayRect = {
          left: left,
          top: top,
          right: left + pixelWidth,
          bottom: top + pixelHeight
        };
        
        // Check overlap with tile bar
        if (tileBarElem) {
          const tileBarRect = tileBarElem.getBoundingClientRect();
          if (!(overlayRect.right < tileBarRect.left || 
                overlayRect.left > tileBarRect.right || 
                overlayRect.bottom < tileBarRect.top || 
                overlayRect.top > tileBarRect.bottom)) {
            overlay.style.display = 'none';
            animationFrameId = requestAnimationFrame(updateOverlayPosition);
            return;
          }
        }
        
        // Check overlap with favorite color bar
        if (favoriteBarElem) {
          const favoriteBarRect = favoriteBarElem.getBoundingClientRect();
          if (!(overlayRect.right < favoriteBarRect.left || 
                overlayRect.left > favoriteBarRect.right || 
                overlayRect.bottom < favoriteBarRect.top || 
                overlayRect.top > favoriteBarRect.bottom)) {
            overlay.style.display = 'none';
            animationFrameId = requestAnimationFrame(updateOverlayPosition);
            return;
          }
        }
      }
      
      // Position the overlay directly using fixed positioning
      overlay.style.display = 'block';
      overlay.style.position = 'fixed';
      overlay.style.left = `${left}px`;
      overlay.style.top = `${top}px`;
      overlay.style.width = `${pixelWidth}px`;
      overlay.style.height = `${pixelHeight}px`;
      
      // Get color based on current mode - always get fresh color from placeStore
      const color = placeStore.clickMode === "Pixel" ? placeStore.color : placeStore.eyeDropColor;
      
      // Only show border, not background
      overlay.style.backgroundColor = 'transparent';
      overlay.style.borderColor = color;
      
      // Apply a different style for eyedropper mode
      if (placeStore.clickMode === "EyeDropper") {
        overlay.classList.add('eyedropper-mode');
      } else {
        overlay.classList.remove('eyedropper-mode');
      }
      
      animationFrameId = requestAnimationFrame(updateOverlayPosition);
    };
    
    // Start the animation loop
    animationFrameId = requestAnimationFrame(updateOverlayPosition);
    
    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (overlayRef.current) {
        overlayRef.current.style.display = 'none';
      }
    };
  }, [
    hide, 
    placeStore.colorPickerOpen, 
    pixelPosition, 
    pixelScale, 
    placeStore.color, 
    placeStore.eyeDropColor, 
    placeStore.clickMode
  ]);

  // Remove the second effect since we've included its logic in the main effect

  return <div ref={overlayRef} className="pixel-overlay" />;
};
