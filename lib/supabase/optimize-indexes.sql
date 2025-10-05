-- Database Index Optimization - Phase 2.1
-- This script adds optimized indexes for better query performance

-- ============================================
-- STEP 1: Add Composite Indexes for Common Query Patterns
-- ============================================

-- Employees page: company_id + role (for filtering employees)
CREATE INDEX IF NOT EXISTS idx_users_company_role 
ON users(company_id, role) 
WHERE role = 'employee';

-- Training modules: company_id + status (for filtering by company and status)
CREATE INDEX IF NOT EXISTS idx_training_modules_company_status 
ON training_modules(company_id, status);

-- Training modules: company_id + created_at (for ordering by date)
CREATE INDEX IF NOT EXISTS idx_training_modules_company_created 
ON training_modules(company_id, created_at DESC);

-- Assignments: employee_id + status (for filtering by employee and status)
CREATE INDEX IF NOT EXISTS idx_assignments_employee_status 
ON assignments(employee_id, status);

-- Assignments: module_id + employee_id (for unique constraint optimization)
CREATE INDEX IF NOT EXISTS idx_assignments_module_employee 
ON assignments(module_id, employee_id);

-- Chat messages: assignment_id + timestamp (for ordering messages)
CREATE INDEX IF NOT EXISTS idx_chat_messages_assignment_timestamp 
ON chat_messages(assignment_id, timestamp DESC);

-- ============================================
-- STEP 2: Add Partial Indexes for Filtered Queries
-- ============================================

-- Active assignments only (in_progress)
CREATE INDEX IF NOT EXISTS idx_assignments_active 
ON assignments(employee_id, module_id) 
WHERE status IN ('not_started', 'in_progress');

-- Published training modules only
CREATE INDEX IF NOT EXISTS idx_training_modules_published 
ON training_modules(company_id, created_at DESC) 
WHERE status = 'published';

-- Recent chat messages (last 30 days)
CREATE INDEX IF NOT EXISTS idx_chat_messages_recent 
ON chat_messages(assignment_id, timestamp DESC) 
WHERE timestamp > NOW() - INTERVAL '30 days';

-- ============================================
-- STEP 3: Add Indexes for JSONB Operations
-- ============================================

-- Training modules: chapters array length (for chapter count queries)
CREATE INDEX IF NOT EXISTS idx_training_modules_chapter_count 
ON training_modules USING GIN ((jsonb_array_length(chapters)));

-- Training modules: key_points array (for searching key points)
CREATE INDEX IF NOT EXISTS idx_training_modules_key_points 
ON training_modules USING GIN (key_points);

-- ============================================
-- STEP 4: Add Indexes for Progress Tracking
-- ============================================

-- Assignments: progress tracking (for progress-based queries)
CREATE INDEX IF NOT EXISTS idx_assignments_progress 
ON assignments(employee_id, progress, status);

-- Assignments: completion tracking (for completion-based queries)
CREATE INDEX IF NOT EXISTS idx_assignments_completion 
ON assignments(employee_id, completed_at) 
WHERE completed_at IS NOT NULL;

-- ============================================
-- STEP 5: Add Indexes for Search Operations
-- ============================================

-- Training modules: title search (for title-based searches)
CREATE INDEX IF NOT EXISTS idx_training_modules_title_search 
ON training_modules USING GIN (to_tsvector('english', title));

-- Users: name search (for name-based searches)
CREATE INDEX IF NOT EXISTS idx_users_name_search 
ON users USING GIN (to_tsvector('english', name));

-- ============================================
-- STEP 6: Add Indexes for Time-based Queries
-- ============================================

-- Training modules: created_at (for recent trainings)
CREATE INDEX IF NOT EXISTS idx_training_modules_recent 
ON training_modules(created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

-- Assignments: started_at (for tracking when assignments started)
CREATE INDEX IF NOT EXISTS idx_assignments_started 
ON assignments(started_at) 
WHERE started_at IS NOT NULL;

-- ============================================
-- STEP 7: Add Indexes for Foreign Key Optimization
-- ============================================

-- Users: company_id (optimize company lookups)
CREATE INDEX IF NOT EXISTS idx_users_company_id 
ON users(company_id) 
WHERE company_id IS NOT NULL;

-- Training modules: creator_id (optimize creator lookups)
CREATE INDEX IF NOT EXISTS idx_training_modules_creator_id 
ON training_modules(creator_id);

-- Assignments: assigned_by (optimize assigner lookups)
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_by 
ON assignments(assigned_by);

-- ============================================
-- STEP 8: Add Indexes for Analytics Queries
-- ============================================

-- Training completion analytics
CREATE INDEX IF NOT EXISTS idx_assignments_completion_analytics 
ON assignments(module_id, status, completed_at);

-- Employee activity analytics
CREATE INDEX IF NOT EXISTS idx_assignments_employee_activity 
ON assignments(employee_id, started_at, completed_at);

-- Company training analytics
CREATE INDEX IF NOT EXISTS idx_training_modules_company_analytics 
ON training_modules(company_id, status, created_at);

-- ============================================
-- STEP 9: Add Indexes for Performance Monitoring
-- ============================================

-- Training modules: video duration (for duration-based queries)
CREATE INDEX IF NOT EXISTS idx_training_modules_duration 
ON training_modules(video_duration) 
WHERE video_duration > 0;

-- Assignments: progress percentage (for progress-based queries)
CREATE INDEX IF NOT EXISTS idx_assignments_progress_percentage 
ON assignments(progress) 
WHERE progress > 0;

-- ============================================
-- STEP 10: Verify Index Creation
-- ============================================

-- Query to check all indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Query to check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ============================================
-- DONE!
-- ============================================
-- Your database now has optimized indexes for:
-- ✅ Common query patterns
-- ✅ Filtered queries
-- ✅ JSONB operations
-- ✅ Progress tracking
-- ✅ Search operations
-- ✅ Time-based queries
-- ✅ Foreign key optimization
-- ✅ Analytics queries
-- ✅ Performance monitoring
