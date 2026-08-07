/**
 * TypeScript type definitions for video upload system
 */

import { LabelType, VideoStatus } from '@prisma/client';

/**
 * Form data for video upload
 */
export interface VideoUploadFormData {
  // Video files (1-3 cameras)
  cam1: File | null;
  cam2: File | null;
  cam3: File | null;
  
  // Fight metadata
  boxer1: string;
  boxer2: string;
  fightDate: Date;
  round: number;
  fps: number;
  
  // Optional fields
  weightClass?: string;
  description?: string;
  
  // Labeler assignments (optional)
  offenseLabelers?: string[];
  defenseLabelers?: string[];
  footworkLabelers?: string[];
}

/**
 * Upload progress tracking
 */
export interface UploadProgress {
  cameraNum: number;
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

/**
 * API response for video upload
 */
export interface VideoUploadResponse {
  success: boolean;
  videoId?: string;
  dynamoDbId?: string;
  message?: string;
  error?: string;
}

/**
 * Video with assignment info for dashboard
 */
export interface VideoWithAssignments {
  id: string;
  dynamoDbId: string;
  title: string;
  description: string | null;
  boxer1: string;
  boxer2: string;
  round: number;
  fightDate: Date;
  fps: number;
  numCameraViews: number;
  sourceUrls: string[];
  createdAt: Date;
  
  // Assignment info
  assignments: {
    id: string;
    labelType: LabelType;
    status: VideoStatus;
    assignedAt: Date;
    pickedUpAt: Date | null;
    submittedAt: Date | null;
  }[];
}

/**
 * Assignment request
 */
export interface AssignmentRequest {
  videoId: string;
  labelType: LabelType;
}

/**
 * Assignment response
 */
export interface AssignmentResponse {
  success: boolean;
  assignmentId?: string;
  message?: string;
  error?: string;
}
