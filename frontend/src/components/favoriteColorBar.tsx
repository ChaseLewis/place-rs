import React, { useEffect } from 'react';
import { Tooltip } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { usePlaceStore } from '../store/usePlaceStore';
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

export const FavoriteColorBar: React.FC = () => {
  const { color, favoriteColors, addFavoriteColor, removeFavoriteColor, setColor } = usePlaceStore();
  
  // Add preset colors if no favorites exist
  useEffect(() => {
    if (favoriteColors.length === 0) {
      PRESET_COLORS.forEach(presetColor => {
        addFavoriteColor(presetColor);
      });
    }
  }, []);
  
  const handleAddFavorite = () => {
    addFavoriteColor(color);
  };
  
  const handleRemoveFavorite = (colorToRemove: string) => {
    removeFavoriteColor(colorToRemove);
  };
  
  const handleSelectColor = (selectedColor: string) => {
    setColor(selectedColor);
  };

  return (
    <div className="favorite-color-bar">
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
    </div>
  );
};
