'use client';

import { useState, useRef, useEffect } from 'react';

type ToneModule = typeof import('tone');
type PolySynthInstance = import('tone').PolySynth;

const ChordPlayer = () => {
  const [chordChart, setChordChart] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChord, setCurrentChord] = useState<string | null>(null);
  const synthRef = useRef<PolySynthInstance | null>(null);
  const scheduledEventsRef = useRef<number[]>([]);
  const ToneRef = useRef<ToneModule | null>(null);
  const chordTimelineRef = useRef<Array<{ chord: string; startTime: number; endTime: number }>>([]);
  const playbackStartTimeRef = useRef<number>(0);
  const updateIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const savedChart = localStorage.getItem('chordChart');
    if (savedChart) {
      setChordChart(savedChart);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chordChart', chordChart);
  }, [chordChart]);

  const parseBarLine = (barLine: string): string[][] => {
    const barParts = barLine.split('|');
    const bars: string[] = [];
    for (let i = 0; i < barParts.length; i++) {
      const part = barParts[i].trim();
      if (i > 0 || (i === 0 && part.length === 0 && barParts.length > 1)) {
        bars.push(part);
      }
    }
    
    return bars.map(bar => {
      if (bar.length === 0) {
        return [];
      }
      
      const normalizedBar = bar.replace(/…/g, '.');
      const tokens = normalizedBar.split(/\s+/).filter(c => c.length > 0);
      const chords: string[] = [];
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token === '.' && chords.length > 0) {
          chords[chords.length - 1] += '.';
        } else if (token !== '.') {
          chords.push(token);
        }
      }
      return chords;
    });
  };

  const parseChordChart = (chart: string): string[] => {
    const chords: string[] = [];
    const lines = chart.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let lastLineBars: string[][] = [];
    
    for (const line of lines) {
      const sectionMatch = line.match(/^(Verse \d+|Bridge|Tag|Chorus|Intro|Outro|Pre-Chorus|[A-Z]:)/i);
      if (sectionMatch) {
        continue;
      }
      
      const repetitionMatch = line.match(/^x\s*(\d+)$/i);
      if (repetitionMatch && lastLineBars.length > 0) {
        const repeatCount = parseInt(repetitionMatch[1], 10);
        for (let i = 1; i < repeatCount; i++) {
          lastLineBars.forEach(bar => {
            bar.forEach(chord => chords.push(chord));
          });
        }
        continue;
      }
      
      const lineWithRepetition = line.match(/^(.+?)\s+x\s*(\d+)\s*$/i);
      if (lineWithRepetition) {
        const barLine = lineWithRepetition[1].trim();
        let repeatCount = parseInt(lineWithRepetition[2], 10);
        if (repeatCount > 100) repeatCount = 100;
        
        const barChords = parseBarLine(barLine);
        lastLineBars = barChords;
        
        for (let i = 0; i < repeatCount; i++) {
          barChords.forEach(bar => {
            bar.forEach(chord => {
              if (chord.trim().length > 0) {
                chords.push(chord);
              }
            });
          });
        }
        continue;
      }
      
      const barChords = parseBarLine(line);
      if (barChords.length > 0) {
        lastLineBars = barChords;
        barChords.forEach(bar => {
          bar.forEach(chord => {
            if (chord.trim().length > 0) {
              chords.push(chord);
            }
          });
        });
      }
    }
    
    return chords;
  };

  const buildChordTimeline = (chart: string): Array<{ chord: string; startTime: number; endTime: number }> => {
    const chordTokens = parseChordChart(chart);
    const timeline: Array<{ chord: string; startTime: number; endTime: number }> = [];
    
    // At 60 BPM, each beat is 1 second (4 seconds per bar)
    const beatDuration = 1.0;
    let currentTime = 0;
    
    for (const token of chordTokens) {
      if (token === '%') {
        // Rest - skip but add time
        currentTime += beatDuration;
        continue;
      }
      
      const dots = (token.match(/\./g) || []).length;
      const chordName = token.replace(/\./g, '').trim();
      
      if (chordName.length === 0) {
        continue;
      }
      
      // Duration: base beat divided by (dots + 1)
      const duration = dots > 0 ? beatDuration / (dots + 1) : beatDuration;
      const startTime = currentTime;
      const endTime = currentTime + duration;
      
      timeline.push({ chord: chordName, startTime, endTime });
      currentTime = endTime;
    }
    
    return timeline;
  };

