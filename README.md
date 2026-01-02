# ✨ Habit Tracker Pro

A modern, minimal, and premium habit tracking application designed to help you build consistency and reflect on your growth. Built with **React 19**, **Vite**, and **Firebase**, this app features a sleek bento-grid layout, visual analytics, and a powerful daily journaling system.

---

## 🚀 Features

- **🎯 Habit Management**: Create, edit, and track daily habits with a simple check-in system.
- **📝 Daily Journaling**: Integrated journal with daily prompts and status tracking.
- **📊 Visual Analytics**: View your progress through dynamic charts and statistics (Weekly/Monthly views).
- **🔒 Secure Authentication**: Google Login integration with email whitelisting for private access.
- **📄 Export to PDF**: Generate and download beautiful summary reports of your habit and journal data.
- **📱 Fully Responsive**: Optimized for desktop, tablet, and mobile devices with a premium "Glassmorphism" UI.
- **🔔 Notifications**: Mobile-friendly browser notifications to keep you on track.

---

## 🛠️ Technology Stack

- **Frontend**: React.js 19, Vite
- **Backend/Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Google)
- **Charts**: Chart.js & React-Chartjs-2
- **PDF Generation**: jsPDF & html2canvas
- **Styling**: Vanilla CSS (Custom UI System)
- **Icons**: Lucide React

---

## 📂 File Structure

```text
habit-tracker/
├── src/
│   ├── assets/           # Static assets, images, and brand files
│   ├── components/       # Reusable UI components (Modals, ProtectRoute, etc.)
│   ├── contexts/         # Authentication and Global state (AuthContext)
│   ├── services/         # API and Database interaction logic
│   ├── App.jsx           # Main application logic & Routing
│   ├── App.css           # Global core styles & Design system
│   ├── firebase.js       # Firebase SDK initialization & Config
│   ├── exportPDF.js      # PDF report generation logic
│   └── main.jsx          # Application entry point
├── public/               # Public assets (icons, manifest.json, sw.js)
├── firebase.json         # Firebase Hosting configuration
└── .env                  # Environment variables (Secrets)
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

### 4. Run the Project
```bash
npm run dev
```

---

## 🔑 How to Get Firebase Credentials

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Click **"Add Project"** and follow the setup steps.
3.  Once the project is created, click the **Web icon (`</>`)** to register a new web app.
4.  Copy the `firebaseConfig` values provided.
5.  **Enable Services**:
    -   **Authentication**: Enable **Google** as a Sign-in provider.
    -   **Firestore Database**: Create a database in **Production mode** (and update rules to allow authenticated users).
6.  Paste the values into your `.env` file as shown in the Setup section.

---

## 🛡️ Database Security Rules (Quick Start)
To protect your data, use these basic Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 📜 License
This project is for personal use and backup. All rights reserved.
