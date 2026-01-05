import { useState, useRef, useCallback, useEffect } from 'react';
import { usePianoPlayback } from '../chordmark-converter/usePianoPlayback';
import { fetchMusicXmlContent, detectMusicXmlFormat } from '../../lib/musicXmlUtils';

type ToneModule = typeof import('tone');

export interface SheetMusicNote {
  pitch: string; // e.g. "C4", "D#5"
  startBeat: number;
  durationBeats: number;
}

interface SheetMusicPlaybackResult {
  isPlaying: boolean;
  isLoading: boolean;
  currentBeat: number;
  totalBeats: number;
  loadError: string | null;
  handlePlay: () => Promise<void>;
  handleStop: () => void;
}

// Parse MusicXML step/octave/alter to note name
const stepToNote = (step: string, octave: number, alter: number): string => {
  let note = step;
  if (alter === 1) note += '#';
  else if (alter === -1) note += 'b';
  return `${note}${octave}`;
};

// Convert MIDI pitch number to note name (e.g. 60 -> "C4")
const midiPitchToNote = (midi: number): string => {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${noteNames[noteIndex]}${octave}`;
};

// Extract notes from MuseScore XML (.mscx) format
export const extractNotesFromMuseScore = (xmlString: string): { notes: SheetMusicNote[], divisions: number, tempo: number } => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  const notes: SheetMusicNote[] = [];
  let tempo = 120;
  const divisions = 1; // MuseScore uses durationType directly
  // Try to find tempo from text content like "♩ = 118"
  const tempoTextEls = doc.querySelectorAll('Tempo text');
  tempoTextEls.forEach(el => {
    const match = el.textContent?.match(/=\s*(\d+)/);
    if (match) tempo = parseInt(match[1], 10);
  });
  // Duration type to beats mapping for MuseScore
  const msDurationToBeats: Record<string, number> = {
    'whole': 4, 'half': 2, 'quarter': 1, 'eighth': 0.5, '16th': 0.25, '32nd': 0.125, '64th': 0.0625,
    'breve': 8, 'long': 16, 'measure': 4, // measure rests default to whole
  };
  // Find all Staff elements that contain Measure elements (the music content, not metadata)
  const staves = doc.querySelectorAll('Staff');
  staves.forEach(staff => {
    // Skip staff definition elements (they only have StaffType children)
    if (!staff.querySelector('Measure')) return;
    let currentBeat = 0;
    let currentTimeSigBeats = 4;
    const measures = staff.querySelectorAll(':scope > Measure');
    measures.forEach(measure => {
      // Check for time signature change
      const timeSig = measure.querySelector('TimeSig');
      if (timeSig) {
        const sigN = timeSig.querySelector('sigN')?.textContent;
        const sigD = timeSig.querySelector('sigD')?.textContent;
        if (sigN && sigD) {
          currentTimeSigBeats = (parseInt(sigN, 10) / parseInt(sigD, 10)) * 4;
        }
      }
      const measureBeat = currentBeat;
      // Process elements directly under Measure (or under voice if present)
      // Each voice starts from measureBeat (voices are concurrent, not sequential)
      const processElements = (container: Element) => {
        let localBeat = measureBeat;
        const elements = container.children;
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          if (el.tagName === 'voice') {
            // Process voice elements - each voice starts from measureBeat
            processElements(el);
            continue;
          }
          if (el.tagName === 'Chord') {
            const durationTypeEl = el.querySelector('durationType');
            const durationType = durationTypeEl?.textContent || 'quarter';
            const dotsEl = el.querySelector('dots');
            const dots = dotsEl?.textContent ? parseInt(dotsEl.textContent, 10) : 0;
            let durationBeats = msDurationToBeats[durationType] || 1;
            // Apply dots
            let dotValue = durationBeats / 2;
            for (let d = 0; d < dots; d++) {
              durationBeats += dotValue;
              dotValue /= 2;
            }
            // Get all notes in the chord
            const noteEls = el.querySelectorAll('Note');
            noteEls.forEach(noteEl => {
              const pitchEl = noteEl.querySelector('pitch');
              if (pitchEl?.textContent) {
                const midiPitch = parseInt(pitchEl.textContent, 10);
                const pitch = midiPitchToNote(midiPitch);
                notes.push({ pitch, startBeat: localBeat, durationBeats });
              }
            });
            localBeat += durationBeats;
          } else if (el.tagName === 'Rest') {
            const durationTypeEl = el.querySelector('durationType');
            const durationType = durationTypeEl?.textContent || 'quarter';
            if (durationType === 'measure') {
              localBeat += currentTimeSigBeats;
            } else {
              const dotsEl = el.querySelector('dots');
              const dots = dotsEl?.textContent ? parseInt(dotsEl.textContent, 10) : 0;
              let durationBeats = msDurationToBeats[durationType] || 1;
              let dotValue = durationBeats / 2;
              for (let d = 0; d < dots; d++) {
                durationBeats += dotValue;
                dotValue /= 2;
              }
              localBeat += durationBeats;
            }
          }
        }
      };
      processElements(measure);
      currentBeat += currentTimeSigBeats;
    });
  });
  notes.sort((a, b) => a.startBeat - b.startBeat);
  return { notes, divisions, tempo };
};

// Extract notes from MusicXML string
export const extractNotesFromMusicXml = (xmlString: string): { notes: SheetMusicNote[], divisions: number, tempo: number } => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  const notes: SheetMusicNote[] = [];
  let divisions = 1; // divisions per quarter note
  let tempo = 120; // default tempo
  let currentBeat = 0;
  // Get divisions from first measure
  const attributesEl = doc.querySelector('attributes divisions');
  if (attributesEl?.textContent) {
    divisions = parseInt(attributesEl.textContent, 10) || 1;
  }
  // Try to find tempo
  const tempoEl = doc.querySelector('sound[tempo]');
  if (tempoEl) {
    tempo = parseFloat(tempoEl.getAttribute('tempo') || '120');
  }
  const metronomeEl = doc.querySelector('direction metronome per-minute');
  if (metronomeEl?.textContent) {
    tempo = parseFloat(metronomeEl.textContent) || tempo;
  }
  // Iterate through all parts and measures
  const parts = doc.querySelectorAll('part');
  parts.forEach(part => {
    currentBeat = 0;
    let chordStartBeat = 0; // Track where current chord started (handles mixed durations)
    const measures = part.querySelectorAll('measure');
    measures.forEach(measure => {
      // Check for divisions in this measure
      const localDivisions = measure.querySelector('attributes divisions');
      if (localDivisions?.textContent) {
        divisions = parseInt(localDivisions.textContent, 10) || divisions;
      }
      const elements = measure.children;
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.tagName === 'note') {
          const isChord = el.querySelector('chord') !== null;
          const isRest = el.querySelector('rest') !== null;
          const durationEl = el.querySelector('duration');
          const duration = durationEl?.textContent ? parseInt(durationEl.textContent, 10) : divisions;
          const durationBeats = duration / divisions;
          if (!isChord) {
            chordStartBeat = currentBeat; // New note starts a new chord group
          }
          if (!isRest) {
            const pitchEl = el.querySelector('pitch');
            if (pitchEl) {
              const step = pitchEl.querySelector('step')?.textContent || 'C';
              const octave = parseInt(pitchEl.querySelector('octave')?.textContent || '4', 10);
              const alter = parseInt(pitchEl.querySelector('alter')?.textContent || '0', 10);
              const pitch = stepToNote(step, octave, alter);
              notes.push({
                pitch,
                startBeat: chordStartBeat,
                durationBeats,
              });
            }
          }
          // Only advance time if not a chord tone
          if (!isChord) {
            currentBeat += durationBeats;
          }
        } else if (el.tagName === 'forward') {
          const durationEl = el.querySelector('duration');
          const duration = durationEl?.textContent ? parseInt(durationEl.textContent, 10) : 0;
          currentBeat += duration / divisions;
        } else if (el.tagName === 'backup') {
          const durationEl = el.querySelector('duration');
          const duration = durationEl?.textContent ? parseInt(durationEl.textContent, 10) : 0;
          currentBeat -= duration / divisions;
        }
      }
    });
  });
  // Sort notes by start time
  notes.sort((a, b) => a.startBeat - b.startBeat);
  return { notes, divisions, tempo };
};

export const useSheetMusicPlayback = (source?: string): SheetMusicPlaybackResult => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [totalBeats, setTotalBeats] = useState(0);
  const [notes, setNotes] = useState<SheetMusicNote[]>([]);
  const { isLoading, loadError, loadPiano, getSampler, getTone } = usePianoPlayback();
  const scheduledIdsRef = useRef<number[]>([]);
  const updateIntervalRef = useRef<number | null>(null);
  const bpmRef = useRef(120);

  // Parse MusicXML when source changes
  useEffect(() => {
    if (!source) {
      setNotes([]);
      setTotalBeats(0);
      return;
    }
    let cancelled = false;
    const parseSource = async () => {
      try {
        const xmlContent = await fetchMusicXmlContent(source);
        if (cancelled || !xmlContent) return;
        const format = detectMusicXmlFormat(xmlContent);
        if (!format) {
          console.warn('Unrecognized music XML format for playback');
          return;
        }
        let parsedNotes: SheetMusicNote[] = [];
        let parsedTempo = 120;
        if (format === 'musescore') {
          const result = extractNotesFromMuseScore(xmlContent);
          parsedNotes = result.notes;
          parsedTempo = result.tempo;
        } else {
          const result = extractNotesFromMusicXml(xmlContent);
          parsedNotes = result.notes;
          parsedTempo = result.tempo;
        }
        if (cancelled) return;
        setNotes(parsedNotes);
        bpmRef.current = parsedTempo;
        if (parsedNotes.length > 0) {
          const lastNote = parsedNotes[parsedNotes.length - 1];
          setTotalBeats(lastNote.startBeat + lastNote.durationBeats);
        } else {
          setTotalBeats(0);
        }
      } catch (err) {
        console.error('Failed to parse sheet music:', err);
      }
    };
    parseSource();
    return () => { cancelled = true; };
  }, [source]);

  const clearUpdateInterval = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, []);

  const clearScheduledEvents = useCallback((Tone: ToneModule) => {
    for (const id of scheduledIdsRef.current) {
      Tone.Transport.clear(id);
    }
    scheduledIdsRef.current = [];
  }, []);

  const handleStop = useCallback(() => {
    clearUpdateInterval();
    const Tone = getTone();
    const synth = getSampler();
    if (!Tone) {
      setIsPlaying(false);
      setCurrentBeat(0);
      return;
    }
    clearScheduledEvents(Tone);
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    if (synth) {
      synth.releaseAll();
    }
    setIsPlaying(false);
    setCurrentBeat(0);
  }, [clearScheduledEvents, clearUpdateInterval, getTone, getSampler]);

  const updateCurrentBeat = useCallback(() => {
    const Tone = getTone();
    if (!Tone) return;
    const beat = Tone.Transport.seconds * (bpmRef.current / 60);
    setCurrentBeat(beat);
    if (beat >= totalBeats && totalBeats > 0) {
      handleStop();
    }
  }, [handleStop, getTone, totalBeats]);

  useEffect(() => {
    if (!isPlaying) {
      clearUpdateInterval();
      return;
    }
    updateIntervalRef.current = window.setInterval(updateCurrentBeat, 50);
    return () => {
      clearUpdateInterval();
    };
  }, [isPlaying, updateCurrentBeat, clearUpdateInterval]);

  const handlePlay = useCallback(async () => {
    if (notes.length === 0) return;
    const loaded = await loadPiano();
    const synth = getSampler();
    const Tone = getTone();
    if (!loaded || !synth || !Tone) return;
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }
    handleStop();
    Tone.Transport.bpm.value = bpmRef.current;
    const secondsPerBeat = 60 / bpmRef.current;
    // Schedule all notes
    for (const note of notes) {
      const startTime = note.startBeat * secondsPerBeat;
      const duration = note.durationBeats * secondsPerBeat * 0.9;
      const id = Tone.Transport.schedule((time) => {
        synth.triggerAttackRelease(note.pitch, duration, time, 0.7);
      }, startTime);
      scheduledIdsRef.current.push(id);
    }
    Tone.Transport.start();
    setIsPlaying(true);
  }, [notes, loadPiano, handleStop, getSampler, getTone]);

  useEffect(() => {
    return () => {
      handleStop();
    };
  }, [handleStop]);

  return {
    isPlaying,
    isLoading,
    currentBeat,
    totalBeats,
    loadError,
    handlePlay,
    handleStop,
  };
};