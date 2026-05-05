import './style.css'
import { DateTime } from 'luxon'
import { Storage } from './utils/storage'
import { Notifications } from './utils/notifications'
import { createIcons, Home, Calendar, BarChart, Settings as SettingsIcon } from 'lucide'

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            console.log('SW registered:', reg);
        }).catch(err => {
            console.log('SW registration failed:', err);
        });
    });
}

// --- State ---
let currentMonth = DateTime.now().startOf('month');
let selectedDate = DateTime.now().toISODate()!;
let settings = Storage.getSettings();
let entries = Storage.getEntries();

// --- DOM Elements ---
const views = document.querySelectorAll('.view');
const navButtons = document.querySelectorAll('.nav-item');
const displayDate = document.getElementById('display-date')!;
const greetingText = document.querySelector('.greeting')!;
const quantityPicker = document.getElementById('quantity-picker')!;
const todayQtyValue = document.getElementById('today-qty-value')!;
const customInputGroup = document.getElementById('custom-input-group')!;
const customQtyInput = document.getElementById('custom-qty') as HTMLInputElement;
const saveCustomBtn = document.getElementById('save-custom')!;

const calendarGrid = document.getElementById('calendar-grid')!;
const calendarMonthName = document.getElementById('calendar-month-name')!;
const prevMonthBtn = document.getElementById('prevMonth')!;
const nextMonthBtn = document.getElementById('nextMonth')!;

const monthlySummaryContainer = document.getElementById('monthly-summary-container')!;
const monthlyDetailsSection = document.getElementById('monthly-details-section')!;
const detailsMonthName = document.getElementById('details-month-name')!;
const backToMonthsBtn = document.getElementById('back-to-months')!;
const statTotalQty = document.getElementById('stat-total-qty')!;
const statTotalAmount = document.getElementById('stat-total-amount')!;
const monthQtySum = document.getElementById('month-qty-sum')!;
const monthAmountSum = document.getElementById('month-amount-sum')!;
const monthSummaryLink = document.getElementById('month-summary-link')!;

const monthlyEntriesList = document.getElementById('monthly-entries-list')!;
const paymentStatusText = document.getElementById('payment-status-text')!;
const togglePaymentBtn = document.getElementById('toggle-payment') as HTMLButtonElement;

const settingsBtn = document.getElementById('settingsBtn')!;
const closeSettingsBtn = document.getElementById('closeSettings')!;
const settingsModal = document.getElementById('settings-modal')!;

const confirmModal = document.getElementById('confirm-modal')!;
const confirmChangeBtn = document.getElementById('confirm-change')!;
const cancelChangeBtn = document.getElementById('cancel-change')!;

const milkRateInput = document.getElementById('milk-rate') as HTMLInputElement;
const reminderTimeInput = document.getElementById('reminder-time') as HTMLInputElement;
const saveSettingsBtn = document.getElementById('save-settings')!;

const exportBtn = document.getElementById('export-btn')!;
const importBtnTrigger = document.getElementById('import-btn-trigger')!;
const importFileInput = document.getElementById('import-file') as HTMLInputElement;

// --- State ---
let activeStatsMonth = DateTime.now().toFormat('yyyy-MM');

// --- Initialization ---
function init() {
    renderTodayView();
    setupEventListeners();
    updateStats();
    
    // Create icons
    createIcons({
        icons: {
            Home,
            Calendar,
            BarChart,
            SettingsIcon
        }
    });

    // Initial permission request
    Notifications.requestPermission();

    // Schedule monthly summary if it's nearing month end
    scheduleMonthSummary();

    // Add keyboard listener for Enter
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            // Only if on today view and no modal is open
            const isTodayView = document.getElementById('view-today')?.classList.contains('active');
            const noModalOpen = !document.querySelector('.modal.open');
            
            if (isTodayView && noModalOpen) {
                // If custom input is visible and has value, save it
                if (!customInputGroup.classList.contains('hidden') && customQtyInput.value) {
                    const val = parseFloat(customQtyInput.value);
                    if (!isNaN(val)) requestSelectQuantity(val);
                } else if (!entries[selectedDate]) {
                    // Default to 1.5 kg
                    selectQuantity(1.5);
                }
            }
        }
    });
}

