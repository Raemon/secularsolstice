import { detectFileType } from './lyricsExtractor';
import { updateVersionRenderedContent, getVersionById, type RenderedContent } from './songsRepository';

/**
 * Convert LilyPond content to SVG using the external LilyPond server
 * Returns an array of SVG strings (one per page)
 */
export const convertLilypondToSvg = async (content: string): Promise<string[]> => {
  const lilypondServerUrl = process.env.LILYPOND_SERVER_URL || process.env.NEXT_PUBLIC_LILYPOND_SERVER_URL;
  if (!lilypondServerUrl) {
    console.warn('[lilypondRenderer] No LILYPOND_SERVER_URL configured, skipping conversion');
    return [];
  }
  const endpoint = `${lilypondServerUrl}/convert`;
  console.log('[lilypondRenderer] Converting lilypond, content length:', content.length);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[lilypondRenderer] Conversion failed:', response.status, errorText);
    throw new Error(`LilyPond conversion failed: ${response.status} ${errorText.substring(0, 200)}`);
  }
  const data = await response.json();
  console.log('[lilypondRenderer] Conversion successful:', data.pageCount, 'pages');
  return data.svgs || [];
};

/**
 * Fetch content from a blob URL
 */
const fetchBlobContent = async (blobUrl: string): Promise<string> => {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch blob: ${response.status}`);
  }
  return response.text();
};

/**
 * Get the filename from a blob URL
 */
const getFilenameFromBlobUrl = (blobUrl: string): string => {
  try {
    const pathname = new URL(blobUrl).pathname;
    return pathname.split('/').pop() || '';
  } catch {
    return blobUrl.split('/').pop() || '';
  }
};

/**
 * Check if a version has lilypond content (either in content or blob)
 * and render it to SVG, storing the result in rendered_content
 * 
 * This function is safe to call on any version - it will only
 * process versions that contain lilypond content.
 */
export const processVersionLilypondIfNeeded = async (versionId: string): Promise<void> => {
  try {
    const version = await getVersionById(versionId);
    if (!version) {
      console.warn('[lilypondRenderer] Version not found:', versionId);
      return;
    }
    // Get content - either from content field or from blob
    let lilypondContent: string | null = null;
    let filename = version.label;
    // Check content field first
    if (version.content) {
      const fileType = detectFileType(version.label, version.content);
      if (fileType === 'lilypond') {
        lilypondContent = version.content;
      }
    }
    // If no lilypond in content, check blob
    if (!lilypondContent && version.blobUrl) {
      const blobFilename = getFilenameFromBlobUrl(version.blobUrl);
      filename = blobFilename || version.label;
      // Check if blob filename suggests lilypond
      if (filename.toLowerCase().endsWith('.ly') || filename.toLowerCase().endsWith('.lilypond')) {
        try {
          const blobContent = await fetchBlobContent(version.blobUrl);
          const fileType = detectFileType(filename, blobContent);
          if (fileType === 'lilypond') {
            lilypondContent = blobContent;
          }
        } catch (err) {
          console.error('[lilypondRenderer] Failed to fetch blob content:', err);
        }
      }
    }
    // If no lilypond content found, nothing to do
    if (!lilypondContent) {
      return;
    }
    // Already has rendered lilypond?
    if (version.renderedContent?.lilypond) {
      console.log('[lilypondRenderer] Version already has rendered lilypond:', versionId);
      return;
    }
    // Convert to SVG
    console.log('[lilypondRenderer] Processing lilypond for version:', versionId);
    const svgs = await convertLilypondToSvg(lilypondContent);
    if (svgs.length === 0) {
      console.warn('[lilypondRenderer] No SVGs generated for version:', versionId);
      return;
    }
    // Update rendered_content
    const newRenderedContent: RenderedContent = {
      ...(version.renderedContent || {}),
      lilypond: JSON.stringify(svgs),
    };
    await updateVersionRenderedContent(versionId, newRenderedContent);
    console.log('[lilypondRenderer] Saved rendered lilypond for version:', versionId, 'pages:', svgs.length);
  } catch (err) {
    console.error('[lilypondRenderer] Error processing lilypond for version:', versionId, err);
    // Don't throw - this is a background operation that shouldn't fail the main request
  }
};
