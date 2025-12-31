import { NextResponse } from 'next/server';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  const nodeEnv = process.env.NODE_ENV;
  const lilypondUrl = process.env.NEXT_PUBLIC_LILYPOND_SERVER_URL;
  const lilypondUrlNonPublic = process.env.LILYPOND_SERVER_URL;
  const allEnvKeys = Object.keys(process.env).filter(key => 
    key.includes('DATABASE') || 
    key.includes('DB') || 
    key.includes('NEON') ||
    key.includes('POSTGRES') ||
    key.includes('LILYPOND')
  );
  
  return NextResponse.json({
    hasDatabaseUrl: !!dbUrl,
    databaseUrlLength: dbUrl?.length || 0,
    databaseUrlPrefix: dbUrl?.substring(0, 20) || 'not set',
    nodeEnv,
    lilypondServerUrl: lilypondUrl || 'not set',
    lilypondServerUrlNonPublic: lilypondUrlNonPublic || 'not set',
    relevantEnvKeys: allEnvKeys,
    allEnvKeysCount: Object.keys(process.env).length
  });
}
