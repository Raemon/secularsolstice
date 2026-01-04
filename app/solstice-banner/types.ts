import type { CSSProperties, MouseEventHandler } from 'react';

export type SolsticeEvent = {
  _id: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  url?: string;
  lat?: number;
  lng?: number;
  googleLocation?: {
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
    formatted_address?: string;
  };
};

export type SolsticeGlobePoint = {
  lat: number;
  lng: number;
  size: number;
  color?: string;
  eventId?: string;
  event?: SolsticeEvent;
};

export type PointOfView = {
  lat: number;
  lng: number;
  altitude: number;
};

export type PointClickCallback = (point: SolsticeGlobePoint, screenCoords: { x: number; y: number }) => void;

export type SolsticeGlobe3DProps = {
  pointsData: Array<SolsticeGlobePoint>;
  defaultPointOfView: PointOfView;
  onPointClick?: PointClickCallback;
  onReady?: () => void;
  onFullyLoaded?: () => void;
  onFpsChange?: (fps: number) => void;
  className?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler<HTMLDivElement>;
  dayImageUrl?: string;
  nightImageUrl?: string;
  luminosityImageUrl?: string;
  altitudeScale?: number;
  initialAltitudeMultiplier?: number;
}