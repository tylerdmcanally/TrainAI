# Background Processing Testing Guide

## 🎯 **Testing Overview**

This guide covers testing the new background processing system for TrainAI. The system moves heavy AI operations (transcription, SOP generation, Mux uploads) to background jobs for improved user experience.

## 📋 **Prerequisites**

### **Database Setup**
1. **Run the background jobs schema**:
   ```sql
   -- Execute this in your Supabase SQL editor
   \i lib/supabase/background-jobs-schema.sql
   ```

2. **Verify tables created**:
   ```sql
   SELECT * FROM background_jobs LIMIT 1;
   SELECT * FROM job_queue LIMIT 1;
   ```

### **Environment Variables**
Ensure these are set in your `.env.local`:
```env
# Required for background job processing
BACKGROUND_JOB_TOKEN=your-secure-token-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
```

## 🧪 **Testing Scenarios**

### **Test 1: Background Job Creation**

#### **Setup**
1. Navigate to training creation page
2. Complete recording step
3. Proceed to processing step

#### **Expected Behavior**
- ✅ Video uploads to storage immediately
- ✅ Transcription job is created in background
- ✅ User sees real-time progress updates
- ✅ User can close tab and return later
- ✅ Job status persists across sessions

#### **Verification**
```sql
-- Check jobs are created
SELECT job_type, status, created_at 
FROM background_jobs 
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC;
```

### **Test 2: Job Processing**

#### **Setup**
1. Create a training with recording
2. Let background jobs be created
3. Trigger job processing

#### **Manual Job Processing**
```bash
# Call the job processor endpoint
curl -X POST http://localhost:3000/api/jobs/process \
  -H "Authorization: Bearer your-background-job-token" \
  -H "Content-Type: application/json" \
  -d '{"jobTypes": ["transcription", "sop_generation"]}'
```

#### **Expected Behavior**
- ✅ Jobs move from 'pending' to 'processing'
- ✅ Progress updates in real-time
- ✅ Jobs complete successfully
- ✅ Output data is stored correctly

#### **Verification**
```sql
-- Check job processing
SELECT job_type, status, progress_percentage, output_data
FROM background_jobs 
WHERE status IN ('processing', 'completed')
ORDER BY started_at DESC;
```

### **Test 3: Real-time Updates**

#### **Setup**
1. Open training creation in browser
2. Create recording and start processing
3. Open job monitor in another tab

#### **Expected Behavior**
- ✅ Progress updates automatically
- ✅ Status changes reflect immediately
- ✅ No page refresh required
- ✅ Multiple tabs stay in sync

#### **Verification**
- Watch progress indicators update
- Check job status badges change
- Verify completion notifications appear

### **Test 4: Error Handling**

#### **Setup**
1. Create jobs with invalid data
2. Simulate API failures
3. Test retry mechanisms

#### **Expected Behavior**
- ✅ Failed jobs show error messages
- ✅ Retry logic activates automatically
- ✅ User can manually retry failed jobs
- ✅ Jobs fail permanently after max retries

#### **Verification**
```sql
-- Check failed jobs
SELECT job_type, status, retry_count, error_data
FROM background_jobs 
WHERE status = 'failed'
ORDER BY completed_at DESC;
```

### **Test 5: Job Cancellation**

#### **Setup**
1. Start long-running jobs
2. Cancel jobs manually
3. Verify cleanup

#### **Expected Behavior**
- ✅ Jobs can be cancelled while pending/processing
- ✅ Cancelled jobs don't consume resources
- ✅ UI reflects cancellation immediately

#### **Verification**
```sql
-- Check cancelled jobs
SELECT job_type, status, completed_at
FROM background_jobs 
WHERE status = 'cancelled'
ORDER BY completed_at DESC;
```

## 🔍 **Component Testing**

### **BackgroundProcessingStep Component**

#### **Test Cases**
1. **Video Upload**: Verify chunked upload works
2. **Job Creation**: Check jobs are created correctly
3. **Progress Updates**: Verify real-time progress
4. **Error Handling**: Test error states
5. **Navigation**: Ensure proper flow control

#### **Test Code**
```typescript
// Example test for job creation
import { createTranscriptionJob } from '@/lib/services/background-jobs'

test('creates transcription job', async () => {
  const jobId = await createTranscriptionJob(
    'user-id',
    'company-id',
    'audio-url',
    'training-id'
  )
  
  expect(jobId).toBeDefined()
  expect(typeof jobId).toBe('string')
})
```

