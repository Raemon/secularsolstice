'use client';
import React, { useState, useMemo, useCallback, useRef, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import SolsticeGlobe3D from './SolsticeGlobe3D';
import { SolsticeGlobePoint, SolsticeEvent, MarkerStyle } from './types';
import { GlobePopup } from './GlobePopup';
import { ProgramsPopup } from './ProgramsPopup';
import type { ProgramWithLocation } from '../../lib/programLocations';
import { groupProgramsByLocation } from '../../lib/programLocations';

const MIN_BANNER_WIDTH = 1100;

export type GlobeDataSource = 'lesswrong-events' | 'programs';

type LocationGroup = {
  city: string;
  lat: number;
  lng: number;
  programs: ProgramWithLocation[];
};

type GlobeBannerProps = {
  dataSource?: GlobeDataSource;
};

function GlobeBannerInner({ dataSource = 'lesswrong-events' }: GlobeBannerProps) {
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [popupCoords, setPopupCoords] = useState<{ x: number; y: number } | null>(null);
  const markerClickInProgressRef = useRef(false);
  const [isHidden, setIsHidden] = useState(false);
  
  // LessWrong events state
  const [solsticeEvents, setSolsticeEvents] = useState<SolsticeEvent[]>([]);
  
  // Programs state
  const [programs, setPrograms] = useState<ProgramWithLocation[]>([]);
  
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

  // Fetch data based on dataSource
  useEffect(() => {
    async function fetchData() {
      try {
        if (dataSource === 'lesswrong-events') {
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
        } else {
          const response = await fetch('/api/programs/with-locations');
          if (!response.ok) throw new Error('Failed to fetch programs');
          const data = await response.json();
          setPrograms(data.programs || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [dataSource]);

  const defaultPointOfView = useMemo(() => ({
    lat: 20,
    lng: -70,
    altitude: 2.2
  }), []);

  // Group programs by location (for programs mode)
  const locationGroups = useMemo((): LocationGroup[] => {
    if (dataSource !== 'programs') return [];
    const grouped = groupProgramsByLocation(programs);
    const groups: LocationGroup[] = [];
    for (const [key, progs] of grouped) {
      if (progs.length > 0) {
        groups.push({
          city: progs[0].city,
          lat: progs[0].lat,
          lng: progs[0].lng,
          programs: progs,
        });
      }
    }
    return groups;
  }, [programs, dataSource]);

  // Get selected event or location group
  const selectedEvent = useMemo(() => {
    if (dataSource === 'lesswrong-events') {
      return solsticeEvents.find((event) => event._id === selectedId);
    }
    return null;
  }, [selectedId, solsticeEvents, dataSource]);

  const selectedGroup = useMemo(() => {
    if (dataSource === 'programs') {
      return locationGroups.find(g => `${g.lat},${g.lng}` === selectedId) || null;
    }
    return null;
  }, [selectedId, locationGroups, dataSource]);

  // Generate points data based on mode
  const pointsData = useMemo(() => {
    if (dataSource === 'lesswrong-events') {
      return solsticeEvents
        .filter((event) => event.lat !== undefined && event.lng !== undefined)
        .map((event) => ({
          lat: event.lat!,
          lng: event.lng!,
          size: 0.5,
          eventId: event._id,
          event: event,
        }));
    } else {
      return locationGroups.map((group) => ({
        lat: group.lat,
        lng: group.lng,
        size: Math.min(0.5 + group.programs.length * 0.1, 1.5),
        eventId: `${group.lat},${group.lng}`,
        event: group as unknown,
      }));
    }
  }, [dataSource, solsticeEvents, locationGroups]);

  const [isPinned, setIsPinned] = useState(false);

  const handleMarkerClick = useCallback((event?: React.MouseEvent<HTMLDivElement>, markerId?: string, screenCoords?: { x: number; y: number }) => {
    event?.stopPropagation();
    event?.preventDefault();
    if (markerId) {
      markerClickInProgressRef.current = true;
      setSelectedId(markerId);
      setPopupCoords(screenCoords || { x: window.innerWidth / 2, y: window.innerHeight / 2 });
      setIsPinned(true);
      setTimeout(() => {
        markerClickInProgressRef.current = false;
      }, 0);
    } else {
      if (!markerClickInProgressRef.current) {
        setSelectedId(null);
        setPopupCoords(null);
        setIsPinned(false);
      }
    }
  }, []);

  const handleMarkerHover = useCallback((point: SolsticeGlobePoint | null, screenCoords: { x: number; y: number } | null) => {
    if (isPinned) return;
    if (point && point.eventId && screenCoords) {
      setSelectedId(point.eventId);
      setPopupCoords(screenCoords);
    } else {
      setSelectedId(null);
      setPopupCoords(null);
    }
  }, [isPinned]);

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
          background: 'linear-gradient(to left, transparent 80%, black 100%)',
        }}
      />
      
      {/* Content blocking rect - allows clicks through to content on left */}
      <div 
        className="absolute top-0 h-full z-[5] pointer-events-none"
        style={{ width: '45vw', right: '55vw' }}
      />
    
      
      {/* Globe container */}
      <div className="absolute top-0 right-0 w-full h-[calc(100vh+120px)] transition-opacity duration-300 z-0 pointer-events-auto">
        <SolsticeGlobe3D 
          pointsData={pointsData}
          defaultPointOfView={defaultPointOfView}
          onPointClick={(point: SolsticeGlobePoint, screenCoords: { x: number; y: number }) => {
            if (dataSource === 'programs') {
              const group = point.event as { city: string } | undefined;
              if (group?.city) router.push(`/programs?city=${encodeURIComponent(group.city)}`);
            } else {
              handleMarkerClick(undefined, point.eventId, screenCoords);
            }
          }}
          onPointHover={handleMarkerHover}
          onClick={(event) => handleMarkerClick(event, undefined)}
          style={{ width: '100%', height: '100%' }}
          markerStyle={(dataSource === 'programs' ? 'beams' : 'pins') as MarkerStyle}
        />
        
        {/* LessWrong event popup */}
        {dataSource === 'lesswrong-events' && selectedId && popupCoords && selectedEvent && (
          <GlobePopup
            document={selectedEvent}
            screenCoords={popupCoords}
            onClose={() => {
              setSelectedId(null);
              setPopupCoords(null);
            }}
          />
        )}
        
        {/* Programs popup */}
        {dataSource === 'programs' && selectedId && popupCoords && selectedGroup && (
          <ProgramsPopup
            programs={selectedGroup.programs}
            city={selectedGroup.city}
            screenCoords={popupCoords}
            onClose={() => {
              setSelectedId(null);
              setPopupCoords(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

export const GlobeBanner = ({ dataSource = 'lesswrong-events' }: GlobeBannerProps) => {
  return (
    <Suspense fallback={null}>
      <GlobeBannerInner dataSource={dataSource} />
    </Suspense>
  );
};

export default GlobeBanner;