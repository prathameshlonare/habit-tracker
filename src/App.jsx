import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import './Settings.css';
import './Toast.css';
import './OfflineIndicator.css';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, useParams, useNavigate, Navigate } from 'react-router-dom';
import { exportToPDF } from './exportPDF';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OfflineProvider, useOffline } from './contexts/OfflineContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import OfflineIndicator from './components/OfflineIndicator';
import DebugInfo from './components/DebugInfo';
import * as firestoreService from './services/firestoreService';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement, // Import BarElement
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2'; // Import Bar

// Register ChartJS Components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement, // Register BarElement
  Title,
  Tooltip,
  Legend
);

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const days = Array.from({ length: 31 }, (_, i) => i + 1);

const getDateKey = (day) => {
  const m = String(currentMonth).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${currentYear}-${m}-${d}`;
};

// --- DISPLAY HELPERS ---
const formatDisplayDate = (dateKey) => {
  if (!dateKey) return "";
  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;
  const [y, m, d] = parts;
  return `${d}-${m}-${y}`;
};

// --- TOAST NOTIFICATION HELPERS ---
let toastIdCounter = 0;
let addToastCallback = null;

const setToastCallback = (callback) => {
  addToastCallback = callback;
};

const showToast = (title, message, type = 'default') => {
  if (addToastCallback) {
    addToastCallback({
      id: ++toastIdCounter,
      title,
      message,
      type
    });
  }
};

// Expose for testing in browser console
if (typeof window !== 'undefined') {
  window.showToast = showToast;
}

// --- NOTIFICATION HELPERS ---
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return Notification.permission === 'granted';
};

const showNotification = (title, options = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });
  }
};

const checkAndNotifyAchievements = (habits, settings) => {
  if (!settings?.achievementNotifications) {
    return;
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Check if all habits completed today
  if (habits.length > 0) {
    const allCompleted = habits.every(habit => habit.logs[todayKey]);

    if (allCompleted) {
      const lastNotified = localStorage.getItem('lastAllCompletedNotification');

      if (lastNotified !== todayKey) {
        showToast('🎉 All Habits Completed!', 'Amazing work! You completed all your habits today!', 'achievement');
        localStorage.setItem('lastAllCompletedNotification', todayKey);
      }
    }
  }

  // Check for streaks
  habits.forEach(habit => {
    let currentStreak = 0;
    const sortedDates = Object.keys(habit.logs).sort().reverse();

    // Calculate current streak
    for (let i = 0; i < sortedDates.length; i++) {
      const date = new Date(sortedDates[i]);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      const dateKey = `${expectedDate.getFullYear()}-${String(expectedDate.getMonth() + 1).padStart(2, '0')}-${String(expectedDate.getDate()).padStart(2, '0')}`;

      if (sortedDates[i] === dateKey) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Notify on milestone streaks (3, 7, 14, 30 days)
    const milestones = [3, 7, 14, 30];
    if (milestones.includes(currentStreak)) {
      const lastStreakNotified = localStorage.getItem(`lastStreakNotification_${habit.id}`);
      if (lastStreakNotified !== `${currentStreak}`) {
        showNotification(`🔥 ${currentStreak}-Day Streak!`, {
          body: `Keep up the great work with "${habit.name}"!`,
          tag: `streak-${habit.id}`
        });
        localStorage.setItem(`lastStreakNotification_${habit.id}`, `${currentStreak}`);
      }
    }
  });
};

// --- COMPONENT: ANALYTICS PAGE (Full Features) ---
function AnalyticsPage({ habits }) {

  // A. Dynamic Date Setup
  const today = new Date();
  const currentActualYear = today.getFullYear();
  const currentActualMonth = today.getMonth() + 1;

  // --- 1. METRICS LOGIC (Preserved) ---
  const activeHabits = habits.length;
  const totalCompleted = habits.reduce((sum, habit) => sum + Object.keys(habit.logs).length, 0);
  const totalPossible = 30 * activeHabits;
  const avgCompletion = totalPossible === 0 ? 0 : Math.round((totalCompleted / totalPossible) * 100);

  let longestStreak = 0;
  habits.forEach(habit => {
    let currentStreak = 0;
    let maxHabitStreak = 0;
    const sortedDates = Object.keys(habit.logs).sort();
    if (sortedDates.length > 0) {
      // Using simpler generic streak logic for efficiency in this view
      // (Or keep the detailed loop if preferred)
      for (let d = 1; d <= 31; d++) {
        const m = String(currentActualMonth).padStart(2, '0');
        const dayStr = String(d).padStart(2, '0');
        const dateKey = `${currentActualYear}-${m}-${dayStr}`;
        if (habit.logs[dateKey]) currentStreak++;
        else {
          maxHabitStreak = Math.max(maxHabitStreak, currentStreak);
          currentStreak = 0;
        }
      }
      maxHabitStreak = Math.max(maxHabitStreak, currentStreak);
      longestStreak = Math.max(longestStreak, maxHabitStreak);
    }
  });

  const getBestMonth = () => {
    const monthCounts = {};
    habits.forEach(habit => {
      Object.keys(habit.logs).forEach(date => {
        const monthKey = date.slice(0, 7);
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      });
    });
    let bestMonthKey = "";
    let maxCount = 0;
    Object.entries(monthCounts).forEach(([key, count]) => {
      if (count > maxCount) {
        maxCount = count;
        bestMonthKey = key;
      }
    });
    if (!bestMonthKey) return "-";
    const [y, m] = bestMonthKey.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1);
    return dateObj.toLocaleString('default', { month: 'long' });
  };
  const bestMonth = getBestMonth();

  // --- 2. MONTHLY CHART LOGIC (Preserved) ---
  const getLast6Months = () => {
    const months = [];
    const dateCursor = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(dateCursor.getFullYear(), dateCursor.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      const daysInMonth = new Date(y, d.getMonth() + 1, 0).getDate();
      months.push({ key: `${y}-${m}`, label, daysInMonth });
    }
    return months;
  };
  const last6Months = getLast6Months();
  const barChartDataValues = last6Months.map((month) => {
    const totalPossible = month.daysInMonth * habits.length;
    if (totalPossible === 0) return 0;
    let actualCount = 0;
    habits.forEach(habit => {
      Object.keys(habit.logs).forEach(date => {
        if (date.startsWith(month.key)) actualCount++;
      });
    });
    return Math.round((actualCount / totalPossible) * 100);
  });
  const trendData = {
    labels: last6Months.map(m => m.label),
    datasets: [{
      label: 'Completion Rate',
      data: barChartDataValues,
      backgroundColor: '#4f46e5',
      borderRadius: 4,
      barThickness: 40,
    }],
  };
  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, max: 100, ticks: { stepSize: 20 }, grid: { color: '#f3f4f6', borderDash: [5, 5] }, border: { display: false } },
      x: { grid: { display: false }, border: { display: false } }
    },
    plugins: { legend: { display: false }, title: { display: true, text: 'Completion rates over time', align: 'start', color: '#6b7280', font: { size: 14, weight: 'normal' }, padding: { bottom: 20 } } }
  };

  // --- 3. TOP PERFORMING LOGIC (Preserved) ---
  const currentMonthKey = `${currentActualYear}-${String(currentActualMonth).padStart(2, '0')}`;
  const daysInCurrentMonth = new Date(currentActualYear, currentActualMonth, 0).getDate();

  const rankedHabits = habits.map(habit => {
    let count = 0;
    Object.keys(habit.logs).forEach(date => {
      if (date.startsWith(currentMonthKey)) count++;
    });
    const percentage = Math.round((count / daysInCurrentMonth) * 100);
    return { ...habit, percentage };
  })
    .sort((a, b) => b.percentage - a.percentage);

  // --- 4. NEW: DAILY ACTIVITY (Last 90 Days) ---
  const getLast90Days = () => {
    const dates = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const formatted = `${y}-${m}-${day}`;
      const label = formatDisplayDate(formatted);

      dates.push({ formatted, label });
    }
    return dates;
  };

  const last90Days = getLast90Days();

  const activityValues = last90Days.map(dateObj => {
    // Count total habits done on this specific date
    return habits.reduce((acc, habit) => {
      return acc + (habit.logs[dateObj.formatted] ? 1 : 0);
    }, 0);
  });

  const activityData = {
    labels: last90Days.map(d => d.label),
    datasets: [{
      label: 'Habits Completed',
      data: activityValues,
      borderColor: '#f59e0b', // Amber/Orange color
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 2,
      pointRadius: 0, // Clean line without dots
      pointHoverRadius: 4,
      fill: true,
      tension: 0.4, // Smooth curve
    }],
  };

  const activityOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
        grid: { color: '#f3f4f6' }
      },
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 10 } // Show fewer labels to avoid clutter
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Analytics</h1>

      {/* 1. Metrics Grid */}
      {/* 1. Metrics Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{activeHabits}</span>
            <span className="stat-title">Active Habits</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{avgCompletion}%</span>
            <span className="stat-title">Avg Rate</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{longestStreak} Days</span>
            <span className="stat-title">Longest Streak</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{bestMonth}</span>
            <span className="stat-title">Best Month</span>
          </div>
        </div>
      </div>

      {/* 2. Middle Grid: Monthly Chart + Top Habits */}
      <div className="analytics-bottom-grid">
        <div className="chart-container" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Monthly Progress Trend</h3>
          <div style={{ height: '300px', marginTop: '1rem' }}>
            <Bar options={trendOptions} data={trendData} />
          </div>
        </div>

        <div className="top-habits-card">
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 600 }}>Top Performing</h3>
          {rankedHabits.length > 0 ? (
            rankedHabits.map(habit => (
              <div key={habit.id} className="habit-rank-item">
                <div className="rank-header">
                  <span>{habit.name}</span>
                  <span>{habit.percentage}%</span>
                </div>
                <div className="rank-bar-bg">
                  <div className="rank-bar-fill" style={{ width: `${habit.percentage}%` }}></div>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#666' }}>No habits added yet.</p>
          )}
        </div>
      </div>

      {/* 3. Bottom: Daily Activity (90 Days) */}
      <div className="activity-section">
        <h3 className="activity-header">Daily Activity (Last 90 Days)</h3>
        <div style={{ height: '300px' }}>
          <Line options={activityOptions} data={activityData} />
        </div>
      </div>

    </div>
  );
}

// --- COMPONENT: OVERALL PROGRESS CARD (New) ---
const OverallProgressCard = ({ habits, viewYear, viewMonth }) => {
  // Get days in the viewing month
  const totalDays = new Date(viewYear, viewMonth, 0).getDate();
  const currentMonthKey = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;

  return (
    <div className="overall-progress-card">
      <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 600 }}>Overall Progress</h3>

      {habits.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No habits yet.</p>
      ) : (
        habits.map(habit => {
          // Calculate Progress for this Month
          let doneCount = 0;
          Object.keys(habit.logs).forEach(date => {
            if (date.startsWith(currentMonthKey)) doneCount++;
          });
          const percent = Math.round((doneCount / totalDays) * 100);

          return (
            <div key={habit.id} className="progress-item">
              <div className="progress-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ✏️ {habit.name}
                </span>
                <span>{percent}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${percent}%` }}></div>
              </div>
              <span className="progress-subtext">{doneCount} of {totalDays} days</span>
            </div>
          );
        })
      )}
    </div>
  );
};

