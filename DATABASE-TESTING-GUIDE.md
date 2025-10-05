# Database Optimization Testing Guide - Phase 2

## 🎯 **Testing Overview**

This guide covers testing the database optimizations implemented in Phase 2, focusing on query performance, index usage, and N+1 problem fixes.

## 📋 **Test Scenarios**

### **1. Index Optimization Testing**

#### **Verify Index Creation**
```sql
-- Check all optimized indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

#### **Check Index Usage**
```sql
-- Monitor index usage statistics
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
```

### **2. Query Optimization Testing**

#### **Employee Listing Performance**
```bash
# Test old vs new employee listing
curl -X GET "http://localhost:3000/api/employees/optimized" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Results**:
- ✅ Single query instead of N+1 queries
- ✅ 50-80% performance improvement
- ✅ Reduced database load

#### **Training Modules Performance**
```bash
# Test optimized training modules query
curl -X GET "http://localhost:3000/api/training/optimized" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Results**:
- ✅ Includes assignment counts in single query
- ✅ Faster loading times
- ✅ Better user experience

#### **Progress Tracking Performance**
```bash
# Test optimized progress tracking
curl -X GET "http://localhost:3000/api/progress/optimized?employeeId=EMPLOYEE_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Results**:
- ✅ Bulk progress updates
- ✅ Reduced API calls
- ✅ Better real-time updates

### **3. Search Performance Testing**

#### **Full-Text Search**
```bash
# Test optimized search
curl -X GET "http://localhost:3000/api/search/optimized?q=training&type=trainings" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Results**:
- ✅ Faster search results
- ✅ Better relevance ranking
- ✅ Support for complex queries

### **4. Function Testing**

#### **Test Optimized Functions**
```sql
-- Test employee listing function
SELECT * FROM get_employees_with_counts('your-company-uuid-here');

-- Test training modules function
SELECT * FROM get_training_modules_with_counts('your-company-uuid-here');

-- Test progress summary function
SELECT * FROM get_employee_progress_summary('your-employee-uuid-here');

-- Test company analytics function
SELECT * FROM get_company_training_analytics('your-company-uuid-here');
```

## 🧪 **Automated Testing**

### **Run Performance Tests**
```bash
# Run database performance tests
npx tsx scripts/test-database-performance.ts

# Run specific tests
npx tsx -e "
import { testEmployeeListing } from './scripts/test-database-performance.ts';
testEmployeeListing();
"
```

### **Test Coverage**
- [ ] Index creation and usage
- [ ] Query performance improvements
- [ ] N+1 problem fixes
- [ ] Search functionality
- [ ] Progress tracking
- [ ] Analytics queries

## 📊 **Performance Benchmarks**

### **Query Performance Targets**
| Query Type | Old Time | Target Time | Improvement |
|------------|----------|-------------|-------------|
| Employee Listing | 200-500ms | 50-100ms | 70-80% |
| Training Modules | 100-300ms | 30-80ms | 60-70% |
| Search Queries | 150-400ms | 40-100ms | 70-75% |
| Progress Updates | 50-150ms | 20-50ms | 60-70% |

### **Index Usage Targets**
- **Index Hit Ratio**: > 95%
- **Index Scans**: > 1000 per day
- **Tuple Reads**: Optimized for common queries

## 🔍 **Monitoring & Debugging**

### **Query Performance Monitoring**
```sql
-- Monitor slow queries
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
```

### **Index Usage Monitoring**
```sql
-- Monitor index usage
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
```

### **Common Issues & Solutions**

#### **Issue: Indexes not being used**
**Solution**: Check query patterns and ensure indexes match WHERE clauses

#### **Issue: Slow function execution**
**Solution**: Verify function definitions and parameter types

#### **Issue: N+1 queries still occurring**
**Solution**: Ensure applications use optimized API endpoints

## ✅ **Success Criteria**

### **Phase 2 Complete When**:
- [ ] All optimized indexes are created and used
- [ ] N+1 queries are eliminated
- [ ] Query performance improved by 50%+
- [ ] Search functionality is optimized
- [ ] Progress tracking is efficient
- [ ] All tests pass
- [ ] No regression in functionality

### **Performance Improvements**:
- [ ] 70% reduction in query execution time
- [ ] 90% reduction in database connections
- [ ] 100% elimination of N+1 queries
- [ ] 50% improvement in search speed

## 🚀 **Next Steps**

After Phase 2 completion:
1. **Phase 3**: Code splitting & bundle optimization
2. **Phase 4**: Background processing implementation
3. **Monitoring**: Set up continuous performance monitoring

## 📝 **Testing Checklist**

### **Before Testing**
- [ ] Database indexes are created
- [ ] Optimized functions are deployed
- [ ] Test data is available
- [ ] Performance baseline is established

### **During Testing**
- [ ] Run automated performance tests
- [ ] Test all optimized endpoints
- [ ] Verify index usage
- [ ] Check query execution plans

### **After Testing**
- [ ] Compare performance metrics
- [ ] Verify no regressions
- [ ] Update documentation
- [ ] Deploy to production

---

**Note**: This testing guide should be updated as new database optimizations are implemented.
