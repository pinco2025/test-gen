import React, { useState, useEffect, useRef } from 'react';

interface ImageUploadProps {
  label: string;
  imageUrl: string | null;
  onImageUrlChange: (newUrl: string | null) => void;
}

// This function now calls the backend IPC handler
const uploadFile = async (file: File): Promise<string> => {
  // In Electron, the File object from a file input includes a 'path' property
  const filePath = (file as any).path;
  if (!filePath) {
    throw new Error('File path is not available. This must be run in an Electron environment.');
  }

  const result = await window.electronAPI.uploadImage(filePath);

  if (result.success && result.url) {
    console.log('Upload complete!');
    return result.url;
  } else {
    // The main process will show a dialog box, but we throw here to handle UI state
    throw new Error(result.error || 'An unknown error occurred during the upload.');
  }
};


const ImageUpload: React.FC<ImageUploadProps> = ({ label, imageUrl, onImageUrlChange }) => {
  const [internalImageUrl, setInternalImageUrl] = useState<string | null>(imageUrl);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [width, setWidth] = useState<number>(300);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInternalImageUrl(imageUrl);
    if (imageUrl) {
      const match = imageUrl.match(/=w(\d+)/);
      if (match) {
        setWidth(parseInt(match[1], 10));
      }
    } else {
        // If the external URL is cleared, also clear the local preview
        if (localPreview) {
            URL.revokeObjectURL(localPreview);
            setLocalPreview(null);
        }
    }
  }, [imageUrl, localPreview]);

  const handleUrlChange = (newUrl: string | null) => {
    setInternalImageUrl(newUrl);
    onImageUrlChange(newUrl);
  };

  const processFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }

    setIsUploading(true);
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);

    try {
        const uploadedUrl = await uploadFile(file);
        const formattedUrl = convertToL3Thumbnail(uploadedUrl, width);
        handleUrlChange(formattedUrl);
    } catch (error: any) {
        console.error("Upload failed:", error);
        // The main process shows a detailed error box. We just reset the UI here.
        // alert(`Image upload failed: ${error.message}`);
        // Clear preview on failure
        URL.revokeObjectURL(previewUrl);
        setLocalPreview(null);
    } finally {
        setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  };

  const convertToL3Thumbnail = (url: string, newWidth: number): string => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      const fileId = url.split('/d/')[1].split('/')[0];
      return `https://lh3.googleusercontent.com/d/${fileId}=w${newWidth}`;
    }
    // Ensure the URL doesn't already have a width parameter before appending
    if (url.includes('lh3.googleusercontent.com')) {
      if (url.includes('=w')) {
        return url.replace(/=w\d+/, `=w${newWidth}`);
      }
      return `${url}=w${newWidth}`;
    }
    return `${url}=w${newWidth}`; // Append for placeholders
  };

  const handleResize = (newWidth: number) => {
    setWidth(newWidth);
    if (internalImageUrl) {
      const resizedUrl = convertToL3Thumbnail(internalImageUrl, newWidth);
      handleUrlChange(resizedUrl);
    }
  };

  const handleRemoveImage = () => {
    if (localPreview) {
        URL.revokeObjectURL(localPreview);
        setLocalPreview(null);
    }
    handleUrlChange(null);
  };

  const displayUrl = localPreview || internalImageUrl;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-text-main dark:text-gray-200">{label}</label>
      </div>

      {!displayUrl && !isUploading ? (
        <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                ${dragOver ? 'border-primary bg-primary/10' : 'border-border-light dark:border-border-dark hover:border-primary/50 hover:bg-black/5 dark:hover:bg-white/5'}`}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <span className="material-symbols-outlined text-3xl text-text-secondary/60">upload_file</span>
                <p className="mb-2 text-sm text-text-secondary"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-text-secondary/70">PNG, JPG, GIF</p>
            </div>
        </div>
      ) : (
        <div className="p-4 border border-border-light dark:border-border-dark rounded-lg space-y-4">
          <div className="relative w-full min-h-[150px] bg-gray-50 dark:bg-black/20 rounded-lg flex items-center justify-center border border-dashed border-border-light dark:border-border-dark overflow-hidden">
            {isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 z-10">
                    <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-white text-sm font-semibold mt-2">Uploading...</p>
                </div>
            )}
            {displayUrl && <img src={displayUrl} alt="Preview" className={`max-w-full h-auto ${isUploading ? 'opacity-50' : ''}`} />}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="100"
                max="1200"
                value={width}
                onChange={(e) => handleResize(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                disabled={isUploading}
              />
              <span className="text-xs text-text-secondary">{width}px</span>
            </div>
             <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={internalImageUrl || 'Uploading...'}
                  readOnly
                  className="w-full text-xs p-1 bg-transparent border-none focus:ring-0 text-text-main dark:text-gray-200"
                  placeholder="Image URL"
                />
                <button
                    onClick={handleRemoveImage}
                    disabled={isUploading}
                    className="text-xs font-medium text-red-500 hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Remove
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;