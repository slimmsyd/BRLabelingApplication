/**
 * Generate a storage path for a video file
 * Format: "{boxer1}_{boxer2}/r{round}/cam{camNum}.mp4"
 * 
 * @param boxer1 - First boxer name
 * @param boxer2 - Second boxer name
 * @param round - Round number
 * @param camNum - Camera number (1-3)
 * @returns Storage path string
 */
export function generateStoragePath(
  boxer1: string,
  boxer2: string,
  round: number,
  camNum: number
): string {
  // Slugify boxer names (remove spaces, lowercase)
  const boxer1Slug = boxer1.toLowerCase().replace(/\s+/g, '');
  const boxer2Slug = boxer2.toLowerCase().replace(/\s+/g, '');
  
  console.log(boxer1Slug, boxer2Slug, round, camNum);
  return `${boxer1Slug}_${boxer2Slug}/r${round}/cam${camNum}.mp4`;
}

/**
 * Validate a video file for format and size
 * 
 * @param file - File to validate
 * @returns Validation result with error message if invalid
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
  const VALID_FORMATS = ['video/mp4', 'video/quicktime', 'video/webm'];
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 500MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`
    };
  }
  
  // Check file format
  if (!VALID_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file format. Please upload MP4, MOV, or WebM files. Got: ${file.type}`
    };
  }
  
  return { valid: true };
}

/**
 * Extract video duration using browser's HTMLVideoElement
 * 
 * @param file - Video file to analyze
 * @returns Promise resolving to duration in seconds
 */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(Math.floor(video.duration));
    };
    
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Generate a video title from metadata
 * Format: "{Boxer1} v {Boxer2} - R{round}"
 * 
 * @param boxer1 - First boxer name
 * @param boxer2 - Second boxer name
 * @param round - Round number
 * @returns Formatted title string
 */
export function generatedVideoTitle(
  boxer1: string,
  boxer2: string,
  round: number
): string {
  return `${boxer1} v ${boxer2} - R${round}`;
}

/**
 * Format a date to match legacy format: "DD MMM YYYY"
 * Example: "06 Sep 2024"
 * 
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatFightDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}
