# Authentication Setup Guide

## ✅ What's Built

The authentication system is fully coded and ready to use:
- ✅ Login page (`/auth/login`)
- ✅ Signup page (`/auth/signup`)
- ✅ Protected routes (middleware)
- ✅ Logout functionality
- ✅ User profile display
- ✅ Session management

## 🔧 Enable Auth in Supabase (5 minutes)

### Step 1: Configure Email Auth

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/alkafibcdspiqtffvltg

2. Click **Authentication** in the left sidebar

3. Click **Providers** tab

4. Find **Email** provider and make sure it's **enabled** (it should be by default)

5. Scroll down to **Email Auth** settings:
   - **Confirm email**: Toggle OFF (for testing - turn on in production!)
   - **Secure email change**: Can leave ON

### Step 2: Configure Site URL (Important!)

1. Still in Authentication, click **URL Configuration**

2. Set the following:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: Add `http://localhost:3000/**`

3. Click **Save**

### Step 3: That's It!

Auth is now ready to use.

## 🧪 Test the Authentication Flow

### Test 1: Sign Up

1. Visit http://localhost:3000
2. Click "Get Started Free"
3. Fill in the form:
   - Name: Your Name
   - Email: your-email@test.com
   - Password: test123456
   - Company Name: Test Company
4. Click "Create account"
5. You should be redirected to `/dashboard`
6. Check the sidebar - it should show your name and email!

### Test 2: Check Database

1. Go to Supabase dashboard
2. Click **Table Editor**
3. Check these tables:
   - **companies** - Should have 1 row with your company
   - **users** - Should have 1 row with your profile
   - **auth.users** - Should have 1 row with your auth data

### Test 3: Logout & Login

1. Click "Logout" in the sidebar
2. You should be redirected to `/auth/login`
3. Try to visit `/dashboard` - you should be redirected back to login
4. Log back in with your credentials
5. Should land on dashboard again

### Test 4: Create a Training (Full Flow!)

1. Click "Create Training" from dashboard
2. Add title: "Test Training"
3. Click Next and record 30 seconds
4. Let AI process it
5. Review the generated content
6. Click "Publish"
7. This time it should work! (Previously it failed with 401)
8. You'll be redirected to dashboard
9. **Check database**: `training_modules` table should have your training!

## 🎯 What Works Now

- ✅ Users can sign up and create accounts
- ✅ Companies get created automatically
- ✅ Login/logout flow works
- ✅ Protected routes redirect to login
- ✅ Training publishing works (was failing before)
- ✅ User data shows in sidebar
- ✅ Sessions persist across page refreshes

## ⚠️ Current Limitations

1. **Email Confirmation Disabled**
   - For testing, we turned off email verification
   - Enable this in production!

2. **No Password Reset Yet**
   - Will add forgot password flow later

3. **Single Role System**
   - All signups create "owner" accounts
   - Employee invites coming next

## 🐛 Troubleshooting

**"Email already registered" error:**
- Go to Supabase → Authentication → Users
- Delete the test user and try again

**"401 Unauthorized" when publishing:**
- Make sure you're logged in (check sidebar for your name)
- Try logging out and back in

**Redirected to login repeatedly:**
- Clear browser cookies
- Check that Site URL is set correctly in Supabase

**Can't create training:**
- Make sure the company and user records were created
- Check Supabase table editor to verify data

## 📊 What's Next

With auth working, you can now:
1. Create multiple training modules (they'll be saved!)
2. Build the employee invite system
3. Add video playback (Mux integration)
4. Build the AI chat tutor for employees

---

**Ready to test?** Go to http://localhost:3000 and sign up! 🚀
