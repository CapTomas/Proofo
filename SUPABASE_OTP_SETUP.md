# Enabling OTP Codes in Supabase

To enable 6-digit OTP codes in your Supabase authentication emails, follow these steps:

## Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Email Templates**
4. Find the **"Confirm signup"** or **"Magic Link"** template
5. Look for the option **"Enable email OTP"** or **"Use a secure 6-digit code"**
6. Toggle it **ON**

## What This Does:

- Supabase will include a 6-digit verification code in the email
- The code can be entered directly in the login form
- The magic link will still work as an alternative
- Users can choose either method to authenticate

## Email Template Configuration:

After enabling, your email will include both:
- A 6-digit code (e.g., `123456`)
- A magic link (clickable URL)

## Testing:

1. Try signing in with an email address
2. Check your email for the 6-digit code
3. Enter the code in the OTP input fields
4. The code should automatically verify when all 6 digits are entered

## Fallback:

If OTP codes are not enabled, users can still click the magic link in the email to authenticate.
