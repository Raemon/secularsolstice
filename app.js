let videoFile = null;
let videoElement = null;
let extractedFrames = [];
let frameExtractionInProgress = false;

// LocalStorage functions
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return null;
    }
}

function saveContent() {
    const contentEditor = document.getElementById('htmlContent');
    const htmlContent = contentEditor.innerHTML;
    saveToLocalStorage('htmlContent', htmlContent);
}

function loadContent() {
    const savedContent = loadFromLocalStorage('htmlContent');
    if (savedContent) {
        const contentEditor = document.getElementById('htmlContent');
        contentEditor.innerHTML = savedContent;
        updateLineCount();
        updateRawHtml();
    }
}

function saveVideo() {
    if (videoFile) {
        // Convert file to base64 for storage
        const reader = new FileReader();
        reader.onload = function(e) {
            const videoData = {
                name: videoFile.name,
                type: videoFile.type,
                data: e.target.result
            };
            saveToLocalStorage('videoFile', videoData);
        };
        reader.readAsDataURL(videoFile);
    }
}

function loadVideo() {
    const savedVideo = loadFromLocalStorage('videoFile');
    if (savedVideo) {
        // Convert base64 back to blob
        const byteCharacters = atob(savedVideo.data.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: savedVideo.type });
        
        // Create a new File object
        const file = new File([blob], savedVideo.name, { type: savedVideo.type });
        handleVideoFile(file);
    }
}

function saveSettings() {
    const linesPerSlide = document.getElementById('linesPerSlide').value;
    saveToLocalStorage('linesPerSlide', linesPerSlide);
}

function loadSettings() {
    const savedLinesPerSlide = loadFromLocalStorage('linesPerSlide');
    if (savedLinesPerSlide) {
        document.getElementById('linesPerSlide').value = savedLinesPerSlide;
    }
}

// Handle video file upload with drag and drop
const fileInputContainer = document.getElementById('fileInputContainer');
const videoFileInput = document.getElementById('videoFile');

// Drag and drop functionality
fileInputContainer.addEventListener('dragover', function(e) {
    e.preventDefault();
    fileInputContainer.classList.add('dragover');
});

fileInputContainer.addEventListener('dragleave', function(e) {
    e.preventDefault();
    fileInputContainer.classList.remove('dragover');
});

fileInputContainer.addEventListener('drop', function(e) {
    e.preventDefault();
    fileInputContainer.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('video/')) {
            videoFileInput.files = files;
            handleVideoFile(file);
        } else {
            showStatus('Please select a valid video file', 'error');
        }
    }
});

// Click to select file
fileInputContainer.addEventListener('click', function() {
    videoFileInput.click();
});

// File input change
videoFileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        handleVideoFile(file);
    }
});

function handleVideoFile(file) {
    videoFile = file;
    const videoURL = URL.createObjectURL(file);
    videoElement = document.getElementById('videoElement');
    videoElement.src = videoURL;
    document.getElementById('videoPreview').style.display = 'block';
    
    // Update file input display
    const fileInputText = fileInputContainer.querySelector('.file-input-text');
    fileInputText.textContent = file.name;
    fileInputContainer.style.borderColor = 'var(--accent-color)';
    fileInputContainer.style.background = 'rgba(102, 126, 234, 0.05)';
    
    // Save video to localStorage
    saveVideo();
    
    showStatus(`Video "${file.name}" loaded successfully`, 'success');
    
    // Start frame extraction in background
    startFrameExtraction();
}

