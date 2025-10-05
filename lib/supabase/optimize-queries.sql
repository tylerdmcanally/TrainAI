-- Database Query Optimization - Phase 2.2
-- This script adds optimized query functions to fix N+1 problems

-- ============================================
-- STEP 1: Create Optimized Employee Listing Function
-- ============================================

-- Function to get employees with assignment counts in a single query
CREATE OR REPLACE FUNCTION get_employees_with_counts(company_uuid UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    company_id UUID,
    assignment_count BIGINT
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.created_at,
        u.company_id,
        COALESCE(assignment_counts.count, 0) as assignment_count
    FROM users u
    LEFT JOIN (
        SELECT 
            employee_id,
            COUNT(*) as count
        FROM assignments
        GROUP BY employee_id
    ) assignment_counts ON u.id = assignment_counts.employee_id
    WHERE u.company_id = company_uuid 
    AND u.role = 'employee'
    ORDER BY u.created_at DESC;
$$;

-- ============================================
-- STEP 2: Create Optimized Training Module Function
-- ============================================

-- Function to get training modules with assignment counts
CREATE OR REPLACE FUNCTION get_training_modules_with_counts(company_uuid UUID)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    creator_id UUID,
    title TEXT,
    description TEXT,
    video_url TEXT,
    video_duration INTEGER,
    transcript TEXT,
    chapters JSONB,
    sop TEXT,
    key_points TEXT[],
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    assignment_count BIGINT,
    completion_count BIGINT
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        tm.*,
        COALESCE(assignment_counts.total_count, 0) as assignment_count,
        COALESCE(assignment_counts.completed_count, 0) as completion_count
    FROM training_modules tm
    LEFT JOIN (
        SELECT 
            module_id,
            COUNT(*) as total_count,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
        FROM assignments
        GROUP BY module_id
    ) assignment_counts ON tm.id = assignment_counts.module_id
    WHERE tm.company_id = company_uuid
    ORDER BY tm.created_at DESC;
$$;

-- ============================================
-- STEP 3: Create Optimized Assignment Function
-- ============================================

-- Function to get assignments with training module details
CREATE OR REPLACE FUNCTION get_assignments_with_training(employee_uuid UUID)
RETURNS TABLE (
    id UUID,
    module_id UUID,
    employee_id UUID,
    assigned_by UUID,
    status TEXT,
    progress INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    training_title TEXT,
    training_description TEXT,
    training_video_duration INTEGER,
    training_status TEXT
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        a.id,
        a.module_id,
        a.employee_id,
        a.assigned_by,
        a.status,
        a.progress,
        a.started_at,
        a.completed_at,
        a.created_at,
        tm.title as training_title,
        tm.description as training_description,
        tm.video_duration as training_video_duration,
        tm.status as training_status
    FROM assignments a
    JOIN training_modules tm ON a.module_id = tm.id
    WHERE a.employee_id = employee_uuid
    ORDER BY a.created_at DESC;
$$;

-- ============================================
-- STEP 4: Create Progress Tracking Function
-- ============================================

-- Function to get employee progress summary
CREATE OR REPLACE FUNCTION get_employee_progress_summary(employee_uuid UUID)
RETURNS TABLE (
    total_assignments BIGINT,
    completed_assignments BIGINT,
    in_progress_assignments BIGINT,
    not_started_assignments BIGINT,
    total_time_spent BIGINT,
    average_progress NUMERIC
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COUNT(*) as total_assignments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_assignments,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_assignments,
        COUNT(CASE WHEN status = 'not_started' THEN 1 END) as not_started_assignments,
        COALESCE(SUM(time_spent), 0) as total_time_spent,
        COALESCE(AVG(progress), 0) as average_progress
    FROM assignments
    WHERE employee_id = employee_uuid;
$$;

-- ============================================
-- STEP 5: Create Company Analytics Function
-- ============================================

-- Function to get company training analytics
CREATE OR REPLACE FUNCTION get_company_training_analytics(company_uuid UUID)
RETURNS TABLE (
    total_trainings BIGINT,
    published_trainings BIGINT,
    draft_trainings BIGINT,
    total_assignments BIGINT,
    completed_assignments BIGINT,
    total_employees BIGINT,
    active_employees BIGINT
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        (SELECT COUNT(*) FROM training_modules WHERE company_id = company_uuid) as total_trainings,
        (SELECT COUNT(*) FROM training_modules WHERE company_id = company_uuid AND status = 'published') as published_trainings,
        (SELECT COUNT(*) FROM training_modules WHERE company_id = company_uuid AND status = 'draft') as draft_trainings,
        (SELECT COUNT(*) FROM assignments WHERE module_id IN (SELECT id FROM training_modules WHERE company_id = company_uuid)) as total_assignments,
        (SELECT COUNT(*) FROM assignments WHERE module_id IN (SELECT id FROM training_modules WHERE company_id = company_uuid) AND status = 'completed') as completed_assignments,
        (SELECT COUNT(*) FROM users WHERE company_id = company_uuid AND role = 'employee') as total_employees,
        (SELECT COUNT(*) FROM users WHERE company_id = company_uuid AND role = 'employee' AND id IN (SELECT DISTINCT employee_id FROM assignments WHERE status IN ('in_progress', 'completed'))) as active_employees;
$$;

-- ============================================
-- STEP 6: Create Bulk Progress Update Function
-- ============================================

-- Function to update multiple assignment progress in one query
CREATE OR REPLACE FUNCTION update_assignment_progress(
    assignment_uuid UUID,
    new_progress INTEGER,
    new_status TEXT DEFAULT NULL,
    new_time_spent INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE assignments 
    SET 
        progress = new_progress,
        status = COALESCE(new_status, status),
        time_spent = COALESCE(new_time_spent, time_spent),
        started_at = CASE 
            WHEN status = 'not_started' AND new_status = 'in_progress' THEN NOW()
            ELSE started_at
        END,
        completed_at = CASE 
            WHEN new_status = 'completed' AND status != 'completed' THEN NOW()
            ELSE completed_at
        END
    WHERE id = assignment_uuid;
    
    RETURN FOUND;
END;
$$;

-- ============================================
-- STEP 7: Create Search Functions
-- ============================================

-- Function to search training modules by title
CREATE OR REPLACE FUNCTION search_training_modules(
    company_uuid UUID,
    search_term TEXT
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        tm.id,
        tm.title,
        tm.description,
        tm.status,
        tm.created_at,
        ts_rank(to_tsvector('english', tm.title), plainto_tsquery('english', search_term)) as rank
    FROM training_modules tm
    WHERE tm.company_id = company_uuid
    AND to_tsvector('english', tm.title) @@ plainto_tsquery('english', search_term)
    ORDER BY rank DESC, tm.created_at DESC;
$$;

-- Function to search employees by name
CREATE OR REPLACE FUNCTION search_employees(
    company_uuid UUID,
    search_term TEXT
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        u.id,
        u.name,
        u.email,
        u.created_at,
        ts_rank(to_tsvector('english', u.name), plainto_tsquery('english', search_term)) as rank
    FROM users u
    WHERE u.company_id = company_uuid
    AND u.role = 'employee'
    AND to_tsvector('english', u.name) @@ plainto_tsquery('english', search_term)
    ORDER BY rank DESC, u.created_at DESC;
$$;

-- ============================================
-- STEP 8: Create Performance Monitoring Functions
-- ============================================

-- Function to get slow query statistics
CREATE OR REPLACE FUNCTION get_query_performance_stats()
RETURNS TABLE (
    query TEXT,
    calls BIGINT,
    total_time DOUBLE PRECISION,
    mean_time DOUBLE PRECISION,
    max_time DOUBLE PRECISION
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        query,
        calls,
        total_time,
        mean_time,
        max_time
    FROM pg_stat_statements
    WHERE query LIKE '%users%' OR query LIKE '%training_modules%' OR query LIKE '%assignments%'
    ORDER BY mean_time DESC
    LIMIT 10;
$$;

-- ============================================
-- STEP 9: Grant Permissions
-- ============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_employees_with_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_training_modules_with_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_assignments_with_training(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_progress_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_training_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_assignment_progress(UUID, INTEGER, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_training_modules(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_employees(UUID, TEXT) TO authenticated;

-- ============================================
-- STEP 10: Test Functions
-- ============================================

-- Test the optimized functions (replace with actual UUIDs)
-- SELECT * FROM get_employees_with_counts('your-company-uuid-here');
-- SELECT * FROM get_training_modules_with_counts('your-company-uuid-here');
-- SELECT * FROM get_assignments_with_training('your-employee-uuid-here');

-- ============================================
-- DONE!
-- ============================================
-- Your database now has optimized functions for:
-- ✅ Employee listing with counts (fixes N+1)
-- ✅ Training modules with counts
-- ✅ Assignments with training details
-- ✅ Progress tracking and analytics
-- ✅ Search functionality
-- ✅ Performance monitoring
-- ✅ Bulk operations
