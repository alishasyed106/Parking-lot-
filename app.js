/**
 * ParkOS — Parking Management System
 * Frontend Application Logic
 * Developed by: Alisha
 * Stack: Java 21, Go 1.22, Spring Boot 3.2, PostgreSQL 16, Redis 7, Kafka
 */

'use strict';

// ─── STATE ───────────────────────────────────────────────────
const state = {
  currentPage: 'dashboard',
  vehicles: [],
  users: [],
  slots: {},
  theme: 'dark',
  charts: {},
  vehicleFilter: '',
  userFilter: '',
};

const RATES = { car: 60, bike: 30, truck: 120, ev: 50 };
const ZONES = [
  { id: 'A', name: 'Zone A — Ground Floor', rows: 5, cols: 10, color: '#00e5a0' },
  { id: 'B', name: 'Zone B — Level 1',      rows: 4, cols: 10, color: '#6c63ff' },
  { id: 'C', name: 'Zone C — Level 2',      rows: 4, cols: 10, color: '#f5a623' },
  { id: 'D', name: 'Zone D — Rooftop',      rows: 3, cols: 10, color: '#ff6584' },
];

// ─── SEED DATA ────────────────────────────────────────────────
function seedData() {
  state.vehicles = [
    { id: 'V001', plate: 'WB 01 AB 1234', owner: 'Rohan Mehta',  type: 'car',   slot: 'A-03', entryTime: timeAgo(90),  status: 'parked',  phone: '+91 98765 43210' },
    { id: 'V002', plate: 'WB 02 CD 5678', owner: 'Priya Sharma', type: 'bike',  slot: 'B-07', entryTime: timeAgo(45),  status: 'parked',  phone: '+91 87654 32109' },
    { id: 'V003', plate: 'DL 3C AB 9012', owner: 'Amit Kumar',   type: 'car',   slot: 'A-09', entryTime: timeAgo(200), status: 'parked',  phone: '+91 76543 21098' },
    { id: 'V004', plate: 'MH 12 EF 3456', owner: 'Sneha Joshi',  type: 'truck', slot: 'C-02', entryTime: timeAgo(30),  status: 'parked',  phone: '+91 65432 10987' },
    { id: 'V005', plate: 'KA 01 GH 7890', owner: 'Vijay Nair',   type: 'ev',    slot: 'D-01', entryTime: timeAgo(150), status: 'parked',  phone: '+91 54321 09876' },
    { id: 'V006', plate: 'WB 05 IJ 2345', owner: 'Kavita Das',   type: 'car',   slot: null,   entryTime: timeAgo(240), exitTime: timeAgo(60), status: 'exited', phone: '+91 43210 98765' },
    { id: 'V007', plate: 'WB 08 KL 6789', owner: 'Rahul Banerjee', type: 'car', slot: 'A-12', entryTime: timeAgo(60),  status: 'parked',  phone: '+91 32109 87654' },
    { id: 'V008', plate: 'TN 07 MN 0123', owner: 'Deepa Pillai', type: 'bike',  slot: 'B-03', entryTime: timeAgo(20),  status: 'parked',  phone: '+91 21098 76543' },
  ];

  state.users = [
    { id: 'U001', name: 'Alisha',        email: 'alisha@parkos.in',       role: 'admin',  avatar: '#6c63ff', vehicles: 0, since: 'Jan 2024' },
    { id: 'U002', name: 'Rajesh Kumar',  email: 'rajesh@parkos.in',       role: 'staff',  avatar: '#00e5a0', vehicles: 1, since: 'Mar 2024' },
    { id: 'U003', name: 'Priya Sharma',  email: 'priya@gmail.com',        role: 'driver', avatar: '#ff6584', vehicles: 1, since: 'Jun 2024' },
    { id: 'U004', name: 'Amit Verma',    email: 'amit.v@gmail.com',       role: 'driver', avatar: '#f5a623', vehicles: 2, since: 'Sep 2024' },
    { id: 'U005', name: 'Meena Singh',   email: 'meena.s@parkos.in',      role: 'staff',  avatar: '#00e5a0', vehicles: 0, since: 'Nov 2024' },
    { id: 'U006', name: 'Kiran Rao',     email: 'kiran.rao@gmail.com',    role: 'driver', avatar: '#6c63ff', vehicles: 1, since: 'Jan 2025' },
    { id: 'U007', name: 'Sunita Devi',   email: 'sunita.d@gmail.com',     role: 'driver', avatar: '#f5a623', vehicles: 1, since: 'Feb 2025' },
    { id: 'U008', name: 'Dev Anand',     email: 'dev.a@parkos.in',        role: 'staff',  avatar: '#00e5a0', vehicles: 0, since: 'Mar 2025' },
  ];

  // Build slot map
  ZONES.forEach(zone => {
    state.slots[zone.id] = [];
    const total = zone.rows * zone.cols;
    const parkedPlates = state.vehicles.filter(v => v.slot?.startsWith(zone.id) && v.status === 'parked').map(v => v.slot);
    for (let i = 1; i <= total; i++) {
      const slotId = `${zone.id}-${String(i).padStart(2, '0')}`;
      const rand = Math.random();
      let status = 'available';
      if (parkedPlates.includes(slotId)) status = 'occupied';
      else if (rand < 0.35) status = 'occupied';
      else if (rand < 0.42) status = 'reserved';
      else if (i === total) status = 'disabled';
      state.slots[zone.id].push({ id: slotId, status });
    }
  });
}

