# Performance Testing Guide - TrainAI

## 🎯 **Testing Overview**

This guide covers testing the performance optimizations implemented in Phase 1, focusing on chunked uploads and progress indicators.

## 📋 **Test Scenarios**

### **1. Chunked Upload Testing**

#### **Small File Upload (< 1MB)**
```bash
# Test with a small video file
curl -X POST http://localhost:3000/api/storage/upload \
  -F "video=@small-video.webm" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected Result**: Should use regular upload (not chunked)

#### **Large File Upload (> 1MB)**
```bash
# Test with a large video file
curl -X POST http://localhost:3000/api/storage/upload \
  -F "video=@large-video.webm" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected Result**: Should use chunked upload with progress indicators

#### **Chunked Upload API Testing**
```bash
# Initialize upload session
curl -X POST http://localhost:3000/api/storage/upload/init \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "fileName": "test-video.webm",
    "fileSize": 5242880,
    "fileType": "video/webm",
    "uploadId": "test-upload-123"
  }'

# Upload chunk
curl -X POST http://localhost:3000/api/storage/upload/chunk \
  -F "chunk=@chunk-0.bin" \
  -F "chunkIndex=0" \
  -F "sessionId=session-123" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Finalize upload
curl -X POST http://localhost:3000/api/storage/upload/finalize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"sessionId": "session-123"}'
```

### **2. Progress Indicator Testing**

#### **Visual Progress Testing**
1. Navigate to `/dashboard/training/create`
2. Complete setup step
3. Record a video (at least 2-3 minutes)
4. Observe the processing step progress indicators

**Expected Results**:
- ✅ Upload progress shows percentage
- ✅ Stage transitions are smooth
- ✅ Error states display correctly
- ✅ Retry mechanisms work
- ✅ Timing information is displayed

#### **Progress Indicator States**
- **Pending**: Gray, no progress bar
- **Active**: Blue, animated progress bar
- **Completed**: Green, checkmark icon
- **Error**: Red, error message

### **3. Performance Metrics Testing**

#### **Upload Performance**
```typescript
// Test upload performance
import { perf } from '@/lib/utils/performance-monitor'

perf.start('video-upload', { fileSize: 5242880 })
// ... upload logic
perf.end('video-upload')
perf.logSummary()
```

#### **Expected Metrics**
- Upload time should be reasonable (< 30s for 10MB)
- Throughput should be > 1MB/s on good connection
- Chunk processing should be efficient

### **4. Error Handling Testing**

#### **Network Interruption**
1. Start a large file upload
2. Disconnect internet mid-upload
3. Reconnect internet
4. Verify retry mechanism works

#### **File Size Limits**
```bash
# Test with oversized file
curl -X POST http://localhost:3000/api/storage/upload \
  -F "video=@huge-file.webm" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected Result**: Should reject with appropriate error message

#### **Invalid File Types**
```bash
# Test with invalid file type
curl -X POST http://localhost:3000/api/storage/upload \
  -F "video=@document.pdf" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected Result**: Should reject with file type error

## 🧪 **Automated Testing**

### **Run Test Suite**
```bash
# Run chunked upload tests
npx tsx scripts/test-chunked-upload.ts

# Run performance tests
npm run test:performance

# Run integration tests
npm run test:integration
```

### **Test Coverage**
- [ ] Chunked upload functionality
- [ ] Progress indicator accuracy
- [ ] Error handling scenarios
- [ ] Performance metrics collection
- [ ] Retry mechanisms
- [ ] File validation
- [ ] Network resilience

## 📊 **Performance Benchmarks**

### **Upload Performance Targets**
| File Size | Expected Upload Time | Max Chunks |
|-----------|---------------------|------------|
| 1MB       | < 5s                | 1          |
| 10MB      | < 30s               | 10         |
| 50MB      | < 2m                | 50         |
| 100MB     | < 4m                | 100        |

### **Progress Indicator Targets**
- Progress updates every 100ms
- Stage transitions < 500ms
- Error display < 200ms
- Retry attempts < 3s delay

## 🔍 **Monitoring & Debugging**

### **Browser DevTools**
1. Open Network tab
2. Monitor chunk upload requests
3. Check for failed requests
4. Verify progress indicators

### **Console Logging**
```typescript
// Enable performance logging
localStorage.setItem('debug', 'performance:*')

// Check performance metrics
console.log(perf.exportMetrics())
```

### **Common Issues & Solutions**

#### **Issue: Chunks not uploading**
**Solution**: Check chunk size configuration and network stability

#### **Issue: Progress not updating**
**Solution**: Verify progress callback functions are properly connected

#### **Issue: Upload failing after retry**
**Solution**: Check server-side chunk storage and finalization logic

## ✅ **Success Criteria**

### **Phase 1 Complete When**:
- [ ] Chunked uploads work for files > 1MB
- [ ] Progress indicators show accurate progress
- [ ] Error handling works for all scenarios
- [ ] Performance metrics are collected
- [ ] All tests pass
- [ ] No regression in existing functionality

### **Performance Improvements**:
- [ ] 50% reduction in upload timeouts
- [ ] 30% improvement in large file upload success rate
- [ ] 100% progress visibility for all operations
- [ ] < 2s error recovery time

## 🚀 **Next Steps**

After Phase 1 completion:
1. **Phase 2**: Database query optimization
2. **Phase 3**: Code splitting & bundle optimization
3. **Phase 4**: Background processing implementation

---

**Note**: This testing guide should be updated as new performance optimizations are implemented.
