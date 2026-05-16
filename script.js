/* =============================================
   script.js — Payment Tracker Logic
   ============================================= */

// ── CONFIG ──────────────────────────────────────────────────────────────────
// Replace this with your deployed Google Apps Script Web App URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwoIFwXBXezwYgxG8Ru1z3TPraXpEB5E_C02QFJlhqLwSXRxo-Yu5yB_w8n20Y2lRkw4w/exec';

// Card catalogues — different for Debit and Credit
const DEBIT_CARDS = {
  HDFC:     ['xx7327', 'xx2604', 'xx3254', 'xx7403'],
  ICICI:    ['xx3005', 'xx3104', 'xx4008'],
  AXIS:     ['xx3447', 'xx2998', 'xx3202'],
  SBI:      ['xx6274', 'xx1686', 'xx5399', 'xx8810'],
  IndusIND: ['xx0834'],
};

const CREDIT_CARDS = {
  HDFC:     ['xx6292'],
  ICICI:    ['xx2711'],
  UCO:      ['xx9329'],
  UBI:      ['xx3465'],
};

// ── STATE ────────────────────────────────────────────────────────────────────
let transactionType = 'Debit';
let recentTransactions = [];

// ── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  initParticles();
  
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (localStorage.getItem('pt_logged_in') === 'true' && localStorage.getItem('pt_user') && localStorage.getItem('pt_secret_code')) {
    showMainApp();
    loadFromLocalStorage();
    renderRecentList();
  } else {
    // If they have an old session without credentials, clear it
    localStorage.removeItem('pt_logged_in');
    localStorage.removeItem('pt_user');
    localStorage.removeItem('pt_secret_code');
  }

  // Small stagger reveal for form groups
  document.querySelectorAll('.form-group').forEach((el, i) => {
    el.style.animationDelay = `${0.08 + i * 0.06}s`;
  });
});

function showMainApp() {
  document.getElementById('loginWrapper').classList.add('hidden');
  const appWrapper = document.getElementById('appWrapper');
  appWrapper.classList.remove('hidden');
  appWrapper.style.display = 'flex';
}