const POWER_CHORD_REGEX = /^[A-G][#b]?5$/i;

const getRootNoteNumber = (rootName: string): number | null => {
  const root = rootName.trim().toUpperCase();
  const rootMap: { [key: string]: number } = {
    'C': 60, 'C#': 61, 'DB': 61,
    'D': 62, 'D#': 63, 'EB': 63,
    'E': 64,
    'F': 65, 'F#': 66, 'GB': 66,
    'G': 67, 'G#': 68, 'AB': 68,
    'A': 69, 'A#': 70, 'BB': 70,
    'B': 71
  };
  return rootMap[root] ?? null;
};

const midiNumberToNoteName = (midiNumber: number): string | null => {
  if (midiNumber < 0 || midiNumber > 127) {
    return null;
  }
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteIndex = midiNumber % 12;
  const octave = Math.floor(midiNumber / 12) - 1;
  return `${noteNames[noteIndex]}${octave}`;
};

const getPowerChordBassEvents = (
  timeline: Array<{ chord: string; startTime: number; endTime: number }>
): Array<{ startTime: number; duration: number; noteName: string }> => {
  const events: Array<{ startTime: number; duration: number; noteName: string }> = [];
  timeline.forEach(item => {
    if (!POWER_CHORD_REGEX.test(item.chord.trim())) {
      return;
    }
    const rootMatch = item.chord.match(/^([A-G][#b]?)/i);
    if (!rootMatch) {
      return;
    }
    const rootMidi = getRootNoteNumber(rootMatch[1]);
    if (rootMidi === null) {
      return;
    }
    const bassMidi = rootMidi - 12;
    const noteName = midiNumberToNoteName(bassMidi);
    if (!noteName) {
      return;
    }
    const duration = Math.max(0.1, item.endTime - item.startTime);
    events.push({
      startTime: item.startTime,
      duration,
      noteName
    });
  });
  return events;
};

  useEffect(() => {
    if (!isPlaying || !ToneRef.current) {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      return;
    }
    
    const Tone = ToneRef.current;
    
    const updateCurrentChord = () => {
      const elapsed = Tone.Transport.seconds;
      const timeline = chordTimelineRef.current;
      
      if (timeline.length === 0) {
        setCurrentChord(null);
        return;
      }
      
      // Find the current chord based on elapsed time
      const current = timeline.find(item => elapsed >= item.startTime && elapsed < item.endTime);
      setCurrentChord(current ? current.chord : null);
      
      // If we've passed all chords, clear
      if (elapsed >= timeline[timeline.length - 1]?.endTime) {
        setCurrentChord(null);
      }
    };
    
    updateIntervalRef.current = window.setInterval(updateCurrentChord, 50);
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [isPlaying]);

  const handlePlay = async () => {
    if (!chordChart.trim()) {
      setError('Please enter a chord chart');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chord-to-midi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chart: chordChart }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate MIDI' }));
        throw new Error(errorData.error || 'Failed to generate MIDI');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Parse and play MIDI using Tone.js (dynamic import to avoid SSR issues)
      try {
        // Dynamically import Tone.js and @tonejs/midi only on client side
        if (!ToneRef.current) {
          ToneRef.current = await import('tone');
        }
        const Tone = ToneRef.current;
        
        const { Midi } = await import('@tonejs/midi');
        const arrayBuffer = await blob.arrayBuffer();
        
        if (arrayBuffer.byteLength === 0) {
          throw new Error('Generated MIDI file is empty');
        }
        
        const midi = new Midi(arrayBuffer);
        
        // Debug: Log MIDI structure
        console.log('MIDI tracks:', midi.tracks.length);
        midi.tracks.forEach((track, i) => {
          console.log(`Track ${i}: ${track.notes.length} notes`);
        });
        console.log('MIDI duration:', midi.duration);
        
        // Check if MIDI has tracks and notes
        const hasNotes = midi.tracks.some(track => track.notes.length > 0);
        if (!hasNotes) {
          console.error('MIDI structure:', {
            tracks: midi.tracks.length,
            trackDetails: midi.tracks.map(t => ({
              notes: t.notes.length,
              instrument: t.instrument?.name,
              channel: t.channel
            }))
          });
          throw new Error('MIDI file has no notes to play');
        }
        
        // Initialize Tone.js if not already started
        if (Tone.context.state !== 'running') {
          await Tone.start();
        }

        // Create a synth for playback
        if (!synthRef.current) {
          synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
        }

        // Stop any currently playing notes
        scheduledEventsRef.current.forEach(id => {
          Tone.Transport.clear(id);
        });
        scheduledEventsRef.current = [];
        synthRef.current?.releaseAll();

        // Reset Transport to start from 0
        if (Tone.Transport.state === 'started') {
          Tone.Transport.stop();
          Tone.Transport.cancel();
        }
        Tone.Transport.position = 0;

        // Build chord timeline for display
        chordTimelineRef.current = buildChordTimeline(chordChart);
        const powerChordBassEvents = getPowerChordBassEvents(chordTimelineRef.current);
        playbackStartTimeRef.current = 0;

        // Schedule MIDI playback
        const now = Tone.now();
        setIsLoading(false);
        setIsPlaying(true);

        let noteCount = 0;
        midi.tracks.forEach(track => {
          track.notes.forEach(note => {
            noteCount++;
            const startTime = now + note.time;
            const duration = note.duration || 0.5; // Default duration if missing
            
            // Convert MIDI note number to note name if needed
            let noteName = note.name;
            if (!noteName && note.midi !== undefined) {
              // Convert MIDI note number to note name
              const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
              const octave = Math.floor(note.midi / 12) - 1;
              const noteIndex = note.midi % 12;
              noteName = noteNames[noteIndex] + octave;
            }
            
            if (!noteName) {
              console.warn('Skipping note without name:', note);
              return;
            }
            
            const velocity = note.velocity !== undefined ? note.velocity / 127 : 0.7;
            
            // Schedule the note - triggerAttackRelease doesn't take startTime as a parameter
            // The timing is handled by scheduleOnce
            const id = Tone.Transport.scheduleOnce(() => {
              if (synthRef.current) {
                synthRef.current.triggerAttackRelease(noteName, duration, undefined, velocity);
              }
            }, startTime);
            
            scheduledEventsRef.current.push(id);
          });
        });

        if (powerChordBassEvents.length > 0) {
          powerChordBassEvents.forEach(event => {
            const bassStartTime = now + event.startTime;
            const id = Tone.Transport.scheduleOnce(() => {
              if (synthRef.current) {
                synthRef.current.triggerAttackRelease(event.noteName, event.duration, undefined, 0.6);
              }
            }, bassStartTime);
            scheduledEventsRef.current.push(id);
          });
        }

        if (noteCount === 0) {
          throw new Error('No notes found in MIDI file');
        }

        // Stop playback after the last note
        const totalDuration = midi.duration || 10; // Default 10 seconds if duration is missing
        Tone.Transport.scheduleOnce(() => {
          handleStop();
        }, now + totalDuration);

        // Start Transport if not already started
        if (Tone.Transport.state !== 'started') {
          Tone.Transport.start();
        }

      } catch (midiError) {
        console.error('MIDI playback error:', midiError);
        console.error('Error type:', typeof midiError);
        console.error('Error details:', JSON.stringify(midiError, Object.getOwnPropertyNames(midiError)));
        let errorMessage = 'Unknown error';
        if (midiError instanceof Error) {
          errorMessage = midiError.message;
        } else if (typeof midiError === 'string') {
          errorMessage = midiError;
        } else if (midiError && typeof midiError === 'object') {
          errorMessage = JSON.stringify(midiError);
        }
        setError(`MIDI playback failed: ${errorMessage}. You can still download the MIDI file.`);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate MIDI');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    if (!ToneRef.current) return;
    
    const Tone = ToneRef.current;
    
    // Cancel all scheduled events
    scheduledEventsRef.current.forEach(id => {
      Tone.Transport.clear(id);
    });
    scheduledEventsRef.current = [];
    
    // Stop all notes
    synthRef.current?.releaseAll();
    
    // Stop Transport
    if (Tone.Transport.state === 'started') {
      Tone.Transport.stop();
      Tone.Transport.cancel();
    }
    
    setIsPlaying(false);
    setCurrentChord(null);
    
    // Don't revoke URL here - let user keep it for download
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chord Chart Player</h1>
      
      <div className="mb-4">
        <label htmlFor="chord-chart" className="block text-sm font-medium mb-2">
          Enter your chord chart:
        </label>
        <textarea
          id="chord-chart"
          value={chordChart}
          onChange={(e) => setChordChart(e.target.value)}
          placeholder={`Verse 1

C | G | Am | F |

C | Am | F | G . F . |

C . Am . | F | C | %`}
          className="w-full h-64 p-2 border border-gray-300 rounded font-mono text-sm dark:bg-gray-800"
        />
      </div>

      <div className="mb-4 flex gap-2 items-center">
        <button
          onClick={handlePlay}
          disabled={isLoading || isPlaying}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Generating...' : isPlaying ? 'Playing...' : 'Generate & Play MIDI'}
        </button>
        {isPlaying && (
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Stop
          </button>
        )}
        {isPlaying && currentChord && (
          <div className="ml-4 text-lg font-semibold">
            Current chord: <span className="text-blue-600">{currentChord}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {audioUrl && (
        <div className="mt-4">
          <a
            href={audioUrl}
            download="chord-chart.mid"
            className="text-blue-600 hover:underline text-sm"
          >
            Download MIDI file
          </a>
        </div>
      )}
    </div>
  );
};

export default ChordPlayer;

