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
    metadata?: Record<string, any>
  ): Promise<ChunkedUploadResult> {
    const startTime = Date.now()
    this.abortController = new AbortController()

    try {
      // Calculate total chunks
      const totalChunks = Math.ceil(file.size / this.options.chunkSize)
      
      if (totalChunks === 1) {
        // For small files, use regular upload
        return await this.uploadSmallFile(file, endpoint, metadata)
      }

      // Generate unique upload ID
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substring(2)}`
      
      // Initialize upload session
      const sessionResponse = await this.initializeUploadSession(file, uploadId, endpoint, metadata)
      if (!sessionResponse.ok) {
        throw createAppError('Failed to initialize upload session', {
          code: ERROR_CODES.UPLOAD_FAILED,
          statusCode: sessionResponse.status,
        })
      }

      const { uploadUrl, sessionId } = await sessionResponse.json()

      // Upload chunks in parallel (but limit concurrency)
      const chunkPromises: Promise<void>[] = []
      const maxConcurrency = 3 // Upload 3 chunks at a time
      
      for (let i = 0; i < totalChunks; i += maxConcurrency) {
        const batch = []
        for (let j = i; j < Math.min(i + maxConcurrency, totalChunks); j++) {
          batch.push(this.uploadChunk(file, j, uploadUrl, sessionId))
        }
        
        await Promise.all(batch)
        
        // Update progress after each batch
        const progress = Math.round(((i + maxConcurrency) / totalChunks) * 100)
        this.options.onProgress(Math.min(progress, 100))
      }

      // Finalize upload
      const finalizeResponse = await this.finalizeUpload(sessionId, endpoint)
      if (!finalizeResponse.ok) {
        throw createAppError('Failed to finalize upload', {
          code: ERROR_CODES.UPLOAD_FAILED,
          statusCode: finalizeResponse.status,
        })
      }

      const result = await finalizeResponse.json()
      const uploadTime = Date.now() - startTime

      return {
        url: result.url,
        path: result.path,
        totalChunks,
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

  private async uploadSmallFile(
    file: File,
    endpoint: string,
    metadata?: Record<string, any>
  ): Promise<ChunkedUploadResult> {
    const startTime = Date.now()
    const formData = new FormData()
    formData.append('file', file)
    
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

  private async initializeUploadSession(
    file: File,
    uploadId: string,
    endpoint: string,
    metadata?: Record<string, any>
  ) {
    const response = await fetch(`${endpoint}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadId,
        metadata,
      }),
      signal: this.abortController?.signal,
    })

    return response
  }

  private async uploadChunk(
    file: File,
    chunkIndex: number,
    uploadUrl: string,
    sessionId: string
  ): Promise<void> {
    const start = chunkIndex * this.options.chunkSize
    const end = Math.min(start + this.options.chunkSize, file.size)
    const chunk = file.slice(start, end)

    let attempts = 0
    while (attempts < this.options.maxRetries) {
      try {
        const formData = new FormData()
        formData.append('chunk', chunk)
        formData.append('chunkIndex', chunkIndex.toString())
        formData.append('sessionId', sessionId)

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
          signal: this.abortController?.signal,
        })

        if (!response.ok) {
          throw new Error(`Chunk upload failed: ${response.status}`)
        }

        this.options.onChunkComplete(chunkIndex, Math.ceil(file.size / this.options.chunkSize))
        return
      } catch (error) {
        attempts++
        if (attempts >= this.options.maxRetries) {
          throw createAppError(`Failed to upload chunk ${chunkIndex} after ${this.options.maxRetries} attempts`, {
            code: ERROR_CODES.UPLOAD_FAILED,
            context: { chunkIndex, attempts },
          })
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000))
      }
    }
  }

  private async finalizeUpload(sessionId: string, endpoint: string) {
    const response = await fetch(`${endpoint}/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
      signal: this.abortController?.signal,
    })

    return response
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

  const upload = useCallback(async (file: File, endpoint: string, metadata?: Record<string, any>) => {
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