// Update line count and slides preview
function updateLineCount() {
    const contentEditor = document.getElementById('htmlContent');
    const htmlContent = contentEditor.innerHTML.trim();
    const lineCountElement = document.getElementById('lineCount');
    const slideCountElement = document.getElementById('slideCount');
    const imageCountElement = document.getElementById('imageCount');
    const htmlLinesBadge = document.getElementById('htmlLinesBadge');
    const slidesBadge = document.getElementById('slidesBadge');
    const previewBadge = document.getElementById('previewBadge');
    
    if (!htmlContent || htmlContent === '' || contentEditor.textContent.trim() === '') {
        lineCountElement.textContent = '0';
        slideCountElement.textContent = '0';
        imageCountElement.textContent = '0';
        htmlLinesBadge.textContent = '0 lines';
        slidesBadge.textContent = '0 slides';
        previewBadge.textContent = 'Ready';
        updateSlidesPreview([]);
        return;
    }
    
    const lines = parseHTMLContent(htmlContent);
    const linesPerSlide = parseInt(document.getElementById('linesPerSlide').value);
    const slides = groupIntoSlides(lines, linesPerSlide);
    
    // Count images
    const imageCount = lines.filter(line => line.isImage).length;
    
    // Update stats
    lineCountElement.textContent = lines.length;
    slideCountElement.textContent = slides.length;
    imageCountElement.textContent = imageCount;
    
    // Update badges
    htmlLinesBadge.textContent = `${lines.length} lines`;
    slidesBadge.textContent = `${slides.length} slides`;
    previewBadge.textContent = lines.length > 0 ? 'Content Ready' : 'Ready';
    
    updateSlidesPreview(slides);
}

