import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export type BackupInfo = {
  filename: string;
  size: number;
  lastModified: Date;
};

const getB2Client = (): S3Client => {
  const region = process.env.B2_REGION; // e.g., 'us-west-004'
  const keyId = process.env.B2_APPLICATION_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;
  if (!region || !keyId || !applicationKey) {
    throw new Error('B2 credentials not configured. Set B2_REGION, B2_APPLICATION_KEY_ID, and B2_APPLICATION_KEY.');
  }
  return new S3Client({
    region,
    endpoint: `https://s3.${region}.backblazeb2.com`,
    credentials: { accessKeyId: keyId, secretAccessKey: applicationKey },
  });
};

const getBucketName = (): string => {
  const bucket = process.env.B2_BUCKET_NAME;
  if (!bucket) throw new Error('B2_BUCKET_NAME not configured.');
  return bucket;
};

export const uploadBackup = async (filename: string, data: Buffer | Uint8Array): Promise<void> => {
  const client = getB2Client();
  const bucket = getBucketName();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: filename,
    Body: data,
    ContentType: 'application/gzip',
  }));
};

export const listBackups = async (): Promise<BackupInfo[]> => {
  const client = getB2Client();
  const bucket = getBucketName();
  const response = await client.send(new ListObjectsV2Command({ Bucket: bucket }));
  const backups: BackupInfo[] = (response.Contents || [])
    .filter(obj => obj.Key && obj.Size !== undefined && obj.LastModified)
    .map(obj => ({
      filename: obj.Key!,
      size: obj.Size!,
      lastModified: obj.LastModified!,
    }))
    .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  return backups;
};

export const downloadBackup = async (filename: string): Promise<Buffer> => {
  const client = getB2Client();
  const bucket = getBucketName();
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: filename }));
  if (!response.Body) throw new Error(`Backup file not found: ${filename}`);
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

export const deleteBackup = async (filename: string): Promise<void> => {
  const client = getB2Client();
  const bucket = getBucketName();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: filename }));
};
