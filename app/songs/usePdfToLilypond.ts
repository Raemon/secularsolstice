import { useState } from 'react';

type ConversionState = 'idle' | 'converting' | 'success' | 'error';

type ConversionStatus = {
  state: ConversionState;
  error: string | null;
  fileName: string | null;
  numPages: number | null;
};

export const usePdfToLilypond = () => {
  const [conversions, setConversions] = useState<Map<string, ConversionStatus>>(new Map());

  const convertPdf = async (songName: string, fileName: string, pdfBlob: Blob) => {
    const key = `${songName}/${fileName}`;
    
    setConversions(prev => new Map(prev).set(key, {
      state: 'converting',
      error: null,
      fileName: null,
      numPages: null,
    }));

    try {
      const formData = new FormData();
      formData.append('file', pdfBlob, fileName);
      formData.append('songName', songName);
      formData.append('fileName', fileName);

      const response = await fetch('/api/pdf-to-lilypond', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Conversion failed');
      }

      const result = await response.json();

      setConversions(prev => new Map(prev).set(key, {
        state: 'success',
        error: null,
        fileName: result.fileName,
        numPages: result.numPages,
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setConversions(prev => new Map(prev).set(key, {
        state: 'error',
        error: errorMessage,
        fileName: null,
        numPages: null,
      }));
      throw error;
    }
  };

  const getConversionStatus = (songName: string, fileName: string): ConversionStatus => {
    const key = `${songName}/${fileName}`;
    return conversions.get(key) || {
      state: 'idle',
      error: null,
      fileName: null,
      numPages: null,
    };
  };

  const resetConversion = (songName: string, fileName: string) => {
    const key = `${songName}/${fileName}`;
    setConversions(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  };

  return {
    convertPdf,
    getConversionStatus,
    resetConversion,
  };
};

