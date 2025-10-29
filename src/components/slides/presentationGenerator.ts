import { parseHTMLContent, groupIntoSlides, extractFrames, invertImage } from './utils';
import { StatusType, Slide } from './types';

// Generate PowerPoint presentation from video and HTML content
export async function generatePresentation(
  PptxGenJS: any,
  videoFile: File | null,
  videoElement: HTMLVideoElement | null,
  htmlContent: string,
  linesPerSlide: number,
  extractedFrames: string[],
  showStatus: (message: string, type: StatusType) => void,
  updateProgress: (percent: number, text: string) => void,
  setIsGenerating: (generating: boolean) => void,
  setShowProgress: (show: boolean) => void
): Promise<void> {
  if (!PptxGenJS) {
    showStatus('PptxGenJS library not loaded yet. Please try again.', 'error');
    return;
  }
  
  try {
    // Validate inputs
    if (!videoFile) {
      showStatus('Please upload an MP4 video file', 'error');
      return;
    }
    
    if (!htmlContent.trim()) {
      showStatus('Please paste formatted content', 'error');
      return;
    }
    
    setIsGenerating(true);
    
    showStatus('Processing video and content...', 'info');
    updateProgress(0, 'Starting...');
    
    // Parse HTML content
    updateProgress(5, 'Parsing HTML content...');
    const lines = parseHTMLContent(htmlContent);
    const slidesList = groupIntoSlides(lines, linesPerSlide);
    
    if (slidesList.length === 0) {
      showStatus('No content found to create slides', 'error');
      setIsGenerating(false);
      setShowProgress(false);
      return;
    }
    
    // Use cached frames or extract new ones if needed
    let frames = extractedFrames;
    if (frames.length < slidesList.length && videoElement) {
      updateProgress(10, 'Extracting additional video frames...');
      const additionalFrames = await extractFrames(videoElement, slidesList.length, updateProgress);
      frames = additionalFrames;
    } else {
      frames = frames.slice(0, slidesList.length);
    }
    
    // Create presentation
    updateProgress(60, 'Creating presentation...');
    const pres = new PptxGenJS();
    
    // Set presentation size (16:9 aspect ratio)
    pres.layout = 'LAYOUT_16x9';
    
    // Create slides
    for (let i = 0; i < slidesList.length; i++) {
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
      const slideContent = slidesList[i];
      
      // Check if this slide contains an image
      const hasImage = slideContent.length > 0 && slideContent[0].isImage;
      
      if (hasImage && slideContent[0].src) {
        // Process and add the image with inverted colors
        try {
          updateProgress(60 + ((i + 1) / slidesList.length) * 35, `Processing image for slide ${i + 1}...`);
          const invertedImageData = await invertImage(slideContent[0].src);
          
          // Add inverted image to slide (centered with screen blend effect)
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
        // Calculate total height needed for all content to center vertically
        let totalHeight = 0;
        const lineHeights: number[] = [];
        
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
          const text = line.text || '';
          
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
            lineSpacing: 28
          });
          
          yPosition += lineHeights[idx];
        });
      }
      
      updateProgress(60 + ((i + 1) / slidesList.length) * 35, `Creating slide ${i + 1} of ${slidesList.length}...`);
    }
    
    // Save presentation
    updateProgress(95, 'Saving presentation...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    await pres.writeFile({ fileName: `presentation-${timestamp}.pptx` });
    
    updateProgress(100, 'Complete!');
    showStatus(`Successfully created presentation with ${slidesList.length} slides!`, 'success');
    
    // Re-enable button
    setTimeout(() => {
      setIsGenerating(false);
      setShowProgress(false);
    }, 2000);
    
  } catch (error) {
    console.error('Error generating presentation:', error);
    showStatus(`Error: ${(error as Error).message}`, 'error');
    setIsGenerating(false);
    setShowProgress(false);
  }
}

