import React, { useState, useRef, useEffect } from 'react';
import { PushpinOutlined, PushpinFilled } from '@ant-design/icons';
import { Tooltip } from 'antd';
import './draggableContainer.css';
import { BarPosition } from '../store/usePlaceStore';

interface DraggableContainerProps {
  children: React.ReactNode;
  position: BarPosition;
  onPositionChange: (position: BarPosition) => void;
  className?: string;
}

export const DraggableContainer: React.FC<DraggableContainerProps> = ({ 
  children, 
  position, 
  onPositionChange,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; initialPosX: number; initialPosY: number } | null>(null);
  
  // Apply the position as percentages
  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${position.x}vw`,
    top: `${position.y}vh`,
    transform: 'translate(-50%, -50%)',
    cursor: isDragging ? 'grabbing' : position.isPinned ? 'default' : 'grab',
    zIndex: isDragging ? 1001 : 1000,
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (position.isPinned) return;
    
    // Only initiate drag if it's not a child element being clicked
    const target = e.target as HTMLElement;
    if (target.closest('button, input, .ant-btn, .color-picker-section, .color-section')) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);
    
    // Store initial position - no need to use getBoundingClientRect() since we're working with viewport percentages
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPosX: position.x,
      initialPosY: position.y
    };
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && dragStartRef.current) {
      e.preventDefault();
      
      const { x, y, initialPosX, initialPosY } = dragStartRef.current;
      
      // Calculate movement as percentage of viewport
      const deltaX = (e.clientX - x) / window.innerWidth * 100;
      const deltaY = (e.clientY - y) / window.innerHeight * 100;
      
      // Update position
      const newX = Math.max(5, Math.min(95, initialPosX + deltaX));
      const newY = Math.max(5, Math.min(95, initialPosY + deltaY));
      
      onPositionChange({
        ...position,
        x: newX,
        y: newY
      });
    }
  };

  const togglePin = () => {
    onPositionChange({
      ...position,
      isPinned: !position.isPinned
    });
  };

  const resetPosition = () => {
    // Get the default position based on the className
    // TileBar default is x: 50, y: 95
    // FavoriteColorBar default is x: 50, y: 85
    const defaultPos = className.includes('tile-bar') 
      ? { x: 50, y: 95, isPinned: false } 
      : { x: 50, y: 87.5, isPinned: false };
    
    onPositionChange(defaultPos);
  };

  // Add global event listeners when dragging starts
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      ref={containerRef}
      className={`draggable-container ${className} ${isDragging ? 'dragging' : ''}`}
      style={style}
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      <div className="draggable-handle">
        <Tooltip title={position.isPinned ? "Unpin" : "Pin position"}>
          {position.isPinned ? (
            <PushpinFilled className="pin-icon" onClick={togglePin} />
          ) : (
            <PushpinOutlined className="pin-icon" onClick={togglePin} />
          )}
        </Tooltip>
      </div>
      {!position.isPinned && isHovered && (
        <Tooltip title="Reset to default position">
          <div className="reset-position-button" onClick={resetPosition}>
            ↺
          </div>
        </Tooltip>
      )}
    </div>
  );
};
