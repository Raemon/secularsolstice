'use client';
import React, { useState, useMemo, useCallback, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import SolsticeGlobe3D from './SolsticeGlobe3D';
import { SolsticeGlobePoint, SolsticeEvent } from './types';
import { GlobePopup } from './GlobePopup';

const MIN_BANNER_WIDTH = 1100;

function SolsticeSeasonBannerInner() {
  const [shouldRender, setShouldRender] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [popupCoords, setPopupCoords] = useState<{ x: number; y: number } | null>(null);
  const markerClickInProgressRef = useRef(false);
  const [isHidden, setIsHidden] = useState(false);
  const [solsticeEvents, setSolsticeEvents] = useState<SolsticeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkWidth = () => {
      setShouldRender(window.innerWidth >= MIN_BANNER_WIDTH);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await fetch('/api/solstice-events');
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        const events: SolsticeEvent[] = (data.events || []).map((event: SolsticeEvent & { pageUrl?: string }) => ({
          _id: event._id,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.googleLocation?.formatted_address || event.location,
          url: event.pageUrl || `https://www.lesswrong.com/events/${event._id}`,
          lat: event.googleLocation?.geometry?.location?.lat,
          lng: event.googleLocation?.geometry?.location?.lng,
          googleLocation: event.googleLocation,
        }));
        setSolsticeEvents(events);
      } catch (error) {
        console.error('Error fetching solstice events:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const defaultPointOfView = useMemo(() => ({
    lat: 20,
    lng: -70,
    altitude: 2.2
  }), []);

  const handleHideSolsticeSeason = useCallback(() => {
    setIsHidden(true);
  }, []);

  const selectedEvent = useMemo(() => {
    return solsticeEvents.find((event) => event._id === selectedEventId);
  }, [selectedEventId, solsticeEvents]);

  const pointsData = useMemo(() => {
    return solsticeEvents
      .filter((event) => event.lat !== undefined && event.lng !== undefined)
      .map((event) => ({
        lat: event.lat!,
        lng: event.lng!,
        size: 0.5,
        eventId: event._id,
        event: event,
      }));
  }, [solsticeEvents]);

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