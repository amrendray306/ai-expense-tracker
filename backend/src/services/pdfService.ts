import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const generateMonthlyReportPdf = async (
  userId: string,
  userName: string,
  month: string,
  expenses: any[],
  insights: string[]
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `report_${userId}_${Date.now()}.pdf`;
      const reportsDir = path.join(__dirname, '../../uploads/reports');
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const filePath = path.join(reportsDir, fileName);
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // Title
      doc.fontSize(20).font('Helvetica-Bold').text(`Monthly Financial Report`, { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(14).font('Helvetica').text(`User: ${userName}`);
      doc.text(`Month: ${month}`);
      doc.moveDown(2);

      // Insights
      if (insights && insights.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold').text('AI Insights & Summary');
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica');
        insights.forEach(insight => {
          doc.text(`• ${insight}`);
        });
        doc.moveDown(2);
      }

      // Expenses breakdown
      doc.fontSize(16).font('Helvetica-Bold').text('Expense Breakdown');
      doc.moveDown(0.5);
      
      // Calculate totals
      let totalAmount = 0;
      const categoryTotals: { [key: string]: number } = {};

      expenses.forEach(e => {
        totalAmount += e.amount;
        const catName = e.category?.name || 'Uncategorized';
        categoryTotals[catName] = (categoryTotals[catName] || 0) + e.amount;
      });

      doc.fontSize(12).font('Helvetica-Bold').text(`Total Spent: Rs ${totalAmount.toFixed(2)}`);
      doc.moveDown();

      doc.font('Helvetica-Bold').text('By Category:');
      doc.font('Helvetica');
      Object.entries(categoryTotals).forEach(([cat, amount]) => {
        doc.text(`- ${cat}: Rs ${amount.toFixed(2)}`);
      });

      doc.moveDown(2);
      
      // Detailed List
      doc.fontSize(16).font('Helvetica-Bold').text('Detailed Transactions');
      doc.moveDown(0.5);
      
      expenses.forEach(e => {
        const dateStr = new Date(e.date).toLocaleDateString();
        const catName = e.category?.name || 'Uncategorized';
        doc.fontSize(10).font('Helvetica').text(`${dateStr} | ${e.title} | ${catName} | Rs ${e.amount.toFixed(2)}`);
      });

      doc.end();

      writeStream.on('finish', () => {
        resolve(`uploads/reports/${fileName}`);
      });
      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};
