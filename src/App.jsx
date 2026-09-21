import React, { useState, useEffect, useRef, useMemo } from 'react';
import './styles/App.css';
import './styles/Settings.css';
import './styles/Toast.css';
import MobileBottomNav from './components/MobileBottomNav';
import MobileDailyView from './components/MobileDailyView';
import JournalCalendar from './components/JournalCalendar';
import { useIsMobile } from './hooks/useIsMobile';

import { HashRouter as Router, Routes, Route, Link, NavLink, useParams, useNavigate, Navigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { exportToPDF } from './services/exportPDF';
import * as dbService from './services/dbService';
import * as reminders from './services/reminders';
import * as backHandler from './services/backHandler';
import { Capacitor } from '@capacitor/core';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register ChartJS Components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

// --- SHARED SVG ICONS (hoisted outside components) ---
const EditIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
);
const TrendIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
);
const BoltIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
);
const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);

const pageVariants = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 } },
  exit: { opacity: 0, y: -16, scale: 0.98, transition: { duration: 0.2, ease: 'easeIn' } }
};

const mobilePageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 28, mass: 0.8 }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15, ease: 'easeIn' }
  }
};

const statsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const statsCardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 350, damping: 25 }
  }
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  }
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

const showToast = (title, message, type = 'default', options = {}) => {
  if (addToastCallback) {
    addToastCallback({
      id: ++toastIdCounter,
      title,
      message,
      type,
      action: options.action,
      group: options.group,
      durationMs: options.durationMs,
    });
  }
};


// --- NOTIFICATION HELPERS ---
const requestNotificationPermission = async () => {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return Notification.permission === 'granted';
    }
  } catch (err) {
    console.warn('Notification permission error:', err);
  }
  return false;
};

const showNotification = (title, options = {}) => {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification && Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    }
  } catch (err) {
    console.warn('Notification error:', err);
  }
};

