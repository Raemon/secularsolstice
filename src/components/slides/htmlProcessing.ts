// HTML processing utilities

// Pretty print HTML with proper indentation
export function prettyPrintHtml(html: string): string {
  let formatted = '';
  let indent = 0;
  const tab = '  ';
  
  // Split by tags
  html.split(/(<[^>]+>)/g).forEach(part => {
    if (!part.trim()) return;
    
    // Check if it's a tag
    if (part.match(/^<\//)) {
      // Closing tag
      indent--;
      formatted += tab.repeat(Math.max(0, indent)) + part + '\n';
    } else if (part.match(/^<[^\/][^>]*>$/)) {
      // Opening tag
      formatted += tab.repeat(indent) + part + '\n';
      // Don't indent for self-closing or inline tags
      if (!part.match(/\/>$/) && !part.match(/^<(br|hr|img|input|meta|link)[\s>]/i)) {
        indent++;
      }
    } else {
      // Text content
      const trimmed = part.trim();
      if (trimmed) {
        formatted += tab.repeat(indent) + trimmed + '\n';
      }
    }
  });
  
  return formatted.trim();
}

// Strip styling except size-related attributes
export function stripStylingExceptSize(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  function stripElement(element: HTMLElement) {
    if (element.nodeType === Node.ELEMENT_NODE) {
      // Remove all style attributes
      element.removeAttribute('style');
      element.removeAttribute('class');
      element.removeAttribute('id');
      
      // Remove all data attributes
      const dataAttrs = Array.from(element.attributes).filter(attr => attr.name.startsWith('data-'));
      dataAttrs.forEach(attr => element.removeAttribute(attr.name));
      
      // Keep only size-related attributes
      const allowedAttrs = ['width', 'height', 'size', 'src', 'alt', 'href'];
      const allAttrs = Array.from(element.attributes);
      allAttrs.forEach(attr => {
        if (!allowedAttrs.includes(attr.name)) {
          element.removeAttribute(attr.name);
        }
      });
      
      // Recursively process children
      Array.from(element.children).forEach(child => stripElement(child as HTMLElement));
    }
  }
  
  Array.from(tempDiv.children).forEach(child => stripElement(child as HTMLElement));
  
  return tempDiv.innerHTML;
}

// Update raw HTML view by stripping styling and pretty printing
export function updateRawHtml(content: string): string {
  const strippedHtml = stripStylingExceptSize(content);
  const prettyHtml = prettyPrintHtml(strippedHtml);
  return prettyHtml;
}

