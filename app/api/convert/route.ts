import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  const tempDir = path.join(process.cwd(), 'tmp');
  let mscxPath: string | null = null;
  let musicxmlPath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.mscz')) {
      return NextResponse.json({ error: 'File must be a .mscz file' }, { status: 400 });
    }

    // Ensure temp directory exists
    await fs.mkdir(tempDir, { recursive: true });

    // Read the .mscz file (which is a ZIP archive)
    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    // Find the .mscx file inside the archive
    const mscxEntry = zipEntries.find(entry => 
      entry.entryName.endsWith('.mscx') && !entry.entryName.includes('/')
    );

    if (!mscxEntry) {
      return NextResponse.json({ 
        error: 'No .mscx file found in .mscz archive',
        details: 'The .mscz file may be corrupted or have an unexpected structure'
      }, { status: 400 });
    }

    // Extract and save the .mscx file temporarily
    const timestamp = Date.now();
    mscxPath = path.join(tempDir, `${timestamp}_temp.mscx`);
    musicxmlPath = path.join(tempDir, `${timestamp}_temp.musicxml`);
    
    await fs.writeFile(mscxPath, mscxEntry.getData());

    // Convert MSCX to MusicXML using MuseScore
    const musescorePath = '/Applications/MuseScore 4.app/Contents/MacOS/mscore';
    try {
      await execAsync(`"${musescorePath}" "${mscxPath}" -o "${musicxmlPath}"`);
    } catch (execError) {
      console.error('MuseScore conversion error:', execError);
      // MuseScore might output warnings to stderr but still succeed, check if file was created
      try {
        await fs.access(musicxmlPath);
      } catch {
        throw new Error('MuseScore conversion failed');
      }
    }

    // Read the converted MusicXML
    const musicxmlContent = await fs.readFile(musicxmlPath, 'utf-8');

    // Clean up temp files
    try {
      if (mscxPath) await fs.unlink(mscxPath);
      if (musicxmlPath) await fs.unlink(musicxmlPath);
    } catch (cleanupError) {
      console.error('Error cleaning up temp files:', cleanupError);
    }

    // Return the MusicXML content
    return new NextResponse(musicxmlContent, {
      headers: {
        'Content-Type': 'application/vnd.recordare.musicxml+xml',
        'Content-Disposition': `attachment; filename="${file.name.replace('.mscz', '.musicxml')}"`,
      },
    });
  } catch (error) {
    // Clean up temp files on error
    try {
      if (mscxPath) await fs.unlink(mscxPath);
      if (musicxmlPath) await fs.unlink(musicxmlPath);
    } catch (cleanupError) {
      console.error('Error cleaning up temp files:', cleanupError);
    }

    console.error('Error processing .mscz file:', error);
    return NextResponse.json({ 
      error: 'Failed to process .mscz file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

