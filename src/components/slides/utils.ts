import { ParsedLine, Slide } from './types';

// Strip text enclosed in square brackets
export function stripBracketedText(text: string): string {
  return text.replace(/\[.*?\]/g, '').replace(/  +/g, ' ').trim();
}

// Parse HTML content into text lines
export function parseHTMLContent(htmlContent: string): ParsedLine[] {
  console.log('parseHTMLContent called with:', htmlContent);
  
  // First, remove sections that begin with "[" and end with "]", but NOT if they're inside elements with class="slideMeta"
  // We'll do this by parsing first, then cleaning
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Remove bracketed text from elements that don't have the slideMeta class
  const elementsToClean = tempDiv.querySelectorAll('*:not(.slideMeta)');
  elementsToClean.forEach(el => {
    if (el.childNodes.length > 0) {
      el.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
          node.textContent = node.textContent.replace(/\[.*?\]/g, '');
        }
      });
    }
  });
  console.log('tempDiv children count:', tempDiv.children.length);
  console.log('tempDiv img count:', tempDiv.querySelectorAll('img').length);
  console.log('tempDiv svg count:', tempDiv.querySelectorAll('svg').length);
  
  // Recursively flatten all nested divs/spans and bring all meaningful elements to top level
  function flattenStructure(container: HTMLElement) {
    const meaningfulElements: Node[] = [];
    
    function isMeaningfulElement(node: Node): boolean {
      if (node.nodeType !== Node.ELEMENT_NODE) return false;
      const tagName = (node as HTMLElement).tagName.toLowerCase();
      const hasBackgroundImage = (tagName === 'div' || tagName === 'span') && (node as HTMLElement).style && !!(node as HTMLElement).style.backgroundImage;
      return tagName.match(/^h[1-6]$/) !== null || tagName === 'p' || tagName === 'li' || tagName === 'hr' || tagName === 'br' || tagName === 'img' || tagName === 'svg' || hasBackgroundImage;
    }
    
    function hasTextContent(node: Node): boolean {
      return !!(node.textContent && node.textContent.trim().length > 0);
    }
    
    function recursiveExtract(node: Node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        
        // If it's a meaningful element, extract it
        if (isMeaningfulElement(node)) {
          meaningfulElements.push(node.cloneNode(true));
        }
        // If it's a wrapper element, check if it should be flattened
        else if (tagName === 'div' || tagName === 'span' || tagName === 'ul' || tagName === 'ol' || tagName === 'section' || tagName === 'article' || tagName === 'b' || tagName === 'strong' || tagName === 'i' || tagName === 'em') {
          // Count meaningful children (elements that contain actual content)
          const childElements = Array.from(element.children).filter(child => child.nodeType === Node.ELEMENT_NODE);
          const meaningfulChildren = childElements.filter(child => isMeaningfulElement(child) || hasTextContent(child));
          
          // If this wrapper has no meaningful children but has text content itself, extract it
          if (meaningfulChildren.length === 0 && hasTextContent(node)) {
            // Create a paragraph element to wrap the text content
            const p = document.createElement('p');
            p.innerHTML = element.innerHTML;
            meaningfulElements.push(p);
          }
          // If this wrapper only contains one meaningful element, extract it directly
          else if (meaningfulChildren.length === 1) {
            recursiveExtract(meaningfulChildren[0]);
          }
          // If this wrapper has multiple meaningful children, recurse into all children
          else if (meaningfulChildren.length > 1) {
            Array.from(element.childNodes).forEach(child => recursiveExtract(child));
          }
          // If no meaningful children, still recurse to check for nested content
          else {
            Array.from(element.childNodes).forEach(child => recursiveExtract(child));
          }
        }
      }
    }
    
    // First pass: aggressively flatten single-child wrappers
    function aggressiveFlatten(node: Node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        
        // If it's a wrapper element with only one child element, replace it with its child
        if ((tagName === 'div' || tagName === 'span' || tagName === 'b' || tagName === 'strong' || tagName === 'i' || tagName === 'em') && 
            element.children.length === 1 && 
            element.children[0].nodeType === Node.ELEMENT_NODE) {
          
          const child = element.children[0] as HTMLElement;
          const childTag = child.tagName.toLowerCase();
          
          // If the child is also a wrapper, continue flattening
          if (childTag === 'div' || childTag === 'span' || childTag === 'b' || childTag === 'strong' || childTag === 'i' || childTag === 'em') {
            // Replace this node with its child
            if (element.parentNode) {
              element.parentNode.replaceChild(child, element);
              // Continue flattening from the child
              aggressiveFlatten(child);
            }
          } else {
            // Child is meaningful, keep it but continue flattening
            aggressiveFlatten(child);
          }
        } else {
          // Process all children
          Array.from(element.children).forEach(child => aggressiveFlatten(child));
        }
      }
    }
    
    // Apply aggressive flattening first
    aggressiveFlatten(container);
    
    // Then extract meaningful elements
    Array.from(container.childNodes).forEach(child => recursiveExtract(child));
    
    // Replace container contents with flattened elements
    if (meaningfulElements.length > 0) {
      container.innerHTML = '';
      meaningfulElements.forEach(el => container.appendChild(el));
    }
    
    return container;
  }
  
  flattenStructure(tempDiv);
  
  // Get all text content, preserving structure
  const lines: ParsedLine[] = [];
  
  // Process children recursively to maintain order
  function processNode(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      const rawText = element.textContent?.trim() || '';
      const isSlideMeta = element.classList.contains('slideMeta');
      const text = isSlideMeta ? rawText : stripBracketedText(rawText);
      
      // Handle hr tags and br tags as slide breaks
      if (tagName === 'hr' || tagName === 'br') {
        lines.push({ text: '', isHr: true });
      }
      // Handle SVG elements (Google Drawings)
      else if (tagName === 'svg') {
        console.log('Found SVG element:', node);
        const svgData = new XMLSerializer().serializeToString(element);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        lines.push({ isImage: true, src: svgUrl, isSvg: true });
        console.log('Added SVG to lines');
      }
      // Handle images
      else if (tagName === 'img') {
        const imgElement = element as HTMLImageElement;
        const imgSrc = imgElement.src || imgElement.getAttribute('src');
        console.log('Found img element with src:', imgSrc);
        if (imgSrc) {
          lines.push({ isImage: true, src: imgSrc });
          console.log('Added image to lines');
        }
      }
      // Handle headings
      else if (tagName.match(/^h[1-6]$/) !== null && text.length > 0) {
        lines.push({ text, isHeading: true, level: parseInt(tagName[1]) });
      }
      // Handle paragraphs and list items (including empty ones)
      else if (tagName === 'p' || tagName === 'li') {
        // Check if this element contains a heading (skip if it does)
        const hasHeading = element.querySelector('h1, h2, h3, h4, h5, h6');
        // Check if this element contains an SVG (Google Drawing)
        const hasSvg = element.querySelector('svg');
        // Check if this element contains br tags
        const hasBr = element.querySelector('br');
        // Check if this element has the slideMeta class
        const isSlideMeta = element.classList.contains('slideMeta');
        if (!hasHeading && !hasSvg) {
          if (hasBr) {
            // If paragraph contains br tags, split by br and process each part
            const parts = element.innerHTML.split(/<br\s*\/?>/i);
            parts.forEach((part, index) => {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = part;
              const rawPartText = tempDiv.textContent?.trim() || '';
              const partText = isSlideMeta ? rawPartText : stripBracketedText(rawPartText);
              if (partText.length > 0) {
                lines.push({ text: partText, isHeading: false, isSlideMeta });
              }
              // Add slide break after each part except the last one
              if (index < parts.length - 1) {
                lines.push({ text: '', isHr: true });
              }
            });
          } else if (text.length > 0) {
            lines.push({ text, isHeading: false, isSlideMeta });
          } else {
            // Empty paragraph/line - treat as empty line marker
            lines.push({ text: '', isEmpty: true });
          }
        } else if (hasSvg) {
          // Process SVG within this element
          Array.from(element.children).forEach(child => processNode(child));
        }
      }
      // Check for elements with background images (another way Google Drawings can appear)
      else if (element.style && element.style.backgroundImage) {
        const bgImage = element.style.backgroundImage;
        const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
          lines.push({ isImage: true, src: urlMatch[1] });
        }
      }
      // For divs and other containers, process children
      else if (tagName === 'div' || tagName === 'ul' || tagName === 'ol' || tagName === 'section' || tagName === 'article') {
        // First check if this div itself has a background image
        if (element.style && element.style.backgroundImage) {
          const bgImage = element.style.backgroundImage;
          const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
          if (urlMatch && urlMatch[1]) {
            lines.push({ isImage: true, src: urlMatch[1] });
          }
        }
        Array.from(element.children).forEach(child => processNode(child));
      }
    }
  }
  
  // Start processing from root children
  Array.from(tempDiv.children).forEach(child => processNode(child));
  
  // Post-process to handle consecutive br tags and empty lines
  const processedLines: ParsedLine[] = [];
  let consecutiveBreaks = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.isHr) {
      consecutiveBreaks++;
      // Only add one break marker for consecutive breaks
      if (consecutiveBreaks === 1) {
        processedLines.push(line);
      }
    } else {
      consecutiveBreaks = 0;
      processedLines.push(line);
    }
  }
  
  // If no structured content found, try to extract plain text
  if (processedLines.length === 0) {
    const text = tempDiv.textContent || tempDiv.innerText || '';
    const textLines = text.split('\n').filter(line => line.trim().length > 0);
    return textLines.map(line => ({ text: stripBracketedText(line), isHeading: false }));
  }
  
  return processedLines;
}

