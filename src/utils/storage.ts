export interface MilkEntry {
    date: string; // ISO format YYYY-MM-DD
    quantity: number;
}

export interface AppSettings {
    rate: number;
    reminderTime: string;
}

const STORAGE_KEYS = {
    ENTRIES: 'milk_entries',
    SETTINGS: 'milk_settings',
    PAYMENTS: 'milk_payments'
};

export const Storage = {
    getEntries(): Record<string, number> {
        const data = localStorage.getItem(STORAGE_KEYS.ENTRIES);
        return data ? JSON.parse(data) : {};
    },

    saveEntry(date: string, quantity: number) {
        const entries = this.getEntries();
        if (quantity === 0) {
            delete entries[date];
        } else {
            entries[date] = quantity;
        }
        localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
    },

    getSettings(): AppSettings {
        const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return data ? JSON.parse(data) : { rate: 50, reminderTime: "08:00" };
    },

    saveSettings(settings: AppSettings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    },

    getPayments(): Record<string, boolean> { // Key: "YYYY-MM"
        const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
        return data ? JSON.parse(data) : {};
    },

    setPayment(month: string, paid: boolean) {
        const payments = this.getPayments();
        payments[month] = paid;
        localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    }
};
