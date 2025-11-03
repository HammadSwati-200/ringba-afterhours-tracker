# Ringba After-Hours Tracker - Authentication Setup

## 🎉 Test User Already Created!

A test user has been created for you:

**Email:** `admin@ringba.com`  
**Password:** `password123`

## 🚀 Quick Start

1. Make sure the dev server is running: `npm run dev`
2. Open http://localhost:3000 in your browser
3. You'll be redirected to the login page
4. Use the credentials above to login
5. Start tracking your after-hours calls!

---

## 🔐 Creating Additional Users

Since authentication is now enabled, you need to create a user account to access the dashboard.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add User** → **Create new user**
4. Enter an email and password
5. Click **Create User**

### Option 2: Using SQL (Quick Method)

Run this SQL in your Supabase SQL Editor:

```sql
-- Replace with your desired email and password
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'your-email@example.com',  -- Change this
  crypt('your-password-here', gen_salt('bf')),  -- Change this
  NOW(),
  NOW(),
  NOW(),
  '',
  ''
);
```

### Option 3: Enable Email Signup (Optional)

If you want users to be able to sign up themselves:

1. Go to **Authentication** → **Providers** in Supabase
2. Enable **Email** provider
3. Configure email templates if needed
4. Add a signup page to your app

## 🚀 Logging In

Once you've created a user:

1. Start the development server: `npm run dev`
2. Navigate to http://localhost:3000
3. You'll be redirected to the login page
4. Enter your email and password
5. Click **Sign In**

## 🔒 Security Features

- ✅ **RLS Enabled**: Row Level Security protects your data
- ✅ **Authenticated Access**: Only logged-in users can view data
- ✅ **Session Management**: Secure cookie-based sessions
- ✅ **Middleware Protection**: Automatic redirects for unauthenticated users

## 🐛 Troubleshooting

### "Database error: permission denied for table calls"

- Make sure you're logged in
- Check that the RLS policy allows authenticated users to read
- Verify your user is in the `authenticated` role

### Can't login / Invalid credentials

- Double-check your email and password
- Verify the user exists in Supabase Dashboard → Authentication → Users
- Check browser console for detailed error messages

### Hydration Error Fixed

- Added `suppressHydrationWarning` to prevent browser extension conflicts
- This fixes the "cz-shortcut-listen" attribute warning from ColorZilla or similar extensions
