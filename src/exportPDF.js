import jsPDF from 'jspdf';

/**
 * Export habit tracker data as a formatted PDF with selectable text
 * @param {Array} habits - Array of habit objects
 * @param {Function} setSaveStatus - Callback to update save status message
 */
export const exportToPDF = (habits, setSaveStatus) => {
    try {
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
                totalCompletions: 0,
                monthlyData: {}
            };

            habits.forEach(habit => {
                const logs = habit.logs || {};
                Object.keys(logs).forEach(date => {
                    const monthKey = date.substring(0, 7); // YYYY-MM
                    if (!metrics.monthlyData[monthKey]) {
                        metrics.monthlyData[monthKey] = {
                            completions: 0,
                            habits: new Set()
                        };
                    }
                    metrics.monthlyData[monthKey].completions++;
                    metrics.monthlyData[monthKey].habits.add(habit.name);
                    metrics.totalCompletions++;
                });
            });

            return metrics;
        };

        const metrics = calculateMetrics();
        const monthKeys = Object.keys(metrics.monthlyData).sort().reverse();

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        let yPos = margin;

        // Helper to check for new page
        const checkNewPage = (requiredSpace) => {
            if (yPos + requiredSpace > pageHeight - margin) {
                pdf.addPage();
                yPos = margin;
                return true;
            }
            return false;
        };

        // Header
        pdf.setFillColor(79, 70, 229);
        pdf.rect(0, 0, pageWidth, 40, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(28);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Habit Tracker Report', pageWidth / 2, 20, { align: 'center' });
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Generated on ${dateStr} | IST (GMT+5:30)`, pageWidth / 2, 30, { align: 'center' });

        yPos = 55;

        // Summary Cards Section
        const cardWidth = (contentWidth - 10) / 3;
        const cardHeight = 25;

        // Card 1
        pdf.setFillColor(102, 126, 234);
        pdf.roundedRect(margin, yPos, cardWidth, cardHeight, 3, 3, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(metrics.totalHabits.toString(), margin + cardWidth / 2, yPos + 12, { align: 'center' });
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text('TOTAL HABITS', margin + cardWidth / 2, yPos + 19, { align: 'center' });

        // Card 2
        pdf.setFillColor(240, 147, 251);
        pdf.roundedRect(margin + cardWidth + 5, yPos, cardWidth, cardHeight, 3, 3, 'F');
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(metrics.totalCompletions.toString(), margin + cardWidth + 5 + cardWidth / 2, yPos + 12, { align: 'center' });
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text('TOTAL COMPLETIONS', margin + cardWidth + 5 + cardWidth / 2, yPos + 19, { align: 'center' });

        // Card 3
        pdf.setFillColor(79, 172, 254);
        pdf.roundedRect(margin + (cardWidth + 5) * 2, yPos, cardWidth, cardHeight, 3, 3, 'F');
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(monthKeys.length.toString(), margin + (cardWidth + 5) * 2 + cardWidth / 2, yPos + 12, { align: 'center' });
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text('ACTIVE MONTHS', margin + (cardWidth + 5) * 2 + cardWidth / 2, yPos + 19, { align: 'center' });

        yPos += cardHeight + 15;

        // Monthly Breakdown
        pdf.setTextColor(79, 70, 229);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Monthly Breakdown', margin, yPos);
        yPos += 8;

        if (monthKeys.length === 0) {
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'italic');
            pdf.text('No completion data tracked yet.', margin, yPos);
            yPos += 10;
        } else {
            monthKeys.forEach(monthKey => {
                checkNewPage(35);
                const data = metrics.monthlyData[monthKey];
                const [year, month] = monthKey.split('-');
                const monthName = new Date(year, parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

                pdf.setFillColor(248, 250, 252);
                pdf.setDrawColor(226, 232, 240);
                pdf.roundedRect(margin, yPos, contentWidth, 25, 2, 2, 'FD');

                pdf.setTextColor(79, 70, 229);
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.text(monthName, margin + 5, yPos + 8);

                pdf.setTextColor(30, 41, 59);
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`Completions: ${data.completions}`, margin + 5, yPos + 16);
                pdf.text(`Active Habits: ${data.habits.size}`, margin + contentWidth / 2, yPos + 16);

                yPos += 30;
            });
        }

        // Habits List
        checkNewPage(20);
        pdf.setTextColor(79, 70, 229);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Habits Overview', margin, yPos);
        yPos += 8;

        if (habits.length === 0) {
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'italic');
            pdf.text('No habits added yet.', margin, yPos);
            yPos += 10;
        } else {
            habits.forEach(habit => {
                checkNewPage(18);
                const totalLogs = Object.keys(habit.logs || {}).length;

                pdf.setFillColor(255, 255, 255);
                pdf.setDrawColor(226, 232, 240);
                pdf.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'FD');

                pdf.setTextColor(30, 41, 59);
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.text(habit.name, margin + 5, yPos + 7);

                pdf.setTextColor(100, 116, 139);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`Total Completions: ${totalLogs}`, margin + contentWidth - 45, yPos + 7);

                yPos += 15;
            });
        }

        // Footer
        const footerY = pageHeight - 15;
        pdf.setTextColor(148, 163, 184);
        pdf.setFontSize(8);
        pdf.text('Generated by HabitTracker', pageWidth / 2, footerY, { align: 'center' });

        const filename = `HabitTracker-Report-${now.toISOString().split('T')[0]}.pdf`;
        pdf.save(filename);

        setSaveStatus('PDF downloaded successfully! ✓');
        setTimeout(() => setSaveStatus(''), 3000);

    } catch {
        // Error already handled via setSaveStatus
        setSaveStatus('PDF generation failed ✗');
        setTimeout(() => setSaveStatus(''), 3000);
    }
};