function scheduleMonthSummary() {
    let totalQty = 0;
    const thisMonth = DateTime.now().toFormat('yyyy-MM');
    Object.keys(entries).forEach(date => {
        if (date.startsWith(thisMonth)) totalQty += entries[date];
    });
    Notifications.scheduleMonthEndSummary(totalQty, totalQty * settings.rate);
}

// --- View Rendering ---
function switchView(viewId: string) {
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(viewId)?.classList.add('active');
    
    navButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-view') === viewId);
    });

    if (viewId === 'view-calendar') renderCalendar();
    if (viewId === 'view-stats') {
        monthlySummaryContainer.classList.remove('hidden');
        monthlyDetailsSection.classList.add('hidden');
        updateStats();
    }
}

// --- TODAY VIEW ---
function renderTodayView() {
    const today = DateTime.now().toISODate();
    const sel = DateTime.fromISO(selectedDate);
    
    displayDate.textContent = sel.toFormat('cccc, d MMMM');
    if (selectedDate === today) {
        greetingText.textContent = "Milk purchased today?";
    } else {
        greetingText.textContent = `Purchase for ${sel.toFormat('d MMM')}?`;
    }
    
    const options = [0, 0.5, 1, 1.5, 2, 2.5, 3];
    quantityPicker.innerHTML = '';
    
    options.forEach(qty => {
        const btn = document.createElement('div');
        btn.className = `qty-option ${entries[selectedDate] === qty ? 'selected' : ''}`;
        // Highlight 1.5 as default if nothing selected
        if (qty === 1.5 && entries[selectedDate] === undefined) {
            btn.style.borderColor = 'rgba(0, 122, 255, 0.5)';
        }
        btn.innerHTML = `
            <span class="qty-label">${qty}</span>
            <span class="qty-unit">KG</span>
        `;
        btn.onclick = () => requestSelectQuantity(qty);
        quantityPicker.appendChild(btn);
    });

    // Custom option
    const customBtn = document.createElement('div');
    const isCustom = entries[selectedDate] && !options.includes(entries[selectedDate]);
    customBtn.className = `qty-option ${isCustom ? 'selected' : ''}`;
    customBtn.innerHTML = `
        <span class="qty-label">+</span>
        <span class="qty-unit">Custom</span>
    `;
    customBtn.onclick = () => {
        customInputGroup.classList.toggle('hidden');
        if (!customInputGroup.classList.contains('hidden')) {
            customQtyInput.focus();
            if (isCustom) customQtyInput.value = entries[selectedDate].toString();
        }
    };
    quantityPicker.appendChild(customBtn);

    todayQtyValue.textContent = `${entries[selectedDate] || 0} kg`;
    updateTodaySummary();
}

let pendingQty: number | null = null;
function requestSelectQuantity(qty: number) {
    if (entries[selectedDate] !== undefined && entries[selectedDate] !== 0 && entries[selectedDate] !== qty) {
        pendingQty = qty;
        confirmModal.classList.add('open');
    } else {
        selectQuantity(qty);
    }
}

function selectQuantity(qty: number) {
    entries[selectedDate] = qty;
    Storage.saveEntry(selectedDate, qty);
    customInputGroup.classList.add('hidden');
    renderTodayView();
    updateStats();
}

function updateTodaySummary() {
    const thisMonth = DateTime.now().toFormat('yyyy-MM');
    let totalQty = 0;
    Object.keys(entries).forEach(date => {
        if (date.startsWith(thisMonth)) totalQty += entries[date];
    });
    monthQtySum.textContent = `${totalQty.toFixed(1)} kg`;
    monthAmountSum.textContent = `₹${(totalQty * settings.rate).toFixed(2)}`;
}

