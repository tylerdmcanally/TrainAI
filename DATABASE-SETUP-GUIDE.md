# TrainAI Database Setup & Testing Guide

## 🔧 Complete Setup Instructions

### Step 1: Reset Your Database (CRITICAL!)

Your database currently has recursive RLS policies causing infinite loops. We need to completely reset it.

1. **Go to Supabase SQL Editor**
   - Open your project: https://supabase.com/dashboard/project/alkafibcdspiqtffvltg
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

2. **Run the Clean Schema**
   - Open the file: `lib/supabase/clean-schema-fixed.sql`
   - Copy ALL the contents
   - Paste into the SQL editor
   - Click "Run" (or press Cmd/Ctrl + Enter)
   - Wait for it to complete (should take 5-10 seconds)

3. **Verify Success**
   - Click "Table Editor" in the left sidebar
   - You should see these tables:
     - `companies`
     - `users`
     - `training_modules`
     - `assignments`
     - `chat_messages`
   - All should be empty (0 rows)

### Step 2: Configure Auth Settings

1. **Go to Authentication Settings**
   - Click "Authentication" → "Providers" in Supabase dashboard
   - Make sure "Email" is enabled

2. **Disable Email Confirmation (for testing)**
   - Scroll to "Email Auth" section
   - Toggle OFF "Confirm email"
   - This lets you test without checking email

3. **Set Site URL**
   - Click "URL Configuration"
   - Set **Site URL**: `http://localhost:3000`
   - Add **Redirect URL**: `http://localhost:3000/**`
   - Click "Save"

---

## 🧪 Testing Guide

### Test 1: Owner Signup & Dashboard

1. **Start the dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Visit** http://localhost:3000

3. **Click "Get Started Free"** or go to http://localhost:3000/auth/signup

4. **Fill in the form**:
   - Name: `Test Owner`
   - Email: `owner@test.com`
   - Password: `test1234`
   - Company Name: `Test Company Inc`

5. **Click "Create account"**

6. **Expected Result**:
   - ✅ You're redirected to `/dashboard/owner`
   - ✅ You see "Owner Dashboard" heading
   - ✅ Stats show: 0 trainings, 0 published, 0m duration, 0 team members
   - ✅ You see "Create Training" and "Manage Team" buttons
   - ✅ Empty state: "No training modules yet"
   - ✅ Sidebar shows your name and email

7. **Verify in Database**:
   - Go to Supabase → Table Editor
   - Check `companies` table: Should have 1 row
   - Check `users` table: Should have 1 row with `role = 'owner'`

### Test 2: Employee Invitation

1. **Still logged in as Owner**, click "Manage Team" button

2. **You'll be taken to** `/dashboard/employees`

3. **Click "Add Employee"** button

4. **Expected Result**:
   - ✅ Dialog opens: "Invite Employees"
   - ✅ Shows an invitation link like:
     ```
     http://localhost:3000/auth/employee-signup?company=<uuid>
     ```
   - ✅ Click "Copy" button
   - ✅ Button changes to "Copied!"

5. **Copy the invitation link** to use in next test

6. **Click "Done"** to close dialog

### Test 3: Employee Signup

1. **Log out** (click your name in sidebar → "Logout")

2. **Open the invitation link** you copied (or open a new private/incognito window)

3. **You should see** "Join your team" page with "Create your account for Test Company Inc"

4. **Fill in the form**:
   - Name: `Test Employee`
   - Email: `employee@test.com`
   - Password: `test1234`

5. **Click "Create employee account"**

6. **Expected Result**:
   - ✅ You're redirected to `/dashboard/employee`
   - ✅ You see "Employee Dashboard" heading
   - ✅ Company name shows "Test Company Inc"
   - ✅ Stats show: 0 assigned trainings
   - ✅ Empty state: "No trainings assigned yet"

7. **Verify in Database**:
   - Check `users` table: Should now have 2 rows
   - One with `role = 'owner'`
   - One with `role = 'employee'`
   - Both should have the same `company_id`
   - Check `companies` table: `employee_count` should be 1

### Test 4: Role-Based Routing

**Test Owner Cannot Access Employee Routes**:

1. **Log in as Owner** (`owner@test.com` / `test1234`)

2. **Try to visit** http://localhost:3000/dashboard/employee

3. **Expected Result**:
   - ✅ Automatically redirected to `/dashboard/owner`
   - ✅ You cannot access employee dashboard

**Test Employee Cannot Access Owner Routes**:

1. **Log out and log in as Employee** (`employee@test.com` / `test1234`)

2. **Try to visit** http://localhost:3000/dashboard/owner

3. **Expected Result**:
   - ✅ Automatically redirected to `/dashboard/employee`
   - ✅ You cannot access owner dashboard

4. **Try to visit** http://localhost:3000/dashboard/training/create

5. **Expected Result**:
   - ✅ Automatically redirected to `/dashboard/employee`
   - ✅ Employees cannot create trainings

