'use client';

import { useState, type ReactNode } from 'react';

type DragAndDropListProps<T> = {
  items: T[];
  onReorder: (reorderedItems: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
  disabled?: boolean;
};

const DragAndDropList = <T,>({ items, onReorder, renderItem, keyExtractor, disabled }: DragAndDropListProps<T>) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    if (disabled) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const reorderedItems = [...items];
      const [removed] = reorderedItems.splice(draggedIndex, 1);
      const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
      reorderedItems.splice(adjustedDropIndex, 0, removed);
      onReorder(reorderedItems);
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  return (
    <div className="flex flex-col">
      {items.map((item, index) => (
        <div key={keyExtractor ? keyExtractor(item, index) : index}>
          {dropTargetIndex === index && draggedIndex !== null && (
            <div className="h-0.5 bg-blue-500 my-1" />
          )}
          <div
            draggable={!disabled}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 ${disabled ? 'cursor-default' : draggedIndex === index ? 'opacity-50 cursor-grabbing' : 'cursor-grab'}`}
          >
            {!disabled && (
              <div className="text-gray-500 select-none" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor">
                  <circle cx="2" cy="2" r="1"/>
                  <circle cx="2" cy="6" r="1"/>
                  <circle cx="2" cy="10" r="1"/>
                  <circle cx="6" cy="2" r="1"/>
                  <circle cx="6" cy="6" r="1"/>
                  <circle cx="6" cy="10" r="1"/>
                  <circle cx="10" cy="2" r="1"/>
                  <circle cx="10" cy="6" r="1"/>
                  <circle cx="10" cy="10" r="1"/>
                </svg>
              </div>
            )}
            <div className="flex-1">
              {renderItem(item, index)}
            </div>
          </div>
        </div>
      ))}
      {dropTargetIndex === items.length && draggedIndex !== null && (
        <div className="h-0.5 bg-blue-500 my-1" />
      )}
      <div
        onDragOver={(e) => handleDragOver(e, items.length)}
        onDrop={(e) => handleDrop(e, items.length)}
        className="h-8"
      />
    </div>
  );
};

export default DragAndDropList;
