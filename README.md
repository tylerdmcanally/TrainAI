# TrainAI - AI-Powered Interactive Employee Training Platform

> **Status: Production Ready - 98% MVP Complete** 🚀

TrainAI is a comprehensive employee training platform that uses AI to automatically generate training content from screen recordings, providing an interactive learning experience with AI-powered tutoring.

## ✨ Key Features

### 🎥 **AI-Powered Training Creation**
- **Screen Recording**: Capture your screen and audio with built-in recorder
- **AI Transcription**: Automatic speech-to-text using OpenAI Whisper
- **AI Content Generation**: GPT-4 generates SOPs, chapters, and key points
- **Background Processing**: Non-blocking AI operations for smooth UX

### 🎬 **Professional Video Hosting**
- **Mux Integration**: Professional video streaming and hosting
- **Chapter Navigation**: Automatic chapter creation with timestamps
- **Progress Tracking**: Real-time progress monitoring
- **Mobile Optimized**: Responsive video player

### 👥 **Complete Employee Management**
- **Employee Onboarding**: Easy employee invitation system
- **Training Assignment**: Assign trainings to individuals or groups
- **Progress Monitoring**: Track completion and engagement
- **Analytics Dashboard**: Comprehensive training insights

### 🤖 **AI Training Assistant**
- **Interactive Chat**: AI tutor that answers training-related questions
- **Context Awareness**: Understands training content and provides relevant help
- **Checkpoint System**: AI-generated questions and evaluations
- **Completion Certificates**: Automated certification system

### 📧 **Professional Communication**
- **Email Notifications**: Resend integration with branded templates
- **Assignment Alerts**: Automatic notifications for new training assignments
- **Progress Updates**: Regular progress summaries

### 🚀 **Performance & Reliability**
- **Background Processing**: Heavy AI operations run in background
- **Chunked Uploads**: Efficient file upload for large videos
- **Error Handling**: Comprehensive error management and retry logic
- **Real-time Updates**: Live progress tracking and notifications

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, PostgreSQL (Supabase)
- **Authentication**: Supabase Auth with RLS
- **Video Hosting**: Mux (professional video streaming)
- **AI**: OpenAI (Whisper, GPT-4, TTS)
- **Email**: Resend (professional email service)
- **UI Components**: shadcn/ui, Radix UI
- **Database**: Supabase with optimized queries and indexes

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- OpenAI API key
- Mux account
- Resend account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TrainAI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your API keys:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # OpenAI
   OPENAI_API_KEY=your-openai-key

   # Mux
   MUX_TOKEN_ID=your-mux-token-id
   MUX_TOKEN_SECRET=your-mux-token-secret
   NEXT_PUBLIC_MUX_ENVIRONMENT_KEY=your-mux-env-key

   # Resend
   RESEND_API_KEY=your-resend-api-key
   ```

4. **Set up the database**
   - Run the SQL schema in `lib/supabase/schema.sql`
   - Apply optimizations from `lib/supabase/optimize-queries.sql`

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📖 User Guide

### For Owners (Training Creators)

1. **Sign up** and create your company
2. **Create Training**:
   - Add title and description
   - Record your screen with audio
   - Let AI process (transcribe and generate content)
   - Review and edit AI-generated content
   - Publish training
3. **Manage Employees**:
   - Add employees to your company
   - Assign trainings to employees
   - Monitor progress and completion
   - View analytics and insights

### For Employees

1. **Receive invitation** via email
2. **Sign up** and access your dashboard
3. **Complete Assigned Trainings**:
   - Watch training videos with chapter navigation
   - Answer checkpoint questions
   - Chat with AI tutor for help
   - Track your progress
4. **Get certified** upon completion

## 🏗 Architecture

### Database Schema
- **Companies**: Company information and settings
- **Users**: User profiles with role-based access
- **Training Modules**: Training content and metadata
- **Assignments**: Employee training assignments
- **Chat Messages**: AI tutor conversations
- **Background Jobs**: Job queue for AI processing

### API Endpoints
- **Training APIs**: Creation, processing, assignment, progress
- **Employee APIs**: Management, assignments, progress
- **Video APIs**: Mux integration, streaming
- **Email APIs**: Resend integration, notifications
- **Background Job APIs**: Job processing and monitoring

### Performance Features
- **Chunked File Uploads**: Efficient large file handling
- **Database Optimization**: Indexed queries and optimized functions
- **Code Splitting**: Lazy loading and dynamic imports
- **Background Processing**: Non-blocking AI operations

## 🔧 Development

### Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Project Structure
```
TrainAI/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── dashboard/         # Dashboard pages
├── components/            # React components
│   ├── training/          # Training-related components
│   ├── employees/         # Employee management
│   ├── ui/               # Reusable UI components
│   └── layout/           # Layout components
├── lib/                  # Utility libraries
│   ├── supabase/         # Database schema and client
│   ├── openai/           # AI client configuration
│   └── utils/            # Utility functions
└── public/               # Static assets
```

## 📊 Current Status

### ✅ Completed Features (98%)
- Complete authentication and user management
- Full training creation workflow with AI
- Professional video hosting and streaming
- Complete employee training experience
- Employee management and assignment system
- Email notifications and communication
- Analytics dashboard and reporting
- Performance optimizations
- Background job processing
- Comprehensive error handling

### 🔄 Optional Enhancements (2%)
- Bulk employee operations
- Training templates
- Mobile PWA features
- Advanced search and filtering
- Integration APIs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation in the `/docs` folder
- Review the testing guides
- Open an issue on GitHub

---

**TrainAI** - Transforming how companies train their employees with AI-powered interactive learning experiences.