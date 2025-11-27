import { useState, useRef, useCallback } from 'react';
import { chordToNotes } from './chordUtils';

type ToneModule = typeof import('tone');
type SamplerInstance = import('tone').Sampler;

const PIANO_SAMPLE_URLS = {
  A0: "A0.mp3",
  C1: "C1.mp3",
  "D#1": "Ds1.mp3",
  "F#1": "Fs1.mp3",
  A1: "A1.mp3",
  C2: "C2.mp3",
  "D#2": "Ds2.mp3",
  "F#2": "Fs2.mp3",
  A2: "A2.mp3",
  C3: "C3.mp3",
  "D#3": "Ds3.mp3",
  "F#3": "Fs3.mp3",
  A3: "A3.mp3",
  C4: "C4.mp3",
  "D#4": "Ds4.mp3",
  "F#4": "Fs4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
  "D#5": "Ds5.mp3",
  "F#5": "Fs5.mp3",
  A5: "A5.mp3",
  C6: "C6.mp3",
  "D#6": "Ds6.mp3",
  "F#6": "Fs6.mp3",
  A6: "A6.mp3",
  C7: "C7.mp3",
  "D#7": "Ds7.mp3",
  "F#7": "Fs7.mp3",
  A7: "A7.mp3",
  C8: "C8.mp3"
};

const PIANO_BASE_URL = "https://tonejs.github.io/audio/salamander/";

export interface PianoPlaybackState {
  isLoading: boolean;
  currentChord: string | null;
  loadError: string | null;
}

export interface PianoPlaybackControls {
  playSingleChord: (chordSymbol: string) => Promise<void>;
  loadPiano: () => Promise<boolean>;
  getSampler: () => SamplerInstance | null;
  getTone: () => ToneModule | null;
}

export const usePianoPlayback = (): PianoPlaybackState & PianoPlaybackControls => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentChord, setCurrentChord] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const synthRef = useRef<SamplerInstance | null>(null);
  const ToneRef = useRef<ToneModule | null>(null);
  const chordTimeoutRef = useRef<number | null>(null);
  
  const loadPiano = useCallback(async (): Promise<boolean> => {
    if (synthRef.current) return true;
    
    setIsLoading(true);
    setLoadError(null);
    
    try {
      const Tone = await import('tone');
      ToneRef.current = Tone;
      
      const sampler = new Tone.Sampler({
        urls: PIANO_SAMPLE_URLS,
        release: 1,
        baseUrl: PIANO_BASE_URL
      }).toDestination();
      
      sampler.volume.value = -6;
      
      await new Promise<void>((resolve) => {
        Tone.loaded().then(() => {
          console.log('Piano samples loaded');
          resolve();
        });
      });
      
      synthRef.current = sampler;
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Failed to load piano:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load piano');
      setIsLoading(false);
      return false;
    }
  }, []);
  
  const playSingleChord = useCallback(async (chordSymbol: string): Promise<void> => {
    const notes = chordToNotes(chordSymbol);
    if (notes.length === 0) return;
    
    const loaded = await loadPiano();
    if (!loaded || !synthRef.current || !ToneRef.current) return;
    
    const Tone = ToneRef.current;
    
    // Start audio context if needed
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }
    
    // Clear any existing timeout
    if (chordTimeoutRef.current) {
      clearTimeout(chordTimeoutRef.current);
    }
    
    // Play the chord for a fixed duration
    setCurrentChord(chordSymbol);
    synthRef.current.triggerAttackRelease(notes, '2n', undefined, 0.7);
    
    // Clear the current chord display after the note duration
    chordTimeoutRef.current = window.setTimeout(() => {
      setCurrentChord(null);
    }, 1000);
  }, [loadPiano]);
  
  const getSampler = useCallback(() => synthRef.current, []);
  const getTone = useCallback(() => ToneRef.current, []);
  
  return {
    isLoading,
    currentChord,
    loadError,
    playSingleChord,
    loadPiano,
    getSampler,
    getTone,
  };
};




