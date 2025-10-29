'use client';

import { useState, useEffect, useCallback } from 'react';
import VideoUploader from './slides/VideoUploader';
import ContentEditor from './slides/ContentEditor';
import SettingsPanel from './slides/SettingsPanel';
import GenerateButton from './slides/GenerateButton';
import ProgressBar from './slides/ProgressBar';
import StatusMessage from './slides/StatusMessage';
import { parseHTMLContent, groupIntoSlides } from './slides/utils';
import { StatusType, Slide } from './slides/types';
import { updateRawHtml as processRawHtml } from './slides/htmlProcessing';
import { handleVideoLoad as processVideoLoad, handlePaste as processPaste } from './slides/eventHandlers';
import { generatePresentation as createPresentation } from './slides/presentationGenerator';
import { AnyBecauseLibrary } from '../types/default';

// Dynamically import PptxGenJS only on client side
let PptxGenJS: AnyBecauseLibrary | null = null;

const SlidesGenerator = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
  const [htmlContent, setHtmlContent] = useState('');
  const [rawHtml, setRawHtml] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [linesPerSlide, setLinesPerSlide] = useState(8);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<StatusType>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [showProgress, setShowProgress] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [frameExtractionInProgress, setFrameExtractionInProgress] = useState(false);
  
  // Load PptxGenJS on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !PptxGenJS) {
      import('pptxgenjs').then((module) => {
        PptxGenJS = module.default;
      });
    }
  }, []);
  
  // Update slides when content or linesPerSlide changes
  useEffect(() => {
    if (htmlContent.trim() === '') {
      setSlides([]);
      setRawHtml('');
      return;
    }
    
    const lines = parseHTMLContent(htmlContent);
    const newSlides = groupIntoSlides(lines, linesPerSlide);
    setSlides(newSlides);
    setRawHtml(processRawHtml(htmlContent));
  }, [htmlContent, linesPerSlide]);
  
  // Handle video load
  const handleVideoLoad = useCallback(async (file: File, video: HTMLVideoElement) => {
    setVideoFile(file);
    setVideoElement(video);
    
    if (!frameExtractionInProgress) {
      setFrameExtractionInProgress(true);
      await processVideoLoad(file, video, showStatus, setExtractedFrames);
      setFrameExtractionInProgress(false);
    }
  }, [frameExtractionInProgress]);
  
  // Handle paste event
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    processPaste(e, showStatus, setHtmlContent);
  }, []);
  
  // Show status
  const showStatus = (message: string, type: StatusType) => {
    setStatusMessage(message);
    setStatusType(type);
  };
  
  // Update progress
  const updateProgress = (percent: number, text: string) => {
    setProgressPercent(percent);
    setProgressText(text);
    setShowProgress(true);
  };
  
  // Generate presentation
  const generatePresentation = useCallback(async () => {
    await createPresentation(PptxGenJS, videoFile, videoElement, htmlContent, linesPerSlide, extractedFrames, showStatus, updateProgress, setIsGenerating, setShowProgress);
  }, [videoFile, videoElement, htmlContent, linesPerSlide, extractedFrames]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <h3 className="text-center text-white text-base font-semibold mb-5">HTML to Presentation Generator</h3>
      
      <div className="max-w-[1600px] mx-auto bg-white rounded-2xl shadow-2xl p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
        
        <VideoUploader onVideoLoad={handleVideoLoad} />
        
        <ContentEditor htmlContent={htmlContent} setHtmlContent={setHtmlContent} rawHtml={rawHtml} slides={slides} extractedFrames={extractedFrames} onPaste={handlePaste} />
        
        <SettingsPanel linesPerSlide={linesPerSlide} setLinesPerSlide={setLinesPerSlide} />
        
        <GenerateButton onClick={generatePresentation} disabled={!videoFile || !htmlContent.trim() || isGenerating} isGenerating={isGenerating} />
        
        <ProgressBar percent={progressPercent} text={progressText} show={showProgress} />
        
        <StatusMessage message={statusMessage} type={statusType} />
      </div>
    </div>
  );
};

export default SlidesGenerator;

