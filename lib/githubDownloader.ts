import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const REPO_URL = 'https://github.com/SecularSolstice/SecularSolstice.github.io.git';
const CLONED_FOLDER_NAME = 'SecularSolstice.github.io';

// Default persistent download location (in project root)
export const DEFAULT_DOWNLOAD_DIR = path.join(process.cwd(), '.secular-solstice-cache');

export type DownloadedRepo = {
  basePath: string;
  songsDir: string;
  speechesDir: string;
  listsDir: string;
  activitiesListFile: string; // lists/All_Activities.list - defines which speeches are activities
  cleanup: () => Promise<void>;
  getFileCommitDate: (filePath: string) => Promise<string | null>;
};

export type DownloadProgress = { phase: 'cloning' | 'pulling' | 'done' };

export type DownloadOptions = {
  onProgress?: (progress: DownloadProgress) => void;
  persistentDir?: string; // If provided, use this dir instead of temp and don't cleanup
  skipIfExists?: boolean; // If true and persistentDir exists with content, skip download
};

// Get the last commit date for a file using git log
const getFileCommitDate = async (repoPath: string, filePath: string): Promise<string | null> => {
  try {
    const relativePath = path.relative(repoPath, filePath);
    const { stdout } = await execAsync(
      `git log -1 --format="%aI" -- "${relativePath}"`,
      { cwd: repoPath }
    );
    const date = stdout.trim();
    return date || null;
  } catch {
    return null;
  }
};

export const downloadSecularSolsticeRepo = async (
  optionsOrOnProgress?: DownloadOptions | ((progress: DownloadProgress) => void)
): Promise<DownloadedRepo> => {
  // Handle both old callback signature and new options object
  const options: DownloadOptions = typeof optionsOrOnProgress === 'function'
    ? { onProgress: optionsOrOnProgress }
    : optionsOrOnProgress ?? {};
  const { onProgress, persistentDir, skipIfExists } = options;

  // Use persistent dir or create temp dir
  const useTemp = !persistentDir;
  const baseDir = persistentDir ?? await fs.mkdtemp(path.join(os.tmpdir(), 'secular-solstice-'));
  const expectedBasePath = path.join(baseDir, CLONED_FOLDER_NAME);

  const makeResult = (basePath: string): DownloadedRepo => ({
    basePath,
    songsDir: path.join(basePath, 'songs'),
    speechesDir: path.join(basePath, 'speeches'),
    listsDir: path.join(basePath, 'lists'),
    activitiesListFile: path.join(basePath, 'lists', 'All_Activities.list'),
    cleanup: async () => {
      if (useTemp) {
        try {
          await fs.rm(baseDir, { recursive: true, force: true });
        } catch (err) {
          console.warn('Failed to cleanup temp directory:', err);
        }
      }
    },
    getFileCommitDate: (filePath: string) => getFileCommitDate(basePath, filePath),
  });

  // Check if we can use existing clone
  if (skipIfExists && persistentDir) {
    try {
      const gitDir = path.join(expectedBasePath, '.git');
      await fs.access(gitDir);
      // It's a git repo, try to pull latest
      console.log('Using cached git clone at:', expectedBasePath);
      onProgress?.({ phase: 'pulling' });
      try {
        await execAsync('git pull --ff-only', { cwd: expectedBasePath });
      } catch (pullErr) {
        console.warn('Git pull failed (continuing with cached version):', (pullErr as Error).message);
      }
      onProgress?.({ phase: 'done' });
      return makeResult(expectedBasePath);
    } catch {
      // Not a valid git repo, proceed with fresh clone
    }
  }

  // Ensure base dir exists
  await fs.mkdir(baseDir, { recursive: true });

  // Remove old extracted folder if it exists (from ZIP-based download)
  const oldExtractedPath = path.join(baseDir, 'SecularSolstice.github.io-master');
  try {
    await fs.rm(oldExtractedPath, { recursive: true, force: true });
  } catch {}

  try {
    onProgress?.({ phase: 'cloning' });
    // Clone with --depth 1 for faster download, but we still get file history via git log
    // Actually, we need full history to get accurate commit dates, so don't use --depth 1
    await execAsync(`git clone "${REPO_URL}" "${expectedBasePath}"`, { cwd: baseDir });
    onProgress?.({ phase: 'done' });

    // Verify the clone worked
    try {
      await fs.access(expectedBasePath);
    } catch {
      throw new Error(`Clone failed - expected folder not found: ${expectedBasePath}`);
    }

    return makeResult(expectedBasePath);
  } catch (error) {
    // Cleanup on error (only if temp)
    if (useTemp) {
      try {
        await fs.rm(baseDir, { recursive: true, force: true });
      } catch {}
    }
    throw error;
  }
};