// --- COMPONENT: STATS FOOTER (New) ---
const StatsFooter = ({ habits }) => {
  // Calculate Stats
  const activeHabits = habits.length;
  const totalCompleted = habits.reduce((sum, h) => sum + Object.keys(h.logs).length, 0);

  // Avg completion rate (Total Done / (Active * 30))
  const totalPossible = activeHabits * 31;
  const avgRate = totalPossible === 0 ? 0 : Math.round((totalCompleted / totalPossible) * 100);

  // Best Day
  const dayCounts = {};
  habits.forEach(h => {
    Object.keys(h.logs).forEach(date => {
      dayCounts[date] = (dayCounts[date] || 0) + 1;
    });
  });
  let bestDayCount = 0;
  Object.values(dayCounts).forEach(c => {
    if (c > bestDayCount) bestDayCount = c;
  });

  // Active Days (Unique days with at least 1 habit)
  const activeDays = Object.keys(dayCounts).length;

  return (
    <div className="stats-footer-grid">
      <div className="stat-card blue">
        <div className="stat-value">{totalCompleted}</div>
        <div className="stat-title">Total Completed</div>
      </div>
      <div className="stat-card green">
        <div className="stat-value">{avgRate}%</div>
        <div className="stat-title">Average Rate</div>
      </div>
      <div className="stat-card purple">
        <div className="stat-value">{bestDayCount}</div>
        <div className="stat-title">Best Day</div>
      </div>
      <div className="stat-card orange">
        <div className="stat-value">{activeDays}</div>
        <div className="stat-title">Active Days</div>
      </div>
    </div>
  );
};