// Pretty print HTML with js-beautify library
function prettyPrintHtml(html) {
    if (typeof html_beautify !== 'undefined') {
        return html_beautify(html, {
            indent_size: 2,
            indent_char: ' ',
            max_preserve_newlines: 1,
            preserve_newlines: true,
            keep_array_indentation: false,
            break_chained_methods: false,
            indent_scripts: 'normal',
            brace_style: 'collapse',
            space_before_conditional: true,
            unescape_strings: false,
            jslint_happy: false,
            end_with_newline: true,
            wrap_line_length: 0,
            indent_inner_html: true,
            comma_first: false,
            e4x: false,
            indent_empty_lines: false
        });
    } else {
        // Fallback to basic formatting if library not loaded
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
}

// Update raw HTML view
function updateRawHtml() {
    const contentEditor = document.getElementById('htmlContent');
    const rawHtmlEditor = document.getElementById('rawHtml');
    const htmlContent = contentEditor.innerHTML;
    
    // Strip all styling except size attributes
    const strippedHtml = stripStylingExceptSize(htmlContent);
    const prettyHtml = prettyPrintHtml(strippedHtml);
    
    // Use textContent to preserve line breaks and indentation
    rawHtmlEditor.textContent = prettyHtml;
}

// Strip all styling except size attributes (width, height, size)
function stripStylingExceptSize(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    function stripElement(element) {
        if (element.nodeType === Node.ELEMENT_NODE) {
            // Remove all style attributes
            element.removeAttribute('style');
            
            // Remove all class attributes
            element.removeAttribute('class');
            
            // Remove all id attributes
            element.removeAttribute('id');
            
            // Remove all data attributes
            const dataAttrs = Array.from(element.attributes).filter(attr => attr.name.startsWith('data-'));
            dataAttrs.forEach(attr => element.removeAttribute(attr.name));
            
            // Keep only size-related attributes
            const allowedAttrs = ['width', 'height', 'size'];
            const allAttrs = Array.from(element.attributes);
            allAttrs.forEach(attr => {
                if (!allowedAttrs.includes(attr.name)) {
                    element.removeAttribute(attr.name);
                }
            });
            
            // Recursively process children
            Array.from(element.children).forEach(child => stripElement(child));
        }
    }
    
    Array.from(tempDiv.children).forEach(child => stripElement(child));
    
    return tempDiv.innerHTML;
}

// Update slides preview
function updateSlidesPreview(slides) {
    const slidesPreview = document.getElementById('slidesPreview');
    
    if (!slides || slides.length === 0) {
        slidesPreview.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 40px; font-style: italic;">No slides to preview</div>';
        return;
    }
    
    let html = '';
    slides.forEach((slide, index) => {
        const hasImage = slide.some(line => line.isImage);
        const hasHeading = slide.some(line => line.isHeading);
        const slideType = hasImage ? 'Image' : hasHeading ? 'Title' : 'Content';
        
        // Get background frame for this slide
        const backgroundFrame = extractedFrames[index] || extractedFrames[extractedFrames.length - 1];
        const backgroundStyle = backgroundFrame ? 
            `background-image: url('${backgroundFrame}'); background-size: cover; background-position: center;` : 
            'background: var(--background-light);';
        
        html += `<div class="slide-item" style="${backgroundStyle}">`;
        html += `<div class="slide-overlay">`;
        html += `<div class="slide-content">`;
        
        slide.forEach(line => {
            if (line.isImage) {
                html += `<div class="image-placeholder">📷 Image${line.isSvg ? ' (SVG)' : ''}</div>`;
            } else if (line.isHeading) {
                const headingClass = `heading h${line.level || 3}`;
                html += `<div class="${headingClass}">${line.text}</div>`;
            } else if (line.text && line.text.trim()) {
                html += `<div class="text">${line.text}</div>`;
            }
        });
        
        html += `</div></div></div>`;
    });
    
    slidesPreview.innerHTML = html;
}

// Add event listener to content editor
document.getElementById('htmlContent').addEventListener('input', function() {
    updateLineCount();
    updateRawHtml();
    saveContent();
});

// Add focus/blur event listeners for column resizing
document.getElementById('rawHtml').addEventListener('focus', function() {
    document.querySelector('.editor-container').classList.add('raw-focused');
});

document.getElementById('rawHtml').addEventListener('blur', function() {
    document.querySelector('.editor-container').classList.remove('raw-focused');
});

// Synchronized scrolling between raw HTML and formatted HTML editors
let isScrolling = false;

function syncScroll(sourceElement, targetElement) {
    if (isScrolling) return;
    
    isScrolling = true;
    
    const sourceScrollTop = sourceElement.scrollTop;
    const sourceScrollHeight = sourceElement.scrollHeight - sourceElement.clientHeight;
    const targetScrollHeight = targetElement.scrollHeight - targetElement.clientHeight;
    
    // Calculate proportional scroll position
    const scrollRatio = sourceScrollHeight > 0 ? sourceScrollTop / sourceScrollHeight : 0;
    const targetScrollTop = targetScrollHeight * scrollRatio;
    
    targetElement.scrollTop = targetScrollTop;
    
    // Reset the flag after a short delay
    setTimeout(() => {
        isScrolling = false;
    }, 10);
}

// Add scroll event listeners for synchronized scrolling (will be added in DOMContentLoaded)

// Add event listener to lines per slide input
document.getElementById('linesPerSlide').addEventListener('input', function() {
    updateLineCount();
    saveSettings();
});
document.getElementById('htmlContent').addEventListener('paste', function(e) {
    console.log('Paste event detected');
    
    // Get the pasted data
    const clipboardData = e.clipboardData || window.clipboardData;
    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');
    
    console.log('HTML data:', htmlData);
    console.log('Text data:', textData);
    
    // If we have HTML data, log it for debugging
    if (htmlData) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlData;
        console.log('Parsed HTML elements:', tempDiv.children);
        console.log('Images found in clipboard:', tempDiv.querySelectorAll('img').length);
        console.log('SVGs found in clipboard:', tempDiv.querySelectorAll('svg').length);
        console.log('Elements with background-image:', Array.from(tempDiv.querySelectorAll('*')).filter(el => el.style && el.style.backgroundImage).length);
        
        // Log all img elements details
        tempDiv.querySelectorAll('img').forEach((img, idx) => {
            console.log(`Image ${idx}:`, {
                src: img.src,
                alt: img.alt,
                width: img.width,
                height: img.height,
                style: img.style.cssText,
                attributes: Array.from(img.attributes).map(attr => ({name: attr.name, value: attr.value}))
            });
        });
        
        // Check if the browser will strip images - if so, manually handle paste
        const imagesInClipboard = tempDiv.querySelectorAll('img').length;
        const svgsInClipboard = tempDiv.querySelectorAll('svg').length;
        
        if (imagesInClipboard > 0 || svgsInClipboard > 0) {
            console.log('Detected images/SVGs in clipboard - using manual paste handling');
            
            // Prevent default paste to handle it manually
            e.preventDefault();
            
            // Get the current selection
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            // Delete any selected content
            selection.deleteFromDocument();
            
            // Insert the HTML content manually
            const range = selection.getRangeAt(0);
            const fragment = range.createContextualFragment(htmlData);
            range.insertNode(fragment);
            
            // Move cursor to end of inserted content
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Trigger update
            setTimeout(() => {
                const contentEditor = document.getElementById('htmlContent');
                console.log('Content after manual paste:', contentEditor.innerHTML);
                const imgCount = contentEditor.querySelectorAll('img').length;
                const svgCount = contentEditor.querySelectorAll('svg').length;
                console.log('Images in editor after manual paste:', imgCount);
                console.log('SVGs in editor after manual paste:', svgCount);
                
                if (imgCount > 0 || svgCount > 0) {
                    showStatus(`Successfully pasted content with ${imgCount} image(s) and ${svgCount} drawing(s)`, 'success');
                }
                
                updateLineCount();
                updateRawHtml();
            }, 100);
            
            return;
        }
    }
    
    setTimeout(() => {
        const contentEditor = document.getElementById('htmlContent');
        console.log('Content after paste:', contentEditor.innerHTML);
        console.log('Images in editor after paste:', contentEditor.querySelectorAll('img').length);
        console.log('SVGs in editor after paste:', contentEditor.querySelectorAll('svg').length);
        updateLineCount();
        updateRawHtml();
    }, 100);
});

