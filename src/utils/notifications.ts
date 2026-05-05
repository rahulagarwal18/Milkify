import { LocalNotifications } from '@capacitor/local-notifications';

export const Notifications = {
    async requestPermission() {
        const { display } = await LocalNotifications.requestPermissions();
        return display === 'granted';
    },

    async scheduleDailyReminder(time: string) {
        const [hour, minute] = time.split(':').map(Number);
        
        // Clear existing notifications
        await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

        // Schedule daily recurring reminder
        await LocalNotifications.schedule({
            notifications: [
                {
                    title: "Milk Reminder 🥛",
                    body: "Don't forget to enter today's milk quantity!",
                    id: 1,
                    schedule: {
                        on: { hour, minute },
                        repeats: true,
                    },
                    sound: 'default',
                    actionTypeId: "",
                    extra: null
                }
            ]
        });
    },

    async scheduleMonthEndSummary(totalQty: number, totalAmount: number) {
        // Schedule for the last day of the month at 9 PM
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        lastDay.setHours(21, 0, 0, 0);

        await LocalNotifications.cancel({ notifications: [{ id: 2 }] });

        await LocalNotifications.schedule({
            notifications: [
                {
                    title: "Monthly Milk Summary 📊",
                    body: `This month: ${totalQty} kg purchased. Total amount: ₹${totalAmount.toFixed(2)}`,
                    id: 2,
                    schedule: { at: lastDay },
                    sound: 'default'
                }
            ]
        });
    }
};
