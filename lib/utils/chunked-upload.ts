// lib/utils/chunked-upload.ts
import { createAppError, getErrorMessage, ERROR_CODES } from './error-handler'

export interface ChunkedUploadOptions {
  chunkSize?: number // Default 1MB
  maxRetries?: number // Default 3
  onProgress?: (progress: number) => void
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void
}

export interface ChunkedUploadResult {
  url: string
  path: string
  totalChunks: number
  uploadTime: number
}

export class ChunkedUploader {
  private options: Required<ChunkedUploadOptions>
  private abortController: AbortController | null = null

  constructor(options: ChunkedUploadOptions = {}) {
    this.options = {
      chunkSize: options.chunkSize ?? 1024 * 1024, // 1MB default
      maxRetries: options.maxRetries ?? 3,
      onProgress: options.onProgress ?? (() => {}),
      onChunkComplete: options.onChunkComplete ?? (() => {}),
    }
  }

  async uploadFile(
    file: File,
    endpoint: string,
    metadata?: Record<string, unknown>
  ): Promise<ChunkedUploadResult> {
    const startTime = Date.now()
    this.abortController = new AbortController()

    try {
      const result = await this.uploadWholeFile(file, endpoint, metadata)
      const uploadTime = Date.now() - startTime

      return {
        ...result,
        totalChunks: 1,
        uploadTime,
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw createAppError('Upload cancelled by user', {
          code: 'UPLOAD_CANCELLED',
          statusCode: 499,
        })
      }

      throw createAppError(error, {
        code: ERROR_CODES.UPLOAD_FAILED,
        context: { fileName: file.name, fileSize: file.size },
      })
    }
  }

  private async uploadWholeFile(
    file: File,
    endpoint: string,
    metadata?: Record<string, unknown>
  ): Promise<ChunkedUploadResult> {
    const startTime = Date.now()
    const formData = new FormData()
    formData.append('video', file)
    
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        formData.append(key, String(value))
      })
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: this.abortController?.signal,
    })

    if (!response.ok) {
      throw createAppError('Failed to upload file', {
        code: ERROR_CODES.UPLOAD_FAILED,
        statusCode: response.status,
      })
    }

    const result = await response.json()
    const uploadTime = Date.now() - startTime

    this.options.onProgress(100)
    this.options.onChunkComplete(1, 1)

    return {
      url: result.url,
      path: result.path,
      totalChunks: 1,
      uploadTime,
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }
}

// Utility function for simple chunked uploads
export async function uploadFileChunked(
  file: File,
  endpoint: string,
  options?: ChunkedUploadOptions
): Promise<ChunkedUploadResult> {
  const uploader = new ChunkedUploader(options)
  return await uploader.uploadFile(file, endpoint)
}

// Hook for React components
export function useChunkedUpload(options?: ChunkedUploadOptions) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploader, setUploader] = useState<ChunkedUploader | null>(null)

  const upload = useCallback(async (file: File, endpoint: string, metadata?: Record<string, unknown>) => {
    setIsUploading(true)
    setProgress(0)
    setError(null)

    const chunkedUploader = new ChunkedUploader({
      ...options,
      onProgress: (progress) => {
        setProgress(progress)
        options?.onProgress?.(progress)
      },
      onChunkComplete: (chunkIndex, totalChunks) => {
        options?.onChunkComplete?.(chunkIndex, totalChunks)
      },
    })

    setUploader(chunkedUploader)

    try {
      const result = await chunkedUploader.uploadFile(file, endpoint, metadata)
      setIsUploading(false)
      return result
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      setIsUploading(false)
      throw err
    }
  }, [options])

  const cancel = useCallback(() => {
    uploader?.cancel()
    setIsUploading(false)
    setProgress(0)
  }, [uploader])

  return {
    upload,
    cancel,
    isUploading,
    progress,
    error,
  }
}

// Import useState and useCallback for the hook
import { useState, useCallback } from 'react'
