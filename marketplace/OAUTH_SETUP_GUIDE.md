# 🔐 Google OAuth Setup Guide for Marketplace App

## Quick Setup Steps

### 1️⃣ **Get Google OAuth Credentials**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create New Project** (or select existing)
3. **Enable Google+ API**:
   - APIs & Services → Library → Search "Google+ API" → Enable

### 2️⃣ **Configure OAuth Consent Screen**

1. APIs & Services → OAuth consent screen
2. Choose **External** user type
3. Fill in:
   - **App name**: Marketplace
   - **User support email**: your-email@gmail.com
   - **Developer contact**: your-email@gmail.com
4. Add Scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. Save and Continue

### 3️⃣ **Create OAuth 2.0 Client ID**

1. APIs & Services → Credentials
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Select **"Web application"**
4. Configure:

```
Application name: Marketplace Web Client

Authorized JavaScript origins:
- http://localhost:3000
- http://localhost:3004
- http://localhost:5001

Authorized redirect URIs:
- http://localhost:5001/api/v1/auth/oauth/google/callback
```

5. Click **Create**
6. **COPY YOUR CREDENTIALS:**
   - Client ID: `xxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxx`

### 4️⃣ **Update Your .env File**

Replace the placeholders in `/packages/server/.env`:

```env
# Google OAuth (Replace with your actual credentials)
GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-YOUR_ACTUAL_SECRET
```

### 5️⃣ **Install Dependencies & Test**

```bash
# In the server directory
cd packages/server
npm install

# Start the server
npm run dev
```

```bash
# In another terminal, start the web app
cd packages/web
npm run dev
```

### 6️⃣ **Test OAuth Flow**

1. Go to http://localhost:3004/login
2. Click "Continue with Google"
3. Select your Google account
4. You should be redirected back and logged in!

## 🚨 Common Issues & Solutions

### Issue: "Redirect URI mismatch"
**Solution**: Make sure the callback URL in Google Console EXACTLY matches:
```
http://localhost:5001/api/v1/auth/oauth/google/callback
```

### Issue: "This app isn't verified"
**Solution**: Click "Advanced" → "Go to Marketplace (unsafe)" during testing

### Issue: Dependencies not installing
**Solution**: Try installing with legacy peer deps:
```bash
npm install --legacy-peer-deps
```

## 📝 Production Checklist

When deploying to production:

1. **Update redirect URIs** in Google Console:
   ```
   https://yourdomain.com/api/v1/auth/oauth/google/callback
   ```

2. **Update .env** with production URLs:
   ```env
   CLIENT_URL=https://yourdomain.com
   ```

3. **Verify your app** with Google (for production use)

## 🔒 Security Notes

- **Never commit** your `.env` file with real credentials
- Use **environment variables** in production (Vercel, Heroku, etc.)
- Keep your **Client Secret** secure
- Rotate credentials if exposed

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)

---

## Need GitHub OAuth Too?

### Quick GitHub OAuth Setup:

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Marketplace
   - **Homepage URL**: http://localhost:3004
   - **Authorization callback URL**: http://localhost:5001/api/v1/auth/oauth/github/callback
4. Register application
5. Copy Client ID and generate Client Secret
6. Update `.env`:
   ```env
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

---

**Questions?** The OAuth implementation is ready - just add your credentials and test!