// --- CALENDAR VIEW ---
function renderCalendar() {
    calendarMonthName.textContent = currentMonth.toFormat('MMMM yyyy');
    calendarGrid.innerHTML = '';

    // Headers (S M T W T F S)
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    days.forEach(d => {
        const h = document.createElement('div');
        h.className = 'calendar-day-header';
        h.textContent = d;
        calendarGrid.appendChild(h);
    });

    const startOfMo = currentMonth.startOf('month');
    const endOfMo = currentMonth.endOf('month');
    const firstDayIndex = startOfMo.weekday % 7; // Sunday=0, Monday=1...

    for (let i = 0; i < firstDayIndex; i++) {
        calendarGrid.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= endOfMo.day; d++) {
        const dateStr = currentMonth.set({ day: d }).toISODate()!;
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        if (dateStr === DateTime.now().toISODate()) cell.classList.add('today');
        if (entries[dateStr]) cell.classList.add('has-entry');
        
        cell.innerHTML = `<span class="day-num">${d}</span>`;
        if (entries[dateStr]) {
            const qtyLabel = document.createElement('span');
            qtyLabel.style.fontSize = '8px';
            qtyLabel.style.opacity = '0.6';
            qtyLabel.textContent = `${entries[dateStr]}kg`;
            cell.appendChild(qtyLabel);
        }

        cell.onclick = () => {
            selectedDate = dateStr;
            switchView('view-today');
            renderTodayView();
        };
        calendarGrid.appendChild(cell);
    }
}

