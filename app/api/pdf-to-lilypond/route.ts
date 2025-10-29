import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getDocument } from 'pdfjs-dist';

// Configure PDF.js to work in Node environment
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const songName = formData.get('songName') as string;
    const fileName = formData.get('fileName') as string;

    if (!file || !songName || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Read PDF file
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;

    // Extract all pages as images concurrently
    const pagePromises = [];
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      pagePromises.push(extractPageAsBase64(pdfDocument, pageNum));
    }
    const pageImages = await Promise.all(pagePromises);

    // Send all pages to OpenRouter concurrently
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const conversionPromises = pageImages.map((imageBase64, index) => 
      convertPageToLilypond(imageBase64, index + 1, numPages, openRouterKey)
    );
    const pageResults = await Promise.all(conversionPromises);

    // Intelligently stitch the results together
    const stitchedLilypond = stitchLilypondPages(pageResults);

    // Save to file
    const songsDir = path.join(process.cwd(), 'songs');
    const songDir = path.join(songsDir, songName);
    const outputFileName = fileName.replace(/\.pdf$/i, '.ly');
    const outputPath = path.join(songDir, outputFileName);

    await fs.writeFile(outputPath, stitchedLilypond, 'utf-8');

    return NextResponse.json({ 
      success: true, 
      fileName: outputFileName,
      numPages,
      message: `Successfully converted ${numPages} page(s) to Lilypond`
    });
  } catch (error) {
    console.error('Error converting PDF to Lilypond:', error);
    return NextResponse.json({ 
      error: 'Failed to convert PDF to Lilypond',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function extractPageAsBase64(pdfDocument: any, pageNum: number): Promise<string> {
  const page = await pdfDocument.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2.0 });

  // Create canvas
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  // Render page to canvas
  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };
  await page.render(renderContext).promise;

  // Convert to base64 PNG
  const base64 = canvas.toDataURL('image/png').split(',')[1];
  return base64;
}

async function convertPageToLilypond(
  imageBase64: string, 
  pageNum: number, 
  totalPages: number,
  apiKey: string
): Promise<string> {
  const prompt = pageNum === 1 
    ? `You are a music notation expert. Convert this sheet music image to Lilypond format. This is page ${pageNum} of ${totalPages}. Include the full Lilypond header with version, title, composer, and all necessary structure. Provide ONLY the Lilypond code without any explanation or markdown formatting.`
    : `You are a music notation expert. Convert this sheet music image to Lilypond format. This is page ${pageNum} of ${totalPages} (continuation). Provide ONLY the music notation code for this page without headers or version declarations. Continue from where the previous page left off.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-flash-1.5-8b',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  // Clean up markdown code blocks if present
  let cleaned = content.trim();
  if (cleaned.startsWith('```lilypond') || cleaned.startsWith('```ly')) {
    cleaned = cleaned.replace(/^```(?:lilypond|ly)\n/, '').replace(/\n```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\n/, '').replace(/\n```$/, '');
  }
  
  return cleaned;
}

function stitchLilypondPages(pages: string[]): string {
  if (pages.length === 0) return '';
  if (pages.length === 1) return pages[0];

  // Extract header and version from first page
  const firstPage = pages[0];
  let header = '';
  let version = '';
  let firstPageMusic = firstPage;

  // Extract version declaration
  const versionMatch = firstPage.match(/\\version\s+"[^"]+"/);
  if (versionMatch) {
    version = versionMatch[0] + '\n\n';
    firstPageMusic = firstPage.replace(versionMatch[0], '').trim();
  }

  // Extract header block
  const headerMatch = firstPageMusic.match(/\\header\s*\{[^}]*\}/s);
  if (headerMatch) {
    header = headerMatch[0] + '\n\n';
    firstPageMusic = firstPageMusic.replace(headerMatch[0], '').trim();
  }

  // Extract score structure from first page
  const scoreMatch = firstPageMusic.match(/\\score\s*\{/);
  
  if (scoreMatch) {
    // Has explicit score block - need to merge music content
    const musicBlocks = pages.map(page => extractMusicFromScore(page));
    const combinedMusic = musicBlocks.join('\n');
    
    // Reconstruct with merged music
    const layoutMatch = firstPageMusic.match(/\\layout\s*\{[^}]*\}/s);
    const layout = layoutMatch ? '\n  ' + layoutMatch[0] : '';
    
    return `${version}${header}\\score {\n  {\n${combinedMusic}\n  }${layout}\n}`;
  } else {
    // Simple concatenation for pages without explicit score structure
    const allMusic = pages.map((page, index) => {
      if (index === 0) return firstPageMusic;
      // Strip any headers/versions from subsequent pages
      let cleaned = page.replace(/\\version\s+"[^"]+"\s*/g, '');
      cleaned = cleaned.replace(/\\header\s*\{[^}]*\}\s*/gs, '');
      return cleaned.trim();
    }).join('\n\n');
    
    return `${version}${header}${allMusic}`;
  }
}

function extractMusicFromScore(page: string): string {
  // Remove version and header
  let cleaned = page.replace(/\\version\s+"[^"]+"\s*/g, '');
  cleaned = cleaned.replace(/\\header\s*\{[^}]*\}\s*/gs, '');
  
  // Try to extract content within \score { ... }
  const scoreMatch = cleaned.match(/\\score\s*\{([\s\S]*)\}/);
  if (scoreMatch) {
    let scoreContent = scoreMatch[1].trim();
    // Remove layout block
    scoreContent = scoreContent.replace(/\\layout\s*\{[^}]*\}\s*/gs, '');
    // Remove outer braces if present
    scoreContent = scoreContent.replace(/^\{\s*/, '').replace(/\s*\}$/, '');
    return '    ' + scoreContent.trim().split('\n').join('\n    ');
  }
  
  return '    ' + cleaned.trim().split('\n').join('\n    ');
}

