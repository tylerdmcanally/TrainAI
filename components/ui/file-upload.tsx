'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToastNotifications } from '@/components/ui/toast'
import { validateFileUpload, getErrorMessage, ERROR_CODES } from '@/lib/utils/error-handler'

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>
  accept?: Record<string, string[]>
  maxSize?: number // in bytes
  maxFiles?: number
  disabled?: boolean
  className?: string
}

interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress?: number
  error?: string
}

export function FileUpload({
  onUpload,
  accept = {
    'video/*': ['.webm', '.mp4', '.mov'],
    'audio/*': ['.webm', '.mp3', '.wav', '.ogg'],
  },
  maxSize = 100 * 1024 * 1024, // 100MB default
  maxFiles = 1,
  disabled = false,
  className = '',
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const { showError, showSuccess } = useToastNotifications()

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map(({ file, errors }) => {
          const errorMessages = errors.map((error: any) => {
            switch (error.code) {
              case 'file-too-large':
                return `File ${file.name} is too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`
              case 'file-invalid-type':
                return `File ${file.name} has invalid type`
              case 'too-many-files':
                return `Too many files (max ${maxFiles})`
              default:
                return `File ${file.name}: ${error.message}`
            }
          })
          return errorMessages.join(', ')
        })
        
        showError('Upload Failed', errors.join('; '))
        return
      }

      // Process accepted files
      const newFiles: UploadFile[] = acceptedFiles.map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending',
      }))

      setFiles(prev => [...prev, ...newFiles])

      // Upload each file
      for (const uploadFile of newFiles) {
        try {
          // Validate file
          validateFileUpload(uploadFile.file, {
            maxSize,
            allowedTypes: Object.keys(accept).flatMap(key => accept[key]),
          })

          // Update status to uploading
          setFiles(prev =>
            prev.map(f =>
              f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
            )
          )

          // Simulate progress (replace with actual progress tracking)
          const progressInterval = setInterval(() => {
            setFiles(prev =>
              prev.map(f => {
                if (f.id === uploadFile.id && f.status === 'uploading') {
                  const newProgress = Math.min((f.progress || 0) + 10, 90)
                  return { ...f, progress: newProgress }
                }
                return f
              })
            )
          }, 100)

          // Upload file
          await onUpload(uploadFile.file)

          // Clear progress interval and mark as success
          clearInterval(progressInterval)
          setFiles(prev =>
            prev.map(f =>
              f.id === uploadFile.id
                ? { ...f, status: 'success', progress: 100 }
                : f
            )
          )

          showSuccess('Upload Successful', `${uploadFile.file.name} uploaded successfully`)

        } catch (error) {
          const errorMessage = getErrorMessage(error)
          
          setFiles(prev =>
            prev.map(f =>
              f.id === uploadFile.id
                ? { ...f, status: 'error', error: errorMessage }
                : f
            )
          )

          showError('Upload Failed', errorMessage)
        }
      }
    },
    [onUpload, accept, maxSize, maxFiles, showError, showSuccess]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
    disabled,
    multiple: maxFiles > 1,
  })

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const clearAll = () => {
    setFiles([])
  }

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'uploading':
        return <Upload className="h-4 w-4 text-blue-600 animate-pulse" />
      default:
        return <File className="h-4 w-4 text-gray-400" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              or click to select files
            </p>
            <p className="text-xs text-gray-500">
              Max size: {Math.round(maxSize / 1024 / 1024)}MB • 
              Supported: {Object.values(accept).flat().join(', ')}
              {maxFiles > 1 && ` • Max files: ${maxFiles}`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Uploaded Files</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={files.some(f => f.status === 'uploading')}
              >
                Clear All
              </Button>
            </div>
            <div className="space-y-2">
              {files.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {getStatusIcon(uploadFile.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(uploadFile.file.size)}
                    </p>
                    {uploadFile.status === 'error' && uploadFile.error && (
                      <p className="text-xs text-red-600 mt-1">
                        {uploadFile.error}
                      </p>
                    )}
                    {uploadFile.status === 'uploading' && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadFile.progress || 0}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {uploadFile.progress || 0}% uploaded
                        </p>
                      </div>
                    )}
                  </div>
                  {uploadFile.status !== 'uploading' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
