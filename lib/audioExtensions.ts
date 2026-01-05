import { SUPPORTED_EXTENSIONS } from '@/app/songs/types';

export const AUDIO_EXTENSIONS = SUPPORTED_EXTENSIONS.audio.map(ext => `.${ext}`) as readonly string[];

export const AUDIO_EXTENSION_SET = new Set<string>(AUDIO_EXTENSIONS);
