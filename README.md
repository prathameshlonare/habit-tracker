# ✨ Habit Tracker Pro

A modern, minimal, and premium habit tracking application designed to help you build consistency and reflect on your growth. Built with **React 19**, **Vite**, and **Firebase**, this app features a sleek bento-grid layout, visual analytics, and a powerful daily journaling system.

---

## 🚀 Features

### 🎯 Habit Management
- **Daily Tracking**: Create, edit, and track daily habits with a simple check-in system
- **Monthly Calendar View**: Visual representation of your habit completion
- **Streak Tracking**: Monitor your current and longest streaks
- **Edit & Delete**: Manage your habits with an intuitive interface
- **Overall Progress**: See completion rates and statistics at a glance

### � Daily Journaling
- **Integrated Journal**: Daily prompts with structured reflection sections
- **Mood Tracking**: Track your daily mood with emoji selectors
- **Reflection Prompts**: Gratitude, highlights, challenges, learning, and goals
- **Calendar View**: Browse past entries with an intuitive calendar interface
- **Entry Statistics**: View your journaling streaks and patterns

### � Visual Analytics
- **Dynamic Charts**: View your progress through beautiful visualizations
- **Monthly Trends**: Completion rates over the last 6 months (bar chart)
- **90-Day Activity**: Daily activity line chart for the last 3 months
- **Top Performers**: See which habits you're most consistent with
- **Key Metrics**: Active habits, average rate, longest streak, and best month

### 🔒 Secure Authentication
- **Google Login**: Seamless authentication with Google OAuth
- **Email Whitelisting**: Private access control for authorized users only
- **User Isolation**: Complete data privacy - each user sees only their own data
- **Firestore Security**: User-specific read/write permissions

### 📄 Export to PDF
- **Beautiful Reports**: Generate and download summary reports
- **Habit Data**: Export all your habits and completion history
- **Journal Entries**: Include your journal reflections in the export

### 📱 Fully Responsive
- **Mobile-First Design**: Optimized for all screen sizes
- **Touch-Friendly**: 44px minimum button sizes for easy tapping
- **Bento Grid Layout**: Modern 2-column grid on mobile devices
- **Premium UI**: Glassmorphism effects and smooth animations

### � Notifications
- **Daily Reminders**: Browser notifications at 9 AM and 6 PM
- **Achievement Alerts**: Celebrate streaks and milestones (3, 7, 14, 30 days)
- **All Completed**: Special notification when you complete all habits
- **Mobile-Friendly**: Works on Android and iOS with HTTPS

---

## 🛠️ Technology Stack

- **Frontend**: React.js 19, Vite
- **Backend/Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Google)
- **Routing**: React Router v6
- **Charts**: Chart.js & React-Chartjs-2
- **PDF Generation**: jsPDF & html2canvas
- **Styling**: Vanilla CSS (Custom UI System)
- **Icons**: Lucide React
- **Hosting**: Firebase Hosting

---

## � Project Structure

```text
habit-tracker/
├── src/
│   ├── assets/           # Static assets, images, and brand files
│   ├── components/       # Reusable UI components
│   │   ├── Login.jsx     # Login page component
│   │   └── ProtectedRoute.jsx  # Route protection wrapper
│   ├── contexts/         # React Context providers
│   │   └── AuthContext.jsx     # Authentication state management
│   ├── services/         # API and Database interaction logic
│   │   └── firestoreService.js # Firestore CRUD operations
│   ├── App.jsx           # Main application logic & Routing
│   ├── App.css           # Global core styles & Design system
│   ├── Settings.css      # Settings page styles
│   ├── Toast.css         # Toast notification styles
│   ├── Login.css         # Login page styles
│   ├── firebase.js       # Firebase SDK initialization & Config
│   ├── exportPDF.js      # PDF report generation logic
│   └── main.jsx          # Application entry point
├── public/               # Public assets (icons, manifest.json)
├── firebase.json         # Firebase Hosting configuration
├── .env                  # Environment variables (Secrets)
└── README.md            # Project documentation
```

---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/prathameshlonare/habit-tracker.git
cd habit-tracker
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory and add your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Configure Allowed Emails
Edit `src/firebase.js` and add authorized email addresses:

```javascript
export const ALLOWED_EMAILS = [
  'your-email@gmail.com',
  'friend-email@gmail.com'
];
```

