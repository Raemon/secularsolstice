import JSZip from 'jszip';

/**
 * Fetch and extract XML content from a MusicXML source.
 * Handles both direct XML strings/URLs and compressed .mxl files.
 */
export const fetchMusicXmlContent = async (source: string): Promise<string | null> => {
  try {
    let xmlContent: string | null = source;
    // Check if it's a URL
    if (source.startsWith('http') || source.startsWith('/')) {
      const response = await fetch(source);
      if (!response.ok) return null;
      const lowerSource = source.toLowerCase();
      if (lowerSource.endsWith('.mxl')) {
        const arrayBuffer = await response.arrayBuffer();
        xmlContent = await extractXmlFromMxlBuffer(arrayBuffer);
        if (!xmlContent) return null;
      } else {
        xmlContent = await response.text();
      }
    }
    return xmlContent;
  } catch (err) {
    console.error('Failed to fetch MusicXML content:', err);
    return null;
  }
};

/**
 * Extract XML content from an MXL (compressed MusicXML) buffer.
 * MXL files are ZIP archives containing the XML file.
 */
export const extractXmlFromMxlBuffer = async (arrayBuffer: ArrayBuffer): Promise<string | null> => {
  const zip = await JSZip.loadAsync(arrayBuffer);
  for (const [filename, file] of Object.entries(zip.files)) {
    if (filename.endsWith('.xml') && !filename.startsWith('META-INF')) {
      return await file.async('string');
    }
  }
  return null;
};

/**
 * Detect if a string contains MusicXML or MuseScore XML content.
 */
export const detectMusicXmlFormat = (xmlContent: string): 'musicxml' | 'musescore' | null => {
  if (xmlContent.includes('<museScore')) return 'musescore';
  if (xmlContent.includes('<score-partwise') || xmlContent.includes('<score-timewise')) return 'musicxml';
  return null;
};