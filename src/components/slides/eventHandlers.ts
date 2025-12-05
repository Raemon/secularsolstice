import { extractFramesForPreview } from './slideUtils';
import { StatusType } from './types';

// Handle video load and frame extraction
export async function handleVideoLoad(
  file: File,
  video: HTMLVideoElement,
  showStatus: (message: string, type: StatusType) => void,
  setExtractedFrames: (frames: string[]) => void
): Promise<void> {
  showStatus(`Video "${file.name}" loaded successfully`, 'success');
  
  // Start frame extraction in background
  showStatus('Extracting video frames for preview...', 'info');
  
  try {
    const maxFrames = 20;
    const frames = await extractFramesForPreview(video, maxFrames);
    setExtractedFrames(frames);
    showStatus(`Extracted ${frames.length} frames successfully`, 'success');
  } catch (error) {
    console.error('Error extracting frames:', error);
    showStatus('Error extracting frames for preview', 'error');
  }
}

// Handle paste event for content editor
export function handlePaste(
  e: React.ClipboardEvent,
  showStatus: (message: string, type: StatusType) => void,
  setHtmlContent: (content: string) => void
): void {
  console.log('Paste event detected');
  
  const clipboardData = e.clipboardData;
  const htmlData = clipboardData.getData('text/html');
  const textData = clipboardData.getData('text/plain');
  
  console.log('HTML data:', htmlData);
  console.log('Text data:', textData);
  
  if (htmlData) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlData;
    console.log('Parsed HTML elements:', tempDiv.children);
    console.log('Images found in clipboard:', tempDiv.querySelectorAll('img').length);
    console.log('SVGs found in clipboard:', tempDiv.querySelectorAll('svg').length);
    
    const imagesInClipboard = tempDiv.querySelectorAll('img').length;
    const svgsInClipboard = tempDiv.querySelectorAll('svg').length;
    
    if (imagesInClipboard > 0 || svgsInClipboard > 0) {
      console.log('Detected images/SVGs in clipboard - using manual paste handling');
      
      e.preventDefault();
      
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      selection.deleteFromDocument();
      
      const range = selection.getRangeAt(0);
      const fragment = range.createContextualFragment(htmlData);
      range.insertNode(fragment);
      
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      setTimeout(() => {
        const contentEditor = document.querySelector('[contenteditable="true"]') as HTMLElement;
        if (contentEditor) {
          const imgCount = contentEditor.querySelectorAll('img').length;
          const svgCount = contentEditor.querySelectorAll('svg').length;
          
          if (imgCount > 0 || svgCount > 0) {
            showStatus(`Successfully pasted content with ${imgCount} image(s) and ${svgCount} drawing(s)`, 'success');
          }
          
          setHtmlContent(contentEditor.innerHTML);
        }
      }, 100);
      
      return;
    }
  }
  
  setTimeout(() => {
    const contentEditor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (contentEditor) {
      setHtmlContent(contentEditor.innerHTML);
    }
  }, 100);
}

