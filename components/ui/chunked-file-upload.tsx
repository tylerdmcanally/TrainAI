'use client'

import React, { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, FileText, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { useToastNotifications } from './toast'
import { FileUploadProgress } from './progress-indicator'
import { useChunkedUpload } from '@/lib/utils/chunked-upload'
import { validateFileUpload, createAppError, getErrorMessage, ERROR_CODES } from '@/lib/utils/error-handler'

interface ChunkedFileUploadProps {
  onFileUpload: (file: File) => Promise<string | void> // Returns URL or void
  acceptedFileTypes?: string[]
  maxFileSize?: number // in bytes
  label?: string
  description?: string
  disabled?: boolean
  chunkSize?: number // in bytes
  showProgress?: boolean
}

export function ChunkedFileUpload({
  onFileUpload,
  acceptedFileTypes = ['video/*', 'audio/*', 'image/*', '.pdf', '.doc', '.docx'],
  maxFileSize = 100 * 1024 * 1024, // Default to 100MB
  label = 'Upload File',
  description = 'Drag & drop your file here, or click to select',
  disabled = false,
  chunkSize = 1024 * 1024, // 1MB chunks
  showProgress = true,
}: ChunkedFileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'completed' | 'error'>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const { showError, showSuccess } = useToastNotifications()
  const uploaderRef = useRef<any>(null)

  const { upload, cancel, isUploading, progress, error } = useChunkedUpload({
    chunkSize,
    onProgress: (progress) => {
      // Progress is handled by the hook
    },
    onChunkComplete: (chunkIndex, totalChunks) => {
      // Optional: Show chunk completion feedback
      if (totalChunks > 1) {
        showSuccess(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded`)
      }
    },
  })

  const handleFileChange = useCallback(async (acceptedFiles: File[]) => {
    setUploadError(null)
    setUploadedUrl(null)
    setUploadStatus('idle')
    
    if (acceptedFiles.length === 0) {
      return
    }

    const selectedFile = acceptedFiles[0]
    setFile(selectedFile)

    try {
      // Validate file
      validateFileUpload(selectedFile, {
        maxSize: maxFileSize,
        allowedTypes: acceptedFileTypes,
      })

      setUploadStatus('uploading')
      
      // Determine if we should use chunked upload
      const shouldUseChunked = selectedFile.size > chunkSize
      
      if (shouldUseChunked) {
        // Use chunked upload for large files
        const result = await upload(selectedFile, '/api/storage/upload', {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
        })
        
        setUploadedUrl(result.url)
        setUploadStatus('completed')
        showSuccess(`File uploaded successfully! (${result.totalChunks} chunks, ${(result.uploadTime / 1000).toFixed(1)}s)`)
      } else {
        // Use regular upload for small files
        const url = await onFileUpload(selectedFile)
        if (url) {
          setUploadedUrl(url)
          setUploadStatus('completed')
          showSuccess('File uploaded successfully!')
        }
      }
    } catch (err) {
      const appError = createAppError(err)
      setUploadError(getErrorMessage(appError))
      setUploadStatus('error')
      showError(getErrorMessage(appError))
    }
  }, [onFileUpload, acceptedFileTypes, maxFileSize, chunkSize, upload, showError, showSuccess])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleFileChange,
    accept: acceptedFileTypes.reduce((acc, type) => {
      if (type.includes('/')) { // MIME type
        acc[type] = []
      } else { // Extension
        acc[type] = []
      }
      return acc
    }, {} as { [key: string]: string[] }),
    maxSize: maxFileSize,
    multiple: false,
    noClick: true, // Prevent opening file dialog on dropzone click
    disabled: disabled || isUploading,
  })

  const handleButtonClick = () => {
    if (!disabled && !isUploading) {
      open()
    }
  }

  const handleRemoveFile = () => {
    if (isUploading) {
      cancel()
    }
    setFile(null)
    setUploadError(null)
    setUploadedUrl(null)
    setUploadStatus('idle')
  }

  const handleCancel = () => {
    cancel()
    setUploadStatus('idle')
    setFile(null)
    setUploadError(null)
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          "flex flex-col items-center justify-center space-y-3",
          disabled || isUploading ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white hover:border-blue-500 cursor-pointer",
          isDragActive && "border-blue-500 bg-blue-50",
          uploadStatus === 'error' && "border-red-500 bg-red-50"
        )}
      >
        <input {...getInputProps()} disabled={disabled || isUploading} />
        
        {file && uploadStatus !== 'idle' ? (
          // Show file info and progress
          <div className="w-full">
            <FileUploadProgress
              fileName={file.name}
              progress={progress}
              status={uploadStatus}
              error={uploadError || undefined}
              onCancel={isUploading ? handleCancel : undefined}
            />
          </div>
        ) : (
          // Show upload interface
          <>
            <UploadCloud className="h-10 w-10 text-gray-400" />
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-gray-500">{description}</p>
            <Button
              type="button"
              variant="outline"
              onClick={handleButtonClick}
              disabled={disabled || isUploading}
              className="mt-3"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                </>
              ) : (
                'Select File'
              )}
            </Button>
          </>
        )}
      </div>

      {/* File info and controls */}
      {file && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          
          {uploadStatus !== 'uploading' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              disabled={disabled}
            >
              <XCircle className="h-4 w-4 text-gray-500 hover:text-red-500" />
            </Button>
          )}
        </div>
      )}

      {/* Upload status messages */}
      {uploadStatus === 'completed' && uploadedUrl && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ Upload complete! 
            <a 
              href={uploadedUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="underline ml-1"
            >
              View file
            </a>
          </p>
        </div>
      )}

      {uploadStatus === 'error' && uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{uploadError}</p>
          </div>
        </div>
      )}

      {/* Upload recommendations */}
      {file && file.size > chunkSize && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            💡 Large file detected. Using chunked upload for better reliability.
          </p>
        </div>
      )}
    </div>
  )
}