// Group lines into slides
export function groupIntoSlides(lines: ParsedLine[], linesPerSlide: number): Slide[] {
  const slides: Slide[] = [];
  let currentSlide: ParsedLine[] = [];
  
  // First, group lines into paragraphs (separated by empty lines or special elements)
  const paragraphs: ParsedLine[][] = [];
  let currentParagraph: ParsedLine[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle hr tags and br tags - end current paragraph
    if (line.isHr) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph);
        currentParagraph = [];
      }
      paragraphs.push([line]); // hr gets its own paragraph
      continue;
    }
    
    // Handle empty lines - end current paragraph (but don't add the empty line itself)
    if (line.isEmpty) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph);
        currentParagraph = [];
      }
      continue;
    }
    
    // Images and headers get their own paragraph
    if (line.isImage || line.isHeading) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph);
        currentParagraph = [];
      }
      paragraphs.push([line]);
    } else {
      currentParagraph.push(line);
    }
  }
  
  // Add remaining paragraph
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph);
  }
  
  // Now group paragraphs into slides, trying to fit as many as possible without exceeding linesPerSlide
  for (const paragraph of paragraphs) {
    // Images and headers always get their own slide
    if (paragraph.length === 1 && (paragraph[0].isImage || paragraph[0].isHeading || paragraph[0].isHr)) {
      if (currentSlide.length > 0) {
        slides.push(currentSlide);
        currentSlide = [];
      }
      slides.push(paragraph);
      continue;
    }
    
    // Check if adding this paragraph would exceed the limit
    // Account for the empty line separator that will be added between paragraphs
    const separatorLines = currentSlide.length > 0 ? 1 : 0;
    if (currentSlide.length > 0 && currentSlide.length + separatorLines + paragraph.length > linesPerSlide) {
      // Start a new slide with this paragraph
      slides.push(currentSlide);
      currentSlide = [...paragraph];
    } else {
      // Add paragraph to current slide with separator if needed
      if (currentSlide.length > 0) {
        currentSlide.push({ text: '', isEmpty: true });
      }
      currentSlide.push(...paragraph);
    }
  }
  
  // Add remaining lines
  if (currentSlide.length > 0) {
    slides.push(currentSlide);
  }
  
  return slides;
}