### 5. Run the Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 6. Build for Production
```bash
npm run build
```

---

## � How to Get Firebase Credentials

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add Project"** and follow the setup steps
3. Once the project is created, click the **Web icon (`</>`)** to register a new web app
4. Copy the `firebaseConfig` values provided
5. **Enable Required Services**:
   - **Authentication**: Enable **Google** as a Sign-in provider
   - **Firestore Database**: Create a database in **Production mode**
6. Paste the values into your `.env` file as shown in the Setup section

---

## 🔥 Firebase Firestore Structure

```
users/
  {userId}/
    habits/
      {habitId}/
        - id: string
        - name: string
        - logs: object { "YYYY-MM-DD": true }
        - createdAt: timestamp
        - updatedAt: timestamp
    journal/
      {date}/  # Format: YYYY-MM-DD
        - mood: string
        - gratitude: string
        - highlights: string
        - challenges: string
        - learning: string
        - goals: string
        - notes: string
        - updatedAt: timestamp
```

---

## 🛡️ Database Security Rules

To protect your data and ensure user isolation, use these Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
  }
}
```

**What this does:**
- ✅ Users can ONLY read their own data
- ✅ Users can ONLY write to their own data
- ✅ No cross-user access possible
- ✅ Enforced at database level

---

## 🚀 Deployment (Firebase Hosting)

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase Hosting
```bash
firebase init hosting
```

**Configuration:**
- Public directory: `dist`
- Single-page app: `Yes`
- Automatic builds with GitHub: `No` (optional)

### 4. Build and Deploy
```bash
npm run build
firebase deploy
```

Your app will be live at: `https://your-project-id.web.app`

---

## 🎨 Design System

### Color Palette
- **Primary**: `#4f46e5` (Indigo)
- **Primary Hover**: `#4338ca`
- **Background**: `#f8fafc` (Light Gray)
- **Card Background**: `#ffffff` (White)
- **Text Main**: `#1e293b` (Dark Slate)
- **Text Muted**: `#64748b` (Slate)
- **Border**: `#e2e8f0` (Light Border)

### Typography
- **Font Family**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto
- **Base Size**: 14px
- **Headings**: 700 weight, -0.02em letter spacing

### Components
- **Border Radius**: 12px (cards), 8px (buttons)
- **Shadows**: Subtle elevation with rgba(0, 0, 0, 0.1)
- **Transitions**: 0.2s ease for smooth animations
- **Min Touch Target**: 44px for mobile accessibility

---

## 📱 Mobile Optimization

- **Responsive Grid**: 2-column layout on mobile, expands on larger screens
- **Horizontal Scroll**: Habit table scrolls horizontally on small screens
- **Touch Gestures**: Optimized for swipe and tap interactions
- **Viewport Meta**: Properly configured for mobile devices
- **Performance**: Lazy loading and code splitting for fast load times

---

## 🔔 Notification Features

### Daily Reminders
- Notifications at 9 AM and 6 PM (if enabled)
- Only triggers if you haven't completed any habits

### Achievement Notifications
- **3-Day Streak**: "Keep up the great work!"
- **7-Day Streak**: "One week strong!"
- **14-Day Streak**: "Two weeks of consistency!"
- **30-Day Streak**: "One month milestone!"
- **All Completed**: Special celebration when you finish all habits

**Note**: Notifications require HTTPS (works on deployed app, not localhost)

---

## 🤝 Contributing

This is a private project for personal use. If you have access and want to contribute:

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Make your changes and test thoroughly
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Submit for review

---

## � License

This project is for personal use and backup. All rights reserved.

---

## 👥 Author

**Prathamesh Lonare**
- GitHub: [@prathameshlonare](https://github.com/prathameshlonare)

---

## 🙏 Acknowledgments

- Firebase for backend infrastructure and authentication
- Chart.js for beautiful data visualizations
- React community for excellent documentation and ecosystem
- Vite for lightning-fast development experience
- All contributors and testers who helped improve this app

---

## 📊 Project Stats

- **React Version**: 19
- **Build Tool**: Vite
- **Bundle Size**: Optimized for production
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Mobile Support**: iOS Safari, Chrome Android

---

**Built with ❤️ using React, Vite, and Firebase**

*Track habits. Build consistency. Reflect on growth.* 🚀
