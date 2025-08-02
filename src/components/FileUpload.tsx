'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { ParsedPDFResult } from '@/types/transaction';
import { FileHistoryService } from '@/lib/fileHistoryService';

interface FileUploadProps {
  onUploadSuccess: (result: ParsedPDFResult) => void;
  onUploadError: (error: string) => void;
}

export default function FileUpload({ onUploadSuccess, onUploadError }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileHistoryService = FileHistoryService.getInstance();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus('success');
        // Save to history
        fileHistoryService.saveFile(result.data, file.size);
        onUploadSuccess(result.data);
      } else {
        setUploadStatus('error');
        onUploadError(result.error || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('error');
      onUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess, onUploadError]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isUploading
  });

  const getDropzoneStyles = () => {
    let baseStyles = 'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ';
    
    if (isDragReject) {
      return baseStyles + 'border-red-300 bg-red-50 text-red-600';
    }
    
    if (isDragActive) {
      return baseStyles + 'border-blue-400 bg-blue-50 text-blue-600';
    }
    
    if (uploadStatus === 'success') {
      return baseStyles + 'border-green-300 bg-green-50 text-green-600';
    }
    
    if (uploadStatus === 'error') {
      return baseStyles + 'border-red-300 bg-red-50 text-red-600';
    }
    
    return baseStyles + 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400 hover:bg-gray-100';
  };

  const getIcon = () => {
    if (uploadStatus === 'success') {
      return <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />;
    }
    
    if (uploadStatus === 'error') {
      return <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />;
    }
    
    if (isUploading) {
      return (
        <div className="w-12 h-12 mx-auto mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    return isDragActive ? 
      <FileText className="w-12 h-12 mx-auto mb-4 text-blue-500" /> :
      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />;
  };

  const getMessage = () => {
    if (uploadStatus === 'success') {
      return 'PDF processed successfully!';
    }
    
    if (uploadStatus === 'error') {
      return 'Upload failed. Please try again.';
    }
    
    if (isUploading) {
      return 'Processing PDF...';
    }
    
    if (isDragReject) {
      return 'Only PDF files are accepted';
    }
    
    if (isDragActive) {
      return 'Drop the PDF file here';
    }
    
    return 'Drag & drop your CIH bank statement PDF here, or click to select';
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div {...getRootProps()} className={getDropzoneStyles()}>
        <input {...getInputProps()} />
        {getIcon()}
        <p className="text-lg font-medium mb-2">{getMessage()}</p>
        {!isUploading && uploadStatus === 'idle' && (
          <p className="text-sm text-gray-500">
            Maximum file size: 10MB • Supported format: PDF
          </p>
        )}
      </div>
      
      {uploadStatus === 'success' && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <p className="text-green-700 font-medium">
              Your bank statement has been processed successfully!
            </p>
          </div>
          <p className="text-green-600 text-sm mt-1">
            Scroll down to view your transactions and spending analysis.
          </p>
        </div>
      )}
      
      {uploadStatus === 'error' && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700 font-medium">
              Upload failed
            </p>
          </div>
          <p className="text-red-600 text-sm mt-1">
            Please check your file and try again. Make sure it's a valid PDF file under 10MB.
          </p>
        </div>
      )}
    </div>
  );
}