// --- COMPONENT: HABITS PAGE (Refactored) ---
function HabitsPage({ habits, onToggle, onAdd }) {
  const { currentUser } = useAuth();
  const { isOnline } = useOffline();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");

  // Month navigation state
  const [viewDate, setViewDate] = useState(new Date());
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth() + 1; // 1-indexed

  // Get days in the current viewing month
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Helper to get date key for current viewing month
  const getViewDateKey = (day) => {
    const m = String(viewMonth).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${viewYear}-${m}-${d}`;
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 2, 1)); // -2 because viewMonth is 1-indexed
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth, 1)); // viewMonth is already 1-indexed
  };

  // Format month name
  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Chart Data (Same logic)
  const chartDataValues = daysArray.map((day) => {
    const dateKey = getViewDateKey(day);
    return habits.reduce((count, habit) => (count + (habit.logs[dateKey] ? 1 : 0)), 0);
  });

  const data = {
    labels: daysArray,
    datasets: [{
      label: 'Daily Progress',
      data: chartDataValues,
      borderColor: '#8b5cf6', // Purple to match theme
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 2,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { borderDash: [4, 4] } },
      x: { grid: { display: false } }
    },
  };

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [editHabitName, setEditHabitName] = useState('');

  const handleAddClick = () => {
    if (newHabitName.trim()) {
      onAdd(newHabitName.trim());
      setNewHabitName('');
      setIsModalOpen(false);
    }
  };

  const handleEditClick = (habit) => {
    setEditingHabit(habit);
    setEditHabitName(habit.name);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (editHabitName.trim() && editingHabit) {
      try {
        await firestoreService.updateHabitNameOffline(currentUser.uid, editingHabit.id, editHabitName.trim());
        setEditModalOpen(false);
        setEditingHabit(null);
      } catch (error) {
        if (error.message.includes('offline')) {
          showToast('Cannot Edit Habits Offline', 'Please connect to internet to edit habits', 'warning');
        } else {
          showToast('Error Updating Habit', error.message, 'error');
        }
      }
    }
  };

  const handleDeleteHabit = async () => {
    if (editingHabit && window.confirm(`Are you sure you want to delete "${editingHabit.name}"?`)) {
      await firestoreService.deleteHabitFromFirestore(currentUser.uid, editingHabit.id);
      setEditModalOpen(false);
      setEditingHabit(null);
    }
  };

  const handleCloseEdit = () => {
    setEditModalOpen(false);
    setEditingHabit(null);
    setEditHabitName('');
  };

  return (
    <>
      <div className="page-header">
        <h1>Habit Tracker</h1>
        <p className="page-subtitle">Track your daily habits and build consistency</p>
      </div>

      {/* TOP GRID: Table + Overall Progress */}
      <div className="dashboard-top-grid">

        {/* LEFT: Calendar Table Card */}
        <div className="card-container" style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>

          <div className="tracker-controls" style={{ padding: 0, boxShadow: 'none', border: 'none', marginBottom: '1.5rem' }}>
            <div className="month-selector" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                className="icon-btn"
                onClick={handlePrevMonth}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{monthName}</span>
              <button
                className="icon-btn"
                onClick={handleNextMonth}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
            <button 
              className="btn-add-habit" 
              onClick={() => setIsModalOpen(true)}
              disabled={!isOnline}
              title={isOnline ? "Add new habit" : "Cannot add habits while offline"}
            >
              {isOnline ? "+ Add Habit" : "📴 Offline"}
            </button>
          </div>

          <div className="table-wrapper">
            <table className="habit-table">
              <thead>
                <tr>
                  <th className="habit-col">Habit</th>
                  {daysArray.map((d) => <th key={d} className="day-col" style={{ minWidth: '30px', color: '#64748b' }}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {habits.length === 0 ? (
                  <tr>
                    <td colSpan={32} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                      Start by adding a new habit!
                    </td>
                  </tr>
                ) : (
                  habits.map(habit => (
                    <tr key={habit.id}>
                      <td
                        className={`habit-name-cell ${isOnline ? 'editable' : 'disabled'}`}
                        onClick={() => isOnline && handleEditClick(habit)}
                        style={{
                          cursor: isOnline ? 'pointer' : 'not-allowed',
                          fontWeight: 600,
                          color: isOnline ? '#1e293b' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          opacity: isOnline ? 1 : 0.7
                        }}
                        title={isOnline ? "Click to edit" : "Cannot edit habits while offline"}
                      >
                        <span>{isOnline ? '📝' : '🔒'}</span> {habit.name}
                      </td>
                      {daysArray.map((d) => {
                        const dateKey = getViewDateKey(d);
                        return (
                          <td key={d} className="day-col">
                            <input
                              type="checkbox"
                              className="habit-checkbox"
                              checked={!!habit.logs[dateKey]}
                              onChange={() => onToggle(habit.id, dateKey)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Overall Progress */}
        <OverallProgressCard habits={habits} viewYear={viewYear} viewMonth={viewMonth} />
      </div>

      {/* MIDDLE: Daily Progress Chart */}
      <div className="chart-section" style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📊 Daily Progress
        </h3>
        <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>Track how many habits you complete each day this month</p>
        <div style={{ height: '300px' }}>
          <Line options={options} data={data} />
        </div>
      </div>

      {/* BOTTOM: Stats Footer */}
      <StatsFooter habits={habits} />

      {/* ADD HABIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Add New Habit</h2>
            <input
              type="text"
              className="modal-input"
              placeholder="Ex: Read Book..."
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleAddClick()}
            />
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setIsModalOpen(false)}
                style={{
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569'
                }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleAddClick}
                disabled={!isOnline}
              >
                {isOnline ? "Add Habit" : "📴 Cannot Add Offline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT HABIT MODAL */}
      {editModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Edit Habit</h2>
              <button
                onClick={handleCloseEdit}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Make changes to your habit here.</p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Name</label>
              <input
                type="text"
                className="modal-input"
                value={editHabitName}
                onChange={(e) => setEditHabitName(e.target.value)}
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
              />
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                className="btn-secondary"
                onClick={handleDeleteHabit}
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderColor: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Delete
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn-secondary"
                  onClick={handleCloseEdit}
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#475569'
                  }}
                >
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSaveEdit}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// --- COMPONENT: SETTINGS PAGE ---
const Settings = ({ settings, onSettingsChange, habits }) => {
  const { currentUser } = useAuth();
  const [saveStatus, setSaveStatus] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(0);

  // Check notification permission status
  const [notificationPermission, setNotificationPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  const handleRequestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setSaveStatus('Notifications enabled! ✓');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    }
  };

  const handleToggle = (field) => {
    onSettingsChange({ ...settings, [field]: !settings[field] });
  };

  const handleChange = (field, value) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  const handleSave = () => {
    setSaveStatus('Changes saved! ✓');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleExport = () => {
    try {
      exportToPDF(habits, setSaveStatus);
    } catch (error) {
      console.error('Export error:', error);
      setSaveStatus('Export failed: ' + error.message);
    }
  };

  const handleDeleteAll = async () => {
    // Step 1: First click - show warning
    if (deleteConfirm === 0) {
      setDeleteConfirm(1);
      setTimeout(() => setDeleteConfirm(0), 5000);
      return;
    }

    // Step 2: Second click - ask for final confirmation
    if (deleteConfirm === 1) {
      setDeleteConfirm(2);
      setTimeout(() => setDeleteConfirm(0), 5000);
      return;
    }

    // Step 3: Third click - actually delete all data
    if (deleteConfirm === 2) {
      try {
        setSaveStatus('Deleting all data...');
        await firestoreService.deleteAllUserDataFromFirestore(currentUser.uid);
        setSaveStatus('All data deleted successfully! ✓');
        setDeleteConfirm(0);
        setTimeout(() => setSaveStatus(''), 3000);
      } catch (error) {
        console.error('Error deleting data:', error);
        setSaveStatus('Failed to delete data. Please try again.');
        setDeleteConfirm(0);
        setTimeout(() => setSaveStatus(''), 3000);
      }
    }
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1>Settings</h1>
        <p className="settings-subtitle">Manage your account and application preferences</p>
      </header>

      {/* 1. Profile Information */}
      <section className="settings-card">
        <h3 className="settings-section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Profile Information
        </h3>
        <span className="settings-section-subtitle">Your account information from Google</span>

        <div className="settings-grid">
          <div className="settings-group">
            <label className="settings-label">Full Name</label>
            <input
              type="text"
              className="settings-input"
              value={currentUser?.displayName || ''}
              readOnly
              style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
            />
          </div>
          <div className="settings-group">
            <label className="settings-label">Email Address</label>
            <input
              type="email"
              className="settings-input"
              value={currentUser?.email || ''}
              readOnly
              style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
            />
          </div>
        </div>
      </section>

      {/* 2. Notifications */}
      <section className="settings-card">
        <h3 className="settings-section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          Notifications
        </h3>
        <div className="toggle-list">
          <div className="toggle-row">
            <div className="toggle-info">
              <span className="toggle-label">Daily Reminders</span>
              <span className="toggle-hint">Get reminded to complete your habits</span>
            </div>
            <label className="switch">
              <input type="checkbox" checked={settings.dailyReminders} onChange={() => handleToggle('dailyReminders')} />
              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-row">
            <div className="toggle-info">
              <span className="toggle-label">Achievement Notifications</span>
              <span className="toggle-hint">Get notified about streaks and milestones</span>
            </div>
            <label className="switch">
              <input type="checkbox" checked={settings.achievementNotifications} onChange={() => handleToggle('achievementNotifications')} />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        {notificationPermission !== 'granted' && (
          <div className="notification-prompt" style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 600, color: '#d97706' }}>🔔 Enable Notifications</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Allow browser notifications for reminders</div>
            </div>
            <button className="btn-primary" onClick={handleRequestNotificationPermission}>Enable</button>
          </div>
        )}
      </section>

      {/* 3. Data Management */}
      <section className="settings-card">
        <h3 className="settings-section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Data Management
        </h3>

        {/* Export Data */}
        <div className="data-box">
          <div className="data-info">
            <h4>Export as PDF</h4>
            <p>Generate a report with all your habits and journal entries</p>
          </div>
          <button className="btn-secondary" onClick={handleExport}>Export PDF</button>
        </div>

        {/* Clear All Data */}
        <div className="data-box" style={{ marginTop: '1rem', borderColor: deleteConfirm > 0 ? '#fca5a5' : '#e5e7eb' }}>
          <div className="data-info">
            <h4 style={{ color: deleteConfirm > 0 ? '#dc2626' : 'inherit' }}>
              ⚠️ Clear All Data
            </h4>
            <p style={{ color: deleteConfirm > 0 ? '#dc2626' : '#64748b' }}>
              {deleteConfirm === 0 && 'Permanently delete all your habits and journal entries'}
              {deleteConfirm === 1 && 'Are you sure? This action cannot be undone!'}
              {deleteConfirm === 2 && 'Click one more time to confirm deletion'}
            </p>
          </div>
          <button
            className={deleteConfirm > 0 ? "btn-danger" : "btn-secondary"}
            onClick={handleDeleteAll}
            style={{
              backgroundColor: deleteConfirm > 0 ? '#dc2626' : undefined,
              color: deleteConfirm > 0 ? 'white' : undefined,
              borderColor: deleteConfirm > 0 ? '#dc2626' : undefined
            }}
          >
            {deleteConfirm === 0 && 'Clear All Data'}
            {deleteConfirm === 1 && 'Click Again to Confirm'}
            {deleteConfirm === 2 && 'Final Confirmation'}
          </button>
        </div>
      </section>

      <footer className="settings-footer">
        <button className="btn-primary" onClick={handleSave}>
          {saveStatus || 'Save Changes'}
        </button>
      </footer>
    </div>
  );
};

// --- COMPONENT: JOURNAL ENTRY (Polished) ---
const JournalEntry = ({ journalEntries, onSave }) => {
  const { date } = useParams();
  const navigate = useNavigate();
  const { isOnline } = useOffline();

  const defaultEntry = {
    mood: '', gratitude: '', highlights: '', challenges: '', learning: '', goals: '', notes: ''
  };

  const [entry, setEntry] = useState(defaultEntry);
  const [saveStatus, setSaveStatus] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // FIX: Data sync karnyasathi Effect
  useEffect(() => {
    if (journalEntries[date]) {
      setEntry(journalEntries[date]);
    } else {
      setEntry(defaultEntry);
    }
    // Ethun setSaveStatus('') kadhun takla ahe
  }, [date, journalEntries]);

  // FIX: New Effect - Fakt Date badalyavar status clear kar
  useEffect(() => {
    setSaveStatus('');
  }, [date]);

  const moodOptions = ['😊', '😐', '😔', '😡', '🤩', '😴'];

  const handleChange = (field, value) => {
    setEntry({ ...entry, [field]: value });
    // User ne type karayla suruvat keli tar status clear kar (Optional)
    if (saveStatus) setSaveStatus('');
  };

  const handleSave = async () => {
    try {
      await onSave(date, entry);
      setSaveStatus('Saved successfully! ✅');

      // Navigate back to calendar after a short delay so user can see the success message
      setTimeout(() => {
        navigate('/journal');
      }, 1500);
    } catch (error) {
      console.error("Failed to save entry:", error);
      setSaveStatus('Failed to save. Please try again.');
    }
  };

  const handleClear = () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      // Reset confirmation if user doesn't click again within 3s
      setTimeout(() => setShowClearConfirm(false), 3000);
      return;
    }

    setEntry(defaultEntry);
    setSaveStatus('Entry cleared');
    setShowClearConfirm(false);
    setTimeout(() => setSaveStatus(''), 2000);
  };

  return (
    <div className="journal-editor-container">
      <div className="editor-top-nav">
        <Link to="/journal" className="back-btn-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back to Journal
        </Link>
        <div className="entry-date-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          {formatDisplayDate(date)}
        </div>
      </div>

      <div className="editor-main-card">
        <header className="editor-header-section">
          <div className="header-text-group">
            <h1>Daily Reflection</h1>
            <p className="subtitle">Capture your thoughts and progress for today</p>
          </div>
          <div className="editor-actions">
            <button
              className={showClearConfirm ? "btn-danger" : "btn-secondary"}
              onClick={handleClear}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              {showClearConfirm ? 'Confirm?' : 'Clear'}
            </button>
            <button 
              className="btn-primary" 
              onClick={handleSave} 
              disabled={!isOnline}
              style={{ 
                minWidth: '140px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                justifyContent: 'center',
                opacity: isOnline ? 1 : 0.7
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              {saveStatus ? 'Saved! ✓' : (isOnline ? 'Save Entry' : '📴 Cannot Save Offline')}
            </button>
          </div>
        </header>

        <div className="editor-sections-grid">
          {/* Mood Section */}
          <section className="editor-section full-width">
            <h3 className="section-title">How are you feeling today?</h3>
            <div className="mood-selection-grid">
              {moodOptions.map((emoji) => (
                <button
                  key={emoji}
                  className={`mood-picker-item ${entry.mood === emoji ? 'active' : ''}`}
                  onClick={() => handleChange('mood', emoji)}
                >
                  <span className="mood-emoji">{emoji}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Reflections Group */}
          <div className="sections-column">
            <section className="editor-section">
              <h3 className="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: '#22c55e' }}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                Grateful for today
              </h3>
              <textarea
                className="modern-textarea"
                placeholder="What are you thankful for?"
                value={entry.gratitude}
                onChange={(e) => handleChange('gratitude', e.target.value)}
              />
            </section>

            <section className="editor-section">
              <h3 className="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: '#f59e0b' }}>
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                Today's Highlights
              </h3>
              <textarea
                className="modern-textarea"
                placeholder="List the best things that happened..."
                value={entry.highlights}
                onChange={(e) => handleChange('highlights', e.target.value)}
              />
            </section>
          </div>

          <div className="sections-column">
            <section className="editor-section">
              <h3 className="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: '#ef4444' }}>
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                Today's Challenges
              </h3>
              <textarea
                className="modern-textarea"
                placeholder="What was difficult or unexpected?"
                value={entry.challenges}
                onChange={(e) => handleChange('challenges', e.target.value)}
              />
            </section>

            <section className="editor-section">
              <h3 className="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: '#8b5cf6' }}>
                  <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path>
                  <path d="M8.5 8.5v.01"></path>
                  <path d="M16 15.5v.01"></path>
                  <path d="M12 12v.01"></path>
                  <path d="M11 17v.01"></path>
                  <path d="M7 14v.01"></path>
                </svg>
                Key Takeaways
              </h3>
              <textarea
                className="modern-textarea"
                placeholder="What did you learn today?"
                value={entry.learning}
                onChange={(e) => handleChange('learning', e.target.value)}
              />
            </section>
          </div>

          {/* Bottom Group */}
          <section className="editor-section">
            <h3 className="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: '#3b82f6' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
              Tomorrow's Focus
            </h3>
            <textarea
              className="modern-textarea"
              placeholder="What are your top 3 priorities for tomorrow?"
              value={entry.goals}
              onChange={(e) => handleChange('goals', e.target.value)}
            />
          </section>

          <section className="editor-section">
            <h3 className="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: '#64748b' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Random Musings
            </h3>
            <textarea
              className="modern-textarea"
              placeholder="Any other thoughts?"
              value={entry.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: JOURNAL CALENDAR (Functional) ---
const Journal = ({ journalEntries }) => {
  const navigate = useNavigate();
  const realToday = new Date();
  const [viewDate, setViewDate] = useState(new Date(realToday.getFullYear(), realToday.getMonth(), 1));


  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const currentMonthName = viewDate.toLocaleString('default', { month: 'short', year: 'numeric' });

  // Navigation Handlers
  const handlePrevMonth = () => setViewDate(new Date(viewYear, viewMonth - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewYear, viewMonth + 1, 1));
  const handleGoToToday = () => setViewDate(new Date(realToday.getFullYear(), realToday.getMonth(), 1));


  // Calculate Grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => null);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return { dayNum, dateKey };
  });

  const allCells = [...blanks, ...monthDays];
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  // Stats Logic (Simplified)
  const entriesCount = Object.keys(journalEntries).length;
  // Calculate This Month Count
  const currentMonthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const thisMonthCount = Object.keys(journalEntries).filter(date => date.startsWith(currentMonthKey)).length;

  // Calculate Streaks
  const calculateStreaks = () => {
    const dates = Object.keys(journalEntries).sort();
    if (dates.length === 0) return { current: 0, best: 0 };

    let best = 0;
    let current = 0;
    let tempStreak = 0;
    let lastDate = null;

    dates.forEach(dateStr => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const curr = new Date(y, m - 1, d);
      if (lastDate) {
        const diff = Math.round((curr - lastDate) / (1000 * 3600 * 24));
        if (diff === 1) tempStreak++;
        else {
          best = Math.max(best, tempStreak);
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      lastDate = curr;
    });
    best = Math.max(best, tempStreak);

    // Current streak (must include today or yesterday)
    current = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (journalEntries[todayKey] || journalEntries[yesterdayKey]) {
      let checkDate = journalEntries[todayKey] ? today : yesterday;
      while (true) {
        const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        if (journalEntries[key]) {
          current++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else break;
      }
    }

    return { current, best };
  };

  const { current: currentStreak, best: bestStreak } = calculateStreaks();

  const stats = [
    {
      label: "Total Entries",
      value: entriesCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      ),
      color: "#3b82f6"
    },
    {
      label: "Current Streak",
      value: `${currentStreak} days`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
        </svg>
      ),
      color: "#f59e0b"
    },
    {
      label: "Best Streak",
      value: `${bestStreak} days`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      ),
      color: "#a855f7"
    },
    {
      label: "This Month",
      value: thisMonthCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      ),
      color: "#22c55e"
    },
  ];

  return (
    <div className="journal-page">
      <div className="journal-page-header">
        <div className="journal-title-group">
          <h1>My Journal</h1>
          <p className="journal-subtitle">Reflect on your journey, one day at a time</p>
        </div>
        <button
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => {
            const todayKey = `${realToday.getFullYear()}-${String(realToday.getMonth() + 1).padStart(2, '0')}-${String(realToday.getDate()).padStart(2, '0')}`;
            navigate(`/journal/${todayKey}`);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Entry
        </button>
      </div>

      <div className="journal-stats-dashboard">
        {stats.map((stat, idx) => (
          <div key={idx} className="journal-stat-card">
            <div className="journal-stat-icon" style={{ color: stat.color }}>
              {stat.icon}
            </div>
            <div className="journal-stat-info">
              <span className="journal-stat-label">{stat.label}</span>
              <span className="journal-stat-value">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="view-controls-row">
        <div className="view-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          Calendar
        </div>
        <div className="calendar-nav">
          <button className="nav-arrow-btn" onClick={handlePrevMonth}>‹</button>
          <div className="nav-date-group">
            <button className="nav-today-btn" onClick={handleGoToToday}>Today</button>
            <span className="nav-month-year">{currentMonthName}</span>
          </div>
          <button className="nav-arrow-btn" onClick={handleNextMonth}>›</button>
        </div>
      </div>

      <div className="calendar-container">
        <div className="weekday-header">
          {weekdays.map(w => <div key={w} className="weekday-label">{w}</div>)}
        </div>

        <div className="calendar-grid">
          {allCells.map((item, idx) => {
            if (!item) return <div key={`empty-${idx}`} className="day-cell empty"></div>;

            const cellDate = new Date(viewYear, viewMonth, item.dayNum);
            cellDate.setHours(0, 0, 0, 0);

            const compToday = new Date();
            compToday.setHours(0, 0, 0, 0);

            const isToday = cellDate.getTime() === compToday.getTime();
            const isFuture = cellDate > compToday;
            const isPast = cellDate < compToday;
            const hasEntry = !!journalEntries[item.dateKey];

            let cellClass = "day-cell";
            if (isToday) cellClass += " today";
            else if (isFuture) cellClass += " disabled";
            else if (isPast) cellClass += " past";
            if (hasEntry) cellClass += " has-entry";

            const entry = journalEntries[item.dateKey];
            const Content = (
              <>
                <span className="day-number">{item.dayNum}</span>
                {entry && (
                  <div className="day-entry-preview">
                    {entry.mood && <span className="day-mood">{entry.mood}</span>}
                    <div className="day-entry-text">
                      {entry.highlights || entry.gratitude || entry.notes || "Entry recorded"}
                    </div>
                  </div>
                )}
              </>
            );

            if (isFuture) {
              return <div key={item.dayNum} className={cellClass}>{Content}</div>;
            }

            return (
              <Link to={`/journal/${item.dateKey}`} key={item.dayNum} className={cellClass}>
                {Content}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};


// ... (Settings & AnalyticsPage & HabitsPage Components remain SAME) ...

// --- TOAST COMPONENT ---
const ToastContainer = ({ toasts, onRemove }) => {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'achievement' && '🎉'}
            {toast.type === 'streak' && '🔥'}
            {toast.type === 'success' && '✓'}
            {toast.type === 'default' && '📝'}
          </div>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button className="toast-close" onClick={() => onRemove(toast.id)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const AppWrapper = () => {
  return (
    <AuthProvider>
      <OfflineProvider>
        <Router>
          <App />
        </Router>
      </OfflineProvider>
    </AuthProvider>
  );
};

function App() {
  const { currentUser, logout, loading: authLoading } = useAuth();

  // State for toasts
  const [toasts, setToasts] = useState([]);

  // State for data
  const [habits, setHabits] = useState([]);
  const [journalEntries, setJournalEntries] = useState({});
  const [settings, setSettings] = useState(() => {
    // Settings are now user-scoped to prevent data leakage between users
    const settingsKey = currentUser ? `habitTrackerSettings_${currentUser.uid}` : 'habitTrackerSettings_temp';
    const saved = localStorage.getItem(settingsKey);
    return saved ? JSON.parse(saved) : {
      dailyReminders: true,
      weeklyReport: true,
      achievementNotifications: true,
      startOfWeek: 'Monday',
      timezone: 'IST',
      theme: 'Light'
    };
  });

  // Account popup and modal states
  const [isAccountPopupOpen, setIsAccountPopupOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const accountPopupRef = useRef(null);

  // Email management states
  const [additionalEmails, setAdditionalEmails] = useState([]);
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  // 1. Listen for Firestore Data
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to Habits
    const unsubscribeHabits = firestoreService.subscribeToHabits(currentUser.uid, (data) => {
      console.log('📥 Received habits from Firebase:', data.length);
      
      // One-time migration from localStorage (only if user has no data in Firestore)
      if (data.length === 0) {
        const localHabits = JSON.parse(localStorage.getItem('habits') || '[]');
        if (localHabits.length > 0) {
          firestoreService.migrateHabitsToFirestore(currentUser.uid, localHabits);
          // Clear localStorage after migration to prevent data leakage
          localStorage.removeItem('habits');
        }
      }
      
      // Cache data locally for offline access
      firestoreService.cacheHabitsLocally(currentUser.uid, data);
      
      // BUT: Don't overwrite UI if user has made offline changes
      const cachedHabits = firestoreService.getCachedHabits(currentUser.uid);
      if (cachedHabits.length > 0) {
        // Merge Firebase data with local cache (local takes priority)
        setHabits(cachedHabits);
      } else {
        setHabits(data);
      }
    });

    // Subscribe to Journal
    const unsubscribeJournal = firestoreService.subscribeToJournal(currentUser.uid, (data) => {
      // One-time migration from localStorage (only if user has no data in Firestore)
      if (Object.keys(data).length === 0) {
        const localJournal = JSON.parse(localStorage.getItem('journalEntries') || '{}');
        if (Object.keys(localJournal).length > 0) {
          firestoreService.migrateJournalToFirestore(currentUser.uid, localJournal);
          // Clear localStorage after migration to prevent data leakage
          localStorage.removeItem('journalEntries');
        }
      }
      
      // Cache data locally for offline access
      firestoreService.cacheJournalLocally(currentUser.uid, data);
      setJournalEntries(data);
    });

    return () => {
      unsubscribeHabits();
      unsubscribeJournal();
    };
  }, [currentUser]);

  // Offline data fallback - more aggressive loading
  useEffect(() => {
    if (!currentUser) return;
    
    // Always try to load from cache if offline or no data
    const loadFromCache = () => {
      const cachedHabits = firestoreService.getCachedHabits(currentUser.uid);
      const cachedJournal = firestoreService.getCachedJournal(currentUser.uid);
      
      console.log('📦 Loading from cache:', {
        cachedHabits: cachedHabits.length,
        cachedJournal: Object.keys(cachedJournal).length
      });
      
      if (cachedHabits.length > 0) {
        setHabits(cachedHabits);
      }
      
      if (Object.keys(cachedJournal).length > 0) {
        setJournalEntries(cachedJournal);
      }
    };
    
    // Load from cache immediately if offline
    if (!navigator.onLine) {
      loadFromCache();
    }
    // Also load if no data is currently loaded
    else if (habits.length === 0 || Object.keys(journalEntries).length === 0) {
      loadFromCache();
    }
  }, [currentUser, habits.length, Object.keys(journalEntries).length]);

  // Auto-sync when coming online
  useEffect(() => {
    if (!currentUser) return;
    
    const handleOnline = async () => {
      console.log('🌐 Back online - checking for queued actions');
      // Give a small delay to ensure Firebase is ready
      setTimeout(() => {
        const { syncNow } = require('./contexts/OfflineContext');
        if (syncNow && offlineService.getQueueLength() > 0) {
          syncNow();
        }
      }, 1000);
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [currentUser]);

  // Toast callback setup
  useEffect(() => {
    setToastCallback((toast) => {
      setToasts((prev) => [...prev, toast]);
    });
  }, []);

  // Click outside handler for account popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountPopupRef.current && !accountPopupRef.current.contains(event.target)) {
        setIsAccountPopupOpen(false);
      }
    };

    if (isAccountPopupOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAccountPopupOpen]);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Persistence Effect for Settings (user-scoped)
  useEffect(() => {
    if (!currentUser) return;
    const settingsKey = `habitTrackerSettings_${currentUser.uid}`;
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, [settings, currentUser]);

  // Clear user-specific data on logout
  useEffect(() => {
    if (!currentUser) {
      // User logged out - clear all data to prevent leakage
      setHabits([]);
      setJournalEntries({});
    }
  }, [currentUser]);

  // Notification Effects
  useEffect(() => {
    // Request permission if any notification is enabled
    if (settings.dailyReminders || settings.achievementNotifications || settings.weeklyReports) {
      requestNotificationPermission();
    }

    // Daily reminder check (runs every hour)
    if (settings.dailyReminders) {
      const checkDailyReminder = () => {
        const now = new Date();
        const hour = now.getHours();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const lastReminder = localStorage.getItem('lastDailyReminder');

        // Send reminder at 9 AM or 6 PM if not sent today
        if ((hour === 9 || hour === 18) && lastReminder !== today) {
          const hasCompletedAny = habits.some(habit => habit.logs[today]);
          if (!hasCompletedAny && habits.length > 0) {
            showNotification('📝 Habit Reminder', {
              body: "Don't forget to track your habits today!",
              tag: 'daily-reminder'
            });
            localStorage.setItem('lastDailyReminder', today);
          }
        }
      };

      // Check immediately and then every hour
      checkDailyReminder();
      const interval = setInterval(checkDailyReminder, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [habits, settings]);

  // Handlers
  const toggleHabit = async (habitId, dateKey) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const newLogs = { ...habit.logs };
    const completed = !newLogs[dateKey];

    // If currently checked, delete the entry; if unchecked, set to true
    if (newLogs[dateKey]) {
      delete newLogs[dateKey]; // Remove the key entirely when unchecking
    } else {
      newLogs[dateKey] = true; // Add the key when checking
    }

    // Use offline-enabled function (this handles both online/offline)
    await firestoreService.toggleHabitOffline(currentUser.uid, habitId, dateKey, completed);

    // Update local state immediately for UI responsiveness
    const updatedHabits = habits.map(h => h.id === habitId ? { ...h, logs: newLogs } : h);
    setHabits(updatedHabits);

    // Achievement checks (only when checking, not unchecking)
    if (newLogs[dateKey]) {
      checkAndNotifyAchievements(updatedHabits, settings);
    }
  };

  const addHabit = async (name) => {
    try {
      const newHabit = {
        id: Date.now().toString(),
        name,
        logs: {}
      };
      
      // Use offline-enabled function
      await firestoreService.addHabitOffline(currentUser.uid, newHabit);
      
      // Update local state immediately
      setHabits([...habits, newHabit]);
    } catch (error) {
      if (error.message.includes('offline')) {
        showToast('Cannot Add Habits Offline', 'Please connect to internet to add new habits', 'warning');
      } else {
        showToast('Error Adding Habit', error.message, 'error');
      }
    }
  };

  // Save Journal Entry Handler
  const saveJournalEntry = async (date, data) => {
    try {
      // Use offline-enabled function
      await firestoreService.saveJournalEntryOffline(currentUser.uid, date, data);
      
      // Update local state immediately
      setJournalEntries(prev => ({
        ...prev,
        [date]: data
      }));
    } catch (error) {
      if (error.message.includes('offline')) {
        showToast('Cannot Save Journal Offline', 'Please connect to internet to save journal entries', 'warning');
      } else {
        showToast('Error Saving Entry', error.message, 'error');
      }
    }
  };

  // Email management handlers
  const handleAddEmail = () => {
    if (newEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setAdditionalEmails([...additionalEmails, { email: newEmail, verified: false }]);
      setNewEmail('');
      setIsAddingEmail(false);
    }
  };

  const handleRemoveEmail = (emailToRemove) => {
    setAdditionalEmails(additionalEmails.filter(e => e.email !== emailToRemove));
  };

  const handleCancelAddEmail = () => {
    setNewEmail('');
    setIsAddingEmail(false);
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <OfflineIndicator />
      {process.env.NODE_ENV === 'development' && <DebugInfo userId={currentUser?.uid} habits={habits} journalEntries={journalEntries} />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="app-container">
                <nav className="navbar">
                  <div className="navbar-inner">
                    <div className="logo">
                      <div className="logo-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      HabitTracker
                    </div>
                    <div className="nav-links">
                      <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                        <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <path d="M9 11l3 3L22 4"></path>
                        </svg>
                        Habits
                      </NavLink>
                      <NavLink to="/journal" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                        <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                        Journal
                      </NavLink>
                      <NavLink to="/analytics" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                        <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="20" x2="18" y2="10"></line>
                          <line x1="12" y1="20" x2="12" y2="4"></line>
                          <line x1="6" y1="20" x2="6" y2="14"></line>
                        </svg>
                        Analytics
                      </NavLink>
                      <NavLink to="/settings" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                        <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        Settings
                      </NavLink>
                    </div>
                    <div className="user-profile" ref={accountPopupRef}>
                      <div
                        className="user-profile-trigger"
                        onClick={() => setIsAccountPopupOpen(!isAccountPopupOpen)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', position: 'relative' }}
                      >
                        <div style={{ textAlign: 'right', fontSize: '0.9rem' }}>
                          <span style={{ color: '#64748b' }}>Welcome, </span>
                          <span style={{ fontWeight: 600 }}>{currentUser?.displayName?.split(' ')?.[0] || 'User'}</span>
                        </div>
                        {currentUser?.photoURL ? (
                          <img src={currentUser.photoURL} alt="avatar" className="user-avatar" />
                        ) : (
                          <div className="user-avatar" style={{ fontWeight: 600, color: '#64748b', fontSize: '1rem' }}>
                            {currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'U'}
                          </div>
                        )}
                      </div>

                      {/* Account Dropdown Popup */}
                      {isAccountPopupOpen && (
                        <div className="account-popup">
                          <div className="account-popup-header">
                            {currentUser?.photoURL ? (
                              <img src={currentUser.photoURL} alt="avatar" className="account-popup-avatar" />
                            ) : (
                              <div className="account-popup-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', fontWeight: 600, color: '#64748b' }}>
                                {currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'U'}
                              </div>
                            )}
                            <div className="account-popup-info">
                              <div className="account-popup-name">{currentUser?.displayName || 'User'}</div>
                              <div className="account-popup-email">{currentUser?.email}</div>
                            </div>
                          </div>
                          <div className="account-popup-divider"></div>
                          <button
                            className="account-popup-item"
                            onClick={() => {
                              setIsAccountPopupOpen(false);
                              setIsAccountModalOpen(true);
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="3"></circle>
                              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                            Manage account
                          </button>
                          <button
                            className="account-popup-item"
                            onClick={() => {
                              setIsAccountPopupOpen(false);
                              logout();
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                              <polyline points="16 17 21 12 16 7"></polyline>
                              <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Sign out
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </nav>

                <main className="main-content">
                  <div className="content-wrapper">
                    <Routes>
                      <Route path="/" element={<HabitsPage habits={habits} onToggle={toggleHabit} onAdd={addHabit} />} />
                      <Route path="/journal" element={<Journal journalEntries={journalEntries} />} />
                      <Route
                        path="/journal/:date"
                        element={<JournalEntry journalEntries={journalEntries} onSave={saveJournalEntry} />}
                      />
                      <Route path="/analytics" element={<AnalyticsPage habits={habits} />} />
                      <Route path="/settings" element={<Settings settings={settings} onSettingsChange={setSettings} habits={habits} />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* Account Settings Modal */}
      {isAccountModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAccountModalOpen(false)}>
          <div className="account-modal" onClick={(e) => e.stopPropagation()}>

            <div className="account-modal-content">
              <button className="account-modal-close" onClick={() => setIsAccountModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <div className="account-modal-header">
                <h3>Profile details</h3>
              </div>

              <div className="account-modal-section">
                <div className="account-modal-profile-header">
                  <div className="account-modal-profile-avatar">
                    {currentUser?.photoURL ? (
                      <img src={currentUser.photoURL} alt="avatar" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', fontWeight: 600, color: '#64748b', fontSize: '1.5rem', borderRadius: '50%' }}>
                        {currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="account-modal-profile-info">
                    <h4>{currentUser?.displayName || 'User'}</h4>
                  </div>
                </div>
              </div>

              <div className="account-modal-section">
                <h4 className="account-modal-section-title">Email addresses</h4>

                {/* Primary Email */}
                <div className="account-modal-email-item">
                  <div className="account-modal-email-info">
                    <div className="account-modal-email-address">{currentUser?.email}</div>
                    <span className="account-modal-badge">Primary</span>
                  </div>
                  <button className="account-modal-menu-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="12" cy="5" r="1"></circle>
                      <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                  </button>
                </div>

                {/* Additional Emails */}
                {additionalEmails.map((emailObj, index) => (
                  <div key={index} className="account-modal-email-item">
                    <div className="account-modal-email-info">
                      <div className="account-modal-email-address">{emailObj.email}</div>
                      {!emailObj.verified && (
                        <span className="account-modal-badge-unverified">Unverified</span>
                      )}
                    </div>
                    <button
                      className="account-modal-menu-btn"
                      onClick={() => handleRemoveEmail(emailObj.email)}
                      title="Remove email"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Add Email Form */}
                {isAddingEmail ? (
                  <div className="account-modal-add-email-form">
                    <input
                      type="email"
                      className="account-modal-email-input"
                      placeholder="Enter email address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                      autoFocus
                    />
                    <div className="account-modal-form-actions">
                      <button
                        className="account-modal-form-btn cancel"
                        onClick={handleCancelAddEmail}
                      >
                        Cancel
                      </button>
                      <button
                        className="account-modal-form-btn save"
                        onClick={handleAddEmail}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="account-modal-add-btn"
                    onClick={() => setIsAddingEmail(true)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add email address
                  </button>
                )}
              </div>

              <div className="account-modal-section">
                <h4 className="account-modal-section-title">Connected accounts</h4>
                <div className="account-modal-connected-item">
                  <div className="account-modal-connected-info">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <div>
                      <div className="account-modal-connected-name">Google</div>
                      <div className="account-modal-connected-email">{currentUser?.email}</div>
                    </div>
                  </div>
                  <button className="account-modal-menu-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="12" cy="5" r="1"></circle>
                      <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AppWrapper;
