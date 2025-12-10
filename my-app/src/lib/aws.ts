/**
 * AWS Configuration and Helper Functions
 * Provides S3 and DynamoDB clients and utility functions for video upload system
 */

import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Upload } from '@aws-sdk/lib-storage';

// AWS Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.warn('AWS credentials not configured. S3 and DynamoDB operations will fail.');
}

// S3 Client Configuration
export const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

// DynamoDB Client Configuration
const dynamoDBClient = new DynamoDBClient({
  region: AWS_REGION,
  credentials: AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

export const dynamoDBDocClient = DynamoDBDocumentClient.from(dynamoDBClient);

// Environment-specific configuration
export const S3_BUCKET = process.env.S3_BUCKET || 'com.boxrawlabs.labelling-app-test-data.unsecured';
export const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL || 'https://do5dznmsu0r6j.cloudfront.net';
export const DYNAMODB_VDS_TABLE = process.env.DYNAMODB_VDS_TABLE || 'VideoDataSource-main';

/**
 * Check if an S3 object exists
 */
export async function checkS3ObjectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Upload a file to S3 with progress tracking
 */
export async function uploadToS3(
  file: File | Buffer,
  key: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: S3_BUCKET,
      Key: key,
      Body: file,
      ContentType: file instanceof File ? file.type : 'video/mp4',
    },
  });

  // Track progress if callback provided
  if (onProgress) {
    upload.on('httpUploadProgress', (progress) => {
      if (progress.loaded && progress.total) {
        const percentage = Math.round((progress.loaded / progress.total) * 100);
        onProgress(percentage);
      }
    });
  }

  await upload.done();
  
  // Return CloudFront URL
  return `${CLOUDFRONT_URL}/${key}`;
}

/**
 * Generate S3 key following Python script naming convention
 */
export function generateS3Key(
  boxer1: string,
  boxer2: string,
  cameraNum: number,
  round: number,
  date: string // YYYY-MM-DDZ format
): string {
  const boxer1Slug = boxer1.toLowerCase().replace(/\s+/g, '');
  const boxer2Slug = boxer2.toLowerCase().replace(/\s+/g, '');
  const filename = `${boxer1Slug}_${boxer2Slug}_c${cameraNum}_r${round}.mp4`;
  const folderPrefix = `${boxer1} v ${boxer2}- ${date.replace('Z', '')}`;
  return `${folderPrefix}/${filename}`;
}

/**
 * VideoDataSource interface matching DynamoDB schema
 */
export interface VideoDataSource {
  id: string;
  assignments: {
    Offense: Array<{ labellerName: string; assignmentDate: string }>;
    Defense: Array<{ labellerName: string; assignmentDate: string }>;
    Footwork: Array<{ labellerName: string; assignmentDate: string }>;
  };
  boxer1: string;
  boxer2: string;
  createdAt: string;
  date: string;
  description: string;
  fps: number;
  num_camera_views: number;
  round: number;
  segment: string;
  source_urls: string[];
  updatedAt: string;
  __typename: 'VideoDataSource';
}

/**
 * Create a VideoDataSource record in DynamoDB
 */
export async function createVideoDataSource(
  data: Omit<VideoDataSource, 'id' | 'createdAt' | 'updatedAt' | '__typename'>
): Promise<VideoDataSource> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const record: VideoDataSource = {
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
    __typename: 'VideoDataSource',
  };

  await dynamoDBDocClient.send(new PutCommand({
    TableName: DYNAMODB_VDS_TABLE,
    Item: record,
  }));

  return record;
}

/**
 * Get a VideoDataSource record from DynamoDB by ID
 */
export async function getVideoDataSource(id: string): Promise<VideoDataSource | null> {
  const result = await dynamoDBDocClient.send(new GetCommand({
    TableName: DYNAMODB_VDS_TABLE,
    Key: { id },
  }));

  return result.Item as VideoDataSource | null;
}

/**
 * Get VideoDataSource records by description (fight name)
 */
export async function getVideoDataSourcesByDescription(description: string): Promise<VideoDataSource[]> {
  const result = await dynamoDBDocClient.send(new ScanCommand({
    TableName: DYNAMODB_VDS_TABLE,
    FilterExpression: 'description = :desc',
    ExpressionAttributeValues: {
      ':desc': description,
    },
  }));

  return (result.Items || []) as VideoDataSource[];
}

/**
 * Format date for DynamoDB (YYYY-MM-DDZ)
 */
export function formatDateForDynamoDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}Z`;
}

/**
 * Format date for display (DD MMM YYYY)
 */
export function formatDateForDisplay(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Create default assignments structure
 */
export function createDefaultAssignments(
  offenseLabelers: string[] = [],
  defenseLabelers: string[] = [],
  footworkLabelers: string[] = []
): VideoDataSource['assignments'] {
  const currentDate = formatDateForDynamoDB(new Date());

  return {
    Offense: offenseLabelers.map(name => ({
      labellerName: name,
      assignmentDate: currentDate,
    })),
    Defense: defenseLabelers.map(name => ({
      labellerName: name,
      assignmentDate: currentDate,
    })),
    Footwork: footworkLabelers.map(name => ({
      labellerName: name,
      assignmentDate: currentDate,
    })),
  };
}
