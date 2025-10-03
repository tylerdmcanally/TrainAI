# Testing Guide - Screen Recording Feature

## 🎥 How to Test the Recording Feature

### Step 1: Navigate to Create Training
1. Visit http://localhost:3000
2. Click "Owner Dashboard"
3. Click the "Create Training" button

### Step 2: Setup Your Training
1. Enter a title (e.g., "How to Make Coffee")
2. Optionally add a description
3. Click "Next: Start Recording"

### Step 3: Record Your Screen
1. Click "Start Recording"
2. **Browser will ask for screen share permissions**
   - Select the window/tab/screen you want to record
   - Make sure "Share audio" is checked
3. **Browser will ask for microphone permissions**
   - Click "Allow" to capture your voice
4. Talk through your process naturally (like you're training someone)
5. Try recording for 30-60 seconds for testing
6. Click "Stop" when done

### Step 4: AI Processing
- Watch as the AI:
  1. Transcribes your audio using OpenAI Whisper
  2. Generates documentation with GPT-4
  3. Creates chapters, SOP, and key points
- This takes ~30-60 seconds depending on video length

### Step 5: Review & Edit
- Review the AI-generated content in 3 tabs:
  - **SOP**: Full step-by-step guide (editable)
  - **Chapters**: Timeline markers (edit titles)
  - **Key Points**: Important takeaways (add/remove/edit)
- Make any changes you want

### Step 6: Publish
- Click "Publish Training"
- Wait for success message
- You'll be redirected to the dashboard

## ⚠️ Important Notes

### Current Limitations (MVP Phase)
1. **No Authentication Yet**
   - Publishing will fail because there's no logged-in user
   - This is expected - we'll add auth next
   - You can test everything up to the publish step

2. **Video Not Saved to Cloud**
   - Video stays as a blob in memory
   - Mux integration coming next for video hosting
   - For now, we save metadata only

3. **No User Data**
   - You won't see published trainings yet
   - Need auth + user context first

### What IS Working ✅
- ✅ Screen recording with MediaRecorder API
- ✅ Audio capture from microphone
- ✅ Recording controls (pause/resume/stop)
- ✅ Timer and preview
- ✅ OpenAI Whisper transcription
- ✅ GPT-4 documentation generation
- ✅ Review and edit interface
- ✅ Beautiful UI with progress tracking

## 🧪 Test Scenarios

### Quick Test (30 seconds)
Record yourself doing something simple:
- Opening a website
- Using a simple app feature
- Explaining a basic concept

### Longer Test (2-3 minutes)
Record a real training scenario:
- How to process a return
- How to use your CRM
- How to handle a customer inquiry

## 🐛 Troubleshooting

**"Permission denied" errors:**
- Make sure you allow both screen sharing and microphone access
- Check browser permissions in Settings

**"Recording not starting":**
- Try refreshing the page
- Make sure you're using Chrome, Edge, or Firefox (Safari has limited support)

**"Processing failed":**
- Check that your OpenAI API key is valid in `.env.local`
- Check the browser console for errors (F12)
- Make sure you have internet connection

**"Publish failed":**
- Expected! Auth isn't implemented yet
- You should still see the success in processing step 3

## 📊 What Gets Generated

From a 1-minute recording, the AI typically creates:
- **Transcript**: Full text of what you said
- **3-5 Chapters**: Logical topic breaks
- **SOP**: 200-500 word step-by-step guide
- **5-7 Key Points**: Critical takeaways

The quality improves with:
- Clear speaking (not too fast)
- Logical progression through steps
- Explaining "why" not just "what"

## 💡 Tips for Best Results

1. **Speak clearly** - Whisper works best with clear audio
2. **Explain as you go** - Say what you're doing and why
3. **Take your time** - Pause between major steps
4. **Use natural language** - Talk like you're training a person
5. **Test audio first** - Make sure your mic is working

---

**Ready to test?** Go to http://localhost:3000 and create your first training! 🚀
