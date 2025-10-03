# TrainAI - Setup Guide

## Project Overview
AI-Powered Interactive Employee Training Platform

## What's Set Up

### ✅ Completed
- [x] Next.js 14 with TypeScript
- [x] Tailwind CSS with custom design system
- [x] shadcn/ui component library
- [x] Project structure (app, components, lib folders)
- [x] OpenAI integration setup
- [x] Supabase client configuration
- [x] Mux video integration setup
- [x] Environment variables template

### 📋 Next Steps

#### 1. Set Up Supabase
1. Go to https://supabase.com and create a new project
2. Once created, go to Project Settings > API
3. Copy the following values to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` - Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` - service_role key (keep secret!)

#### 2. Set Up OpenAI
1. Add your OpenAI API key to `.env.local`:
   - `OPENAI_API_KEY=sk-...`

#### 3. Set Up Mux (Video Hosting)
1. Go to https://mux.com and create an account
2. Create an access token with full permissions
3. Copy the following to `.env.local`:
   - `MUX_TOKEN_ID` - Token ID
   - `MUX_TOKEN_SECRET` - Token Secret
4. In Mux dashboard, get your Environment Key:
   - `NEXT_PUBLIC_MUX_ENVIRONMENT_KEY` - For video playback

#### 4. Create Database Schema
After setting up Supabase, run the SQL schema provided in `/lib/supabase/schema.sql` (will be created next)

## Running the App

```bash
# Install dependencies (if not already installed)
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Tech Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Lucide React icons
- **Backend**: Next.js API routes, PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (files) + Mux (video)
- **AI**: OpenAI Whisper (transcription) + GPT-4 (AI tutor)

## Project Structure
```
TrainAI/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard routes
│   ├── auth/              # Auth routes
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components
│   ├── training/          # Training-related components
│   └── employee/          # Employee-related components
├── lib/                   # Utility functions
│   ├── supabase/          # Supabase clients
│   ├── openai/            # OpenAI integration
│   ├── mux/               # Mux video integration
│   └── types/             # TypeScript types
└── public/                # Static assets
```

## Environment Variables
See `.env.local.example` for all required environment variables.

## Design System
- **Primary Color**: #2563eb (Blue)
- **Secondary Color**: #8b5cf6 (Purple)
- **Success Color**: #10b981 (Green)
- **Font**: Inter
- **Border Radius**: 8px
- **Spacing**: 8px grid system

## Development Status
Currently in Week 1-2 of the 8-week MVP build plan. Focus: Foundation setup.
