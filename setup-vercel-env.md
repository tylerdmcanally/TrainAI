# Vercel Environment Variables Setup

## 🚨 Action Required: Set Environment Variables in Vercel

Your deployment is failing because environment variables are not configured. Here's how to fix it:

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/tyler-mcanallys-projects/trainai-app
2. Click on **Settings** tab
3. Click on **Environment Variables** in the left sidebar

### Step 2: Add These Environment Variables

Add each variable with these exact names and values:

#### Required Variables:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
OPENAI_API_KEY=sk-your-openai-api-key
MUX_TOKEN_ID=your-mux-token-id
MUX_TOKEN_SECRET=your-mux-token-secret
NEXT_PUBLIC_MUX_ENVIRONMENT_KEY=your-mux-environment-key
RESEND_API_KEY=re_your-resend-api-key
```

#### Optional Variables:
```
BACKGROUND_JOB_TOKEN=your-secure-random-token
NEXT_PUBLIC_APP_URL=https://trainai-geco60auo-tyler-mcanallys-projects.vercel.app
```

### Step 3: Set Environment Scope
For each variable, make sure to:
1. Select **Production** environment
2. Click **Save**

### Step 4: Redeploy
After adding all environment variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment

## 🔍 How to Find Your API Keys

### Supabase Keys:
1. Go to your Supabase project dashboard
2. Settings → API
3. Copy "Project URL" and "anon public" key
4. Copy "service_role" key (keep this secret!)

### OpenAI Key:
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with sk-)

### Mux Keys:
1. Go to your Mux dashboard
2. Settings → API Access Tokens
3. Copy Token ID and Token Secret
4. Copy Environment Key

### Resend Key:
1. Go to https://resend.com/api-keys
2. Create a new API key
3. Copy the key (starts with re_)

## 🚀 After Setup

Once you've added all environment variables and redeployed:
1. Your app will be live at: https://trainai-geco60auo-tyler-mcanallys-projects.vercel.app
2. You can share this URL for user feedback
3. All features should work correctly

## 🆘 Need Help?

If you need help finding any of these API keys, let me know which service you need help with and I can guide you through finding them.