### **JobMonitor Component**

#### **Test Cases**
1. **Job Display**: Show jobs correctly
2. **Status Updates**: Real-time status changes
3. **Actions**: Cancel/refresh functionality
4. **Filtering**: Group by status
5. **Empty States**: Handle no jobs

#### **Test Scenarios**
```typescript
// Test job status updates
const { result } = renderHook(() => useJobStatus({
  jobId: 'test-job-id',
  pollingInterval: 1000
}))

// Simulate job completion
await act(async () => {
  await updateJobStatus('test-job-id', 'completed')
})

expect(result.current.isCompleted).toBe(true)
```

## 🚀 **Performance Testing**

### **Load Testing**

#### **Scenario 1: Multiple Concurrent Jobs**
```bash
# Create multiple training recordings simultaneously
for i in {1..5}; do
  # Create training $i
  # Verify all jobs process correctly
done
```

#### **Expected Results**
- ✅ All jobs process without interference
- ✅ No resource conflicts
- ✅ Proper queue ordering maintained

#### **Scenario 2: Large File Processing**
```bash
# Test with large video files (100MB+)
# Verify chunked upload handles large files
# Check memory usage stays stable
```

#### **Expected Results**
- ✅ Large files upload successfully
- ✅ Memory usage remains stable
- ✅ No timeouts or failures

### **Monitoring**

#### **Database Performance**
```sql
-- Monitor job processing times
SELECT 
  job_type,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
  COUNT(*) as job_count
FROM background_jobs 
WHERE completed_at IS NOT NULL
GROUP BY job_type;
```

#### **System Resources**
- Monitor CPU usage during job processing
- Check memory consumption
- Verify database connection pool usage

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Jobs Stuck in Pending**
```sql
-- Check for stuck jobs
SELECT * FROM background_jobs 
WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '10 minutes';
```

**Solution**: Restart job processor or manually trigger processing

#### **Jobs Failing Repeatedly**
```sql
-- Check failed jobs
SELECT job_type, error_data, retry_count
FROM background_jobs 
WHERE status = 'failed' 
  AND retry_count >= max_retries;
```

**Solution**: Check error logs, verify API keys, test external services

#### **Progress Not Updating**
- Verify WebSocket connections
- Check polling intervals
- Confirm job processor is running

### **Debug Commands**

#### **Check Job Queue**
```sql
SELECT * FROM job_queue ORDER BY priority, created_at;
```

#### **Monitor Active Jobs**
```sql
SELECT * FROM background_jobs 
WHERE status = 'processing'
ORDER BY started_at;
```

#### **Clean Up Old Jobs**
```sql
-- Delete jobs older than 30 days
DELETE FROM background_jobs 
WHERE completed_at < NOW() - INTERVAL '30 days'
  AND status IN ('completed', 'failed', 'cancelled');
```

## ✅ **Success Criteria**

### **Functional Requirements**
- [ ] Jobs are created and processed correctly
- [ ] Real-time updates work reliably
- [ ] Error handling is comprehensive
- [ ] Users can cancel jobs
- [ ] Progress tracking is accurate

### **Performance Requirements**
- [ ] Jobs process within expected timeframes
- [ ] System handles concurrent jobs
- [ ] Memory usage remains stable
- [ ] Database performance is acceptable

### **User Experience Requirements**
- [ ] Users can leave during processing
- [ ] Progress is clearly communicated
- [ ] Error messages are helpful
- [ ] Recovery from failures is smooth

## 📊 **Test Results Template**

```
Background Processing Test Results
================================

Date: [DATE]
Tester: [NAME]
Environment: [LOCAL/STAGING/PRODUCTION]

Test Results:
- Job Creation: ✅/❌
- Job Processing: ✅/❌
- Real-time Updates: ✅/❌
- Error Handling: ✅/❌
- Performance: ✅/❌

Issues Found:
1. [ISSUE DESCRIPTION]
2. [ISSUE DESCRIPTION]

Recommendations:
1. [RECOMMENDATION]
2. [RECOMMENDATION]

Overall Status: ✅ READY / ❌ NEEDS WORK
```

## 🎯 **Next Steps**

After successful testing:
1. **Deploy to staging** for integration testing
2. **Set up monitoring** and alerting
3. **Configure job processor** as scheduled task
4. **Train users** on new workflow
5. **Monitor performance** in production
