# TrainAI - Production Deployment Guide

## 🚀 Production-Ready Application

TrainAI is **98% MVP complete** and ready for production deployment. This guide covers deploying your fully-featured AI-powered training platform.

## 📋 Pre-Deployment Checklist

### ✅ Environment Variables
Ensure all required environment variables are configured:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OpenAI (Required)
OPENAI_API_KEY=sk-your-openai-api-key

# Mux Video Hosting (Required)
MUX_TOKEN_ID=your-mux-token-id
MUX_TOKEN_SECRET=your-mux-token-secret
NEXT_PUBLIC_MUX_ENVIRONMENT_KEY=your-mux-environment-key

# Resend Email Service (Required)
RESEND_API_KEY=re_your-resend-api-key

# Background Jobs (Optional)
BACKGROUND_JOB_TOKEN=your-secure-random-token
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### ✅ Database Setup
All SQL schemas must be applied in order:
1. `lib/supabase/schema.sql` - Main schema
2. `lib/supabase/clean-schema-fixed.sql` - RLS policies
3. `lib/supabase/add-mux-columns.sql` - Video columns
4. `lib/supabase/add-detailed-progress-tracking.sql` - Progress tracking
5. `lib/supabase/optimize-queries.sql` - Performance optimizations
6. `lib/supabase/background-jobs-schema.sql` - Background jobs

### ✅ Service Configuration
- **Supabase**: Project created and configured
- **OpenAI**: API key active with sufficient quota
- **Mux**: Account configured with streaming enabled
- **Resend**: Domain verified for email sending

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the easiest deployment option for Next.js applications.

#### Steps:
1. **Connect Repository**
   ```bash
   # Push your code to GitHub
   git add .
   git commit -m "Production ready deployment"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add all environment variables in Vercel dashboard
   - Deploy

3. **Configure Domain**
   - Add custom domain in Vercel settings
   - Update `NEXT_PUBLIC_APP_URL` to your domain

#### Vercel Configuration
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install"
}
```

### Option 2: Railway

Railway provides easy deployment with built-in database support.

#### Steps:
1. **Connect Repository**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repository
   - Railway will auto-detect Next.js

2. **Configure Environment**
   - Add all environment variables
   - Railway will automatically deploy

3. **Custom Domain**
   - Add custom domain in Railway settings
   - Update environment variables

### Option 3: AWS/GCP/Azure

For enterprise deployments, use cloud providers with Docker.

#### Dockerfile
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

## 🔧 Production Configuration

### Next.js Configuration

Update `next.config.ts` for production:

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@mux/mux-node'],
  },
  images: {
    domains: ['image.mux.com'],
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
}

module.exports = nextConfig
```

### Database Optimization

For production, ensure these optimizations are applied:

```sql
-- Enable connection pooling
ALTER SYSTEM SET max_connections = 200;

-- Optimize for production queries
VACUUM ANALYZE;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 📊 Monitoring & Analytics

### Performance Monitoring

1. **Vercel Analytics** (if using Vercel)
   ```bash
   npm install @vercel/analytics
   ```

2. **Custom Monitoring**
   - Use the built-in `BundleMonitor` component
   - Monitor background job performance
   - Track API response times

### Error Tracking

The application includes comprehensive error tracking:

- **Error Boundaries**: Catch React errors
- **API Error Handling**: Consistent error responses
- **Background Job Monitoring**: Track job success/failure rates

## 🔐 Security Considerations

### Environment Security
- Never commit `.env.local` to version control
- Use different API keys for staging/production
- Rotate API keys regularly
- Use strong, random `BACKGROUND_JOB_TOKEN`

### Database Security
- RLS policies are enabled and configured
- Service role key is properly secured
- Database connections use SSL

### API Security
- All API routes include authentication checks
- Input validation on all endpoints
- Rate limiting on AI endpoints
- CORS properly configured

## 🚀 Post-Deployment

### 1. Verify Deployment
- [ ] All pages load correctly
- [ ] Authentication works
- [ ] Training creation flow works
- [ ] Video upload and playback works
- [ ] Email notifications work
- [ ] Background jobs process correctly

### 2. Performance Testing
- [ ] Test with large video files
- [ ] Verify chunked uploads work
- [ ] Check database query performance
- [ ] Monitor background job processing

### 3. User Acceptance Testing
- [ ] Owner can create and assign trainings
- [ ] Employees can complete trainings
- [ ] AI chat provides helpful responses
- [ ] Progress tracking works accurately
- [ ] Email notifications are received

## 🔄 Background Job Processing

For production, set up background job processing:

### Option 1: Vercel Cron Jobs
```javascript
// api/cron/process-jobs.js
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.BACKGROUND_JOB_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Process pending jobs
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/process`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.BACKGROUND_JOB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ jobTypes: ['transcription', 'sop_generation', 'mux_upload'] })
  })

  res.status(200).json({ success: true })
}
```

### Option 2: External Cron Service
Use services like:
- **Cron-job.org**
- **EasyCron**
- **AWS CloudWatch Events**

Set up to call `/api/jobs/process` every 5 minutes.

## 📈 Scaling Considerations

### Database Scaling
- Monitor connection pool usage
- Consider read replicas for analytics
- Implement database backups

### API Scaling
- Monitor OpenAI API rate limits
- Implement request queuing for high volume
- Consider caching for frequently accessed data

### Video Scaling
- Mux handles video scaling automatically
- Monitor bandwidth usage
- Consider CDN for global distribution

## 🎯 Success Metrics

After deployment, monitor these key metrics:

### User Engagement
- Training completion rates
- Employee login frequency
- AI chat usage
- Time spent on platform

### Technical Performance
- API response times
- Video load times
- Background job success rates
- Error rates

### Business Impact
- Training effectiveness
- Employee satisfaction
- Time to onboard new employees
- Training cost savings

---

## 🎉 Congratulations!

Your TrainAI application is now deployed and ready to transform how your company trains employees! 

**Features Available:**
- ✅ AI-powered training creation
- ✅ Professional video hosting
- ✅ Interactive employee training
- ✅ Progress tracking and analytics
- ✅ Email notifications
- ✅ Background processing
- ✅ Performance optimizations

**Ready for Production Use!** 🚀