// Show status messages
function showStatus(message, type = 'info') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
}

// Update progress
function updateProgress(percent, text) {
    const progress = document.getElementById('progress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressPercentage = document.getElementById('progressPercentage');
    
    progress.style.display = 'block';
    progressFill.style.width = `${percent}%`;
    progressText.textContent = text;
    progressPercentage.textContent = `${Math.round(percent)}%`;
}

// Hide progress
function hideProgress() {
    document.getElementById('progress').style.display = 'none';
}

// Start frame extraction process
async function startFrameExtraction() {
    if (frameExtractionInProgress || !videoElement) return;
    
    frameExtractionInProgress = true;
    showStatus('Extracting video frames for preview...', 'info');
    
    try {
        // Extract a reasonable number of frames for preview (max 20)
        const maxFrames = 20;
        extractedFrames = await extractFramesForPreview(videoElement, maxFrames);
        
        showStatus(`Extracted ${extractedFrames.length} frames successfully`, 'success');
        
        // Update slides preview if content exists
        const contentEditor = document.getElementById('htmlContent');
        const htmlContent = contentEditor.innerHTML.trim();
        if (htmlContent && contentEditor.textContent.trim() !== '') {
            updateLineCount();
        }
    } catch (error) {
        console.error('Error extracting frames:', error);
        showStatus('Error extracting frames for preview', 'error');
    } finally {
        frameExtractionInProgress = false;
    }
}

// Extract frames from video for preview
async function extractFramesForPreview(video, maxFrames) {
    return new Promise((resolve, reject) => {
        const frames = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.addEventListener('loadedmetadata', async function() {
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
        });
        
        video.addEventListener('error', (e) => {
            reject(new Error('Error loading video'));
        });
        
        // Trigger metadata load
        video.load();
    });
}

// Extract frames from video (for final presentation generation)
async function extractFrames(video, numFrames) {
    return new Promise((resolve, reject) => {
        const frames = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.addEventListener('loadedmetadata', async function() {
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
                    updateProgress((i / numFrames) * 50, `Extracting frame ${i} of ${numFrames}...`);
                } catch (error) {
                    console.error('Error extracting frame:', error);
                }
            }
            
            resolve(frames);
        });
        
        video.addEventListener('error', (e) => {
            reject(new Error('Error loading video'));
        });
        
        // Trigger metadata load
        video.load();
    });
}

