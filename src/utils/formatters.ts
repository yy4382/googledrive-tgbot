export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatFileType(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'image/jpeg': '🖼️ Image',
    'image/png': '🖼️ Image', 
    'image/gif': '🎞️ GIF',
    'video/mp4': '🎥 Video',
    'video/quicktime': '🎥 Video',
    'audio/mpeg': '🎵 Audio',
    'audio/wav': '🎵 Audio',
    'application/pdf': '📄 PDF',
    'application/msword': '📝 Word Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝 Word Document',
    'application/vnd.ms-excel': '📊 Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊 Excel',
    'application/zip': '🗜️ Archive',
    'text/plain': '📝 Text',
  };
  
  return typeMap[mimeType] || '📎 File';
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function formatUploadProgress(uploaded: number, total: number): string {
  const percentage = Math.round((uploaded / total) * 100);
  const barLength = 10;
  const filled = Math.round((percentage / 100) * barLength);
  const empty = barLength - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar} ${percentage}%`;
}

export function generateFileName(originalName?: string, fileType?: string): string {
  const timestamp = Date.now();
  
  if (originalName) {
    return originalName;
  }
  
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
  };
  
  const extension = fileType ? extensions[fileType] || 'bin' : 'bin';
  return `file_${timestamp}.${extension}`;
}