function timeAgo(minutesAgo) {
  const d = new Date(Date.now() - minutesAgo * 60000);
  return d;
}

function formatTime(date) {
  if (!date) return '—';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateTime(date) {
  if (!date) return '—';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

function getDuration(entry, exit) {
  const end = exit || new Date();
  const mins = Math.floor((end - entry) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function calcBill(vehicle) {
  const end = vehicle.exitTime || new Date();
  const hours = Math.max((end - vehicle.entryTime) / 3600000, 0.5);
  return Math.round(RATES[vehicle.type] * Math.ceil(hours));
}

// ─── NAVIGATION ──────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  document.getElementById('breadcrumb').textContent = page.charAt(0).toUpperCase() + page.slice(1);
  state.currentPage = page;
  if (page === 'slots') renderSlotMap();
  if (page === 'vehicles') renderVehicleTable();
  if (page === 'users') renderUsers();
  if (page === 'reports') initReportCharts();
}

// ─── DASHBOARD ───────────────────────────────────────────────
function updateDashboardStats() {
  const totalSlots = Object.values(state.slots).flat().length;
  const occupied = Object.values(state.slots).flat().filter(s => s.status === 'occupied').length;
  const available = Object.values(state.slots).flat().filter(s => s.status === 'available').length;
  const parked = state.vehicles.filter(v => v.status === 'parked').length;
  const todayVehicles = state.vehicles.length;
  const revenue = state.vehicles.reduce((sum, v) => sum + (v.status === 'exited' ? calcBill(v) : 0), 0) + 12480;

  document.getElementById('statAvailable').textContent = available;
  document.getElementById('statOccupied').textContent = occupied;
  document.getElementById('statRevenue').textContent = `₹${revenue.toLocaleString('en-IN')}`;
  document.getElementById('statVehicles').textContent = todayVehicles + 126;
}

function renderZones() {
  const container = document.getElementById('zonesList');
  ZONES.forEach(zone => {
    const slots = state.slots[zone.id] || [];
    const total = slots.length;
    const occ = slots.filter(s => s.status === 'occupied').length;
    const pct = total ? Math.round(occ / total * 100) : 0;
    const row = document.createElement('div');
    row.className = 'zone-row';
    row.innerHTML = `
      <span class="zone-name">Zone ${zone.id}</span>
      <div class="zone-bar-wrap">
        <div class="zone-bar" style="width:0%;background:${zone.color}" data-target="${pct}"></div>
      </div>
      <span class="zone-pct">${pct}%</span>
    `;
    container.appendChild(row);
  });
  // Animate bars
  setTimeout(() => {
    document.querySelectorAll('.zone-bar').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  }, 200);
}

function renderActivity() {
  const container = document.getElementById('activityList');
  const activities = [
    { type: 'entry', plate: 'WB 08 KL 6789', slot: 'A-12', time: '5m ago' },
    { type: 'exit',  plate: 'WB 05 IJ 2345', slot: 'A-15', time: '18m ago', bill: '₹180' },
    { type: 'entry', plate: 'TN 07 MN 0123', slot: 'B-03', time: '32m ago' },
    { type: 'entry', plate: 'MH 12 EF 3456', slot: 'C-02', time: '1h ago' },
    { type: 'exit',  plate: 'RJ 14 PQ 4567', slot: 'B-08', time: '1h 15m ago', bill: '₹240' },
    { type: 'entry', plate: 'KA 01 GH 7890', slot: 'D-01', time: '2h ago' },
  ];
  activities.forEach(a => {
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="activity-icon ${a.type}"><i class="fa-solid fa-${a.type === 'entry' ? 'arrow-right-to-bracket' : 'arrow-right-from-bracket'}"></i></div>
      <div class="activity-body">
        <div class="activity-title">${a.type === 'entry' ? 'Entry' : 'Exit'} — <span class="plate-badge">${a.plate}</span></div>
        <div class="activity-sub">Slot ${a.slot}${a.bill ? ' · Billed: ' + a.bill : ''}</div>
      </div>
      <span class="activity-time">${a.time}</span>
    `;
    container.appendChild(item);
  });
}

function initDashboardCharts() {
  // Occupancy Chart
  const occCtx = document.getElementById('occupancyChart')?.getContext('2d');
  if (occCtx && !state.charts.occ) {
    state.charts.occ = new Chart(occCtx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Occupancy %',
          data: [62, 71, 68, 74, 82, 78, 58],
          borderColor: '#00e5a0', backgroundColor: 'rgba(0,229,160,0.08)',
          borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 4,
          pointBackgroundColor: '#00e5a0', pointBorderColor: '#0a0c10', pointBorderWidth: 2,
        }]
      },
      options: chartOptions('Occupancy (%)', '#00e5a0')
    });
  }

  // Revenue Chart
  const revCtx = document.getElementById('revenueChart')?.getContext('2d');
  if (revCtx && !state.charts.rev) {
    const hours = Array.from({length: 12}, (_, i) => `${6+i}:00`);
    state.charts.rev = new Chart(revCtx, {
      type: 'bar',
      data: {
        labels: hours,
        datasets: [{
          label: 'Revenue (₹)',
          data: [240, 480, 720, 960, 1200, 1440, 1320, 1080, 900, 720, 480, 360],
          backgroundColor: 'rgba(108,99,255,0.7)', borderColor: '#6c63ff',
          borderWidth: 1, borderRadius: 5,
        }]
      },
      options: chartOptions('Revenue (₹)', '#6c63ff')
    });
  }
}

function chartOptions(label, color) {
  const isDark = document.body.dataset.theme !== 'light';
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1e222c' : '#fff',
        titleColor: isDark ? '#edf2f7' : '#1a202c',
        bodyColor: isDark ? '#8892a4' : '#4a5568',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        borderWidth: 1, padding: 10,
      }
    },
    scales: {
      x: { grid: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }, ticks: { color: isDark ? '#4a5568' : '#a0aec0', font: { family: 'DM Mono', size: 11 } } },
      y: { grid: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }, ticks: { color: isDark ? '#4a5568' : '#a0aec0', font: { family: 'DM Mono', size: 11 } } }
    }
  };
}

// ─── SLOT MAP ─────────────────────────────────────────────────
function renderSlotMap() {
  const container = document.getElementById('slotZones');
  container.innerHTML = '';
  ZONES.forEach(zone => {
    const slots = state.slots[zone.id] || [];
    const avail = slots.filter(s => s.status === 'available').length;
    const zoneEl = document.createElement('div');
    zoneEl.className = 'slot-zone';
    zoneEl.innerHTML = `
      <div class="slot-zone-header">
        <h3>${zone.name}</h3>
        <span class="badge-info">${avail}/${slots.length} Available</span>
      </div>
      <div class="slot-grid" id="grid-${zone.id}"></div>
    `;
    container.appendChild(zoneEl);
    const grid = document.getElementById(`grid-${zone.id}`);
    slots.forEach(slot => {
      const icons = { available: 'fa-square-parking', occupied: 'fa-car', reserved: 'fa-bookmark', disabled: 'fa-ban' };
      const cell = document.createElement('div');
      cell.className = `slot-cell ${slot.status}`;
      cell.dataset.slot = slot.id;
      cell.innerHTML = `
        <i class="fa-solid ${icons[slot.status] || 'fa-square-parking'} slot-icon"></i>
        <span class="slot-num">${slot.id}</span>
      `;
      if (slot.status === 'available') {
        cell.addEventListener('click', () => openEntryForSlot(slot.id));
      } else if (slot.status === 'occupied') {
        const v = state.vehicles.find(v => v.slot === slot.id && v.status === 'parked');
        if (v) cell.addEventListener('click', () => openExitModal(v.id));
      }
      grid.appendChild(cell);
    });
  });
}

// ─── VEHICLE TABLE ───────────────────────────────────────────
function renderVehicleTable(filter = '') {
  const tbody = document.getElementById('vehicleTableBody');
  tbody.innerHTML = '';
  const statusFilter = document.getElementById('vehicleStatusFilter')?.value || '';
  const search = filter || document.getElementById('vehicleSearch')?.value.toLowerCase() || '';
  const filtered = state.vehicles.filter(v => {
    const matchSearch = !search || v.plate.toLowerCase().includes(search) || v.owner.toLowerCase().includes(search);
    const matchStatus = !statusFilter || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  filtered.forEach(v => {
    const duration = getDuration(v.entryTime, v.exitTime || null);
    const bill = v.status === 'exited' ? `₹${calcBill(v)}` : `₹${calcBill(v)} est.`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="plate-badge">${v.plate}</span></td>
      <td>${v.owner}</td>
      <td><i class="fa-solid fa-${typeIcon(v.type)}"></i> ${v.type.charAt(0).toUpperCase() + v.type.slice(1)}</td>
      <td><span class="plate-badge">${v.slot || '—'}</span></td>
      <td>${formatDateTime(v.entryTime)}</td>
      <td style="font-family:var(--font-mono)">${duration}</td>
      <td><span class="status-badge status-${v.status}">${statusDot(v.status)} ${v.status.toUpperCase()}</span></td>
      <td>
        ${v.status === 'parked' ? `<button class="action-btn success" onclick="openExitModal('${v.id}')">Exit</button>` : ''}
        <button class="action-btn" onclick="viewVehicle('${v.id}')">View</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (filtered.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px">No vehicles found</td>`;
    tbody.appendChild(tr);
  }
}

function typeIcon(t) { return { car: 'car', bike: 'motorcycle', truck: 'truck', ev: 'bolt' }[t] || 'car'; }
function statusDot(s) { return s === 'parked' ? '●' : '○'; }

// ─── USERS ───────────────────────────────────────────────────
function renderUsers(filter = '') {
  const grid = document.getElementById('usersGrid');
  grid.innerHTML = '';
  const roleFilter = document.getElementById('userRoleFilter')?.value || '';
  const search = filter || document.getElementById('userSearch')?.value.toLowerCase() || '';
  const filtered = state.users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  filtered.forEach(u => {
    const card = document.createElement('div');
    card.className = 'user-card-item';
    card.innerHTML = `
      <div class="user-card-avatar" style="background:${u.avatar}">${u.name.charAt(0)}</div>
      <div class="user-card-name">${u.name}</div>
      <div class="user-card-email">${u.email}</div>
      <span class="user-card-role role-${u.role}">${u.role.toUpperCase()}</span>
      <div class="user-card-stats">
        <div class="u-stat"><span>${u.vehicles}</span><span>Vehicles</span></div>
        <div class="u-stat"><span>${u.since}</span><span>Member Since</span></div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ─── REPORTS CHARTS ──────────────────────────────────────────
function initReportCharts() {
  // Vehicle Type Donut
  const vtCtx = document.getElementById('vehicleTypeChart')?.getContext('2d');
  if (vtCtx && !state.charts.vt) {
    state.charts.vt = new Chart(vtCtx, {
      type: 'doughnut',
      data: {
        labels: ['Car', 'Bike', 'Truck', 'EV'],
        datasets: [{ data: [58, 22, 12, 8], backgroundColor: ['#00e5a0','#6c63ff','#f5a623','#ff6584'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#8892a4', font: { family: 'DM Mono', size: 11 }, padding: 16 } } }, cutout: '65%' }
    });
  }

  // Peak Hours
  const phCtx = document.getElementById('peakHoursChart')?.getContext('2d');
  if (phCtx && !state.charts.ph) {
    state.charts.ph = new Chart(phCtx, {
      type: 'bar',
      data: {
        labels: Array.from({length: 18}, (_, i) => `${6+i}h`),
        datasets: [{
          label: 'Vehicles',
          data: [8, 15, 22, 28, 35, 42, 38, 30, 25, 32, 45, 52, 48, 38, 30, 20, 12, 6],
          backgroundColor: (ctx) => {
            const v = ctx.raw;
            if (v >= 40) return 'rgba(255,77,109,0.8)';
            if (v >= 25) return 'rgba(245,166,35,0.8)';
            return 'rgba(0,229,160,0.6)';
          },
          borderRadius: 4, borderWidth: 0
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#4a5568', font: { family: 'DM Mono', size: 10 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5568', font: { family: 'DM Mono', size: 10 } } } } }
    });
  }

  // Revenue Trend
  const rtCtx = document.getElementById('revenueTrendChart')?.getContext('2d');
  if (rtCtx && !state.charts.rt) {
    const days = Array.from({length: 30}, (_, i) => i + 1);
    const rev = days.map(() => Math.floor(Math.random() * 8000 + 6000));
    state.charts.rt = new Chart(rtCtx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: 'Revenue (₹)', data: rev,
          borderColor: '#f5a623', backgroundColor: 'rgba(245,166,35,0.08)',
          borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0,
        }]
      },
      options: chartOptions('Revenue', '#f5a623')
    });
  }

  renderTransactions();
}

function renderTransactions() {
  const tbody = document.getElementById('transactionBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const txns = [
    { id: 'TXN-001', plate: 'WB 05 IJ 2345', entry: '10:30 AM', exit: '1:45 PM', duration: '3h 15m', slot: 'A-15', amount: '₹195', status: 'paid' },
    { id: 'TXN-002', plate: 'DL 9X AB 7890', entry: '09:00 AM', exit: '11:30 AM', duration: '2h 30m', slot: 'B-06', amount: '₹150', status: 'paid' },
    { id: 'TXN-003', plate: 'MH 04 PQ 3456', entry: '08:15 AM', exit: '10:00 AM', duration: '1h 45m', slot: 'C-09', amount: '₹105', status: 'paid' },
    { id: 'TXN-004', plate: 'WB 12 RS 9012', entry: '11:00 AM', exit: '02:30 PM', duration: '3h 30m', slot: 'A-07', amount: '₹210', status: 'paid' },
    { id: 'TXN-005', plate: 'KA 05 TU 5678', entry: '07:45 AM', exit: '09:15 AM', duration: '1h 30m', slot: 'D-04', amount: '₹75', status: 'paid' },
  ];
  txns.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${t.id}</td>
      <td><span class="plate-badge">${t.plate}</span></td>
      <td style="font-family:var(--font-mono);font-size:12px">${t.entry}</td>
      <td style="font-family:var(--font-mono);font-size:12px">${t.exit}</td>
      <td style="font-family:var(--font-mono);font-size:12px">${t.duration}</td>
      <td><span class="plate-badge">${t.slot}</span></td>
      <td style="font-family:var(--font-display);font-weight:700;color:var(--accent)">${t.amount}</td>
      <td><span class="status-badge status-parked">${t.status.toUpperCase()}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ─── ENTRY MODAL ─────────────────────────────────────────────
function openEntryModal() {
  document.getElementById('entryModal').classList.add('open');
  document.getElementById('entryPlate').focus();
}

function openEntryForSlot(slotId) {
  openEntryModal();
  const zone = slotId.split('-')[0];
  document.getElementById('entryZone').value = zone;
  document.getElementById('slotPreview').innerHTML = `<i class="fa-solid fa-circle-check"></i> Slot <strong>${slotId}</strong> selected`;
}

function closeEntryModal() {
  document.getElementById('entryModal').classList.remove('open');
  ['entryPlate', 'entryOwner', 'entryPhone'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('entryType').value = 'car';
  document.getElementById('entryZone').value = 'auto';
  document.getElementById('slotPreview').innerHTML = '<i class="fa-solid fa-circle-info"></i> Slot will be auto-assigned on entry';
}

function confirmEntry() {
  const plate = document.getElementById('entryPlate').value.trim().toUpperCase();
  const type = document.getElementById('entryType').value;
  const owner = document.getElementById('entryOwner').value.trim() || 'Guest';
  const phone = document.getElementById('entryPhone').value.trim() || '—';
  const zoneChoice = document.getElementById('entryZone').value;

  if (!plate) { showToast('Please enter a license plate number', 'error'); return; }
  if (state.vehicles.some(v => v.plate === plate && v.status === 'parked')) {
    showToast(`Vehicle ${plate} is already parked`, 'error'); return;
  }

  // Find available slot
  const targetZones = zoneChoice === 'auto' ? Object.keys(state.slots) : [zoneChoice];
  let assignedSlot = null;
  for (const zid of targetZones) {
    const available = state.slots[zid]?.find(s => s.status === 'available');
    if (available) { assignedSlot = available; break; }
  }
  if (!assignedSlot) { showToast('No available slots in selected zone!', 'error'); return; }

  assignedSlot.status = 'occupied';
  const v = { id: `V${String(state.vehicles.length + 1).padStart(3, '0')}`, plate, owner, type, slot: assignedSlot.id, entryTime: new Date(), status: 'parked', phone };
  state.vehicles.unshift(v);

  closeEntryModal();
  updateDashboardStats();
  if (state.currentPage === 'vehicles') renderVehicleTable();
  if (state.currentPage === 'slots') renderSlotMap();
  showToast(`✓ ${plate} assigned to slot ${assignedSlot.id}`, 'success');
}

// ─── EXIT MODAL ──────────────────────────────────────────────
let exitVehicleId = null;

function openExitModal(vehicleId) {
  const v = state.vehicles.find(v => v.id === vehicleId);
  if (!v) return;
  exitVehicleId = vehicleId;
  const duration = getDuration(v.entryTime);
  const bill = calcBill(v);
  document.getElementById('exitModalBody').innerHTML = `
    <div class="billing-box">
      <div class="billing-row"><span>License Plate</span><span class="plate-badge">${v.plate}</span></div>
      <div class="billing-row"><span>Vehicle Type</span><span>${v.type.charAt(0).toUpperCase() + v.type.slice(1)}</span></div>
      <div class="billing-row"><span>Slot</span><span class="plate-badge">${v.slot}</span></div>
      <div class="billing-row"><span>Entry Time</span><span>${formatDateTime(v.entryTime)}</span></div>
      <div class="billing-row"><span>Exit Time</span><span>${formatDateTime(new Date())}</span></div>
      <div class="billing-row"><span>Duration</span><span>${duration}</span></div>
      <div class="billing-row"><span>Rate</span><span>₹${RATES[v.type]}/hr</span></div>
      <div class="billing-row"><span>Total Amount</span><span>₹${bill}</span></div>
    </div>
  `;
  document.getElementById('exitModal').classList.add('open');
}

function closeExitModal() {
  document.getElementById('exitModal').classList.remove('open');
  exitVehicleId = null;
}

function confirmExit() {
  if (!exitVehicleId) return;
  const v = state.vehicles.find(v => v.id === exitVehicleId);
  if (!v) return;
  v.exitTime = new Date();
  v.status = 'exited';
  // Free slot
  const [zoneId] = v.slot.split('-');
  const slot = state.slots[zoneId]?.find(s => s.id === v.slot);
  if (slot) slot.status = 'available';
  v.slot = null;

  closeExitModal();
  updateDashboardStats();
  if (state.currentPage === 'vehicles') renderVehicleTable();
  if (state.currentPage === 'slots') renderSlotMap();
  showToast(`✓ Exit processed — ₹${calcBill(v)} billed`, 'success');
}

function viewVehicle(id) {
  const v = state.vehicles.find(v => v.id === id);
  if (!v) return;
  showToast(`${v.plate} — ${v.owner} — Slot ${v.slot || 'N/A'} — ${getDuration(v.entryTime, v.exitTime)}`, 'info');
}

// ─── TOAST ───────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3800);
}

// ─── TIME ────────────────────────────────────────────────────
function updateTime() {
  const el = document.getElementById('currentTime');
  if (el) el.textContent = new Date().toLocaleString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

// ─── INIT ────────────────────────────────────────────────────
function init() {
  seedData();
  updateDashboardStats();
  renderZones();
  renderActivity();

  // Defer charts
  requestAnimationFrame(() => {
    setTimeout(initDashboardCharts, 100);
  });

  // Clock
  updateTime();
  setInterval(updateTime, 1000);

  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => { e.preventDefault(); navigate(item.dataset.page); });
  });

  // Entry modal triggers
  document.getElementById('quickEntryBtn')?.addEventListener('click', openEntryModal);
  document.getElementById('entryBtn')?.addEventListener('click', openEntryModal);
  document.getElementById('closeEntryModal')?.addEventListener('click', closeEntryModal);
  document.getElementById('cancelEntry')?.addEventListener('click', closeEntryModal);
  document.getElementById('confirmEntry')?.addEventListener('click', confirmEntry);

  // Exit modal
  document.getElementById('closeExitModal')?.addEventListener('click', closeExitModal);
  document.getElementById('cancelExit')?.addEventListener('click', closeExitModal);
  document.getElementById('confirmExit')?.addEventListener('click', confirmExit);

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
  });

  // Search & filters
  document.getElementById('vehicleSearch')?.addEventListener('input', e => renderVehicleTable(e.target.value));
  document.getElementById('vehicleStatusFilter')?.addEventListener('change', () => renderVehicleTable());
  document.getElementById('userSearch')?.addEventListener('input', e => renderUsers(e.target.value));
  document.getElementById('userRoleFilter')?.addEventListener('change', () => renderUsers());

  // Add user btn
  document.getElementById('addUserBtn')?.addEventListener('click', () => showToast('User registration modal — API: POST /api/v1/users', 'info'));

  // Theme toggle
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = state.theme === 'light' ? 'light' : '';
    document.getElementById('themeToggle').innerHTML = state.theme === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    // Destroy and re-init charts for theme
    Object.values(state.charts).forEach(c => c.destroy());
    state.charts = {};
    if (state.currentPage === 'dashboard') setTimeout(initDashboardCharts, 50);
    if (state.currentPage === 'reports') setTimeout(initReportCharts, 50);
  });

  // Mobile menu
  document.getElementById('menuBtn')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Toggles
  document.querySelectorAll('.toggle').forEach(t => {
    t.addEventListener('click', () => { t.classList.toggle('active'); });
  });

  // Slot filter chips
  document.querySelectorAll('[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter;
      document.querySelectorAll('.slot-cell').forEach(cell => {
        cell.style.display = (filter === 'all' || cell.classList.contains(filter)) ? '' : 'none';
      });
    });
  });

  // Global search
  document.getElementById('globalSearch')?.addEventListener('input', e => {
    const q = e.target.value.trim();
    if (q) {
      navigate('vehicles');
      document.getElementById('vehicleSearch').value = q;
      renderVehicleTable(q);
    }
  });

  // Simulate live updates
  setInterval(() => {
    if (Math.random() < 0.3) {
      updateDashboardStats();
    }
  }, 10000);
}

document.addEventListener('DOMContentLoaded', init);
