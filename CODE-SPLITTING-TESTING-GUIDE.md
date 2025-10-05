# Code Splitting Testing Guide - Phase 3

## 🎯 **Testing Overview**

This guide covers testing the code splitting optimizations implemented in Phase 3, focusing on bundle size reduction, lazy loading, and performance improvements.

## 📋 **Test Scenarios**

### **1. Bundle Size Testing**

#### **Before vs After Comparison**
```bash
# Run bundle analysis
npx tsx scripts/analyze-bundle.ts

# Compare bundle sizes
npm run build
ls -la .next/static/chunks/
```

**Expected Results**:
- ✅ Reduced initial bundle size
- ✅ Smaller individual chunks
- ✅ Better code splitting

#### **Bundle Analyzer**
```bash
# Install bundle analyzer
npm install --save-dev webpack-bundle-analyzer

# Analyze bundle
ANALYZE=true npm run build
```

**Expected Results**:
- ✅ Clear chunk separation
- ✅ Reduced vendor chunk size
- ✅ Optimized third-party imports

### **2. Lazy Loading Testing**

#### **Training Creation Flow**
```bash
# Navigate to optimized training creation
curl -X GET "http://localhost:3000/dashboard/training/create/optimized"
```

**Expected Results**:
- ✅ Initial page loads quickly
- ✅ Steps load on demand
- ✅ Loading indicators work
- ✅ No JavaScript errors

#### **Video Player Loading**
```bash
# Navigate to training detail with video
curl -X GET "http://localhost:3000/dashboard/training/[id]/optimized"
```

**Expected Results**:
- ✅ Page loads without video player
- ✅ Video player loads on demand
- ✅ Smooth loading experience
- ✅ No layout shift

#### **Employee Training Player**
```bash
# Navigate to employee training
curl -X GET "http://localhost:3000/dashboard/employee/training/[id]/optimized"
```

**Expected Results**:
- ✅ Training player loads lazily
- ✅ AI tutor chat loads on demand
- ✅ Progress tracking works
- ✅ No performance issues

### **3. Performance Testing**

#### **Page Load Times**
```javascript
// Test in browser console
performance.mark('page-start')
window.addEventListener('load', () => {
  performance.mark('page-end')
  performance.measure('page-load', 'page-start', 'page-end')
  console.log(performance.getEntriesByType('measure'))
})
```

**Expected Results**:
- ✅ Faster initial page load
- ✅ Reduced Time to Interactive (TTI)
- ✅ Better First Contentful Paint (FCP)

#### **Network Requests**
```javascript
// Monitor network requests
performance.getEntriesByType('resource').forEach(entry => {
  console.log(`${entry.name}: ${entry.duration}ms`)
})
```

**Expected Results**:
- ✅ Fewer initial requests
- ✅ Smaller initial payload
- ✅ Lazy-loaded resources

### **4. Component Loading Testing**

#### **Dynamic Import Testing**
```javascript
// Test dynamic imports
import('./components/training/lazy-components').then(module => {
  console.log('Lazy components loaded:', module)
})
```

**Expected Results**:
- ✅ Components load on demand
- ✅ No import errors
- ✅ Proper error boundaries

#### **Suspense Testing**
```javascript
// Test Suspense fallbacks
// Navigate between pages and observe loading states
```

**Expected Results**:
- ✅ Loading indicators show
- ✅ Smooth transitions
- ✅ No flash of unstyled content

## 🧪 **Automated Testing**

### **Run Performance Tests**
```bash
# Run bundle analysis
npx tsx scripts/analyze-bundle.ts

# Run performance tests
npm run test:performance

# Run accessibility tests
npm run test:a11y
```

### **Test Coverage**
- [ ] Bundle size reduction
- [ ] Lazy loading functionality
- [ ] Performance improvements
- [ ] Error handling
- [ ] Loading states
- [ ] User experience

## 📊 **Performance Benchmarks**

### **Bundle Size Targets**
| Metric | Before | Target | Improvement |
|--------|--------|--------|-------------|
| Initial Bundle | 500KB+ | < 250KB | 50%+ |
| Total Bundle | 1.5MB+ | < 1MB | 33%+ |
| Largest Chunk | 800KB+ | < 500KB | 37%+ |
| Chunk Count | 30+ | < 20 | 33%+ |

### **Loading Performance Targets**
| Metric | Before | Target | Improvement |
|--------|--------|--------|-------------|
| First Contentful Paint | 2s+ | < 1.5s | 25%+ |
| Time to Interactive | 4s+ | < 3s | 25%+ |
| Largest Contentful Paint | 3s+ | < 2.5s | 17%+ |
| Cumulative Layout Shift | 0.1+ | < 0.1 | Stable |

## 🔍 **Monitoring & Debugging**

### **Bundle Monitoring**
```javascript
// Monitor bundle metrics in production
import { BundleMonitor } from '@/components/ui/bundle-monitor'

// Add to dashboard
<BundleMonitor />
```

### **Performance Monitoring**
```javascript
// Monitor Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

getCLS(console.log)
getFID(console.log)
getFCP(console.log)
getLCP(console.log)
getTTFB(console.log)
```

### **Common Issues & Solutions**

#### **Issue: Components not loading**
**Solution**: Check dynamic import paths and error boundaries

#### **Issue: Bundle size not reduced**
**Solution**: Verify code splitting is working and unused code is removed

#### **Issue: Loading states not showing**
**Solution**: Ensure Suspense boundaries are properly configured

#### **Issue: Performance not improved**
**Solution**: Check if lazy loading is actually working and measure real metrics

## ✅ **Success Criteria**

### **Phase 3 Complete When**:
- [ ] Bundle size reduced by 30%+
- [ ] Lazy loading working for all heavy components
- [ ] Page load times improved by 25%+
- [ ] No JavaScript errors introduced
- [ ] All tests pass
- [ ] User experience maintained or improved

### **Performance Improvements**:
- [ ] 30% reduction in initial bundle size
- [ ] 25% improvement in page load times
- [ ] 50% reduction in initial JavaScript payload
- [ ] 100% of heavy components lazy-loaded

## 🚀 **Next Steps**

After Phase 3 completion:
1. **Phase 4**: Background processing implementation
2. **Monitoring**: Set up continuous performance monitoring
3. **Optimization**: Fine-tune based on real user metrics

## 📝 **Testing Checklist**

### **Before Testing**
- [ ] Bundle analysis baseline established
- [ ] Performance metrics baseline recorded
- [ ] Test environment configured
- [ ] Monitoring tools set up

### **During Testing**
- [ ] Run bundle analysis
- [ ] Test lazy loading functionality
- [ ] Measure performance improvements
- [ ] Verify error handling
- [ ] Check user experience

### **After Testing**
- [ ] Compare metrics with baseline
- [ ] Verify no regressions
- [ ] Update documentation
- [ ] Deploy to production

---

**Note**: This testing guide should be updated as new code splitting optimizations are implemented.
