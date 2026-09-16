# Bangla Brain Challenge

**Lead Developer & Software Architect:** Fakhrul Islam (`fakhrulctg106@gmail.com`)

Production-ready cross-platform educational gaming platform designed from the ground up for scalable Bengali learning across **Web/PWA**, **Android (Capacitor)**, and **iOS (Capacitor)**.

---

## 1. Project Structure

```
├── .env.example                 # Environment variables specification
├── capacitor.config.json        # Native mobile build runtime config
├── firebase-applet-config.json  # Firebase SDK configuration
├── firebase-blueprint.json      # Firestore entity schemas & models
├── firestore.rules              # Server-enforced role-based access & security rules
├── public/
│   ├── manifest.json            # PWA manifest
├── src/
│   ├── components/
│   │   ├── AdminPanel.tsx       # RBAC admin portal (Owner, Admin, Moderator)
│   │   ├── AuthScreen.tsx       # Student login and registration
│   │   ├── CommunicationView.tsx# Student chat, developer DM, WebRTC audio signaling
│   │   ├── LeaderboardView.tsx  # Daily, Weekly, Monthly, All-time rankings
│   │   ├── MathChallenge.tsx    # Math speed arithmetic game engine
│   │   ├── ProfileSettings.tsx  # User stats, dark mode, audio toggle, developer info
│   │   ├── PuzzleGame.tsx       # Bengali traditional riddles & logic puzzles
│   │   └── QuizRunner.tsx       # 10-question quiz engine with instant explanations
│   ├── contexts/
│   │   └── AuthContext.tsx      # Authentication state and role permissions
│   ├── data/
│   │   └── seedQuestions.ts     # Initial verified question bank with Islamic references
│   ├── services/
│   │   ├── ads.ts               # Capacitor AdMob & Web advertising abstraction
│   │   ├── audio.ts             # Web Audio API procedural sound synthesizer
│   │   ├── communication.ts     # Realtime chat, reporting, and signaling
│   │   ├── db.ts                # Firestore queries, seeders, and anti-cheat validation
│   │   └── firebase.ts          # Firebase app, auth, and database initialization
│   ├── types/
│   │   └── index.ts             # Strict TypeScript data models
│   ├── App.tsx                  # Main modular navigation & view orchestration
│   ├── main.tsx                 # Application mount
│   └── index.css                # Tailwind CSS styling
```

---

## 2. Core Game & Anti-Cheat Architecture

- **10-Question Structured Engine**: Each quiz session presents 10 questions with 4 distinct choices, countdown timer, immediate correct/wrong evaluation, and educational explanations.
- **Strict Islamic General Knowledge**: Separate dedicated category with mandatory/strongly encouraged source citations (e.g., Sahih Bukhari, Sahih Muslim, Quranic Surahs). No unverified religious text is accepted.
- **Anti-Cheat Validation**:
  - Each quiz attempt issues a unique cryptographic attempt token `att_<timestamp>_<rand>`.
  - Duplicate tokens are rejected at database level to prevent repeated score submissions.
  - Scores are recorded synchronously with daily, weekly, monthly, and all-time period keys.
- **Natural Ad Breaks**: Interstitial advertisements are displayed strictly during natural game intervals (after full quiz completions), never intruding into individual questions.

---

## 3. Communication & WebRTC Audio Calling

- Direct messaging channel directly connected with Developer **Fakhrul Islam**.
- Student community chatroom.
- WebRTC signaling architecture ready for TURN/STUN integration for low-latency peer-to-peer audio calls.
- In-app reporting and moderation system for harmful content and user harassment.

---

## 4. Role-Based Admin Panel (`/admin`)

- **Owner (Fakhrul Islam - `fakhrulctg106@gmail.com`)**:
  - Full platform control.
  - Can securely appoint administrators or moderators via Firestore `roles/{userId}` records.
  - Protected from modification or deletion by ordinary administrators.
- **Admin**:
  - Add, edit, publish, and delete questions in any category.
  - View users and block/unblock violators.
  - Review moderation complaints.
- **Moderator**:
  - Moderate chat messages and review student reports.
- **Immutable Audit Logging**:
  - Every administrative question edit, role assignment, and user block is permanently written to `/auditLogs`.

---

## 5. Capacitor Mobile Setup (Android APK & iOS)

### Android Build
1. Install native packages:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap add android
   ```
2. Build the web distribution:
   ```bash
   npm run build
   npx cap copy
   ```
3. Open in Android Studio:
   ```bash
   npx cap open android
   ```
4. Build APK / App Bundle via Android Studio (`Build > Generate Signed Bundle / APK`).

### iOS Build
1. Add iOS platform:
   ```bash
   npm install @capacitor/ios
   npx cap add ios
   npx cap open ios
   ```

---

## 6. How to Add Questions & Expand the Question Bank

1. Log in with an authorized Admin or Owner account.
2. Navigate to **অ্যাডমিন প্যানেল** (`/admin`).
3. Click **নতুন প্রশ্ন যোগ করুন**.
4. Select category (e.g., ইসলামিক সাধারণ জ্ঞান, বাংলাদেশ, বিজ্ঞান).
5. Enter the question, 4 options, mark the correct index, provide an explanation, and attach the exact reference/source.
6. The question becomes immediately accessible across Web, Android, and iOS clients.
