'use client';
import React, { useState, useMemo, useCallback, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import SolsticeGlobe3D from './SolsticeGlobe3D';
import { SolsticeGlobePoint, SolsticeEvent } from './types';
import { GlobePopup } from './GlobePopup';

const MIN_BANNER_WIDTH = 1100;

// Sample events - you can replace these with real data from your API
const SAMPLE_EVENTS: SolsticeEvent[] = [
  {
    _id: 'berkeley-2025',
    title: 'Berkeley Solstice Megameetup',
    startTime: '2025-12-06T18:00:00',
    location: 'Lighthaven, Berkeley CA',
    url: 'https://waypoint.lighthaven.space/solstice-season'
  },
  {
    _id: 'nyc-2025',
    title: 'NYC Solstice Megameetup',
    startTime: '2025-12-20T18:00:00',
    location: 'New York City',
    url: 'https://rationalistmegameetup.com/'
  }
];

function SolsticeSeasonBannerInner() {
  const [shouldRender, setShouldRender] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [popupCoords, setPopupCoords] = useState<{ x: number; y: number } | null>(null);
  const markerClickInProgressRef = useRef(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkWidth = () => {
      setShouldRender(window.innerWidth >= MIN_BANNER_WIDTH);
    };
    
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const events = useMemo(() => SAMPLE_EVENTS.map((event) => ({
    _id: event._id,
    lat: event._id === 'berkeley-2025' ? 37.87 : 40.71,
    lng: event._id === 'berkeley-2025' ? -122.27 : -74.01,
  })), []);

  const defaultPointOfView = useMemo(() => ({
    lat: 20,
    lng: -70,
    altitude: 2.2
  }), []);

  const handleHideSolsticeSeason = useCallback(() => {
    setIsHidden(true);
  }, []);

  const selectedEvent = useMemo(() => {
    return SAMPLE_EVENTS.find((event) => event._id === selectedEventId);
  }, [selectedEventId]);

  const pointsData = useMemo(() => {
    return events.map((event) => ({
      lat: event.lat,
      lng: event.lng,
      size: 0.5,
      eventId: event._id,
      event: SAMPLE_EVENTS.find(e => e._id === event._id),
    }));
  }, [events]);

  const handleMeetupClick = useCallback((event?: React.MouseEvent<HTMLDivElement>, eventId?: string, screenCoords?: { x: number; y: number }) => {
    event?.stopPropagation();
    event?.preventDefault();
    if (eventId) {
      markerClickInProgressRef.current = true;
      setSelectedEventId(eventId);
      setPopupCoords(screenCoords || { x: window.innerWidth / 2, y: window.innerHeight / 2 });
      setTimeout(() => {
        markerClickInProgressRef.current = false;
      }, 0);
    } else {
      if (!markerClickInProgressRef.current) {
        setSelectedEventId(null);
        setPopupCoords(null);
      }
    }
  }, []);

  if (isHidden || !shouldRender) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 w-[50vw] h-full hidden min-[1100px]:block pointer-events-none z-[1] overflow-hidden">
      {/* Overlay that fades in on scroll */}
      <div className="absolute top-0 right-0 w-screen h-full bg-black opacity-0 z-10 pointer-events-none" />
      
      {/* Gradient overlay */}
      <div 
        className="absolute top-0 right-0 h-full z-[1] pointer-events-none transition-opacity duration-300"
        style={{
          width: '50vw',
          background: 'linear-gradient(to left, transparent 50%, black 100%)',
        }}
      />
      
      {/* Content blocking rect - allows clicks through to content on left */}
      <div 
        className="absolute top-0 h-full z-[5] pointer-events-none"
        style={{ width: '45vw', right: '55vw' }}
      />
      
      {/* Background */}
      <div 
        className="absolute top-0 right-0 w-[50vw] h-full pointer-events-none"
        style={{ background: 'linear-gradient(to left, black 50%, transparent 70%)' }}
      />
      
      {/* Globe container */}
      <div className="absolute top-0 right-0 w-full h-[calc(100vh+120px)] transition-opacity duration-300 z-0 pointer-events-auto">
        <SolsticeGlobe3D 
          pointsData={pointsData}
          defaultPointOfView={defaultPointOfView}
          onPointClick={(point: SolsticeGlobePoint, screenCoords: { x: number; y: number }) => handleMeetupClick(undefined, point.eventId, screenCoords)}
          onClick={(event) => handleMeetupClick(event, undefined)}
          style={{ width: '100%', height: '100%' }}
        />
        
        {selectedEventId && popupCoords && selectedEvent && (
          <GlobePopup
            document={selectedEvent}
            screenCoords={popupCoords}
            onClose={() => {
              setSelectedEventId(null);
              setPopupCoords(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

export const SolsticeSeasonBanner = () => {
  return (
    <Suspense fallback={null}>
      <SolsticeSeasonBannerInner />
    </Suspense>
  );
};

export default SolsticeSeasonBanner;