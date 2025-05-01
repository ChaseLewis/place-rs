import { useEffect } from 'react';
import { Tooltip } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { usePlaceStore } from '../store/usePlaceStore';
import { DraggableContainer } from './DraggableContainer';
import './favoriteColorBar.css';

// Preset colors to add if no favorites exist
const PRESET_COLORS = [
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#000000', // Black
  '#FFFFFF'  // White
];

export const FavoriteColorBar = (props: { hide: boolean }) => {
  const placeStore = usePlaceStore();
  const { 
    color, 
    favoriteColors, 
    addFavoriteColor, 
    removeFavoriteColor, 
    setColor, 
    favoriteBarPosition, 
    updateFavoriteBarPosition 
  } = placeStore;
  
  // Add preset colors if no favorites exist
  useEffect(() => {
    if (favoriteColors.length === 0) {
      PRESET_COLORS.forEach(presetColor => {
        addFavoriteColor(presetColor);
      });
    }
  }, []);

  // When a bar is pinned, ensure the reset layout button is visible
  useEffect(() => {
    if (!placeStore.showResetLayoutButton && 
        (placeStore.tileBarPosition.isPinned || favoriteBarPosition.isPinned)) {
      placeStore.setShowResetLayoutButton(true);
    }
  }, [placeStore.tileBarPosition.isPinned, favoriteBarPosition.isPinned]);
  
  const handleAddFavorite = () => {
    addFavoriteColor(color);
  };
  
  const handleRemoveFavorite = (colorToRemove: string) => {
    removeFavoriteColor(colorToRemove);
  };
  
  const handleSelectColor = (selectedColor: string) => {
    setColor(selectedColor);
  };

  if(props.hide) {
    return null;
  }

  return (
    <DraggableContainer
      position={favoriteBarPosition}
      onPositionChange={updateFavoriteBarPosition}
      className="favorite-color-bar"
    >
      <div className="favorite-colors-container">
        {favoriteColors.map((favoriteColor, index) => (
          <Tooltip title={favoriteColor} key={`${favoriteColor}-${index}`}>
            <div 
              className={`favorite-color-item ${favoriteColor === color ? 'selected' : ''}`}
              style={{ backgroundColor: favoriteColor }}
              onClick={() => handleSelectColor(favoriteColor)}
            >
              <div 
                className="remove-favorite"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFavorite(favoriteColor);
                }}
              >
                <MinusOutlined />
              </div>
            </div>
          </Tooltip>
        ))}
        <Tooltip title="Add current color to favorites">
          <div 
            className="add-favorite-button" 
            onClick={handleAddFavorite}
          >
            <PlusOutlined />
          </div>
        </Tooltip>
      </div>
    </DraggableContainer>
  );
};
