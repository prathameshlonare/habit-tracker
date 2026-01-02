import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Export habit tracker data as a formatted PDF
 * @param {Function} setSaveStatus - Callback to update save status message
 */
export const exportToPDF = (setSaveStatus) => {
    const habits = JSON.parse(localStorage.getItem('habits') || '[]');
    const journalEntries = JSON.parse(localStorage.getItem('journalEntries') || '{}');
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Kolkata'
    });

    // Calculate metrics
    const calculateMetrics = () => {
        const metrics = {
            totalHabits: habits.length,
            totalDays: 0,
            currentMonth: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
            monthlyData: {}
        };

        // Group data by month
        habits.forEach(habit => {
            Object.keys(habit.logs).forEach(date => {
                const monthKey = date.substring(0, 7); // YYYY-MM
                if (!metrics.monthlyData[monthKey]) {
                    metrics.monthlyData[monthKey] = {
                        completions: 0,
                        habits: new Set()
                    };
                }
                metrics.monthlyData[monthKey].completions++;
                metrics.monthlyData[monthKey].habits.add(habit.name);
                metrics.totalDays++;
            });
        });

        return metrics;
    };

    const metrics = calculateMetrics();
    const monthKeys = Object.keys(metrics.monthlyData).sort().reverse();

    // Create HTML content for PDF
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Habit Tracker Report - ${dateStr}</title>
      <style>
        @page {
          margin: 15mm;
          size: A4 portrait;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0 auto;
          padding: 30px 40px;
          color: #1e293b;
          line-height: 1.8;
          max-width: 650px;
        }
        .header {
          text-align: center;
          margin-bottom: 35px;
          border-bottom: 4px solid #4f46e5;
          padding-bottom: 25px;
        }
        .header h1 {
          margin: 0;
          color: #4f46e5;
          font-size: 36px;
          font-weight: 700;
        }
        .header p {
          margin: 12px 0 0 0;
          color: #64748b;
          font-size: 15px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin: 35px 0;
        }
        .summary-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 25px 20px;
          border-radius: 12px;
          text-align: center;
        }
        .summary-card:nth-child(2) {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        .summary-card:nth-child(3) {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        .summary-value {
          font-size: 42px;
          font-weight: 700;
          margin: 8px 0;
        }
        .summary-label {
          font-size: 13px;
          opacity: 0.95;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .section {
          margin: 40px 0;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #1e293b;
          border-left: 5px solid #4f46e5;
          padding-left: 15px;
        }
        .month-section {
          background: #f8fafc;
          padding: 20px;
          margin: 20px 0;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }
        .month-header {
          font-weight: 600;
          font-size: 19px;
          color: #4f46e5;
          margin-bottom: 15px;
        }
        .month-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-top: 12px;
        }
        .stat-item {
          font-size: 15px;
          color: #64748b;
          line-height: 1.6;
        }
        .stat-value {
          font-weight: 600;
          color: #1e293b;
          font-size: 16px;
        }
        .habit-item {
          background: white;
          padding: 18px;
          margin: 12px 0;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .habit-name {
          font-weight: 600;
          font-size: 16px;
        }
        .habit-stats {
          display: flex;
          gap: 20px;
          font-size: 14px;
          color: #64748b;
        }
        .journal-entry {
          background: #fffbeb;
          padding: 18px;
          margin: 12px 0;
          border-radius: 8px;
          border-left: 4px solid #f59e0b;
        }
        .journal-date {
          font-weight: 600;
          color: #92400e;
          font-size: 15px;
          margin-bottom: 10px;
        }
        .journal-content {
          color: #78350f;
          font-size: 14px;
          line-height: 1.7;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
          line-height: 1.6;
        }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Habit Tracker Report</h1>
        <p>Generated on ${dateStr} | IST (GMT+5:30)</p>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-value">${metrics.totalHabits}</div>
          <div class="summary-label">Total Habits</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${metrics.totalDays}</div>
          <div class="summary-label">Total Completions</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${monthKeys.length}</div>
          <div class="summary-label">Active Months</div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">📅 Monthly Breakdown</h2>
  `;

    if (monthKeys.length === 0) {
        htmlContent += '<p style="color: #94a3b8;">No data available yet.</p>';
    } else {
        monthKeys.forEach(monthKey => {
            const monthData = metrics.monthlyData[monthKey];
            const [year, month] = monthKey.split('-');
            const monthName = new Date(year, parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
            const daysInMonth = new Date(year, month, 0).getDate();
            const completionRate = Math.round((monthData.completions / (habits.length * daysInMonth)) * 100);

            htmlContent += `
        <div class="month-section">
          <div class="month-header">${monthName}</div>
          <div class="month-stats">
            <div class="stat-item">
              <span class="stat-value">${monthData.completions}</span> total completions
            </div>
            <div class="stat-item">
              <span class="stat-value">${monthData.habits.size}</span> active habits
            </div>
            <div class="stat-item">
              <span class="stat-value">${completionRate}%</span> completion rate
            </div>
            <div class="stat-item">
              <span class="stat-value">${daysInMonth}</span> days in month
            </div>
          </div>
        </div>
      `;
        });
    }

    htmlContent += '</div>';

    // Habits Overview
    htmlContent += `
    <div class="section">
      <h2 class="section-title">📝 Habits Overview</h2>
  `;

    if (habits.length === 0) {
        htmlContent += '<p style="color: #94a3b8;">No habits tracked yet.</p>';
    } else {
        habits.forEach(habit => {
            const totalLogs = Object.keys(habit.logs).length;
            const thisMonth = now.toISOString().slice(0, 7);
            const thisMonthLogs = Object.keys(habit.logs).filter(date => date.startsWith(thisMonth)).length;

            // Calculate current streak
            let streak = 0;
            const sortedDates = Object.keys(habit.logs).sort().reverse();
            for (let i = 0; i < sortedDates.length; i++) {
                const checkDate = new Date(now);
                checkDate.setDate(checkDate.getDate() - i);
                const dateKey = checkDate.toISOString().split('T')[0];
                if (sortedDates.includes(dateKey)) {
                    streak++;
                } else {
                    break;
                }
            }

            htmlContent += `
        <div class="habit-item">
          <div class="habit-name">📌 ${habit.name}</div>
          <div class="habit-stats">
            <span>📅 ${totalLogs} days</span>
            <span>📆 ${thisMonthLogs} this month</span>
            <span>🔥 ${streak} day streak</span>
          </div>
        </div>
      `;
        });
    }

    htmlContent += '</div>';

    // Journal Entries
    const journalDates = Object.keys(journalEntries).sort().reverse();
    if (journalDates.length > 0) {
        htmlContent += `
      <div class="section">
        <h2 class="section-title">📔 Recent Journal Entries</h2>
    `;

        journalDates.slice(0, 10).forEach(date => {
            const entry = journalEntries[date];
            const formattedDate = new Date(date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            htmlContent += `
        <div class="journal-entry">
          <div class="journal-date">${formattedDate}</div>
          <div class="journal-content">
            ${entry.mood ? `<p><strong>Mood:</strong> ${entry.mood}</p>` : ''}
            ${entry.notes ? `<p>${entry.notes}</p>` : ''}
          </div>
        </div>
      `;
        });

        htmlContent += '</div>';
    }

    htmlContent += `
      <div class="footer">
        <p>HabitTracker - Track your daily habits and build consistency</p>
        <p>This report was automatically generated from your habit tracking data</p>
      </div>
    </body>
    </html>
  `;

    // Create an isolated iframe for rendering (prevents layout shifts)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // Write content to iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Generate PDF using html2canvas and jsPDF
    setSaveStatus('Generating PDF... ⏳');

    // Wait for iframe content to load
    setTimeout(async () => {
        try {
            const canvas = await html2canvas(iframeDoc.body, {
                scale: 2,
                useCORS: true,
                logging: false,
                width: 794,
                windowWidth: 794
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Only add first page
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

            // Add additional pages only if content is significantly longer than one page
            let heightLeft = imgHeight - pageHeight;

            while (heightLeft > 10) { // Only add page if more than 10mm of content remains
                pdf.addPage();
                const position = -(imgHeight - heightLeft);
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Download the PDF
            const filename = `HabitTracker-Report-${now.toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);

            // Clean up
            document.body.removeChild(iframe);

            setSaveStatus('PDF downloaded successfully! ✓');
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (error) {
            console.error('PDF generation error:', error);
            if (iframe.parentNode) {
                document.body.removeChild(iframe);
            }
            setSaveStatus('PDF generation failed ✗');
            setTimeout(() => setSaveStatus(''), 3000);
        }
    }, 500);
};