// ── LOGIN FLOW ───────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();

  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'login',
        username: user,
        password: pass
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      localStorage.setItem('pt_logged_in', 'true');
      localStorage.setItem('pt_user', user);
      localStorage.setItem('pt_secret_code', result.secret_code);
      showMainApp();
      loadFromLocalStorage();
      renderRecentList();
      showToast('✅', 'Welcome back!', 'success');
      loadRecentTransactions(); // Fetch latest after login
    } else {
      showToast('❌', result.error || 'Invalid credentials', 'error');
      document.getElementById('loginPass').value = '';
    }
  } catch (err) {
    showToast('⚠️', 'Network error during login', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function handleAuthError() {
  localStorage.removeItem('pt_logged_in');
  localStorage.removeItem('pt_user');
  localStorage.removeItem('pt_secret_code');
  location.reload();
}

// ── DATE ──────────────────────────────────────────────────────────────────────
function setTodayDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm   = String(today.getMonth() + 1).padStart(2, '0');
  const dd   = String(today.getDate()).padStart(2, '0');
  document.getElementById('transactionDate').value = `${yyyy}-${mm}-${dd}`;
}

// ── TRANSACTION TYPE TOGGLE ───────────────────────────────────────────────────
function setTransactionType(type) {
  transactionType = type;
  const slider    = document.getElementById('toggleSlider');
  const btnDebit  = document.getElementById('btnDebit');
  const btnCredit = document.getElementById('btnCredit');
  const btnDash   = document.getElementById('btnDashboard');
  const typeLabel = document.getElementById('typeLabel');
  const typeIndicator = document.getElementById('typeIndicator');
  
  const form = document.getElementById('trackerForm');
  const recentSec = document.querySelector('.recent-section');
  const dashSec = document.getElementById('dashboardSection');
  
  const spentByLabelText = document.getElementById('spentByLabelText');
  const cardUsedLabelText = document.getElementById('cardUsedLabelText');

  btnDebit.classList.remove('active');
  btnCredit.classList.remove('active');
  if (btnDash) btnDash.classList.remove('active');
  slider.classList.remove('credit', 'dashboard');

  if (type === 'Dashboard') {
    if (btnDash) btnDash.classList.add('active');
    slider.classList.add('dashboard');
    if (typeIndicator) typeIndicator.style.display = 'none';
    form.style.display = 'none';
    if (recentSec) recentSec.style.display = 'none';
    if (dashSec) dashSec.style.display = 'grid';
    renderDashboard();
    return;
  }

  if (typeIndicator) typeIndicator.style.display = 'block';
  form.style.display = 'grid';
  if (recentSec) recentSec.style.display = 'block';
  if (dashSec) dashSec.style.display = 'none';

  if (type === 'Debit') {
    btnDebit.classList.add('active');
    typeLabel.style.color = 'var(--accent-primary)';
    if(spentByLabelText) spentByLabelText.textContent = 'Spent By';
    if(cardUsedLabelText) cardUsedLabelText.textContent = 'Card Used';
  } else {
    slider.classList.add('credit');
    btnCredit.classList.add('active');
    typeLabel.style.color = 'var(--accent-green)';
    if(spentByLabelText) spentByLabelText.textContent = 'Credited By';
    if(cardUsedLabelText) cardUsedLabelText.textContent = 'account No.';
  }
  typeLabel.textContent = type;

  // Rebuild bank dropdown for the current mode
  updateBankDropdown();

  // Subtle card pulse
  const card = document.getElementById('trackerCard');
  card.style.transition = 'box-shadow 0.3s ease';
  card.style.boxShadow = type === 'Debit'
    ? '0 4px 6px rgba(0,0,0,0.2), 0 20px 60px rgba(0,0,0,0.35), 0 0 40px rgba(99,102,241,0.08) inset'
    : '0 4px 6px rgba(0,0,0,0.2), 0 20px 60px rgba(0,0,0,0.35), 0 0 40px rgba(34,211,163,0.06) inset';
}

// ── SPENT BY DROPDOWN ─────────────────────────────────────────────────────────
function handleSpentByChange() {
  const val     = document.getElementById('spentBy').value;
  const wrapper = document.getElementById('customNameWrapper');
  const input   = document.getElementById('customName');

  if (val === 'Others') {
    wrapper.classList.add('visible');
    input.focus();
    input.required = true;
  } else {
    wrapper.classList.remove('visible');
    input.required = false;
    input.value = '';
  }
}

// ── BANK DROPDOWN (dynamic per mode) ──────────────────────────────────────────
function updateBankDropdown() {
  const catalogue = transactionType === 'Credit' ? CREDIT_CARDS : DEBIT_CARDS;
  const bankSelect = document.getElementById('bankName');
  const cardSelect = document.getElementById('cardNo');

  bankSelect.innerHTML = '<option value="">— Select Bank —</option>';
  Object.keys(catalogue).forEach(bank => {
    const opt = document.createElement('option');
    opt.value = bank;
    opt.textContent = bank;
    bankSelect.appendChild(opt);
  });

  // Reset card dropdown too
  cardSelect.innerHTML = '<option value="">— Select Bank First —</option>';
}

// ── CARD FILTER BY BANK ───────────────────────────────────────────────────────
function filterCards() {
  const bank   = document.getElementById('bankName').value;
  const select = document.getElementById('cardNo');
  const catalogue = transactionType === 'Credit' ? CREDIT_CARDS : DEBIT_CARDS;

  select.innerHTML = '';

  if (!bank) {
    select.innerHTML = '<option value="">— Select Bank First —</option>';
    return;
  }

  const cards = catalogue[bank] || [];
  if (!cards.length) {
    select.innerHTML = '<option value="">No cards registered</option>';
    return;
  }

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Select Card —';
  select.appendChild(placeholder);

  cards.forEach(card => {
    const opt = document.createElement('option');
    opt.value = card;
    opt.textContent = card;
    select.appendChild(opt);
  });

  if (cards.length === 1) {
    select.value = cards[0];
  }

  // Animate the select
  select.style.animation = 'none';
  select.offsetHeight; // reflow
  select.style.animation = 'fadeUp 0.3s var(--spring) both';
}

// ── FORM SUBMIT ───────────────────────────────────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault();

  const btn    = document.getElementById('submitBtn');
  const form   = document.getElementById('trackerForm');

  // Validate
  if (!validateForm()) return;

  // Collect data
  const data = collectFormData();

  // UI → loading state
  setLoading(true);

  try {
    if (GAS_URL && GAS_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
      await sendToSheet(data);
    } else {
      // Demo mode — simulate delay
      await sleep(1400);
      console.log('Demo mode — would send:', data);
    }

    // Save to local store + render
    recentTransactions.unshift(data);
    if (recentTransactions.length > 20) recentTransactions.pop();
    saveToLocalStorage();
    renderRecentList();

    showToast('✅', 'Transaction saved to Google Sheet!', 'success');
    form.reset();
    setTodayDate();
    filterCards();
    handleSpentByChange();
    setTransactionType('Debit');

  } catch (err) {
    console.error(err);
    showToast('❌', 'Failed to save. Check your GAS URL.', 'error');
  } finally {
    setLoading(false);
    createRipple(btn);
  }
}

