# Firebase + Clerk Integration Setup

## 🔧 Environment Variables Required

Create a `.env.local` file in your project root with the following variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# Environment
NODE_ENV=development
```

## 🚀 Setup Steps

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Go to Project Settings > General > Your apps
5. Add a web app and copy the config values

### 2. Configure Clerk-Firebase Integration

**Note: Using simplified integration for testing**

- Clerk handles authentication
- User IDs from Clerk are used directly with Firestore
- No JWT template needed for now

### 3. Deploy Firestore Security Rules

Upload the `firestore.rules` file to your Firebase project:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

### 4. Test the Integration

1. Start your Next.js app: `npm run dev`
2. Sign in with Clerk
3. Check browser console for any Firebase connection errors
4. Verify user data is being created in Firestore

## 📁 Data Structure Overview

Your Firestore database will have this structure:

```
/users/{clerkUserId}
  - profile data (email, name, etc.)

  /backgrounds/{backgroundId}
    - training background data

  /trainingPlans/{planId}
    - complete training plans

  /chatHistory/{messageId}
    - chat messages with AI

  /progress/{weekId}
    - workout completion tracking
```

## 🔒 Security Features

- ✅ Users can only access their own data
- ✅ Clerk authentication required for all operations
- ✅ Automatic user initialization on first sign-in
- ✅ Type-safe Firestore operations
- ✅ Real-time data synchronization

## 🛠️ Development vs Production

The app automatically handles:

- **Development**: Attempts to connect to Firebase emulators if available
- **Production**: Uses your live Firebase project

To use emulators in development:

```bash
# Install Firebase emulators
firebase init emulators

# Start emulators
firebase emulators:start
```

## 📝 Next Steps

After setup is complete, you can:

1. Build the onboarding flow to collect user data
2. Create LLM integration for training plan generation
3. Add progress tracking features
4. Implement workout completion UI

## 🐛 Troubleshooting

**Error: "Failed to initialize user data"**

- Verify all Firebase environment variables are set correctly
- Check that Firestore is enabled in your Firebase project
- Verify all Clerk environment variables are set

**Error: "Permission denied"**

- Ensure Firestore rules are deployed (`firebase deploy --only firestore:rules`)
- Current rules are permissive for testing - check Firebase console

**Error: "Firebase app not initialized"**

- Verify all Firebase environment variables are set correctly
- Check browser console for specific Firebase config errors