const checkAndNotifyAchievements = (habits, settings, dateKey) => {
  if (!settings?.achievementNotifications) {
    return;
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Only show "All Habits Completed" notification if completing TODAY's habits.
  // Web gets the in-app toast; native gets the system notification instead.
  if (dateKey === todayKey && habits.length > 0) {
    const allCompleted = habits.every(habit => habit.logs[todayKey]);

    if (allCompleted) {
      if (Capacitor.isNativePlatform()) {
        void reminders.notifyAchievement(
          'All habits completed!',
          'Amazing work! You completed all your habits today!',
          settings
        );
      } else {
        showToast('All habits completed!', 'Amazing work! You completed all your habits today!', 'achievement');
      }
    }
  }

  // Check for streaks (only for today's completion)
  if (dateKey === todayKey) {
    habits.forEach(habit => {
      let currentStreak = 0;
      const sortedDates = Object.keys(habit.logs).sort().reverse();

      // Calculate current streak
      for (let i = 0; i < sortedDates.length; i++) {

        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);

        const checkDateKey = `${expectedDate.getFullYear()}-${String(expectedDate.getMonth() + 1).padStart(2, '0')}-${String(expectedDate.getDate()).padStart(2, '0')}`;

        if (sortedDates[i] === checkDateKey) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Notify on milestone streaks (3, 7, 14, 30 days)
      const milestones = [3, 7, 14, 30];
      if (milestones.includes(currentStreak)) {
        void reminders.notifyAchievement(
          `${currentStreak}-Day Streak!`,
          `Keep up the great work with "${habit.name}"!`,
          settings
        );
      }
    });
  }
};

// --- COMPONENT: ANALYTICS PAGE (Full Features) ---
function AnalyticsPage({ habits }) {
  const isMobile = useIsMobile();
  const [showAllHabits, setShowAllHabits] = useState(false);

  // // A. Dynamic Date Setup
  // const today = new Date();
  // const currentActualYear = today.getFullYear();
  // const currentActualMonth = today.getMonth() + 1;

  // --- 1. METRICS LOGIC (Preserved) ---
  const activeHabits = habits.length;
  const totalCompleted = habits.reduce((sum, habit) => sum + Object.keys(habit.logs).length, 0);

  // Calculate current month days for accurate progress
  const today = new Date();
  const currentActualYear = today.getFullYear();
  const currentActualMonth = today.getMonth() + 1;
  const daysInCurrentMonth = new Date(currentActualYear, currentActualMonth, 0).getDate();

  const totalPossible = daysInCurrentMonth * activeHabits;
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

  // Phone variant: 2 hero numbers + one short chart + top 3 with expander.
  // Desktop keeps the full 4 cards, both charts, and the full ranked list.
  if (isMobile) {
    const t = new Date();
    const tKey = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    const doneToday = habits.filter((h) => h.logs && h.logs[tKey]).length;
    const todayRate = habits.length > 0 ? Math.round((doneToday / habits.length) * 100) : 0;
    const mobileLabels = last90Days.slice(-30).map((d) => d.label);
    const mobileActivity = {
      labels: mobileLabels,
      datasets: [{ ...activityData.datasets[0], data: activityValues.slice(-30) }],
    };
    const visibleHabits = showAllHabits ? rankedHabits : rankedHabits.slice(0, 3);

    return (
      <Motion.div
        variants={mobilePageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <h1 style={{ marginBottom: '1.5rem' }}>Analytics</h1>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper green">
              <TrendIcon />
            </div>
            <div className="stat-info">
              <span className="stat-value">{todayRate}%</span>
              <span className="stat-title">Today</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper orange">
              <BoltIcon />
            </div>
            <div className="stat-info">
              <span className="stat-value">{longestStreak} Days</span>
              <span className="stat-title">Best Streak</span>
            </div>
          </div>
        </div>

        <div className="activity-section">
          <h3 className="activity-header">Last 30 Days</h3>
          <div style={{ height: '220px' }}>
            <Line options={activityOptions} data={mobileActivity} />
          </div>
        </div>

        <div className="top-habits-card" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 600 }}>Top Performing</h3>
          {rankedHabits.length > 0 ? (
            <>
              {visibleHabits.map(habit => (
                <div key={habit.id} className="habit-rank-item">
                  <div className="rank-header">
                    <span>{habit.name}</span>
                    <span>{habit.percentage}%</span>
                  </div>
                  <div className="rank-bar-bg">
                    <Motion.div
                      className="rank-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${habit.percentage}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                    />
                  </div>
                </div>
              ))}
              {rankedHabits.length > 3 && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                  onClick={() => setShowAllHabits((v) => !v)}
                >
                  {showAllHabits ? 'Show less' : `Show all ${rankedHabits.length}`}
                </button>
              )}
            </>
          ) : (
            <p style={{ color: '#666' }}>No habits added yet.</p>
          )}
        </div>
      </Motion.div>
    );
  }

  return (
    <Motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <h1 style={{ marginBottom: '1.5rem' }}>Analytics</h1>

      {/* 1. Metrics Grid */}
      {/* 1. Metrics Grid */}
      <Motion.div
        className="stats-grid"
        variants={statsContainerVariants}
        initial="hidden"
        animate="visible"
      >
        <Motion.div className="stat-card" variants={statsCardVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
          <div className="stat-icon-wrapper blue">
            <EditIcon />
          </div>
          <div className="stat-info">
            <span className="stat-value">{activeHabits}</span>
            <span className="stat-title">Active Habits</span>
          </div>
        </Motion.div>
        <Motion.div className="stat-card" variants={statsCardVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
          <div className="stat-icon-wrapper green">
            <TrendIcon />
          </div>
          <div className="stat-info">
            <span className="stat-value">{avgCompletion}%</span>
            <span className="stat-title">Avg Rate</span>
          </div>
        </Motion.div>
        <Motion.div className="stat-card" variants={statsCardVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
          <div className="stat-icon-wrapper orange">
            <BoltIcon />
          </div>
          <div className="stat-info">
            <span className="stat-value">{longestStreak} Days</span>
            <span className="stat-title">Longest Streak</span>
          </div>
        </Motion.div>
        <Motion.div className="stat-card" variants={statsCardVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
          <div className="stat-icon-wrapper purple">
            <CalendarIcon />
          </div>
          <div className="stat-info">
            <span className="stat-value">{bestMonth}</span>
            <span className="stat-title">Best Month</span>
          </div>
        </Motion.div>
      </Motion.div>

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
                  <Motion.div
                    className="rank-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${habit.percentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                  />
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

    </Motion.div>
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
          // Only count logs that exist AND match the current month
          if (habit.logs && typeof habit.logs === 'object') {
            Object.keys(habit.logs).forEach(date => {
              if (date.startsWith(currentMonthKey) && habit.logs[date]) {
                doneCount++;
              }
            });
          }
          const percent = totalDays > 0 ? Math.round((doneCount / totalDays) * 100) : 0;

          return (
            <div key={habit.id} className="progress-item">
              <div className="progress-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ✏️ {habit.name}
                </span>
                <span>{percent}%</span>
              </div>
              <div className="progress-track">
                <Motion.div
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
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
    <Motion.div
      className="stats-footer-grid"
      variants={statsContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <Motion.div className="stat-card blue" variants={statsCardVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
        <div className="stat-value">{totalCompleted}</div>
        <div className="stat-title">Total Completed</div>
      </Motion.div>
      <Motion.div className="stat-card green" variants={statsCardVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
        <div className="stat-value">{avgRate}%</div>
        <div className="stat-title">Average Rate</div>
      </Motion.div>
      <Motion.div className="stat-card purple" variants={statsCardVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
        <div className="stat-value">{bestDayCount}</div>
        <div className="stat-title">Best Day</div>
      </Motion.div>
      <Motion.div className="stat-card orange" variants={statsCardVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
        <div className="stat-value">{activeDays}</div>
        <div className="stat-title">Active Days</div>
      </Motion.div>
    </Motion.div>
  );
};

// --- COMPONENT: HABITS PAGE (Refactored) ---
function HabitsPage({ habits, onToggle, onAdd }) {
  const isMobile = useIsMobile();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  // Phone sheets swipe down to dismiss; desktop keeps the centered dialog.
  const sheetDrag = (onClose) =>
    isMobile
      ? {
          drag: 'y',
          dragConstraints: { top: 0, bottom: 0 },
          dragElastic: { top: 0, bottom: 0.6 },
          onDragEnd: (_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 500) onClose();
          },
        }
      : {};

  // Pass 5: system back button closes sheets first. Opening a sheet arms one
  // history entry; popping it closes the sheet instead of navigating. Closing
  // any other way (button, swipe, save) consumes the entry via history.back()
  // so no dead entry is left behind. Covers every close path with no
  // call-site changes. (Effects live below the edit-modal state they read.)

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

  // Back-button effects (placed after the state they read — the dep arrays
  // evaluate during render, so they must not sit above these declarations).
  // Web keeps the history-entry trick; native uses the central sheet registry
  // owned by the Capacitor backButton listener (gesture back included).
  const sheetEntryPushed = useRef(false);
  const closedByPop = useRef(false);
  const isNativeSheet = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isNativeSheet) return;
    const anyOpen = isModalOpen || editModalOpen;
    if (anyOpen && !sheetEntryPushed.current) {
      sheetEntryPushed.current = true;
      window.history.pushState({ habitSheet: true }, '');
    } else if (!anyOpen && sheetEntryPushed.current && !closedByPop.current) {
      sheetEntryPushed.current = false;
      window.history.back();
    }
    closedByPop.current = false;
  }, [isModalOpen, editModalOpen, isNativeSheet]);

  useEffect(() => {
    if (isNativeSheet) return;
    const onPop = () => {
      if (!sheetEntryPushed.current) return;
      if (isModalOpen || editModalOpen) {
        closedByPop.current = true;
        sheetEntryPushed.current = false;
        setIsModalOpen(false);
        setEditModalOpen(false);
        setEditingHabit(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [isModalOpen, editModalOpen, isNativeSheet]);

  useEffect(() => {
    if (!isNativeSheet) return;
    if (editModalOpen) {
      backHandler.pushSheet('edit-habit', () => {
        setEditModalOpen(false);
        setEditingHabit(null);
      });
    } else {
      backHandler.removeSheet('edit-habit');
    }
    if (isModalOpen && !editModalOpen) {
      backHandler.pushSheet('add-habit', () => setIsModalOpen(false));
    } else {
      backHandler.removeSheet('add-habit');
    }
    return () => {
      backHandler.removeSheet('edit-habit');
      backHandler.removeSheet('add-habit');
    };
  }, [isModalOpen, editModalOpen, isNativeSheet]);

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
      await dbService.updateHabitNameInFirestore(null, editingHabit.id, editHabitName.trim());
      setEditModalOpen(false);
      setEditingHabit(null);
    }
  };

  const handleDeleteHabit = async () => {
    if (editingHabit && window.confirm(`Are you sure you want to delete "${editingHabit.name}"?`)) {
      await dbService.deleteHabitFromFirestore(null, editingHabit.id);
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
    <Motion.div
      variants={isMobile ? mobilePageVariants : pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {!isMobile && (
        <div className="page-header">
          <h1>Habit Tracker</h1>
          <p className="page-subtitle">Track your daily habits and build consistency</p>
        </div>
      )}

      {isMobile ? (
        <MobileDailyView habits={habits} onToggle={onToggle} onEdit={handleEditClick} onAdd={onAdd} />
      ) : (
      <>
      {/* TOP GRID: Table + Overall Progress */}
      <div className="dashboard-top-grid">

        {/* LEFT: Calendar Table Card */}
        <div className="card-container" style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>

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
                <button className="btn-add-habit" onClick={() => setIsModalOpen(true)}>+ Add Habit</button>
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
                        <td colSpan={daysInMonth + 1} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                          Start by adding a new habit!
                        </td>
                      </tr>
                    ) : (
                      habits.map(habit => (
                        <tr key={habit.id}>
                          <td
                            className="habit-col habit-name-cell"
                            onClick={() => handleEditClick(habit)}
                            style={{
                              cursor: 'pointer'
                            }}
                            title="Click to edit"
                          >
                            <span>📝</span> {habit.name}
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
          <div className="chart-section" style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'relative' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📊 Daily Progress
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>Track how many habits you complete each day this month</p>
            <div style={{ height: '300px', position: 'relative' }}>
              <Line options={options} data={data} />
            </div>
          </div>

          {/* BOTTOM: Stats Footer */}
          <StatsFooter habits={habits} />
      </>
      )}

          {/* Floating Action Button for easy habit creation on mobile */}
          <button
            className="fab-add-button mobile-only"
            onClick={() => setIsModalOpen(true)}
            aria-label="Add new habit"
          >
            +
          </button>

      {/* ADD HABIT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <Motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Motion.div
              className="modal-content"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              {...sheetDrag(() => setIsModalOpen(false))}
            >
              <div className="sheet-handle mobile-only" aria-hidden="true" />
              <h2 className="modal-title">Add New Habit</h2>
              <input
                type="text"
                className="modal-input"
                placeholder="Ex: Read Book..."
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAddClick()}
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
                <button className="btn-primary" onClick={handleAddClick}>Add Habit</button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
      {/* EDIT HABIT MODAL */}
      <AnimatePresence>
        {editModalOpen && (
          <Motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Motion.div
              className="modal-content"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              {...sheetDrag(handleCloseEdit)}
            >
              <div className="sheet-handle mobile-only" aria-hidden="true" />
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
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
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
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
}


// --- COMPONENT: SETTINGS PAGE ---
const Settings = ({ settings, onSettingsChange, habits }) => {
  const [saveStatus, setSaveStatus] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(0);

  // Check notification permission status safely
  const [notificationPermission, setNotificationPermission] = useState(() => {
    try {
      return (typeof window !== 'undefined' && 'Notification' in window && window.Notification) ? Notification.permission : 'unsupported';
    } catch {
      return 'unsupported';
    }
  });

  useEffect(() => {
    if (!reminders.isNative()) return;
    reminders.permissionState().then(setNotificationPermission).catch(() => {});
  }, []);

  const handleRequestNotificationPermission = async () => {
    try {
      if (reminders.isNative()) {
        const granted = await reminders.ensurePermissions();
        setNotificationPermission(granted ? 'granted' : 'denied');
        if (granted) {
          await reminders.scheduleDaily(settings);
          setSaveStatus('Notifications enabled! ✓');
          setTimeout(() => setSaveStatus(''), 3000);
        }
        return;
      }
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          setSaveStatus('Notifications enabled! ✓');
          setTimeout(() => setSaveStatus(''), 3000);
        }
      }
    } catch (err) {
      console.warn('Notification request error:', err);
    }
  };

  const handleToggle = (field) => {
    onSettingsChange({ ...settings, [field]: !settings[field] });
  };



  const handleSave = () => {
    setSaveStatus('Changes saved! ✓');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleExport = async () => {
    showToast('Generating report', 'Your PDF is being prepared…', 'default');
    try {
      const filename = await exportToPDF(habits);
      const done = Capacitor.isNativePlatform()
        ? 'Pick where it goes in the share sheet.'
        : 'Check your downloads folder.';
      showToast('Report ready', `${filename}. ${done}`, 'achievement');
      setSaveStatus('Report ready! ✓');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch {
      showToast('Export failed', 'Please try again.', 'error');
      setSaveStatus('Export failed. Please try again.');
      setTimeout(() => setSaveStatus(''), 3000);
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
        await dbService.deleteAllUserDataFromFirestore(null);
        setSaveStatus('All data deleted successfully! ✓');
        setDeleteConfirm(0);
        setTimeout(() => setSaveStatus(''), 3000);
      } catch {
        // Error already shown via toast notification
        setSaveStatus('Failed to delete data. Please try again.');
        setDeleteConfirm(0);
        setTimeout(() => setSaveStatus(''), 3000);
      }
    }
  };

  return (
    <Motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
    <div className="settings-page">
      <header className="settings-header">
        <h1>Settings</h1>
        <p className="settings-subtitle">Manage your application preferences</p>
      </header>

      {/* 1. Notifications */}
      <Motion.section
        className="settings-card"
        variants={fadeUpVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
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
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div>
              <div style={{ fontWeight: 600, color: '#d97706' }}>🔔 Enable Notifications</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Allow browser notifications for reminders</div>
            </div>
            <button className="btn-primary" onClick={handleRequestNotificationPermission}>Enable</button>
          </div>
        )}
      </Motion.section>

      {/* 3. Data Management */}
      <Motion.section
        className="settings-card"
        variants={fadeUpVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
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
      </Motion.section>

      <footer className="settings-footer">
        <button className="btn-primary" onClick={handleSave}>
          {saveStatus || 'Save Changes'}
        </button>
      </footer>
    </div>
    </Motion.div>
  );
};

// --- COMPONENT: JOURNAL ENTRY (Polished) ---
const JournalEntry = ({ journalEntries, onSave }) => {
  const { date } = useParams();
  const navigate = useNavigate();

  const defaultEntry = useMemo(() => ({
    mood: '', gratitude: '', highlights: '', challenges: '', learning: '', goals: '', notes: ''
  }), []);

  const [entry, setEntry] = useState(() => journalEntries[date] || defaultEntry);
  const [saveStatus, setSaveStatus] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Sync entry when date or journalEntries change
  const syncKey = date + JSON.stringify(journalEntries[date]);
  useEffect(() => {
    setEntry(journalEntries[date] || defaultEntry);
    setSaveStatus('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  // Mood faces are entry content (stored in the journal), each gets a text label
  // so the picker is never an icon-only control.
  const moodOptions = [
    { face: '😊', label: 'Good' },
    { face: '😐', label: 'Okay' },
    { face: '😔', label: 'Low' },
    { face: '😡', label: 'Angry' },
    { face: '🤩', label: 'Amazing' },
    { face: '😴', label: 'Tired' },
  ];

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
    } catch {
      // Error already shown via setSaveStatus
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
    <Motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
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
            <button className="btn-primary" onClick={handleSave} style={{ minWidth: '140px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              {saveStatus ? 'Saved! ✓' : 'Save Entry'}
            </button>
          </div>
        </header>

        <div className="editor-sections-grid">
          {/* Mood Section */}
          <section className="editor-section full-width">
            <h3 className="section-title">How are you feeling today?</h3>
            <div className="mood-selection-grid">
              {moodOptions.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  aria-pressed={entry.mood === m.face}
                  className={`mood-picker-item ${entry.mood === m.face ? 'active' : ''}`}
                  onClick={() => handleChange('mood', m.face)}
                >
                  <span className="mood-emoji" aria-hidden="true">{m.face}</span>
                  <span className="mood-label">{m.label}</span>
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

      {/* Phone-only sticky action bar: Save stays under the thumb while writing.
          Same handlers as the header buttons, which hide on phone via CSS. */}
      <div className="editor-stickybar mobile-only">
        <button
          type="button"
          className={showClearConfirm ? "btn-danger" : "btn-secondary"}
          onClick={handleClear}
        >
          {showClearConfirm ? 'Confirm?' : 'Clear'}
        </button>
        <button type="button" className="btn-primary" onClick={handleSave}>
          {saveStatus ? 'Saved' : 'Save Entry'}
        </button>
      </div>
    </div>
    </Motion.div>
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


  const handlePrevMonth = () => setViewDate(new Date(viewYear, viewMonth - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewYear, viewMonth + 1, 1));
  const handleGoToToday = () => setViewDate(new Date(realToday.getFullYear(), realToday.getMonth(), 1));
  const goToTodayEntry = () => {
    const todayKey = `${realToday.getFullYear()}-${String(realToday.getMonth() + 1).padStart(2, '0')}-${String(realToday.getDate()).padStart(2, '0')}`;
    navigate(`/journal/${todayKey}`);
  };


  // Grid rendering is owned by JournalCalendar (DayPicker). viewDate stays here
  // because the month nav row and the stats below both read it.

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
    <Motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
    <div className="journal-page">
      <div className="journal-page-header">
        <div className="journal-title-group">
          <h1>My Journal</h1>
          <p className="journal-subtitle">Reflect on your journey, one day at a time</p>
        </div>
        <button
          className="btn-primary desktop-only"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={goToTodayEntry}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Entry
        </button>
      </div>

      {/* Phone: same FAB pattern as Habits — one primary action, thumb reach */}
      <button
        className="fab-add-button mobile-only"
        onClick={goToTodayEntry}
        aria-label="New journal entry"
      >
        +
      </button>

      <Motion.div
        className="journal-stats-dashboard"
        variants={statsContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {stats.map((stat, idx) => (
          <Motion.div key={idx} className="journal-stat-card" variants={statsCardVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
            <div className="journal-stat-icon" style={{ color: stat.color }}>
              {stat.icon}
            </div>
            <div className="journal-stat-info">
              <span className="journal-stat-label">{stat.label}</span>
              <span className="journal-stat-value">{stat.value}</span>
            </div>
          </Motion.div>
        ))}
      </Motion.div>

      <div className="view-controls-row">
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
        <JournalCalendar journalEntries={journalEntries} month={viewDate} onMonthChange={setViewDate} />
      </div>
    </div>
    </Motion.div>
  );
};


// --- TOAST COMPONENT ---
// Status is carried by one tonal tile with a drawn glyph (same 2px-stroke
// family as the nav and habit tiles) — never emoji, never a side border.
// Toasts auto-dismiss after 4s, so there is no close button.
const TOAST_TONES = {
  achievement: { bg: '#fef3c7', fg: '#b45309' },
  streak: { bg: '#ffedd5', fg: '#c2410c' },
  success: { bg: '#dcfce7', fg: '#15803d' },
  error: { bg: '#fee2e2', fg: '#dc2626' },
  default: { bg: '#f1f5f9', fg: '#475569' },
};

const ToastGlyph = ({ type }) => {
  const p = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (type) {
    case 'achievement':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" {...p} aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case 'streak':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" {...p} aria-hidden="true">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case 'error':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" {...p} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    case 'default':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" {...p} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
    case 'success':
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" {...p} aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
  }
};

const SWIPE_DISMISS_PX = 90;

// One toast: follows the finger while swiped, flies out past the threshold,
// snaps back otherwise. Reduced-motion users get instant dismiss.
const SwipeableToast = ({ toast, onDismiss }) => {
  const [offset, setOffset] = useState(0);
  const [exiting, setExiting] = useState(null);
  const drag = useRef(null);

  const dismiss = (dir) => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      onDismiss(toast.id);
      return;
    }
    setExiting(dir);
    setTimeout(() => onDismiss(toast.id), 180);
  };

  const onPointerDown = (e) => {
    if (exiting) return;
    // Taps on the action button belong to the button, not the swipe.
    if (e.target.closest && e.target.closest('.toast-action')) return;
    drag.current = { startX: e.clientX, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setOffset(e.clientX - d.startX);
  };

  const endDrag = (e) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > SWIPE_DISMISS_PX) {
      dismiss(dx > 0 ? 'right' : 'left');
    } else {
      setOffset(0);
    }
  };

  const cancelDrag = () => {
    drag.current = null;
    setOffset(0);
  };

  const tone = TOAST_TONES[toast.type] || TOAST_TONES.default;
  return (
    <div
      className={`toast${exiting ? ` toast-exiting-${exiting}` : ''}`}
      style={
        exiting || offset === 0
          ? undefined
          : {
              transform: `translateX(${offset}px)`,
              opacity: Math.max(0.35, 1 - Math.abs(offset) / 320),
              transition: 'none',
            }
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={cancelDrag}
    >
      <span className="toast-tile" style={{ backgroundColor: tone.bg, color: tone.fg }} aria-hidden="true">
        <ToastGlyph type={toast.type} />
      </span>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        <div className="toast-message">{toast.message}</div>
      </div>
      {toast.action && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            toast.action.onClick();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
};

const ToastContainer = ({ toasts, onDismiss }) => {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(toast => (
        <SwipeableToast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const AppWrapper = () => { return (<Router><App /></Router>); };

const BootSkeleton = () => (
  <div aria-label="Loading" role="status">
    <div className="skeleton skeleton-text" style={{ width: '40%' }} />
    <div className="skeleton skeleton-text short" />
    <div className="skeleton skeleton-card" style={{ marginTop: '1rem' }} />
    <div className="skeleton skeleton-card" style={{ marginTop: '1rem' }} />
  </div>
);

function App() {
  // State for toasts
  const [toasts, setToasts] = useState([]);

  // State for data
  const [habits, setHabits] = useState([]);
  const [journalEntries, setJournalEntries] = useState({});
  const [booted, setBooted] = useState(() => !Capacitor.isNativePlatform());
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('habitTrackerSettings_local');
      return saved ? JSON.parse(saved) : {
        dailyReminders: true,
        weeklyReport: true,
        achievementNotifications: true,
        startOfWeek: 'Monday',
        timezone: 'IST',
        theme: 'Light'
      };
    } catch {
      return {
        dailyReminders: true,
        weeklyReport: true,
        achievementNotifications: true,
        startOfWeek: 'Monday',
        timezone: 'IST',
        theme: 'Light'
      };
    }
  });

  // 1. Listen for Local / Offline Data (Run once on mount)
  useEffect(() => {
    // Subscribe to Habits
    const unsubscribeHabits = dbService.subscribeToHabits(null, (data) => {
      setHabits(data);
    });

    // Subscribe to Journal
    const unsubscribeJournal = dbService.subscribeToJournal(null, (data) => {
      setJournalEntries(data);
    });

    return () => {
      unsubscribeHabits();
      unsubscribeJournal();
    };
  }, []);

  // Boot gate (native only): storage init + first snapshot before content,
  // then dark status icons for the white topbar and manual splash hide.
  // Web skips the gate entirely — behavior there is unchanged.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    (async () => {
      try {
        await dbService.initStorage();
        if (cancelled) return;
        setSettings(dbService.getSettings());
      } finally {
        if (!cancelled) setBooted(true);
      }
      if (cancelled) return;
      await backHandler.initBackHandler();
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      await SplashScreen.hide().catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Toast callback setup (auto-dismiss after 4s, snackbar behavior).
  // Toasts sharing a `group` replace each other (e.g. rapid habit toggles
  // keep one Undo toast); `durationMs` overrides the 4s default.
  useEffect(() => {
    setToastCallback((toast) => {
      setToasts((prev) => {
        const withoutGroup = toast.group
          ? prev.filter((t) => t.group !== toast.group)
          : prev;
        return [...withoutGroup, toast];
      });
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.durationMs || 4000);
    });
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Persistence Effect for Settings (repo fans out to SQLite on native)
  useEffect(() => {
    dbService.saveSettings(settings);
  }, [settings]);

  // Native daily alarms follow the settings toggle
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void reminders.scheduleDaily(settings);
  }, [settings.dailyReminders]);

  // Notification Effects (web only — native uses scheduled local notifications)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification) {
      return;
    }

    // Daily reminder check (runs every hour)
    if (settings.dailyReminders) {
      const checkDailyReminder = () => {
        const now = new Date();
        const hour = now.getHours();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // Send reminder at 9 AM or 6 PM
        if (hour === 9 || hour === 18) {
          const hasCompletedAny = habits.some(habit => habit.logs[today]);
          if (!hasCompletedAny && habits.length > 0) {
            showNotification('📝 Habit Reminder', {
              body: "Don't forget to track your habits today!",
              tag: 'daily-reminder'
            });
          }
        }
      };

      // Check immediately and then every hour
      checkDailyReminder();
      const interval = setInterval(checkDailyReminder, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [habits, settings.dailyReminders]);

  // Handlers
  const toggleHabit = async (habitId, dateKey) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const newLogs = { ...habit.logs };

    // If currently checked, delete the entry; if unchecked, set to true
    if (newLogs[dateKey]) {
      delete newLogs[dateKey];
    } else {
      newLogs[dateKey] = true;
    }

    // OPTIMISTIC UPDATE: functional setState for stable callback
    setHabits(prev => prev.map(h =>
      h.id === habitId ? { ...h, logs: newLogs } : h
    ));

    // Local store update in background (no await to prevent UI blocking)
    dbService.updateHabitLogsInFirestore(null, habitId, newLogs)
      .catch(() => {
        // Rollback on error
        setHabits(habits);
        showToast('Error', 'Failed to update habit. Please try again.', 'error');
      });

    const nowDone = !!newLogs[dateKey];
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(nowDone ? 15 : 8);
    }

    // Achievement checks (only when checking, not unchecking)
    if (newLogs[dateKey]) {
      const updatedHabits = habits.map(h =>
        h.id === habitId ? { ...h, logs: newLogs } : h
      );
      checkAndNotifyAchievements(updatedHabits, settings, dateKey);
    }
  };

  const addHabit = async (name) => {
    const newHabit = {
      id: Date.now().toString(),
      name,
      logs: {}
    };
    await dbService.addHabitToFirestore(null, newHabit);
  };

  // Save Journal Entry Handler
  const saveJournalEntry = async (date, data) => {
    await dbService.saveJournalEntryInFirestore(null, date, data);
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="app-container" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.9), rgba(55,48,163,0.1))',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '100vh'
        }}>
        <header className="mobile-topbar mobile-only">
          <div className="mobile-topbar-inner">
            <div className="logo">
              <div className="logo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              HabitTracker
            </div>
          </div>
        </header>
        <nav className="navbar desktop-only">
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
                  </div>
                </nav>

                <main className="main-content">
                  <div className="content-wrapper">
                    {!booted ? (
                      <BootSkeleton />
                    ) : (
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
                    )}
                  </div>
                </main>
              </div>
      <MobileBottomNav />

    </>
  );
}

export default AppWrapper;