// ── VALIDATION ────────────────────────────────────────────────────────────────
function validateForm() {
  const date   = document.getElementById('transactionDate').value;
  const person = document.getElementById('spentBy').value;
  const custom = document.getElementById('customName').value;
  const amt    = document.getElementById('amount').value;
  const bank   = document.getElementById('bankName').value;
  const card   = document.getElementById('cardNo').value;

  if (!date) { shakeField('transactionDate'); return false; }
  if (!person) { shakeField('spentBy'); return false; }
  if (person === 'Others' && !custom.trim()) { shakeField('customName'); return false; }
  if (!amt || parseFloat(amt) <= 0) { shakeField('amount'); return false; }
  if (!bank) { shakeField('bankName'); return false; }
  if (!card) { shakeField('cardNo'); return false; }

  return true;
}

function shakeField(id) {
  const el = document.getElementById(id);
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shake 0.4s ease';
  el.style.borderColor = 'var(--accent-red)';
  el.focus();

  el.addEventListener('input', () => {
    el.style.borderColor = '';
    el.style.animation = '';
  }, { once: true });
}

// Inject shake keyframe dynamically
const shakeKF = document.createElement('style');
shakeKF.textContent = `
  @keyframes shake {
    0%,100%{transform:translateX(0)}
    20%    {transform:translateX(-6px)}
    40%    {transform:translateX(6px)}
    60%    {transform:translateX(-4px)}
    80%    {transform:translateX(4px)}
  }
`;
document.head.appendChild(shakeKF);

// ── DATA COLLECTION ───────────────────────────────────────────────────────────
function collectFormData() {
  const person = document.getElementById('spentBy').value;
  const custom = document.getElementById('customName').value;

  return {
    type:            transactionType,
    transactionDate: document.getElementById('transactionDate').value,
    spentBy:         person === 'Others' ? custom.trim() : person,
    amount:          parseFloat(document.getElementById('amount').value),
    bankName:        document.getElementById('bankName').value,
    cardNo:          document.getElementById('cardNo').value,
    remarks:         document.getElementById('remarks').value.trim(),
    submittedAt:     new Date().toISOString(),
  };
}

// ── GOOGLE SHEETS API CALL ────────────────────────────────────────────────────
async function sendToSheet(data) {
  data.action = 'save';
  data.username = localStorage.getItem('pt_user') || '';
  data.secret_code = localStorage.getItem('pt_secret_code') || '';
  const response = await fetch(GAS_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body:    JSON.stringify(data)
  });
  const result = await response.json();
  if (!result.success) {
    if (result.error === 'Invalid or missing Secret_Code') handleAuthError();
    throw new Error(result.error || 'Failed to save');
  }
}

async function loadRecentTransactions() {
  const btn = document.getElementById('refreshBtn');
  btn.style.animation = 'spin 0.6s linear';
  btn.addEventListener('animationend', () => btn.style.animation = '', { once: true });

  if (GAS_URL && GAS_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
    try {
      const u = encodeURIComponent(localStorage.getItem('pt_user') || '');
      const s = encodeURIComponent(localStorage.getItem('pt_secret_code') || '');
      const res  = await fetch(`${GAS_URL}?action=getRecent&limit=10&username=${u}&secret_code=${s}`);
      const json = await res.json();
      if (json.data) {
        recentTransactions = json.data;
        saveToLocalStorage();
        renderRecentList();
        showToast('🔄', 'Transactions refreshed!', 'success');
      } else if (!json.success && (json.error === 'Invalid or missing Secret_Code' || json.error === 'Invalid username or password')) {
        handleAuthError();
      }
    } catch (err) {
      showToast('⚠️', 'Could not fetch from sheet.', 'error');
    }
  } else {
    showToast('ℹ️', 'Connect GAS URL to fetch live data.', 'info');
  }
}

// ── LOCAL STORAGE ─────────────────────────────────────────────────────────────
function saveToLocalStorage() {
  try {
    localStorage.setItem('pt_transactions', JSON.stringify(recentTransactions));
  } catch (_) {}
}

