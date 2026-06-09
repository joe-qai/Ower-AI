import { getOutputDirs } from './config.js';

export async function saveFile(url, filename, type) {
  const dirs = getOutputDirs();
  const dirMap = {
    text: dirs.docs,
    image: dirs.images,
    video: dirs.videos
  };

  const dir = dirMap[type] || dirs.docs;
  
  try {
    await ensureDirectoryExists(dir);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }
    
    const blob = await response.blob();
    const localPath = `${dir}/${filename}`;
    
    return downloadBlob(blob, filename);
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
}

export async function saveText(content, filename) {
  const dirs = getOutputDirs();
  const dir = dirs.docs;
  
  try {
    await ensureDirectoryExists(dir);
    
    const blob = new Blob([content], { type: 'text/plain' });
    return downloadBlob(blob, filename);
  } catch (error) {
    console.error('Error saving text:', error);
    throw error;
  }
}

function downloadBlob(blob, filename) {
  return new Promise((resolve, reject) => {
    try {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      resolve(filename);
    } catch (error) {
      reject(error);
    }
  });
}

async function ensureDirectoryExists(dir) {
  try {
    const response = await fetch(dir);
    if (!response.ok) {
      console.log(`Directory ${dir} may not exist, but will be handled by browser download`);
    }
  } catch (error) {
    console.log(`Cannot check directory: ${dir}`);
  }
}

export function generateFilename(type, extension) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${type}-${timestamp}.${extension}`;
}