// --- STATS VIEW ---
function updateStats() {
    // 1. Group by Month
    const months: Record<string, { qty: number, count: number }> = {};
    Object.keys(entries).forEach(date => {
        const m = date.substring(0, 7); // yyyy-MM
        if (!months[m]) months[m] = { qty: 0, count: 0 };
        months[m].qty += entries[date];
        months[m].count += 1;
    });

    // 2. Render Monthly Summaries
    monthlySummaryContainer.innerHTML = '';
    const sortedMonths = Object.keys(months).sort((a, b) => b.localeCompare(a));
    
    if (sortedMonths.length === 0) {
        monthlySummaryContainer.innerHTML = '<p style="text-align:center; opacity:0.5; margin-top:40px;">No entries yet.</p>';
    }

    sortedMonths.forEach(m => {
        const data = months[m];
        const card = document.createElement('div');
        card.className = 'stats-card';
        card.style.cursor = 'pointer';
        card.style.flexDirection = 'column';
        card.style.padding = '20px';
        
        const monthDisplay = DateTime.fromISO(m + "-01").toFormat('MMMM yyyy');
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h3 style="font-size:16px;">${monthDisplay}</h3>
                <span style="font-size:12px; background:var(--accent); color:var(--primary); padding:4px 10px; border-radius:10px;">${data.count} entries</span>
            </div>
            <div style="display:flex; gap:16px;">
                <div style="flex:1">
                    <p style="font-size:12px; color:var(--text-light)">Total Milk</p>
                    <p style="font-size:18px; font-weight:700">${data.qty.toFixed(1)} kg</p>
                </div>
                <div style="flex:1">
                    <p style="font-size:12px; color:var(--text-light)">Total Amount</p>
                    <p style="font-size:18px; font-weight:700; color:var(--primary)">₹${(data.qty * settings.rate).toFixed(1)}</p>
                </div>
            </div>
        `;
        card.onclick = () => showMonthlyDetails(m);
        monthlySummaryContainer.appendChild(card);
    });

    // 3. Update Details if active
    if (!monthlyDetailsSection.classList.contains('hidden')) {
        renderMonthlyDetails(activeStatsMonth);
    }
}

function showMonthlyDetails(monthStr: string) {
    activeStatsMonth = monthStr;
    monthlySummaryContainer.classList.add('hidden');
    monthlyDetailsSection.classList.remove('hidden');
    renderMonthlyDetails(monthStr);
}

function renderMonthlyDetails(monthStr: string) {
    detailsMonthName.textContent = DateTime.fromISO(monthStr + "-01").toFormat('MMMM yyyy');
    
    let totalQty = 0;
    monthlyEntriesList.innerHTML = '';
    
    const sortedDates = Object.keys(entries)
        .filter(d => d.startsWith(monthStr))
        .sort((a, b) => b.localeCompare(a));

    sortedDates.forEach(date => {
        const qty = entries[date];
        totalQty += qty;

        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.padding = '12px 0';
        item.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
        item.innerHTML = `
            <span style="font-size: 14px; font-weight: 500">${DateTime.fromISO(date).toFormat('dd MMM')}</span>
            <span style="font-weight: 600">${qty} kg</span>
        `;
        monthlyEntriesList.appendChild(item);
    });

    statTotalQty.textContent = `${totalQty.toFixed(1)} kg`;
    statTotalAmount.textContent = `₹${(totalQty * settings.rate).toFixed(2)}`;

    // Payment Status
    const payments = Storage.getPayments();
    const isPaid = payments[monthStr] || false;
    paymentStatusText.textContent = isPaid ? 'Paid' : 'Unpaid';
    paymentStatusText.style.color = isPaid ? '#34C759' : '#FF3B30';
    togglePaymentBtn.textContent = isPaid ? 'Mark as Unpaid' : 'Mark as Paid';
}

// --- SETTINGS ---
function setupEventListeners() {
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const viewId = btn.getAttribute('data-view')!;
            switchView(viewId);
        });
    });

    backToMonthsBtn.onclick = () => {
        monthlyDetailsSection.classList.add('hidden');
        monthlySummaryContainer.classList.remove('hidden');
    };

    prevMonthBtn.onclick = () => { currentMonth = currentMonth.minus({ months: 1 }); renderCalendar(); };
    nextMonthBtn.onclick = () => { currentMonth = currentMonth.plus({ months: 1 }); renderCalendar(); };

    settingsBtn.onclick = () => {
        milkRateInput.value = settings.rate.toString();
        reminderTimeInput.value = settings.reminderTime;
        settingsModal.classList.add('open');
    };

    closeSettingsBtn.onclick = () => settingsModal.classList.remove('open');

    saveSettingsBtn.onclick = async () => {
        settings.rate = parseFloat(milkRateInput.value) || 50;
        settings.reminderTime = reminderTimeInput.value;
        Storage.saveSettings(settings);
        settingsModal.classList.remove('open');
        updateStats();

        // Update notification
        await Notifications.scheduleDailyReminder(settings.reminderTime);
    };

    saveCustomBtn.onclick = () => {
        const val = parseFloat(customQtyInput.value);
        if (!isNaN(val)) requestSelectQuantity(val);
    };

    confirmChangeBtn.onclick = () => {
        if (pendingQty !== null) selectQuantity(pendingQty);
        confirmModal.classList.remove('open');
        pendingQty = null;
    };

    cancelChangeBtn.onclick = () => {
        confirmModal.classList.remove('open');
        pendingQty = null;
    };

    monthSummaryLink.onclick = () => {
        switchView('view-stats');
    };

    togglePaymentBtn.onclick = () => {
        const payments = Storage.getPayments();
        const isPaid = !payments[activeStatsMonth];
        Storage.setPayment(activeStatsMonth, isPaid);
        updateStats();
    };

    // Data Management
    exportBtn.onclick = () => {
        const data = JSON.stringify(entries, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `milkify-backup-${DateTime.now().toISODate()}.json`;
        a.click();
    };

    importBtnTrigger.onclick = () => importFileInput.click();

    importFileInput.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                Object.assign(entries, imported);
                // Save to storage
                localStorage.setItem('milk_entries', JSON.stringify(entries));
                alert('Data restored successfully!');
                renderTodayView();
                updateStats();
            } catch (err) {
                alert('Invalid backup file!');
            }
        };
        reader.readAsText(file);
    };
}

init();
