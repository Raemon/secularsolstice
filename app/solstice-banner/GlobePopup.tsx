'use client';
import React, { useEffect, useState, useRef } from "react";
import { useFloating, autoUpdate, offset, flip, shift } from '@floating-ui/react-dom';
import { SolsticeEvent } from './types';

const formatDate = (date: string, format: string) => {
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 || 12;
  if (format === "h:mm a") return `${hour12}:${minutes} ${ampm}`;
  return `${month} ${day} ${hour12}:${minutes} ${ampm}`;
};

export const GlobePopup = ({document, screenCoords, onClose}: {
  document: SolsticeEvent;
  screenCoords: { x: number; y: number };
  onClose: () => void;
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [triangleStyle, setTriangleStyle] = useState<React.CSSProperties>({});
  const bgColor = '#e5e7eb';

  const { refs, floatingStyles, placement: actualPlacement } = useFloating({
    placement: 'right',
    middleware: [offset(25), flip({ fallbackPlacements: ['left'] }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    refs.setReference({
      getBoundingClientRect: () => ({
        width: 0,
        height: 0,
        x: screenCoords.x,
        y: screenCoords.y,
        top: screenCoords.y,
        left: screenCoords.x,
        right: screenCoords.x,
        bottom: screenCoords.y,
      }),
    });
  }, [refs, screenCoords.x, screenCoords.y]);

  useEffect(() => {
    if (!popupRef.current) return;
    const placementSide = actualPlacement.split('-')[0];

    const triangleConfig: Record<string, React.CSSProperties> = {
      right: {
        left: 0,
        top: '50%',
        transform: 'translateX(-100%) translateY(-50%)',
        borderWidth: '8px 10px 8px 0',
        borderColor: `transparent ${bgColor} transparent transparent`,
      },
      left: {
        left: '100%',
        top: '50%',
        transform: 'translateY(-50%)',
        borderWidth: '8px 0 8px 10px',
        borderColor: `transparent transparent transparent ${bgColor}`,
      }
    };

    setTriangleStyle({
      width: 0,
      height: 0,
      borderStyle: 'solid',
      ...triangleConfig[placementSide],
    });
  }, [actualPlacement, screenCoords.x, screenCoords.y, bgColor]);

  if (!document) return null;

  const startDate = document.startTime ? new Date(document.startTime) : null;
  const endDate = document.endTime ? new Date(document.endTime) : null;
  const areSameDay = startDate && endDate && 
    startDate.toDateString() === endDate.toDateString();
  const endTimeFormat = areSameDay ? "h:mm a" : "MMM D h:mm a";

  return (
    <div
      ref={(node) => {
        refs.setFloating(node);
        popupRef.current = node;
      }}
      style={floatingStyles}
      className="bg-gray-200 z-[10000000000] relative rounded-md shadow-xl p-2.5 max-w-[250px] relative text-black"
    >
      <div className="absolute" style={triangleStyle} />
      <a 
        href={document.url || '#'} 
        className="flex flex-col no-underline gap-1 hover:opacity-100"
        target="_blank" 
        rel="noopener noreferrer"
      >
        <div className="text-black font-georgia font-semibold tex-sm text-balance leading-tight mb-2">{document.title}</div>
        {(document.startTime || document.endTime) && (
          <div className="flex justify-start gap-1">
            {document.startTime && (
              <div className="font-normal text-sm opacity-80 leading-tight">
                <em>{startDate && startDate < new Date() ? "This event was on " : ""}{formatDate(document.startTime, "MMM D")}</em>
              </div>
            )}
          </div>
        )}
      </a>
    </div>
  );
};