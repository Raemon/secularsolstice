'use client';
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { SolsticeGlobe3DProps, SolsticeGlobePoint } from './types';
import { useGlobeDayNightMaterial, useGlobeReadyEffects, useEventListener } from './hooks';
import { mapPointsToMarkers } from './utils';
import { createLightBeams, setBeamHovered } from './LightBeams';
import { DEFAULT_DAY_IMAGE_URL, DEFAULT_NIGHT_IMAGE_URL, DEFAULT_LUMINOSITY_IMAGE_URL, DEFAULT_ALTITUDE_SCALE, DEFAULT_INITIAL_ALTITUDE_MULTIPLIER, DEFAULT_NIGHT_SKY_IMAGE_URL } from './solsticeSeasonConstants';
import { type GlobeMethods } from 'react-globe.gl';
import dynamic from 'next/dynamic';

const Globe = dynamic(() => import('react-globe.gl').then(mod => mod.default), { ssr: false });

type GlobeMarkerData = {
  lat: number;
  lng: number;
  size: number;
  color?: string;
  eventId?: string;
  event?: unknown;
  _index: number;
  programCount?: number;
};

export const SolsticeGlobe3D = ({
  pointsData,
  defaultPointOfView,
  onPointClick,
  onPointHover,
  onReady,
  onFullyLoaded,
  className,
  style,
  onClick,
  dayImageUrl = DEFAULT_DAY_IMAGE_URL,
  nightImageUrl = DEFAULT_NIGHT_IMAGE_URL,
  luminosityImageUrl = DEFAULT_LUMINOSITY_IMAGE_URL,
  altitudeScale = DEFAULT_ALTITUDE_SCALE,
  initialAltitudeMultiplier = DEFAULT_INITIAL_ALTITUDE_MULTIPLIER,
  markerStyle = 'pins',
}: SolsticeGlobe3DProps) => {
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  const [screenHeight, setScreenHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 1000);
  const [isHoveringMarker, setIsHoveringMarker] = useState(false);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const globeMaterialRef = useGlobeDayNightMaterial();
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const shouldIgnoreClickRef = useRef(false);
  const clickIgnoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initialPov = useMemo(() => ({
    lat: defaultPointOfView.lat,
    lng: defaultPointOfView.lng,
    altitude: defaultPointOfView.altitude * initialAltitudeMultiplier,
  }), [defaultPointOfView.lat, defaultPointOfView.lng, defaultPointOfView.altitude, initialAltitudeMultiplier]);

  useGlobeReadyEffects(isGlobeReady, globeRef, globeMaterialRef, dayImageUrl, nightImageUrl, luminosityImageUrl, initialPov, onReady, () => {
    setIsFullyLoaded(true);
    onFullyLoaded?.();
  });

  // Disable zoom on the globe's orbit controls
  useEffect(() => {
    if (!isGlobeReady || !globeRef.current) return;
    const controls = globeRef.current.controls?.();
    if (controls) {
      controls.enableZoom = false;
    }
  }, [isGlobeReady]);
  
  const findMarkerElement = useCallback((element: HTMLElement | null, clientX?: number, clientY?: number): HTMLElement | null => {
    const allMarkers = Array.from(document.querySelectorAll('div[data-globe-marker]'));
    
    if (clientX !== undefined && clientY !== undefined) {
      for (const marker of allMarkers) {
        if (marker instanceof HTMLElement) {
          const rect = marker.getBoundingClientRect();
          if (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
          ) {
            return marker;
          }
        }
      }
    }
    
    let current: HTMLElement | null = element;
    while (current) {
      if (current.hasAttribute && current.hasAttribute('data-globe-marker')) {
        return current;
      }
      current = current.parentElement;
    }
    
    return null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
    
    const target = e.target as HTMLElement;
    const markerElement = findMarkerElement(target, e.clientX, e.clientY);
    
    if (markerElement) {
      const markerIndexStr = markerElement.getAttribute('data-marker-index');
      if (markerIndexStr !== null) {
        const markerIndex = parseInt(markerIndexStr, 10);
        if (!isNaN(markerIndex) && markerIndex >= 0 && markerIndex < pointsData.length) {
          const originalPoint = pointsData[markerIndex];
          
          if (onPointClick && originalPoint.eventId) {
            const solsticePoint: SolsticeGlobePoint = {
              lat: originalPoint.lat,
              lng: originalPoint.lng,
              size: originalPoint.size,
              eventId: originalPoint.eventId,
              event: originalPoint.event,
            };
            const markerRect = markerElement.getBoundingClientRect();
            const markerCenter = {
              x: markerRect.left + (markerRect.width / 2),
              y: markerRect.top + (markerRect.height / 2),
            };
            onPointClick(solsticePoint, markerCenter);
            e.stopPropagation();
          }
        }
      }
      return;
    }
    
    if (!shouldIgnoreClickRef.current) {
      onClick?.(e);
    }
  }, [findMarkerElement, pointsData, onPointClick, onClick]);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (dragStartRef.current) {
      const deltaX = Math.abs(e.clientX - dragStartRef.current.x);
      const deltaY = Math.abs(e.clientY - dragStartRef.current.y);
      if (deltaX > 5 || deltaY > 5) {
        isDraggingRef.current = true;
      }
    }
  }, []);

  const handleGlobalMouseUp = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    const markerElement = findMarkerElement(target, e.clientX, e.clientY);
    const isMarkerClick = markerElement !== null || target.closest('svg') !== null;
    
    if (dragStartRef.current && isDraggingRef.current && !isMarkerClick) {
      const deltaX = e.clientX - dragStartRef.current.x;
      if (deltaX < -10) {
        shouldIgnoreClickRef.current = true;
        if (clickIgnoreTimeoutRef.current) {
          clearTimeout(clickIgnoreTimeoutRef.current);
        }
        clickIgnoreTimeoutRef.current = setTimeout(() => {
          shouldIgnoreClickRef.current = false;
          clickIgnoreTimeoutRef.current = null;
        }, 0);
      }
    } else if (isMarkerClick) {
      shouldIgnoreClickRef.current = false;
      if (clickIgnoreTimeoutRef.current) {
        clearTimeout(clickIgnoreTimeoutRef.current);
        clickIgnoreTimeoutRef.current = null;
      }
    }
    dragStartRef.current = null;
    isDraggingRef.current = false;
  }, [findMarkerElement]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const markerElement = findMarkerElement(target, e.clientX, e.clientY);
    const isOverMarker = markerElement !== null;
    setIsHoveringMarker(isOverMarker);
  }, [findMarkerElement]);

  useEventListener('mousemove', handleGlobalMouseMove);
  useEventListener('mousemove', handleMouseMove);
  useEventListener('mouseup', handleGlobalMouseUp);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const markerElement = findMarkerElement(target, e.clientX, e.clientY);
    
    if (markerElement) {
      e.stopPropagation();
      return;
    }
  }, [findMarkerElement]);

  const handleZoom = useCallback(({ lng, lat }: { lng: number; lat: number }) => {
    if (globeMaterialRef.current?.uniforms?.globeRotation) {
      globeMaterialRef.current.uniforms.globeRotation.value.set(lng, lat);
    }
  }, [globeMaterialRef]);

  const handleObjectClick = useCallback((obj: object, event: MouseEvent) => {
    const d = obj as GlobeMarkerData;
    if (onPointClick && d.eventId) {
      const solsticePoint: SolsticeGlobePoint = {
        lat: d.lat,
        lng: d.lng,
        size: d.size,
        eventId: d.eventId,
        event: d.event,
      };
      const screenCoords = { x: event.clientX, y: event.clientY };
      onPointClick(solsticePoint, screenCoords);
    }
  }, [onPointClick]);

  const hoveredIndexRef = useRef<number | null>(null);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const trackMouse = (e: MouseEvent) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', trackMouse);
    return () => window.removeEventListener('mousemove', trackMouse);
  }, []);

  const handleObjectHover = useCallback((obj: object | null) => {
    if (hoveredIndexRef.current !== null) {
      setBeamHovered(hoveredIndexRef.current, false);
    }
    if (obj) {
      const d = obj as GlobeMarkerData;
      setBeamHovered(d._index, true);
      hoveredIndexRef.current = d._index;
      setIsHoveringMarker(true);
      if (onPointHover && d.eventId) {
        const solsticePoint: SolsticeGlobePoint = {
          lat: d.lat,
          lng: d.lng,
          size: d.size,
          eventId: d.eventId,
          event: d.event,
        };
        onPointHover(solsticePoint, lastMousePosRef.current);
      }
    } else {
      hoveredIndexRef.current = null;
      setIsHoveringMarker(false);
      if (onPointHover) {
        onPointHover(null, null);
      }
    }
  }, [onPointHover]);

  const markerData: GlobeMarkerData[] = useMemo(() => {
    const baseMarkers = mapPointsToMarkers(pointsData);
    return baseMarkers.map(marker => {
      const event = marker.event;
      let programCount = 1;
      if (event && typeof event === 'object' && 'programs' in event && Array.isArray((event as {programs: unknown[]}).programs)) {
        programCount = (event as {programs: unknown[]}).programs.length;
      }
      return { ...marker, programCount };
    });
  }, [pointsData]);

  const renderHtmlElement = useCallback((obj: object): HTMLElement => {
    const d = obj as GlobeMarkerData;
    const eventId = d.event && typeof d.event === 'object' && '_id' in d.event && typeof d.event._id === 'string' ? d.event._id : null;
    const isSpecialMarker = eventId === "FjHG3XcrhXkGWTDwf" || eventId === "YcKFwMLjCrr9hnerm";
    const markerSize = isSpecialMarker ? 45 : 30;
    const markerColor = isSpecialMarker ? "white" : "rgb(206, 233, 255)";
    const el = document.createElement('div');
    el.setAttribute('data-globe-marker', 'true');
    el.setAttribute('data-marker-index', String(d._index));
    el.style.color = markerColor;
    el.innerHTML = `
      <div style="text-align: center;">
        <svg viewBox="0 0 24 24" style="width:${markerSize}px;margin:0 auto;">
          <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 3.25 2.5 6.75 7 11.54 4.5-4.79 7-8.29 7-11.54 0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
        </svg>
      </div>
    `;
    
    return el;
  }, []);

  
  const htmlAltitude = useCallback((obj: object): number => {
    const d = obj as GlobeMarkerData;
    return (typeof d.size === 'number' ? d.size : 1) * altitudeScale * 0.01;
  }, [altitudeScale]);

  useEffect(() => {
    const handleResize = () => {
      setScreenHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      style={{ ...style, height: screenHeight }}
      className={`${className || ''} w-full relative transition-opacity duration-800 ${isHoveringMarker ? 'cursor-pointer' : 'cursor-grab'} ${isFullyLoaded ? 'opacity-100' : 'opacity-0'}`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className="flex justify-center">
        <Globe
          ref={globeRef}
          globeImageUrl={undefined}
          backgroundImageUrl={DEFAULT_NIGHT_SKY_IMAGE_URL}
          globeMaterial={globeMaterialRef.current}
          onGlobeReady={() => setIsGlobeReady(true)}
          animateIn={true}
          polygonsTransitionDuration={0}
          polygonAltitude={0.03}
          htmlElementsData={markerStyle === 'pins' ? markerData : []}
          htmlLat={(d) => (d as GlobeMarkerData).lat}
          htmlLng={(d) => (d as GlobeMarkerData).lng}
          htmlAltitude={htmlAltitude}
          htmlElement={renderHtmlElement}
          objectsData={markerStyle === 'beams' ? markerData : []}
          objectThreeObject={markerStyle === 'beams' ? createLightBeams : undefined}
          objectLat={(d: object) => (d as GlobeMarkerData).lat}
          objectLng={(d: object) => (d as GlobeMarkerData).lng}
          objectAltitude={() => 0.01}
          objectFacesSurfaces={() => true}
          onObjectClick={handleObjectClick}
          onObjectHover={handleObjectHover}
          showAtmosphere={true}
          atmosphereColor="rgb(206, 233, 255)"
          atmosphereAltitude={0.15}
          enablePointerInteraction={true}
          onZoom={handleZoom}
        />
      </div>
    </div>
  );
};

export default SolsticeGlobe3D;