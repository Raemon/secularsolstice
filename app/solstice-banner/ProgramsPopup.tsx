'use client';
import React, { useEffect, useState, useRef } from "react";
import { useFloating, autoUpdate, offset, flip, shift } from '@floating-ui/react-dom';
import Link from 'next/link';
import type { ProgramWithLocation } from '../../lib/programLocations';

export const ProgramsPopup = ({programs, city, screenCoords, onClose}: {
  programs: ProgramWithLocation[];
  city: string;
  screenCoords: { x: number; y: number };
  onClose: () => void;
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [triangleStyle, setTriangleStyle] = useState<React.CSSProperties>({});
  const bgColor = '#11101b';

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

  if (!programs.length) return null;

  return (
    <div
      ref={(node) => {
        refs.setFloating(node);
        popupRef.current = node;
      }}
      style={floatingStyles}
      className="bg-[#22212c] text-white z-[10000000000] relative rounded-md shadow-xl p-2.5 max-w-[280px]"
    >
      <div className="absolute" style={triangleStyle} />
      <div className="font-georgia font-semibold text-lg mb-2">{city} Solstice Programs</div>
      <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
        {programs.map((program) => (
          <Link
            key={program.id}
            href={`/programs/${program.id}/script`}
            className="text-sm text-white hover:text-blue-600 hover:underline"
          >
            {program.title}
          </Link>
        ))}
        <span className="text-[11px] text-gray-300 italic mt-2">Click to read</span>
      </div>
    </div>
  );
};