import cron from 'node-cron';
import { prisma } from './db';
import { sendNotification } from './services/notificationService';

export const initCronJobs = () => {
  // Weekly Report: Runs every Sunday at 9:00 AM
  cron.schedule('0 9 * * 0', async () => {
    console.log('[CRON] Running weekly summary job...');
    try {
      const users = await prisma.user.findMany({ include: { expenses: true } });
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      for (const user of users) {
        const weeklyExpenses = user.expenses.filter((e: any) => new Date(e.date) >= oneWeekAgo);
        const total = weeklyExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);

        if (total > 0) {
          await sendNotification(
            user.email,
            user.phone,
            'Your Weekly FinAdvisor Summary',
            `Hello ${user.name},\n\nYou spent a total of ₹${total.toFixed(2)} this week across ${weeklyExpenses.length} transactions.\nKeep up the tracking!`
          );
        }
      }
    } catch (error) {
      console.error('[CRON] Error in weekly job:', error);
    }
  });

  // Monthly Report: Runs on the 1st of every month at 9:00 AM
  cron.schedule('0 9 1 * *', async () => {
    console.log('[CRON] Running monthly summary job...');
    try {
      const users = await prisma.user.findMany({ include: { expenses: true } });
      
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      for (const user of users) {
        const monthlyExpenses = user.expenses.filter((e: any) => new Date(e.date) >= oneMonthAgo);
        const total = monthlyExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);

        if (total > 0) {
          await sendNotification(
            user.email,
            user.phone,
            'Your Monthly FinAdvisor Summary',
            `Hello ${user.name},\n\nYour total spending for the last month was ₹${total.toFixed(2)}.\nCheck your Analytics dashboard to see your predictions for the upcoming month!`
          );
        }
      }
    } catch (error) {
      console.error('[CRON] Error in monthly job:', error);
    }
  });

  console.log('[CRON] Scheduled jobs initialized.');
};