### Test 5: Login Flow

1. **Log out**

2. **Go to** http://localhost:3000/auth/login

3. **Log in as Owner**:
   - Email: `owner@test.com`
   - Password: `test1234`

4. **Expected Result**:
   - ✅ Redirected to `/dashboard/owner`

5. **Log out**

6. **Log in as Employee**:
   - Email: `employee@test.com`
   - Password: `test1234`

7. **Expected Result**:
   - ✅ Redirected to `/dashboard/employee`

### Test 6: Verify No Recursive Login Issues

1. **Open browser console** (F12 → Console tab)

2. **Log in as Owner**

3. **Watch the console**:
   - ✅ No errors
   - ✅ No infinite loops
   - ✅ No "Maximum call stack exceeded" errors
   - ✅ Page loads quickly

4. **Repeat for Employee login**

---

## ✅ What's Fixed

### Database Structure
- ✅ **Clean RLS Policies** - No circular dependencies
- ✅ **Role Separation** - Clear owner vs employee policies
- ✅ **Proper Foreign Keys** - All relationships intact
- ✅ **Efficient Indexes** - Fast queries

### Authentication
- ✅ **No Recursive Login** - Fixed RLS causing infinite loops
- ✅ **Role-Based Routing** - Middleware routes to correct dashboard
- ✅ **Protected Routes** - Owners can't access employee routes and vice versa
- ✅ **Automatic Redirects** - Login sends you to the right place

### Two Clear Flows

**Owner Flow** (`/dashboard/owner`):
- View all company trainings
- Create new trainings
- Manage employees (invite via link)
- Assign trainings (coming soon)
- View statistics

**Employee Flow** (`/dashboard/employee`):
- View assigned trainings only
- Track progress
- Complete trainings
- No access to creation or management

### Invitation System
- ✅ **Invitation Links** - Owners get a shareable link
- ✅ **Self-Signup** - Employees create their own accounts
- ✅ **Auto-Join Company** - Link includes company ID
- ✅ **Simple & Secure** - No manual password distribution

---

## 🐛 Troubleshooting

### "Infinite redirect loop" or "Maximum call stack exceeded"

**Cause**: Old RLS policies still active

**Fix**:
1. Re-run `clean-schema-fixed.sql` in Supabase SQL Editor
2. Make sure to run the ENTIRE file
3. Clear browser cache and cookies
4. Restart dev server

### "No profile found" error

**Cause**: User exists in `auth.users` but not in `users` table

**Fix**:
1. Go to Supabase → Authentication → Users
2. Delete the test users
3. Sign up again from scratch

### "Company not found" on employee signup

**Cause**: Invalid company ID in invitation link

**Fix**:
1. Log in as owner
2. Go to "Manage Team"
3. Generate a fresh invitation link
4. Use the new link

### Employee count not updating

**Cause**: Trigger might not be working

**Fix**:
1. Check that the trigger was created: Go to Supabase → Database → Triggers
2. Should see `update_company_employee_count`
3. If missing, re-run the schema SQL

### Still having RLS issues

**Debug Steps**:
1. Open Supabase → SQL Editor
2. Run this query:
   ```sql
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename, policyname;
   ```
3. Compare with the policies in `clean-schema-fixed.sql`
4. If different, re-run the schema

---

## 🎯 Next Steps

Once everything is working:

1. **Test Creating a Training**:
   - Log in as owner
   - Click "Create Training"
   - Record a quick video
   - Let AI process it
   - Publish it

2. **Build Assignment System**:
   - Allow owners to assign trainings to employees
   - Employees see assigned trainings on their dashboard

3. **Add Video Playback**:
   - Integrate Mux for video hosting
   - Build video player for employee training view

4. **Implement AI Chat**:
   - Let employees ask questions about the training
   - GPT-4 responds based on transcript and SOP

---

## 📊 Database Schema Summary

```
companies
├── id (UUID)
├── name (TEXT)
├── plan (starter/growth/business)
├── owner_id (UUID) → auth.users.id
└── employee_count (INTEGER)

users
├── id (UUID) → auth.users.id
├── email (TEXT)
├── name (TEXT)
├── role (owner/employee)
└── company_id (UUID) → companies.id

training_modules
├── id (UUID)
├── company_id (UUID) → companies.id
├── creator_id (UUID) → users.id
├── title, description, video_url
├── transcript, sop, chapters, key_points
└── status (draft/published)

assignments
├── id (UUID)
├── module_id (UUID) → training_modules.id
├── employee_id (UUID) → users.id
├── assigned_by (UUID) → users.id
├── status (not_started/in_progress/completed)
└── progress (0-100)

chat_messages
├── id (UUID)
├── assignment_id (UUID) → assignments.id
├── role (user/assistant)
└── content (TEXT)
```

---

**You're all set! Follow the testing guide above to verify everything works.** 🚀
