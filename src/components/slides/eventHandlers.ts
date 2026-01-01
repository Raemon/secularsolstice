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

// Allowed tags for markdown-style paste (semantic elements only)
const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'a', 'img', 'svg',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
  'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span' // kept for structure, but styles stripped
]);

// Attributes to preserve on specific elements
const ALLOWED_ATTRS: Record<string, string[]> = {
  'a': ['href'],
  'img': ['src', 'alt'],
};

function stripStyles(element: Element): void {
  // Remove style attribute from all elements
  element.removeAttribute('style');
  element.removeAttribute('class');
  
  // Keep only allowed attributes based on tag
  const tagName = element.tagName.toLowerCase();
  const allowedAttrs = ALLOWED_ATTRS[tagName] || [];
  const attrsToRemove: string[] = [];
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    if (!allowedAttrs.includes(attr.name)) {
      attrsToRemove.push(attr.name);
    }
  }
  attrsToRemove.forEach(attr => element.removeAttribute(attr));
  
  // Recursively process children
  for (let i = 0; i < element.children.length; i++) {
    stripStyles(element.children[i]);
  }
}

function unwrapNonSemanticElements(container: Element): void {
  // Find and unwrap elements that aren't in allowed list (like <font>)
  const allElements = Array.from(container.querySelectorAll('*'));
  for (const el of allElements) {
    const tagName = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) {
      // Unwrap: replace element with its children
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
    }
  }
}

function sanitizeHtmlForPaste(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  unwrapNonSemanticElements(tempDiv);
  stripStyles(tempDiv);
  return tempDiv.innerHTML;
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
  
  e.preventDefault();
  
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  
  selection.deleteFromDocument();
  const range = selection.getRangeAt(0);
  
  if (htmlData) {
    const sanitizedHtml = sanitizeHtmlForPaste(htmlData);
    const fragment = range.createContextualFragment(sanitizedHtml);
    range.insertNode(fragment);
  } else if (textData) {
    const textNode = document.createTextNode(textData);
    range.insertNode(textNode);
  }
  
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
}