function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem('pt_transactions');
    if (saved) recentTransactions = JSON.parse(saved);
  } catch (_) {}
}

// ── RENDER RECENT LIST ────────────────────────────────────────────────────────
function renderRecentList() {
  const list = document.getElementById('recentList');

  if (!recentTransactions.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>No transactions yet. Submit your first one above!</p>
      </div>`;
    return;
  }

  list.innerHTML = '';
  recentTransactions.slice(0, 10).forEach((txn, i) => {
    const row = document.createElement('div');
    row.className = 'txn-row';
    row.style.animationDelay = `${i * 0.05}s`;

    const isDebit  = txn.type === 'Debit';
    const icon     = isDebit ? '↓' : '↑';
    const dateStr  = formatDate(txn.transactionDate);
    const amtStr   = `₹${Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    row.innerHTML = `
      <div class="txn-badge ${isDebit ? 'debit' : 'credit'}">${icon}</div>
      <div class="txn-info">
        <div class="txn-name">${esc(txn.spentBy)}</div>
        <div class="txn-meta">
          <span>${dateStr}</span>
          <span class="txn-dot">•</span>
          <span>${esc(txn.bankName)}</span>
          <span class="txn-dot">•</span>
          <span>${esc(txn.cardNo)}</span>
          ${txn.remarks ? `<span class="txn-dot">•</span><span>${esc(txn.remarks)}</span>` : ''}
        </div>
      </div>
      <div class="txn-amount ${isDebit ? 'debit' : 'credit'}">${isDebit ? '-' : '+'}${amtStr}</div>
    `;

    list.appendChild(row);
  });
  
  renderDashboard();
}

function renderDashboard() {
  let balance = 0;
  let credit = 0;
  let debit = 0;
  
  recentTransactions.forEach(txn => {
    const amt = parseFloat(txn.amount) || 0;
    if (txn.type === 'Credit') {
      credit += amt;
      balance += amt;
    } else if (txn.type === 'Debit') {
      debit += amt;
      balance -= amt;
    }
  });

  const dashBalance = document.getElementById('dashBalance');
  const dashCredit = document.getElementById('dashCredit');
  const dashDebit = document.getElementById('dashDebit');
  
  if(dashBalance) dashBalance.textContent = `₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if(dashCredit) dashCredit.textContent = `₹${credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if(dashDebit) dashDebit.textContent = `₹${debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ── UI HELPERS ────────────────────────────────────────────────────────────────
function setLoading(on) {
  const btn = document.getElementById('submitBtn');
  if (on) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

let toastTimer;
function showToast(icon, msg, type = 'success') {
  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toastIcon');
  const toastMsg  = document.getElementById('toastMessage');

  toastIcon.textContent = icon;
  toastMsg.textContent  = msg;

  // Color coding
  toast.style.borderColor =
    type === 'success' ? 'rgba(34,211,163,0.3)' :
    type === 'error'   ? 'rgba(244,63,94,0.3)'  :
                         'rgba(99,102,241,0.3)';

  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}

function createRipple(btn) {
  const circle = document.createElement('span');
  circle.className = 'ripple';
  const size = Math.max(btn.offsetWidth, btn.offsetHeight);
  circle.style.width = circle.style.height = `${size}px`;
  circle.style.left  = `${btn.offsetWidth  / 2 - size / 2}px`;
  circle.style.top   = `${btn.offsetHeight / 2 - size / 2}px`;
  btn.appendChild(circle);
  circle.addEventListener('animationend', () => circle.remove());
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── PARTICLE CANVAS ───────────────────────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  const ctx    = canvas.getContext('2d');

  let W, H, particles = [];

  const resize = () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x    = Math.random() * W;
      this.y    = Math.random() * H;
      this.r    = Math.random() * 1.8 + 0.4;
      this.vx   = (Math.random() - 0.5) * 0.3;
      this.vy   = (Math.random() - 0.5) * 0.3;
      this.life = Math.random();
      this.maxLife = 0.5 + Math.random() * 0.5;
      this.hue  = 230 + Math.random() * 60;
    }
    update() {
      this.x    += this.vx;
      this.y    += this.vy;
      this.life -= 0.002;
      if (this.life <= 0 || this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    }
    draw() {
      const alpha = Math.min(this.life / this.maxLife, 1) * 0.6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 70%, 70%, ${alpha})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < 80; i++) particles.push(new Particle());

  const loop = () => {
    ctx.clearRect(0, 0, W, H);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(99,102,241,${(1 - dist/100) * 0.08})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  };
  loop();
}