// Seek to specific time in video
function seekToTime(video, time) {
    return new Promise((resolve) => {
        video.currentTime = time;
        video.addEventListener('seeked', function onSeeked() {
            video.removeEventListener('seeked', onSeeked);
            resolve();
        });
    });
}

// Strip text enclosed in square brackets
function stripBracketedText(text) {
    return text.replace(/\[.*?\]/g, '').replace(/  +/g, ' ').trim();
}

// Convert image to inverted data URL
async function invertImage(imgSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
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

// Parse HTML content into text lines
function parseHTMLContent(htmlContent) {
    console.log('parseHTMLContent called with:', htmlContent);
    
    // First, remove sections that begin with "[" and end with "]"
    const cleanedHtml = htmlContent.replace(/\[[\s\S]*?\]/g, '');
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanedHtml;
    console.log('tempDiv children count:', tempDiv.children.length);
    console.log('tempDiv img count:', tempDiv.querySelectorAll('img').length);
    console.log('tempDiv svg count:', tempDiv.querySelectorAll('svg').length);
    
    // Recursively flatten all nested divs/spans and bring all meaningful elements to top level
    function flattenStructure(container) {
        const meaningfulElements = [];
        
        function isMeaningfulElement(node) {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            const tagName = node.tagName.toLowerCase();
            return tagName.match(/^h[1-6]$/) || tagName === 'p' || tagName === 'li' || tagName === 'hr' || tagName === 'br' || tagName === 'img' || tagName === 'svg' ||
                   ((tagName === 'div' || tagName === 'span') && node.style && node.style.backgroundImage);
        }
        
        function hasTextContent(node) {
            return node.textContent && node.textContent.trim().length > 0;
        }
        
        function recursiveExtract(node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                
                // If it's a meaningful element, extract it
                if (isMeaningfulElement(node)) {
                    meaningfulElements.push(node.cloneNode(true));
                }
                // If it's a wrapper element, check if it should be flattened
                else if (tagName === 'div' || tagName === 'span' || tagName === 'ul' || tagName === 'ol' || tagName === 'section' || tagName === 'article' || tagName === 'b' || tagName === 'strong' || tagName === 'i' || tagName === 'em') {
                    // Count meaningful children (elements that contain actual content)
                    const childElements = Array.from(node.children).filter(child => child.nodeType === Node.ELEMENT_NODE);
                    const meaningfulChildren = childElements.filter(child => isMeaningfulElement(child) || hasTextContent(child));
                    
                    // If this wrapper has no meaningful children but has text content itself, extract it
                    if (meaningfulChildren.length === 0 && hasTextContent(node)) {
                        // Create a paragraph element to wrap the text content
                        const p = document.createElement('p');
                        p.innerHTML = node.innerHTML;
                        meaningfulElements.push(p);
                    }
                    // If this wrapper only contains one meaningful element, extract it directly
                    else if (meaningfulChildren.length === 1) {
                        recursiveExtract(meaningfulChildren[0]);
                    }
                    // If this wrapper has multiple meaningful children, recurse into all children
                    else if (meaningfulChildren.length > 1) {
                        Array.from(node.childNodes).forEach(child => recursiveExtract(child));
                    }
                    // If no meaningful children, still recurse to check for nested content
                    else {
                        Array.from(node.childNodes).forEach(child => recursiveExtract(child));
                    }
                }
            }
        }
        
        // First pass: aggressively flatten single-child wrappers
        function aggressiveFlatten(node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                
                // If it's a wrapper element with only one child element, replace it with its child
                if ((tagName === 'div' || tagName === 'span' || tagName === 'b' || tagName === 'strong' || tagName === 'i' || tagName === 'em') && 
                    node.children.length === 1 && 
                    node.children[0].nodeType === Node.ELEMENT_NODE) {
                    
                    const child = node.children[0];
                    const childTag = child.tagName.toLowerCase();
                    
                // If the child is also a wrapper, continue flattening
                if (childTag === 'div' || childTag === 'span' || childTag === 'b' || childTag === 'strong' || childTag === 'i' || childTag === 'em') {
                    // Replace this node with its child
                    if (node.parentNode) {
                        node.parentNode.replaceChild(child, node);
                        // Continue flattening from the child
                        aggressiveFlatten(child);
                    }
                } else {
                    // Child is meaningful, keep it but continue flattening
                    aggressiveFlatten(child);
                }
                } else {
                    // Process all children
                    Array.from(node.children).forEach(child => aggressiveFlatten(child));
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
    const lines = [];
    
    // Process children recursively to maintain order
    function processNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            const rawText = node.textContent.trim();
            const text = stripBracketedText(rawText);
            
            // Handle hr tags and br tags as slide breaks
            if (tagName === 'hr' || tagName === 'br') {
                lines.push({ text: '', isHr: true });
            }
            // Handle SVG elements (Google Drawings)
            else if (tagName === 'svg') {
                console.log('Found SVG element:', node);
                const svgData = new XMLSerializer().serializeToString(node);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const svgUrl = URL.createObjectURL(svgBlob);
                lines.push({ isImage: true, src: svgUrl, isSvg: true });
                console.log('Added SVG to lines');
            }
            // Handle images
            else if (tagName === 'img') {
                const imgSrc = node.src || node.getAttribute('src');
                console.log('Found img element with src:', imgSrc);
                if (imgSrc) {
                    lines.push({ isImage: true, src: imgSrc });
                    console.log('Added image to lines');
                }
            }
            // Handle headings
            else if (tagName.match(/^h[1-6]$/) && text.length > 0) {
                lines.push({ text, isHeading: true, level: parseInt(tagName[1]) });
            }
            // Handle paragraphs and list items (including empty ones)
            else if (tagName === 'p' || tagName === 'li') {
                // Check if this element contains a heading (skip if it does)
                const hasHeading = node.querySelector('h1, h2, h3, h4, h5, h6');
                // Check if this element contains an SVG (Google Drawing)
                const hasSvg = node.querySelector('svg');
                // Check if this element contains br tags
                const hasBr = node.querySelector('br');
                if (!hasHeading && !hasSvg) {
                    if (hasBr) {
                        // If paragraph contains br tags, split by br and process each part
                        const parts = node.innerHTML.split(/<br\s*\/?>/i);
                        parts.forEach((part, index) => {
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = part;
                            const partText = stripBracketedText(tempDiv.textContent.trim());
                            if (partText.length > 0) {
                                lines.push({ text: partText, isHeading: false });
                            }
                            // Add slide break after each part except the last one
                            if (index < parts.length - 1) {
                                lines.push({ text: '', isHr: true });
                            }
                        });
                    } else if (text.length > 0) {
                        lines.push({ text, isHeading: false });
                    } else {
                        // Empty paragraph/line - treat as empty line marker
                        lines.push({ text: '', isEmpty: true });
                    }
                } else if (hasSvg) {
                    // Process SVG within this element
                    Array.from(node.children).forEach(child => processNode(child));
                }
            }
            // Check for elements with background images (another way Google Drawings can appear)
            else if (node.style && node.style.backgroundImage) {
                const bgImage = node.style.backgroundImage;
                const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                if (urlMatch && urlMatch[1]) {
                    lines.push({ isImage: true, src: urlMatch[1] });
                }
            }
            // For divs and other containers, process children
            else if (tagName === 'div' || tagName === 'ul' || tagName === 'ol' || tagName === 'section' || tagName === 'article') {
                // First check if this div itself has a background image
                if (node.style && node.style.backgroundImage) {
                    const bgImage = node.style.backgroundImage;
                    const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                    if (urlMatch && urlMatch[1]) {
                        lines.push({ isImage: true, src: urlMatch[1] });
                    }
                }
                Array.from(node.children).forEach(child => processNode(child));
            }
        }
    }
    
    // Start processing from root children
    Array.from(tempDiv.children).forEach(child => processNode(child));
    
    // Post-process to handle consecutive br tags and empty lines
    const processedLines = [];
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
function groupIntoSlides(lines, linesPerSlide) {
    const slides = [];
    let currentSlide = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Handle hr tags and br tags - end current slide and skip the break marker
        if (line.isHr) {
            if (currentSlide.length > 0) {
                slides.push(currentSlide);
                currentSlide = [];
            }
            continue;
        }
        
        // Handle empty lines - end current slide and skip the empty line
        if (line.isEmpty) {
            if (currentSlide.length > 0) {
                slides.push(currentSlide);
                currentSlide = [];
            }
            continue;
        }
        
        // Images get their own slide
        if (line.isImage) {
            // Push current slide if it has content
            if (currentSlide.length > 0) {
                slides.push(currentSlide);
            }
            // Create a new slide with just the image
            slides.push([line]);
            currentSlide = [];
        }
        // Headers always get their own slide
        else if (line.isHeading) {
            // Push current slide if it has content
            if (currentSlide.length > 0) {
                slides.push(currentSlide);
            }
            // Create a new slide with just the header
            slides.push([line]);
            currentSlide = [];
        } else {
            currentSlide.push(line);
            
            // If we've reached the max lines per slide limit, start new slide
            if (currentSlide.length >= linesPerSlide) {
                slides.push(currentSlide);
                currentSlide = [];
            }
        }
    }
    
    // Add remaining lines
    if (currentSlide.length > 0) {
        slides.push(currentSlide);
    }
    
    return slides;
}

// Generate presentation
async function generatePresentation() {
    try {
        // Validate inputs
        if (!videoFile) {
            showStatus('Please upload an MP4 video file', 'error');
            return;
        }
        
        const contentEditor = document.getElementById('htmlContent');
        const htmlContent = contentEditor.innerHTML.trim();
        if (!htmlContent || htmlContent === '' || contentEditor.textContent.trim() === '') {
            showStatus('Please paste formatted content', 'error');
            return;
        }
        
        const linesPerSlide = parseInt(document.getElementById('linesPerSlide').value);
        
        // Disable button
        const btn = document.getElementById('generateBtn');
        const buttonText = document.getElementById('buttonText');
        btn.disabled = true;
        buttonText.textContent = 'Generating...';
        
        showStatus('Processing video and content...', 'info');
        updateProgress(0, 'Starting...');
        
        // Parse HTML content
        updateProgress(5, 'Parsing HTML content...');
        const lines = parseHTMLContent(htmlContent);
        const slides = groupIntoSlides(lines, linesPerSlide);
        
        if (slides.length === 0) {
            showStatus('No content found to create slides', 'error');
            btn.disabled = false;
            buttonText.textContent = 'Generate Presentation';
            hideProgress();
            return;
        }
        
        // Use cached frames or extract new ones if needed
        let frames = extractedFrames;
        if (frames.length < slides.length) {
            updateProgress(10, 'Extracting additional video frames...');
            const additionalFrames = await extractFrames(videoElement, slides.length);
            frames = additionalFrames;
        } else {
            // Use only the frames we need
            frames = frames.slice(0, slides.length);
        }
        
        // Create presentation
        updateProgress(60, 'Creating presentation...');
        const pres = new PptxGenJS();
        
        // Set presentation size (16:9 aspect ratio)
        pres.layout = 'LAYOUT_16x9';
        
        // Create slides
        for (let i = 0; i < slides.length; i++) {
            const slide = pres.addSlide();
            
            // Add background image
            if (frames[i]) {
                slide.background = { data: frames[i] };
            }
            
            // Add semi-transparent overlay for better text readability
            slide.addShape(pres.ShapeType.rect, {
                x: 0, y: 0, w: '100%', h: '100%',
                fill: { color: '000000', transparency: 40 }
            });
            
            // Prepare slide content
            const slideContent = slides[i];
            
            // Check if this slide contains an image
            const hasImage = slideContent.length > 0 && slideContent[0].isImage;
            
            if (hasImage) {
                // Process and add the image with inverted colors
                try {
                    updateProgress(60 + ((i + 1) / slides.length) * 35, `Processing image for slide ${i + 1}...`);
                    const invertedImageData = await invertImage(slideContent[0].src);
                    
                    // Add inverted image to slide (centered with screen blend effect)
                    // Screen blend mode is simulated with inverted colors and transparency
                    slide.addImage({
                        data: invertedImageData,
                        x: 1.5,
                        y: 1,
                        w: 7,
                        h: 3.625,
                        sizing: { type: 'contain', w: 7, h: 3.625 },
                        transparency: 30
                    });
                } catch (error) {
                    console.error('Error processing image:', error);
                }
            } else {
                // Check if this slide contains only a header
                const isHeaderOnlySlide = slideContent.length === 1 && slideContent[0].isHeading;
                
                // Calculate total height needed for all content to center vertically
                let totalHeight = 0;
                const lineHeights = [];
                
                slideContent.forEach((line) => {
                    const isHeading = line.isHeading || false;
                    const headingLevel = line.level || 3;
                    
                    let spacing = 0.5;
                    if (isHeading) {
                        if (headingLevel === 1) {
                            spacing = 0.9;
                        } else if (headingLevel === 2) {
                            spacing = 0.8;
                        } else {
                            spacing = 0.7;
                        }
                    }
                    
                    lineHeights.push(spacing);
                    totalHeight += spacing;
                });
                
                // Start position to center content vertically (slide height is 5.625 for 16:9)
                const slideHeight = 5.625;
                let yPosition = (slideHeight - totalHeight) / 2;
                
                slideContent.forEach((line, idx) => {
                    const isHeading = line.isHeading || false;
                    const headingLevel = line.level || 3;
                    const text = typeof line === 'string' ? line : line.text;
                    
                    // Determine font size based on heading level
                    let fontSize = 16;
                    if (isHeading) {
                        if (headingLevel === 1) {
                            fontSize = 36;
                        } else if (headingLevel === 2) {
                            fontSize = 32;
                        } else {
                            fontSize = 26;
                        }
                    }
                    
                    slide.addText(text, {
                        x: 0.5,
                        y: yPosition,
                        w: 9,
                        fontSize: fontSize,
                        color: 'FFFFFF',
                        bold: isHeading,
                        align: 'center',
                        valign: 'top',
                        fontFace: 'Georgia',
                        lineSpacing: 28,
                        fontBold: isHeading ? true : false,
                        transform: 'scaleX(-1)'
                    });
                    
                    yPosition += lineHeights[idx];
                });
            }
            
            updateProgress(60 + ((i + 1) / slides.length) * 35, `Creating slide ${i + 1} of ${slides.length}...`);
        }
        
        // Save presentation
        updateProgress(95, 'Saving presentation...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        await pres.writeFile({ fileName: `presentation-${timestamp}.pptx` });
        
        updateProgress(100, 'Complete!');
        showStatus(`Successfully created presentation with ${slides.length} slides!`, 'success');
        
        // Re-enable button
        setTimeout(() => {
            btn.disabled = false;
            buttonText.textContent = 'Generate Presentation';
            hideProgress();
        }, 2000);
        
    } catch (error) {
        console.error('Error generating presentation:', error);
        showStatus(`Error: ${error.message}`, 'error');
        const btn = document.getElementById('generateBtn');
        const buttonText = document.getElementById('buttonText');
        btn.disabled = false;
        buttonText.textContent = 'Generate Presentation';
        hideProgress();
    }
}

// Load saved data when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadContent();
    loadVideo();
    loadSettings();
    
    // Add scroll event listeners for synchronized scrolling
    document.getElementById('rawHtml').addEventListener('scroll', function() {
        syncScroll(this, document.getElementById('htmlContent'));
    });

    document.getElementById('htmlContent').addEventListener('scroll', function() {
        syncScroll(this, document.getElementById('rawHtml'));
    });
});