// Convert image to inverted data URL
export async function invertImage(imgSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the image
      ctx.drawImage(img, 0, 0);
      
      // Get image data and invert colors
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];         // Invert red
        data[i + 1] = 255 - data[i + 1]; // Invert green
        data[i + 2] = 255 - data[i + 2]; // Invert blue
        // Alpha channel stays the same
      }
      ctx.putImageData(imageData, 0, 0);
      
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = function() {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imgSrc;
  });
}

// Seek to specific time in video
export function seekToTime(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    video.currentTime = time;
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
  });
}

// Extract frames from video for preview
export async function extractFramesForPreview(video: HTMLVideoElement, maxFrames: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const frames: string[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    const onLoadedMetadata = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const duration = video.duration;
      const interval = duration / (maxFrames + 1);
      
      for (let i = 1; i <= maxFrames; i++) {
        const time = interval * i;
        
        try {
          await seekToTime(video, time);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frameData = canvas.toDataURL('image/jpeg', 0.7);
          frames.push(frameData);
        } catch (error) {
          console.error('Error extracting frame:', error);
        }
      }
      
      resolve(frames);
    };
    
    const onError = () => {
      reject(new Error('Error loading video'));
    };
    
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('error', onError);
    
    // Trigger metadata load
    video.load();
  });
}

// Extract frames from video (for final presentation generation)
export async function extractFrames(video: HTMLVideoElement, numFrames: number, onProgress?: (percent: number, text: string) => void): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const frames: string[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    const onLoadedMetadata = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const duration = video.duration;
      const interval = duration / (numFrames + 1);
      
      for (let i = 1; i <= numFrames; i++) {
        const time = interval * i;
        
        try {
          await seekToTime(video, time);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frameData = canvas.toDataURL('image/jpeg', 0.8);
          frames.push(frameData);
          if (onProgress) {
            onProgress((i / numFrames) * 50, `Extracting frame ${i} of ${numFrames}...`);
          }
        } catch (error) {
          console.error('Error extracting frame:', error);
        }
      }
      
      resolve(frames);
    };
    
    const onError = () => {
      reject(new Error('Error loading video'));
    };
    
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('error', onError);
    
    // Trigger metadata load
    video.load();
  });
}

