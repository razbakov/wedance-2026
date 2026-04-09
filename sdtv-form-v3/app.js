// @ts-check
/* ========================================
   SDTV FORM v3 — LIVE
   Connected to Airtable via Express backend.
   Find My Dance searches real captures.
   Walk-up and Notify Me save to People table.
   ======================================== */

/** @type {string} API base URL (empty = same origin) */
const API = '';

/**
 * Escape HTML to prevent XSS in dynamic content.
 * @param {string} str — raw user input
 * @returns {string} HTML-safe string
 */
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/**
 * Trigger server-side ffmpeg preview generation + poll until ready.
 * Lightweight previews (720p, 10s, ~2.5MB) replace raw Dropbox 4K streams.
 * @param {string} captureId — Airtable record ID
 */
async function warmPreview(captureId) {
  const video = document.querySelector(`[id$="video-${captureId}"], [id$="video-ul-${captureId}"]`);
  try {
    const res = await fetch(`${API}/api/preview/${captureId}`, { headers: { Range: 'bytes=0-0' } });
    if (res.status === 202) {
      // Generating — poll every 3s
      const poll = setInterval(async () => {
        try {
          const check = await fetch(`${API}/api/preview/status/${captureId}`);
          const data = await check.json();
          if (data.ready) {
            clearInterval(poll);
            if (video) { video.src = `${API}/api/preview/${captureId}`; video.load(); }
          }
        } catch {}
      }, 3000);
      // Stop polling after 2 minutes
      setTimeout(() => clearInterval(poll), 120000);
    } else if (res.ok && video) {
      // Already cached — reload video element
      video.src = `${API}/api/preview/${captureId}`;
      video.load();
    }
  } catch {}
}

/**
 * Haptic feedback for mobile interactions.
 * @param {'light'|'medium'|'heavy'} [style='light']
 */
function haptic(style = 'light') {
  try { navigator.vibrate?.( style === 'heavy' ? 30 : style === 'medium' ? 15 : 8 ); } catch {}
}

// ==========================================
// IG AUTOCOMPLETE
// ==========================================
let _acTimer = null;
let _acController = null;

function onIdentityInput() {
  clearTimeout(_acTimer);
  if (_acController) { _acController.abort(); _acController = null; }

  const input = document.getElementById('dancerIdentity');
  const val = (input.value || '').trim().replace(/^@/, '').toLowerCase();
  input.value = input.value.toLowerCase(); // auto-lowercase

  // Hide checkmark on new typing
  const check = document.getElementById('igMatchCheck');
  if (check) check.style.display = 'none';

  const drop = document.getElementById('igAutocompleteDropdown');
  if (val.length < 2) { drop.style.display = 'none'; return; }

  _acTimer = setTimeout(async () => {
    _acController = new AbortController();
    try {
      const res = await fetch(`${API}/api/people/autocomplete?q=${encodeURIComponent(val)}`, { signal: _acController.signal });
      const data = await res.json();
      const recs = data.records || [];
      if (recs.length === 0) { drop.style.display = 'none'; return; }

      drop.innerHTML = '';
      recs.forEach((r, idx) => {
        const f = r.fields;
        const ig = (f.Instagram || '').replace(/^@/, '');
        const email = f.Email || '';
        const name = f.Name || '';
        const detail = [name, email].filter(Boolean).join(' · ');
        const el = document.createElement('div');
        el.className = 'ig-ac-item';
        el.innerHTML = `<span class="ig-ac-handle">@${esc(ig)}</span>${detail ? `<span class="ig-ac-detail">${esc(detail)}</span>` : ''}`;
        el.onmousedown = () => selectIgSuggestion(ig, email, name);
        el.ontouchstart = (e) => acTouchStart(e);
        el.ontouchend = (e) => acTouchEnd(e, ig, email, name);
        drop.appendChild(el);
      });
      drop.style.display = 'block';
    } catch (e) {
      if (e.name !== 'AbortError') drop.style.display = 'none';
    }
  }, 400);
}

function selectIgSuggestion(ig, email, name) {
  const input = document.getElementById('dancerIdentity');
  input.value = ig;
  state.dancerIdentity = ig;
  state.knownEmail = (email || '').trim();
  state.knownName = (name || '').trim();
  document.getElementById('igAutocompleteDropdown').style.display = 'none';
  // Show green checkmark
  const check = document.getElementById('igMatchCheck');
  if (check) check.style.display = '';
  validateIdentity();
  haptic('medium');

  // Personalize — greet by name when we recognize them
  const firstName = (name || '').split(' ')[0];
  if (firstName) {
    const title = document.getElementById('identityTitle');
    const subtitle = document.getElementById('identitySubtitle');
    if (title) title.textContent = `Hey ${esc(firstName)}! 👋`;
    if (subtitle) subtitle.textContent = `Let's find your footage`;
  }
}

// Hide dropdown on blur (delay so tap registers)
document.addEventListener('click', (e) => {
  const drop = document.getElementById('igAutocompleteDropdown');
  if (drop && !e.target.closest('#dancerIdentity') && !e.target.closest('.ig-ac-dropdown')) {
    drop.style.display = 'none';
  }
});

// ==========================================
// STATE
// ==========================================

/**
 * @typedef {'archive'|'preorder'|'visibility'|'notsure'|'walkup'|'status'} FlowType
 * @typedef {'social'|'show'|'both'} DanceType
 * @typedef {'later'|'now'} PaymentTiming
 *
 * @typedef {Object} Festival
 * @property {string} name
 * @property {string} location
 * @property {string} date
 * @property {string} year
 * @property {string} emoji
 * @property {string} [airtableId]
 * @property {boolean} [isLive]
 * @property {string} [status]
 *
 * @typedef {Object} Capture
 * @property {string} id — Airtable record ID
 * @property {string} danceId — e.g. "MAM26-010"
 * @property {string} videoTitle — e.g. "Rocio Calidonio & Ricky"
 * @property {string} session — e.g. "Friday"
 * @property {string} style — e.g. "Salsa"
 * @property {'Captured'|'Processing'|'Ready'|'Delivered'|'Waitlisted'} status
 * @property {string} previewUrl
 * @property {string} capturedAt
 * @property {{ig: string, name: string}} partner1
 * @property {{ig: string, name: string}} partner2
 */

/** @type {{
 *   currentScreen: string,
 *   history: string[],
 *   currentFlow: FlowType|null,
 *   isGoingBack: boolean,
 *   selectedFestival: Festival|null,
 *   selectedYear: string,
 *   dancerIdentity: string,
 *   archiveEmail: string,
 *   selectedTiming: string,
 *   searchResults: Capture[],
 *   activeCapture: Capture|null,
 *   activeCaptures: Capture[],
 *   selectedClips: string[],
 *   knownEmail: string,
 *   knownName: string,
 *   selectedUpcomingFestival: Festival|null,
 *   selectedPackage: {type: DanceType, price: number},
 *   collabAddon: boolean,
 *   selectedDay: string|null,
 *   selectedSlot: string|null,
 *   slotSkipped: boolean,
 *   visibilityOutcome: string|null,
 *   visibilityPlan: string|null,
 *   walkupType: DanceType,
 *   walkupPayment: PaymentTiming,
 *   walkupCounterValue: number,
 *   walkupCounterInterval: number|null,
 *   promo: {code: string, discount: number, promoId: string}|null
 * }} */
const state = {
  currentScreen: 'routing',
  history: [],
  currentFlow: null,
  isGoingBack: false,

  // Archive flow
  selectedFestival: null,
  selectedYear: '2026',
  dancerIdentity: '',
  archiveEmail: '',
  selectedTiming: 'Not sure',
  searchResults: [],
  activeCapture: null,
  activeCaptures: [],
  selectedClips: [],
  knownEmail: '',
  knownName: '',

  // Pre-order flow
  selectedUpcomingFestival: null,
  selectedPackage: { type: 'social', price: 100 },
  collabAddon: false,

  // Slot booking
  selectedDay: null,
  selectedSlot: null,
  slotSkipped: false,

  // Visibility flow
  visibilityOutcome: null,
  visibilityPlan: null,

  // Walk-up flow
  walkupType: 'social',
  walkupPayment: 'later',

  // Walk-up counter
  walkupCounterValue: 0,
  walkupCounterInterval: null,
};

// ==========================================
// FESTIVAL DATA (static fallback + live from Airtable)
// ==========================================
let liveFestivals = []; // populated from API on load

// Generate day labels ("Friday Jun 12") from Start Date + End Date
function generateFestivalDays(startStr, endStr) {
  const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (!startStr) return ['Day 1', 'Day 2', 'Day 3'];
  const start = new Date(startStr + 'T00:00:00');
  if (isNaN(start)) return ['Day 1', 'Day 2', 'Day 3'];
  let numDays = 3;
  if (endStr) {
    const end = new Date(endStr + 'T00:00:00');
    if (!isNaN(end) && end >= start) numDays = Math.round((end - start) / 86400000) + 1;
  }
  if (numDays < 1) numDays = 1;
  if (numDays > 14) numDays = 14;
  const days = [];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(`${weekdays[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`);
  }
  return days;
}

// Load real festivals from Airtable on startup
(async function loadLiveFestivals() {
  try {
    const res = await fetch(`${API}/api/festivals`);
    const data = await res.json();
    liveFestivals = (data.records || []).map(r => {
      const f = r.fields;
      const name = f['Festival Name'] || 'Unnamed';
      const date = f['Start Date'] || '';
      const year = date ? date.substring(0, 4) : '2026';
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const month = date ? monthNames[parseInt(date.substring(5, 7), 10) - 1] : '';
      const star = f['Status'] === 'Active' ? ' ★' : '';
      // Generate days array from Start Date + End Date (or default 3 days)
      const days = generateFestivalDays(f['Start Date'], f['End Date']);
      return {
        name: name + star,
        location: f['City'] || f['Country'] || '',
        date: month ? `${month} ${year}` : year,
        year: year,
        emoji: '🎬',
        airtableId: r.id,
        isLive: true,
        status: f['Status'] || '',
        days
      };
    });
    // Populate upcoming festivals for Reserve Filming flow
    upcomingFestivals = liveFestivals
      .filter(f => f.status === 'Upcoming')
      .map(f => ({ ...f, spots: 30 }));

    // Re-render festivals if the screen is currently showing them
    if (state.currentScreen === 'archive-festival') renderFestivals();
    if (state.currentScreen === 'preorder-festival') renderUpcomingFestivals();
  } catch (e) {
    // Silent fallback — static festival list used
  }
})();

// No hardcoded festivals — all data comes from Airtable via liveFestivals
const festivals = [];
let upcomingFestivals = []; // populated from liveFestivals (Upcoming status)

const timeSlots = [
  { label: 'Afternoon Social', time: '14:00–17:00' },
  { label: 'Evening Party', time: '20:00–23:00' },
  { label: 'Late Night Party', time: '23:00–01:00' },
  { label: 'Pool Party', time: '12:00–15:00' },
];

// ==========================================
// POPUP OPEN / CLOSE
// ==========================================
function openPopup() {
  const overlay = document.getElementById('popupOverlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  resetForm();
}

function closePopup() {
  stopAllVideos();
  // Return to routing screen instead of closing — keeps form alive
  if (state.currentScreen !== 'routing') {
    state.history = [];
    showScreen('routing', false);
    return;
  }
  // On routing screen → actually close
  const overlay = document.getElementById('popupOverlay');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  if (state.walkupCounterInterval) {
    clearInterval(state.walkupCounterInterval);
    state.walkupCounterInterval = null;
  }
}

document.getElementById('closeBtn').addEventListener('click', closePopup);

document.getElementById('popupOverlay').addEventListener('click', function(e) {
  if (e.target === this) closePopup();
});

// ==========================================
// SCREEN NAVIGATION
// ==========================================
function stopAllVideos() {
  document.querySelectorAll('video').forEach(v => {
    v.pause();
    v.currentTime = 0;
  });
  if (typeof foundPreviewTimer !== 'undefined' && foundPreviewTimer) {
    clearInterval(foundPreviewTimer);
    foundPreviewTimer = null;
  }
  if (typeof previewTimer !== 'undefined' && previewTimer) {
    clearInterval(previewTimer);
    previewTimer = null;
  }
}

/**
 * Navigate to a screen with View Transitions API support.
 * @param {string} screenId — screen name without 'screen-' prefix
 * @param {boolean} [addToHistory=true] — push current screen to back-stack
 */
function showScreen(screenId, addToHistory = true) {
  if (addToHistory && state.currentScreen) {
    // Prevent duplicate entries (avoids back-button loops)
    if (state.history[state.history.length - 1] !== state.currentScreen) {
      state.history.push(state.currentScreen);
    }
  }

  stopAllVideos();

  const doTransition = () => {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active', 'slide-back');
    });

    const target = document.getElementById('screen-' + screenId);
    if (target) {
      if (state.isGoingBack) {
        target.classList.add('slide-back');
      }
      target.classList.add('active');
    // Reset scroll on ALL levels (iOS WebView fix)
    target.scrollTop = 0;
    const content = target.querySelector('.screen-content');
    if (content) content.scrollTop = 0;
    const popup = document.getElementById('popupContainer');
    if (popup) popup.scrollTop = 0;
    // iOS WebView: reset window + document scroll
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // Also reset after a tick (iOS sometimes delays scroll)
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
    state.isGoingBack = false;
  }

  // Init notify card email pre-fill when empty screen loads
  if (screenId === 'archive-empty') {
    requestAnimationFrame(initEmptyNotify);
  }
  };

  // View Transitions API — smooth crossfade between screens
  if (document.startViewTransition) {
    document.startViewTransition(doTransition);
  } else {
    doTransition();
  }

  // Update currentScreen SYNCHRONOUSLY after transition is queued
  // (doTransition sets it too, but async via View Transitions API)
  state.currentScreen = screenId;
  updateProgressBar();
}

function goBack() {
  if (state.history.length > 0) {
    state.isGoingBack = true;
    const prev = state.history.pop();
    showScreen(prev, false);
  }
}

function resetForm() {
  state.currentScreen = 'routing';
  state.history = [];
  state.currentFlow = null;
  state.selectedFestival = null;
  state.selectedYear = '2026';
  state.dancerIdentity = '';
  state.selectedTiming = 'Not sure';
  state.selectedUpcomingFestival = null;
  state.selectedPackage = { type: 'social', price: 100 };
  state.collabAddon = false;
  state.selectedDay = null;
  state.selectedSlot = null;
  state.slotSkipped = false;
  state.visibilityOutcome = null;
  state.visibilityPlan = null;
  state.walkupType = 'social';
  state.walkupPayment = 'later';

  // Reset UI
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'slide-back'));
  document.getElementById('screen-routing').classList.add('active');

  // Reset year pills
  document.querySelectorAll('#yearPills .pill').forEach(p => p.classList.remove('active'));
  const firstYearPill = document.querySelector('#yearPills .pill[data-year="2026"]');
  if (firstYearPill) firstYearPill.classList.add('active');

  // Reset inputs
  const inputs = ['festivalSearch', 'dancerIdentity', 'archiveCheckoutEmail', 'archiveCheckoutInstagram',
    'preorderName', 'preorderEmail', 'preorderInstagram', 'visName', 'visEmail', 'visInstagram',
    'notifyEmail', 'notifyInstagram', 'walkupInstagram', 'walkupEmail', 'statusEmail'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('error', 'valid'); el.style.borderColor = ''; }
  });

  // Reset buttons
  const disabledBtns = ['archiveFestivalNext', 'archiveIdentityNext', 'preorderFestivalNext', 'preorderCheckoutBtn', 'visCheckoutBtn', 'slotNextBtn', 'walkupBtn', 'statusCheckBtn', 'notifyBtn'];
  disabledBtns.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) { btn.disabled = true; btn.classList.add('disabled'); }
  });

  // Reset collab toggle
  const collabToggle = document.getElementById('collabToggle');
  if (collabToggle) collabToggle.checked = false;

  // Reset collab details
  const collabDetails = document.getElementById('collabDetails');
  if (collabDetails) collabDetails.classList.remove('open');

  // Reset collab confirm
  const collabConfirm = document.getElementById('collabConfirm');
  if (collabConfirm) collabConfirm.style.display = 'none';
  const collabConfirmCheck = document.getElementById('collabConfirmCheck');
  if (collabConfirmCheck) collabConfirmCheck.checked = false;

  // Reset IG required label
  const igLabel = document.getElementById('igRequiredLabel');
  if (igLabel) igLabel.textContent = '(optional)';

  // Reset package selection
  document.querySelectorAll('.package-card').forEach(c => c.classList.remove('selected'));
  const firstPkg = document.querySelector('.package-card');
  if (firstPkg) firstPkg.classList.add('selected');

  // Reset walkup type pills
  document.querySelectorAll('.walkup-type-pills .pill-sm').forEach(p => p.classList.remove('active'));
  const firstWalkupPill = document.querySelector('.walkup-type-pills .pill-sm');
  if (firstWalkupPill) firstWalkupPill.classList.add('active');

  // Reset walkup pricing
  document.querySelectorAll('.walkup-price-option').forEach(o => o.classList.remove('walkup-price-option--selected'));
  const firstPriceOption = document.querySelector('.walkup-price-option');
  if (firstPriceOption) firstPriceOption.classList.add('walkup-price-option--selected');

  // Reset archive upsell
  const archiveUpsell = document.getElementById('archiveUpsell');
  if (archiveUpsell) {
    archiveUpsell.style.opacity = '';
    archiveUpsell.style.display = '';
    archiveUpsell.style.transform = '';
    const upsellCheckout = document.getElementById('upsellCheckout');
    const upsellActions = document.getElementById('upsellActions');
    const upsellSuccess = document.getElementById('upsellSuccess');
    if (upsellCheckout) { upsellCheckout.classList.remove('active'); upsellCheckout.style.display = ''; }
    if (upsellActions) upsellActions.style.display = '';
    if (upsellSuccess) upsellSuccess.style.display = 'none';
    const priceEl = archiveUpsell.querySelector('.upsell-price');
    if (priceEl) priceEl.style.display = '';
    // Destroy old Stripe element to remount fresh
    if (stripeElements.upsell) { stripeElements.upsell.destroy(); stripeElements.upsell = null; }
  }

  // Reset walkup upsell
  const walkupUpsell = document.getElementById('walkupUpsell');
  if (walkupUpsell) {
    walkupUpsell.style.opacity = '';
    walkupUpsell.style.display = '';
    walkupUpsell.style.transform = '';
    walkupUpsell.innerHTML = `
      <div class="upsell-badge">Boost your reach</div>
      <h3 class="upsell-title">✨ Feature on SDTV Channel</h3>
      <p class="upsell-desc">Get your video published to <strong>509K+ followers</strong>. Instagram Collab — appears on your profile too.</p>
      <div class="upsell-price">+€100</div>
      <div class="upsell-actions">
        <button class="btn-primary btn-sm" onclick="acceptWalkupUpsell()">Add — €100</button>
        <button class="btn-ghost btn-sm" onclick="declineWalkupUpsell()">Maybe later</button>
      </div>
    `;
  }

  // Reset expandable
  const expandable = document.getElementById('visibilityUpsell');
  if (expandable) expandable.classList.remove('open');

  // Reset visibility confirmation
  resetVisConfirmation();

  // Hide slot elements
  const timeSlotEl = document.getElementById('timeSlots');
  if (timeSlotEl) timeSlotEl.style.display = 'none';
  const slotSummary = document.getElementById('slotSummary');
  if (slotSummary) slotSummary.style.display = 'none';

  // Reset status result
  const statusResult = document.getElementById('statusResult');
  if (statusResult) statusResult.style.display = 'none';

  updateProgressBar();
  renderFestivals();
  renderUpcomingFestivals();
}

// ==========================================
// PROGRESS BAR
// ==========================================
function updateProgressBar() {
  const fill = document.getElementById('progressFill');
  let progress = 0;

  if (state.currentFlow === 'archive') {
    const steps = {
      'archive-festival': 15,     // Step 1/4: Pick festival
      'archive-identity': 35,     // Step 2/4: Identify yourself
      'archive-preview': 55,      // Step 3/4: State B — review match
      'archive-unlock': 75,       // Step 4/4: State C — email + unlock
      'archive-notready': 55,     // State A: Filmed, not ready
      'archive-notify-confirm': 85,
      'archive-checkout': 90,
      'archive-confirmation': 100,
    };
    progress = steps[state.currentScreen] || 0;
  } else if (state.currentFlow === 'preorder') {
    const steps = {
      'preorder-festival': 20,
      'preorder-package': 40,
      'preorder-slot': 60,
      'preorder-checkout': 80,
      'preorder-confirmation': 100,
    };
    progress = steps[state.currentScreen] || 0;
  } else if (state.currentFlow === 'visibility') {
    const steps = {
      'visibility-intro': 25,
      'visibility-packages': 50,
      'visibility-checkout': 75,
      'visibility-confirmation': 100,
    };
    progress = steps[state.currentScreen] || 0;
  } else if (state.currentFlow === 'walkup') {
    const steps = {
      'walkup': 50,
      'walkup-confirmation': 100,
    };
    progress = steps[state.currentScreen] || 0;
  } else if (state.currentFlow === 'status') {
    const steps = {
      'check-status': 50,
    };
    progress = steps[state.currentScreen] || 0;
  } else if (state.currentFlow === 'monday') {
    const steps = {
      'monday-morning': 40,
      'monday-confirm': 100,
    };
    progress = steps[state.currentScreen] || 0;
  } else if (state.currentFlow === 'notsure') {
    progress = 50;
  }

  fill.style.width = progress + '%';

  // Update dot steppers on current screen
  updateDotSteppers();
}

/**
 * Render dot stepper into .step-indicator elements.
 * Parses "STEP X OF Y" text from HTML, replaces with dots.
 */
function updateDotSteppers() {
  document.querySelectorAll('.step-indicator').forEach(el => {
    // Parse step info from original text or data attribute
    if (!el.dataset.parsed) {
      const text = el.textContent.trim();
      const match = text.match(/(\d+)\s*(?:OF|of|\/)\s*(\d+)/);
      if (match) {
        el.dataset.current = match[1];
        el.dataset.total = match[2];
        el.dataset.parsed = 'true';
      } else return;
    }
    const current = parseInt(el.dataset.current);
    const total = parseInt(el.dataset.total);
    if (!total) return;

    let html = '';
    for (let i = 1; i <= total; i++) {
      const cls = i < current ? 'step-dot step-dot--done'
                : i === current ? 'step-dot step-dot--active'
                : 'step-dot';
      html += `<span class="${cls}"></span>`;
      if (i < total) {
        const lineCls = i < current ? 'step-line step-line--done' : 'step-line';
        html += `<span class="${lineCls}"></span>`;
      }
    }
    el.innerHTML = html;
  });
}

// ==========================================
// INTENT ROUTING
// ==========================================
function selectIntent(intent) {
  state.currentFlow = intent;

  switch(intent) {
    case 'archive':
      showScreen('archive-festival');
      renderFestivals();
      break;
    case 'preorder':
      showScreen('preorder-festival');
      renderUpcomingFestivals();
      break;
    case 'visibility':
      showScreen('visibility-intro');
      break;
    case 'notsure':
      showScreen('notsure');
      break;
  }
}

// ==========================================
// ARCHIVE FLOW — FESTIVAL FINDER
// ==========================================
function renderFestivals() {
  const list = document.getElementById('festivalList');
  if (!list) return;

  const search = (document.getElementById('festivalSearch')?.value || '').toLowerCase().trim();
  const year = state.selectedYear;

  // Merge live festivals (from Airtable) with static fallback list
  // Exclude "Upcoming" festivals — they have no footage yet
  const allFestivals = [...liveFestivals, ...festivals].filter(f => f.status !== 'Upcoming');
  let filtered = allFestivals.filter(f => {
    const yearMatch = f.year === year;
    if (!search) return yearMatch;
    return yearMatch && (
      f.name.toLowerCase().includes(search) ||
      f.location.toLowerCase().includes(search)
    );
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding: 24px 16px; color: var(--sdtv-text-faint); font-size: var(--text-sm);">
      No festivals found. Try a different search or year.
    </div>`;
    return;
  }

  list.innerHTML = filtered.map(f => {
    const isSelected = state.selectedFestival &&
      state.selectedFestival.name === f.name &&
      state.selectedFestival.year === f.year;
    return `
      <div class="festival-item ${isSelected ? 'selected' : ''}"
           onclick="selectFestival('${f.name.replace(/'/g, "\\'")}', '${f.year}', '${f.date}', '${f.location}')">
        <span class="festival-emoji">${f.emoji}</span>
        <div class="festival-info">
          <div class="festival-name">${f.name}</div>
          <div class="festival-meta">${f.location} · ${f.date}</div>
        </div>
        <div class="festival-check">
          ${isSelected ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

function selectFestival(name, year, date, location) {
  state.selectedFestival = { name, year, date, location };
  renderFestivals();

  const btn = document.getElementById('archiveFestivalNext');
  btn.disabled = false;
  btn.classList.remove('disabled');
}

function filterFestivals() {
  renderFestivals();
}

function filterYear(el) {
  document.querySelectorAll('#yearPills .pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  state.selectedYear = el.dataset.year;
  state.selectedFestival = null;

  const btn = document.getElementById('archiveFestivalNext');
  btn.disabled = true;
  btn.classList.add('disabled');

  renderFestivals();
}

function goToArchiveIdentity() {
  showScreen('archive-identity');
}

// ==========================================
// ARCHIVE FLOW — IDENTITY
// ==========================================
function validateIdentity() {
  const ig = document.getElementById('dancerIdentity').value.trim();
  const nameField = document.getElementById('archiveIdentityName');
  const name = nameField ? nameField.value.trim() : '';
  state.dancerIdentity = ig || name;
  const btn = document.getElementById('archiveIdentityNext');

  // Need at least an IG handle OR a name (if expanded)
  if (ig.length >= 2 || name.length >= 2) {
    btn.disabled = false;
    btn.classList.remove('disabled');
  } else {
    btn.disabled = true;
    btn.classList.add('disabled');
  }
}

function toggleIdentityFields() {
  const extra = document.getElementById('identityExtra');
  const toggle = document.getElementById('identityToggle');
  if (extra.style.display === 'none') {
    extra.style.display = 'block';
    toggle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg> Hide extra fields';
  } else {
    extra.style.display = 'none';
    toggle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> No Instagram? Add other details';
  }
}

function validateUnlockForm() {
  const email = document.getElementById('unlockEmail').value.trim();
  const btn = document.getElementById('unlockBtn');
  const emailEl = document.getElementById('unlockEmail');

  if (isValidEmail(email)) {
    emailEl.classList.remove('error');
    emailEl.classList.add('valid');
    btn.disabled = false;
    btn.classList.remove('disabled');
    state.archiveEmail = email;
  } else {
    if (email.length > 0) emailEl.classList.remove('valid');
    btn.disabled = true;
    btn.classList.add('disabled');
  }
}

function selectTiming(el) {
  document.querySelectorAll('.timing-pills .pill-sm').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  state.selectedTiming = el.textContent.trim();
}

// ==========================================
// ARCHIVE FLOW — SEARCH WITH BRANCHING
// ==========================================
async function searchArchive() {
  const overlay = document.getElementById('searchingOverlay');
  overlay.classList.add('active');

  const searchingFestival = document.getElementById('searchingFestival');
  if (searchingFestival && state.selectedFestival) {
    searchingFestival.textContent = state.selectedFestival.name + ' · ' + state.selectedFestival.date;
  }
  const clipCount = document.getElementById('searchingClipCount');
  if (clipCount) clipCount.textContent = '...';

  try {
    const ig = state.dancerIdentity.replace(/^@/, '');
    const res = await fetch(`${API}/api/captures/search?ig=${encodeURIComponent('@' + ig)}`);
    const data = await res.json();
    overlay.classList.remove('active');

    // Store results for later use
    state.searchResults = data.results || [];

    if (clipCount) clipCount.textContent = state.searchResults.length;

    if (state.searchResults.length === 0) {
      // Pre-fill email if known
      const emptyEmail = document.getElementById('emptyNotifyEmail');
      if (emptyEmail && state.knownEmail) {
        emptyEmail.value = state.knownEmail;
        validateEmptyNotify();
      }
      showScreen('archive-empty');
      return;
    }

    // Split results by readiness
    const ready = state.searchResults.filter(r => r.status === 'Ready' || r.status === 'Delivered' || r.status === 'Notified' || r.previewUrl);
    const notReady = state.searchResults.filter(r => r.status === 'Captured' || r.status === 'Processing' || r.status === 'Waitlisted');

    if (ready.length > 0) {
      // Has ready clips — show preview (may also include not-ready ones)
      state.selectedClips = [];
      populateClipList([...ready, ...notReady], ig);
      showScreen('archive-preview');
    } else if (notReady.length > 0) {
      // All clips still in editing — show not-ready screen
      const festName = document.getElementById('notreadyFestival');
      if (festName) festName.textContent = state.selectedFestival?.name || 'the festival';
      // Pre-fill notify form with known data
      const notifyEmail = document.getElementById('notifyEmail');
      const notifyIg = document.getElementById('notifyInstagram');
      // Only pre-fill from current session or URL param
      const knownEmail = state.collectedEmail || state.knownEmail || '';
      const knownIg = state.dancerIdentity || '';
      if (notifyEmail && knownEmail) { notifyEmail.value = knownEmail; }
      if (notifyIg && knownIg) { notifyIg.value = knownIg.startsWith('@') ? knownIg : '@' + knownIg; }
      if (knownEmail) validateNotifyForm();
      showScreen('archive-notready');
    } else {
      showScreen('archive-empty');
    }
  } catch (e) {
    overlay.classList.remove('active');
    showToast("Search failed. Please try again.");
    console.error('Search error:', e);
  }
}

// ==========================================
// ARCHIVE FLOW — MULTI-CLIP LIST
// ==========================================
/**
 * Render clip cards for found dances — Ready clips first, with video previews.
 * @param {Capture[]} clips — sorted: ready first, processing last
 * @param {string} ig — dancer's Instagram handle
 */
function populateClipList(clips, ig) {
  const festivalName = state.selectedFestival ? state.selectedFestival.name : '';

  // Header
  const title = document.getElementById('foundTitle');
  const subtitle = document.getElementById('foundSubtitle');
  if (title) {
    const firstName = state.knownName ? state.knownName.split(' ')[0] : '';
    if (firstName) {
      title.textContent = clips.length === 1 ? `${firstName}, look what we found 🔥` : `${firstName}, we found ${clips.length} dances 🔥`;
    } else {
      title.textContent = clips.length === 1 ? 'Look what we found 🔥' : `We found ${clips.length} dances 🔥`;
    }
  }
  if (subtitle) {
    subtitle.textContent = festivalName ? `${festivalName} · @${ig}` : `@${ig}`;
  }

  // Social proof
  const proofEl = document.getElementById('previewProofText');
  if (proofEl) proofEl.textContent = `${clips.length} dance(s) found for @${ig}`;

  // Show "Select all" if more than 1
  const selectAllBar = document.getElementById('selectAllBar');
  if (selectAllBar) selectAllBar.style.display = clips.length > 1 ? '' : 'none';

  // Render clip cards
  const list = document.getElementById('clipList');
  if (!list) return;

  list.innerHTML = clips.map((clip, i) => {
    const isReady = clip.status === 'Ready' || clip.status === 'Delivered';
    const hasPreview = !!clip.previewUrl;
    const partner1 = clip.partner1?.name || clip.partner1?.ig || '';
    const partner2 = clip.partner2?.name || clip.partner2?.ig || '';
    const dancerNames = esc(clip.videoTitle || [partner1, partner2].filter(Boolean).join(' & ') || '@' + ig);
    const details = esc([clip.style, clip.session].filter(Boolean).join(' · '));

    return `
      <div class="clip-item ${isReady ? '' : 'clip-item--disabled'}" id="clip-${clip.id}">
        <!-- Video preview — original style -->
        <div class="video-preview-protected" onclick="${isReady ? `toggleClipSelection('${clip.id}')` : ''}">
          <div class="video-preview-player">
            ${hasPreview ? `
              <video class="clip-video" id="clip-video-${clip.id}" muted playsinline disablepictureinpicture
                     controlsList="nodownload nofullscreen noremoteplayback"
                     oncontextmenu="return false;"
                     src="${API}/api/preview/${clip.id}"
                     preload="metadata"></video>
            ` : ''}
            <div class="video-watermark">SDTV PREVIEW</div>
            ${hasPreview ? `
              <div class="video-play-overlay" id="clip-overlay-${clip.id}" onclick="event.stopPropagation(); playClipPreview('${clip.id}')">
                <div class="video-play-btn">
                  <svg class="icon-play" width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="6 3 20 12 6 21"/></svg>
                  <svg class="icon-pause" width="24" height="24" viewBox="0 0 24 24" fill="white"><rect x="5" y="3" width="5" height="18" rx="1"/><rect x="14" y="3" width="5" height="18" rx="1"/></svg>
                </div>
                <span class="video-play-label">Tap to preview · 5 sec</span>
              </div>
              <div class="video-progress"><div class="video-progress-fill" id="clip-progress-${clip.id}"></div></div>
            ` : `
              <div class="clip-no-preview">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                <span class="clip-no-preview-text">${isReady ? 'Preview generating...' : 'Editing in progress'}</span>
              </div>
            `}
          </div>
          <div class="video-preview-info">
            <div>
              <div class="unlock-preview-title">${festivalName}</div>
              <div class="preview-match-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sdtv-green)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Matched to <strong>${dancerNames}</strong>
              </div>
              <div class="clip-meta-line">${details}${!isReady ? ' · ⏳ Editing in progress' : ''}</div>
            </div>
            ${isReady ? `
              <div class="clip-select-badge ${state.selectedClips.includes(clip.id) ? 'clip-select-badge--on' : ''}" id="clip-badge-${clip.id}">
                ${state.selectedClips.includes(clip.id) ? '✓' : '€100'}
              </div>
            ` : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  updateClipContinueBtn();

  // Mark videos as loaded when metadata arrives (hides skeleton)
  list.querySelectorAll('.clip-video').forEach(v => {
    v.addEventListener('loadeddata', () => v.dataset.loaded = 'true', { once: true });
  });

  // Trigger preview generation for all ready clips
  clips.filter(c => c.previewUrl).forEach(c => {
    warmPreview(c.id);
  });
}

// Clip selection
function toggleClipSelection(clipId) {
  if (!state.selectedClips) state.selectedClips = [];
  const idx = state.selectedClips.indexOf(clipId);
  if (idx >= 0) {
    state.selectedClips.splice(idx, 1);
  } else {
    state.selectedClips.push(clipId);
  }
  // Update UI
  const selected = state.selectedClips.includes(clipId);
  const badge = document.getElementById('clip-badge-' + clipId);
  if (badge) {
    badge.classList.toggle('clip-select-badge--on', selected);
    badge.textContent = selected ? '✓' : '€100';
  }
  const item = document.getElementById('clip-' + clipId);
  if (item) item.classList.toggle('clip-item--selected', selected);
  haptic(selected ? 'medium' : 'light');
  updateClipContinueBtn();
}

function toggleSelectAllClips() {
  const readyClips = state.searchResults.filter(r => r.status === 'Ready' || r.status === 'Delivered');
  const allSelected = readyClips.every(r => state.selectedClips.includes(r.id));

  if (allSelected) {
    state.selectedClips = [];
  } else {
    state.selectedClips = readyClips.map(r => r.id);
  }

  // Update all cards
  readyClips.forEach(r => {
    const sel = state.selectedClips.includes(r.id);
    const badge = document.getElementById('clip-badge-' + r.id);
    if (badge) {
      badge.classList.toggle('clip-select-badge--on', sel);
      badge.textContent = sel ? '✓' : '€100';
    }
    const item = document.getElementById('clip-' + r.id);
    if (item) item.classList.toggle('clip-item--selected', sel);
  });
  updateClipContinueBtn();
}

function updateClipContinueBtn() {
  const btn = document.getElementById('clipContinueBtn');
  const label = document.getElementById('clipContinueLabel');
  if (!btn) return;
  const count = (state.selectedClips || []).length;
  if (count === 0) {
    btn.disabled = true;
    btn.classList.add('disabled');
    if (label) label.textContent = 'Select your dances';
  } else {
    btn.disabled = false;
    btn.classList.remove('disabled');
    const total = count * 100;
    if (label) label.textContent = count === 1 ? `Unlock 1 video — €${total}` : `Unlock ${count} videos — €${total}`;
  }
}

function confirmSelectedClips() {
  if (!state.selectedClips || state.selectedClips.length === 0) return;
  // Set active captures for checkout
  state.activeCaptures = state.searchResults.filter(r => state.selectedClips.includes(r.id));
  state.activeCapture = state.activeCaptures[0];
  // Move to unlock/checkout
  confirmArchiveMatch();
}

// ==========================================
// PREVIEW PLAYBACK
// Waits for buffer, shows poster, supports pause.
// 5-second limit enforced client-side.
// ==========================================

/** @type {string|null} */
let activeClipPreview = null;
/** @type {number|null} */
let clipPreviewTimer = null;

/**
 * Play/pause toggle for a clip preview.
 * If video isn't buffered yet, shows "Buffering..." and auto-plays when ready.
 * @param {string} clipId — suffix after 'clip-video-' / 'clip-overlay-' / 'clip-progress-'
 */
function playClipPreview(clipId) {
  // Stop any currently playing preview
  if (activeClipPreview && activeClipPreview !== clipId) {
    stopClipPreview(activeClipPreview);
  }

  const video = document.getElementById('clip-video-' + clipId);
  const overlay = document.getElementById('clip-overlay-' + clipId);
  const progressFill = document.getElementById('clip-progress-' + clipId);
  if (!video) return;

  // Toggle: if playing → stop
  if (!video.paused) {
    stopClipPreview(clipId);
    return;
  }

  // Not ready yet → buffer first, show progress, then play
  if (video.readyState < 4) {
    const label = overlay?.querySelector('.video-play-label');
    if (label) label.textContent = 'Buffering...';
    overlay?.classList.add('loading');

    // Force browser to start downloading
    video.preload = 'auto';
    video.load();

    // Show buffering progress
    const bufferCheck = setInterval(() => {
      if (video.buffered.length > 0) {
        const buffered = video.buffered.end(0);
        const pct = Math.round((buffered / PREVIEW_LIMIT) * 100);
        if (label) label.textContent = `Buffering... ${Math.min(pct, 100)}%`;
        if (progressFill) progressFill.style.width = Math.min(pct, 100) + '%';
      }
      // Ready when we have enough buffer for the full preview
      if (video.readyState >= 4 || (video.buffered.length > 0 && video.buffered.end(0) >= PREVIEW_LIMIT)) {
        clearInterval(bufferCheck);
        overlay?.classList.remove('loading');
        if (progressFill) progressFill.style.width = '0%';
        startPlayback(clipId, video, overlay, progressFill);
      }
    }, 200);

    // Timeout — if can't buffer in 15s, play anyway
    setTimeout(() => {
      clearInterval(bufferCheck);
      if (video.paused && overlay?.classList.contains('loading')) {
        overlay?.classList.remove('loading');
        if (progressFill) progressFill.style.width = '0%';
        if (video.readyState >= 2) {
          startPlayback(clipId, video, overlay, progressFill);
        } else {
          if (label) label.textContent = 'Slow connection — tap to retry';
        }
      }
    }, 15000);
    return;
  }

  startPlayback(clipId, video, overlay, progressFill);
}

/**
 * Start actual video playback after buffer is ready.
 * @param {string} clipId
 * @param {HTMLVideoElement} video
 * @param {HTMLElement|null} overlay
 * @param {HTMLElement|null} progressFill
 */
function startPlayback(clipId, video, overlay, progressFill) {
  activeClipPreview = clipId;
  video.currentTime = 0;
  video.muted = false;
  video.play().catch(() => { video.muted = true; video.play(); });

  // Show pause state
  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.classList.add('playing');
  }

  if (clipPreviewTimer) clearInterval(clipPreviewTimer);
  clipPreviewTimer = setInterval(() => {
    if (progressFill) {
      const progress = Math.min((video.currentTime / PREVIEW_LIMIT) * 100, 100);
      progressFill.style.width = progress + '%';
    }
    if (video.currentTime >= PREVIEW_LIMIT) {
      stopClipPreview(clipId);
      if (overlay) {
        const label = overlay.querySelector('.video-play-label');
        if (label) label.textContent = 'Preview ended · 5 sec limit';
      }
    }
  }, 100);
}

function stopClipPreview(clipId) {
  const video = document.getElementById('clip-video-' + clipId);
  const overlay = document.getElementById('clip-overlay-' + clipId);
  const progressFill = document.getElementById('clip-progress-' + clipId);
  if (video) { video.pause(); video.currentTime = 0; }
  if (overlay) {
    overlay.classList.remove('hidden', 'playing', 'loading');
  }
  if (progressFill) progressFill.style.width = '0%';
  if (clipPreviewTimer) { clearInterval(clipPreviewTimer); clipPreviewTimer = null; }
  activeClipPreview = null;
}

// ==========================================
// ARCHIVE FLOW — STATE B: REVIEW MATCH
// ==========================================
function confirmArchiveMatch() {
  stopAllVideos();
  const captures = state.activeCaptures && state.activeCaptures.length > 0
    ? state.activeCaptures
    : (state.activeCapture ? [state.activeCapture] : []);
  const festivalName = state.selectedFestival ? state.selectedFestival.name : '';
  const count = captures.length;
  const total = count * 100;

  // Populate clips list with video previews
  const listEl = document.getElementById('unlockClipsList');
  if (listEl) {
    listEl.innerHTML = captures.map(c => {
      const title = esc(c.videoTitle || 'Your dance video');
      const details = esc([c.style, c.session].filter(Boolean).join(' · '));
      const hasPreview = !!c.previewUrl;
      return `
        <div class="video-preview-protected">
          <div class="video-preview-player">
            ${hasPreview ? `
              <video class="clip-video" id="clip-video-ul-${c.id}" muted playsinline disablepictureinpicture
                     controlsList="nodownload nofullscreen noremoteplayback"
                     oncontextmenu="return false;"
                     src="${API}/api/preview/${c.id}"
                     preload="auto"></video>
            ` : ''}
            <div class="video-watermark">SDTV PREVIEW</div>
            ${hasPreview ? `
              <div class="video-play-overlay" id="clip-overlay-ul-${c.id}" onclick="playClipPreview('ul-${c.id}')">
                <div class="video-play-btn">
                  <svg class="icon-play" width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="6 3 20 12 6 21"/></svg>
                  <svg class="icon-pause" width="24" height="24" viewBox="0 0 24 24" fill="white"><rect x="5" y="3" width="5" height="18" rx="1"/><rect x="14" y="3" width="5" height="18" rx="1"/></svg>
                </div>
                <span class="video-play-label">Preview · 5 sec</span>
              </div>
              <div class="video-progress"><div class="video-progress-fill" id="clip-progress-ul-${c.id}"></div></div>
            ` : ''}
          </div>
          <div class="match-confirmed-bar">
            <div class="match-confirmed-left">
              <div class="match-confirmed-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="match-confirmed-info">
                <div class="match-confirmed-title">${title}</div>
                <div class="match-confirmed-meta">${festivalName}${details ? ' · ' + details : ''}</div>
              </div>
            </div>
            <div class="match-confirmed-badge">Match confirmed</div>
          </div>
        </div>`;
    }).join('');

    // Mark videos as loaded when ready (hides skeleton)
    listEl.querySelectorAll('video').forEach(v => {
      v.addEventListener('loadeddata', () => v.dataset.loaded = 'true', { once: true });
    });
  }

  // Populate order summary
  const summaryEl = document.getElementById('unlockOrderSummary');
  if (summaryEl) {
    const rows = captures.map((c) => {
      const title = esc(c.videoTitle || 'Dance Video');
      return `<div class="price-row"><span>${title} · HD</span><span>€100</span></div>`;
    }).join('');
    summaryEl.innerHTML = `
      ${rows}
      <div id="unlockDiscountRow"></div>
      <div class="price-divider"></div>
      <div class="price-row price-total">
        <span>Total</span>
        <span id="unlockTotal">€${total}</span>
      </div>`;
  }

  // Update festival name in header
  const festEl = document.getElementById('unlockFestival');
  if (festEl) festEl.textContent = festivalName;

  // Update pay button
  const payAmount = document.getElementById('unlockPayAmount');
  if (payAmount) payAmount.textContent = `€${total}`;
  const payLabel = document.getElementById('unlockPayLabel');
  if (payLabel) payLabel.textContent = count > 1 ? `Unlock ${count} Videos` : 'Unlock My Video';

  showScreen('archive-unlock');
}

/* (removed: dead rejectArchiveMatch — no longer in HTML) */

// ==========================================
// ARCHIVE FLOW — STATE C: UNLOCK / CHECKOUT
// ==========================================
function goToArchiveCheckout() {
  // Validate unlock email first
  const unlockEmail = document.getElementById('unlockEmail')?.value.trim();
  if (unlockEmail && !isValidEmail(unlockEmail)) {
    const el = document.getElementById('unlockEmail');
    el.focus();
    el.classList.add('error');
    shakeElement(el);
    return;
  }
  // Pre-fill checkout email from unlock step
  const email = unlockEmail || state.archiveEmail || '';
  const checkoutEmailEl = document.getElementById('archiveCheckoutEmail');
  if (checkoutEmailEl && email) {
    checkoutEmailEl.value = email;
    checkoutEmailEl.classList.add('valid');
  }
  showScreen('archive-checkout');
  updateArchiveCheckoutPrice();
}

function updateArchiveCheckoutPrice() {
  updateCheckoutTotal('archive');
}

/* (removed: dead showNoMatch) */

// ==========================================
// ARCHIVE FLOW — CHECKOUT
// ==========================================
function validateArchiveCheckout() {
  const email = document.getElementById('archiveCheckoutEmail').value.trim();
  const emailEl = document.getElementById('archiveCheckoutEmail');

  if (isValidEmail(email)) {
    emailEl.classList.remove('error');
    emailEl.classList.add('valid');
  } else if (email.length > 0) {
    emailEl.classList.remove('valid');
  } else {
    emailEl.classList.remove('error', 'valid');
  }
  // Re-evaluate Pay button based on email + card
  const btn = document.getElementById('archiveCheckoutBtn');
  if (btn && isValidEmail(email)) {
    // Card completeness is checked by Stripe 'change' event
  }
}

async function simulateArchivePayment() {
  const email = document.getElementById('archiveCheckoutEmail').value.trim();
  if (!isValidEmail(email)) {
    const emailEl = document.getElementById('archiveCheckoutEmail');
    emailEl.focus();
    emailEl.classList.add('error');
    shakeElement(emailEl);
    return;
  }

  const btn = document.getElementById('archiveCheckoutBtn');
  if (!btn) return;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="searching-spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;"></span> Processing...';
  btn.disabled = true;

  try {
    // Save person to People table
    await fetch(`${API}/api/people/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ig: state.dancerIdentity || '',
        email: email,
        source: 'Archive Purchase',
        paid: true
      })
    });
    // Create notification for delivery tracking
    await fetch(`${API}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ig: state.dancerIdentity || '',
        email: email,
        festival: state.selectedFestival?.name || '',
        channel: 'Email',
        template: 'Purchase confirmation'
      })
    });
  } catch (e) {
    console.error('Archive payment save error:', e);
  }

  btn.innerHTML = originalText;
  btn.disabled = false;
  showScreen('archive-confirmation');
}

// ==========================================
// ARCHIVE FLOW — CONFIRMATION & UPSELL
// ==========================================
function acceptArchiveUpsell() {
  const upsellCard = document.getElementById('archiveUpsell');
  upsellCard.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;color:var(--sdtv-green);font-weight:600;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      Feature added — €100 extra
    </div>
    <p style="font-size:var(--text-sm);color:var(--sdtv-text-muted);">We'll feature your dance on @socialdancetv as a Collab post.</p>
  `;
}

function declineArchiveUpsell() {
  const upsellCard = document.getElementById('archiveUpsell');
  upsellCard.style.opacity = '0';
  upsellCard.style.transform = 'translateY(-10px)';
  setTimeout(() => upsellCard.style.display = 'none', 300);
}

// ==========================================
// NOTIFY ME FLOW (Video Not Ready)
// ==========================================
function validateNotifyForm() {
  const email = document.getElementById('notifyEmail').value.trim();
  const btn = document.getElementById('notifyBtn');

  if (isValidEmail(email)) {
    btn.disabled = false;
    btn.classList.remove('disabled');
  } else {
    btn.disabled = true;
    btn.classList.add('disabled');
  }
}

async function submitNotifyMe() {
  const email = document.getElementById('notifyEmail').value.trim();
  if (!isValidEmail(email)) {
    const el = document.getElementById('notifyEmail');
    el.focus();
    el.classList.add('error');
    shakeElement(el);
    return;
  }

  const btn = document.getElementById('notifyBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="searching-spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;"></span> Saving...';
  btn.disabled = true;

  try {
    // Save person to People table
    await fetch(`${API}/api/people/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ig: state.dancerIdentity || '',
        email: email,
        source: 'Notify Me'
      })
    });
    // Create notification request
    await fetch(`${API}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ig: state.dancerIdentity || '',
        email: email,
        festival: state.selectedFestival?.name || '',
        channel: 'Email',
        template: 'Video ready notification'
      })
    });
  } catch (e) {
    console.error('Notify save error:', e);
  }

  btn.innerHTML = originalText;
  btn.disabled = false;
  const confirmEmail = document.getElementById('notifyConfirmEmail');
  if (confirmEmail) confirmEmail.textContent = email;
  showScreen('archive-notify-confirm');
}

// ── Empty state: notify me when video is ready ──
function initEmptyNotify() {
  // Only pre-fill from current session or URL param — not localStorage (may be someone else's)
  const knownEmail = state.collectedEmail || '';
  const knownWrap = document.getElementById('emptyNotifyKnown');
  const knownLabel = document.getElementById('emptyNotifyKnownEmail');
  const labelWrap = document.getElementById('emptyNotifyLabel');
  const input = document.getElementById('emptyNotifyEmail');
  const btn = document.getElementById('emptyNotifyBtn');

  if (knownEmail && knownWrap && knownLabel && labelWrap) {
    knownLabel.textContent = knownEmail;
    knownWrap.style.display = 'flex';
    labelWrap.style.display = 'none';
    if (input) input.value = knownEmail;
    if (btn) { btn.disabled = false; btn.classList.remove('disabled'); }
  }
}
function changeEmptyNotifyEmail() {
  const knownWrap = document.getElementById('emptyNotifyKnown');
  const labelWrap = document.getElementById('emptyNotifyLabel');
  const input = document.getElementById('emptyNotifyEmail');
  if (knownWrap) knownWrap.style.display = 'none';
  if (labelWrap) labelWrap.style.display = 'flex';
  if (input) { input.value = ''; input.focus(); }
  validateEmptyNotify();
}
function validateEmptyNotify() {
  const email = document.getElementById('emptyNotifyEmail')?.value.trim();
  const btn = document.getElementById('emptyNotifyBtn');
  if (btn) {
    btn.disabled = !isValidEmail(email);
    btn.classList.toggle('disabled', !isValidEmail(email));
  }
}

async function submitEmptyNotify() {
  const email = document.getElementById('emptyNotifyEmail')?.value.trim();
  if (!isValidEmail(email)) return;
  const btn = document.getElementById('emptyNotifyBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    await fetch(`${API}/api/people/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ig: state.dancerIdentity || '',
        email,
        source: 'Empty state notify'
      })
    });
    await fetch(`${API}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ig: state.dancerIdentity || '',
        email,
        festival: state.selectedFestival?.name || '',
        channel: 'Email',
        template: 'Video ready notification'
      })
    });
  } catch {}

  // Persist for future pre-fill
  try { localStorage.setItem('sdtv_email', email); } catch {}
  state.collectedEmail = email;

  // Show confirmation
  if (btn) btn.textContent = 'Done!';
  showToast("We'll email you at " + email + " when your video is ready.");
  setTimeout(() => closePopup(), 2000);
}

function reservePreEdit() {
  // Set activeCapture from search results (first not-ready clip)
  const notReady = (state.searchResults || []).filter(r =>
    r.status === 'Captured' || r.status === 'Processing' || r.status === 'Waitlisted'
  );
  if (notReady.length > 0) {
    state.activeCapture = notReady[0];
  }
  state.isEarlyBird = true;
  goToArchiveCheckout();
}

// ==========================================
// PRE-ORDER FLOW — FESTIVAL SELECTION
// ==========================================
function renderUpcomingFestivals() {
  const container = document.getElementById('upcomingFestivals');
  if (!container) return;

  container.innerHTML = upcomingFestivals.map(f => {
    const isSelected = state.selectedUpcomingFestival &&
      state.selectedUpcomingFestival.name === f.name;
    const urgencyColor = f.spots <= 15 ? 'var(--sdtv-red)' : 'var(--sdtv-gold)';
    const urgencyText = f.spots <= 15
      ? `Only ${f.spots} spots left`
      : `${f.spots} spots available`;

    return `
      <button class="festival-card-visual ${isSelected ? 'selected' : ''}"
              onclick="selectUpcomingFestival('${f.name.replace(/'/g, "\\'")}', '${f.location.replace(/'/g, "\\'")}', '${f.date}', ${f.spots})">
        <div class="festival-card-left">
          <div class="festival-card-name">${f.emoji} ${f.name}</div>
          <div class="festival-card-detail">${f.location} · ${f.date}</div>
          <div class="festival-card-spots" style="color:${urgencyColor}">${urgencyText}</div>
        </div>
        <div class="festival-card-check">
          ${isSelected ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </div>
      </button>
    `;
  }).join('');
}

function selectUpcomingFestival(name, location, date, spots) {
  state.selectedUpcomingFestival = { name, location, date, spots };
  renderUpcomingFestivals();

  const btn = document.getElementById('preorderFestivalNext');
  btn.disabled = false;
  btn.classList.remove('disabled');
}

function goToPreorderPackage() {
  showScreen('preorder-package');
  updateTotal();
}

// ==========================================
// PRE-ORDER FLOW — PACKAGE SELECTION
// ==========================================
function selectPackage(el, type, price) {
  document.querySelectorAll('.package-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedPackage = { type, price };
  updateTotal();
}

function updateTotal() {
  const collabToggle = document.getElementById('collabToggle');
  const collab = collabToggle ? collabToggle.checked : false;
  state.collabAddon = collab;

  // Show/hide collab details
  const collabDetails = document.getElementById('collabDetails');
  if (collabDetails) {
    if (collab) {
      collabDetails.classList.add('open');
    } else {
      collabDetails.classList.remove('open');
    }
  }

  const total = state.selectedPackage.price + (collab ? 100 : 0);
  const totalEl = document.getElementById('totalPrice');
  if (totalEl) totalEl.textContent = '€' + total;
}

// ==========================================
// PRE-ORDER FLOW — SLOT BOOKING
// ==========================================
function goToPreorderSlot() {
  // Set festival name in slot screen
  const slotFestivalName = document.getElementById('slotFestivalName');
  if (slotFestivalName && state.selectedUpcomingFestival) {
    slotFestivalName.textContent = state.selectedUpcomingFestival.name + ' · ' + state.selectedUpcomingFestival.date;
  }

  state.selectedDay = null;
  state.selectedSlot = null;
  state.slotSkipped = false;

  // Hide time slots and summary
  const timeSlotsEl = document.getElementById('timeSlots');
  if (timeSlotsEl) timeSlotsEl.style.display = 'none';
  const slotSummary = document.getElementById('slotSummary');
  if (slotSummary) slotSummary.style.display = 'none';

  // Reset slot next button
  const slotNextBtn = document.getElementById('slotNextBtn');
  if (slotNextBtn) { slotNextBtn.disabled = true; slotNextBtn.classList.add('disabled'); }

  renderDaySelector();
  showScreen('preorder-slot');
}

function renderDaySelector() {
  const container = document.getElementById('daySelector');
  if (!container) return;

  // Get days for selected festival
  const festival = upcomingFestivals.find(f => f.name === state.selectedUpcomingFestival?.name);
  const days = festival?.days || ['Day 1', 'Day 2', 'Day 3'];

  container.innerHTML = days.map((day, i) => {
    const parts = day.split(' ');
    const weekday = parts[0] || '';
    const month = parts[1] || '';
    const date = parts[2] || (i + 1);
    const isSelected = state.selectedDay === day;

    return `
      <button class="day-card ${isSelected ? 'selected' : ''}" onclick="selectDay('${day}')">
        <span class="day-card-weekday">${weekday}</span>
        <span class="day-card-date">${date}</span>
        <span class="day-card-month">${month}</span>
      </button>
    `;
  }).join('');
}

function selectDay(day) {
  state.selectedDay = day;
  state.selectedSlot = null;

  renderDaySelector();

  // Show time slots
  const timeSlotsEl = document.getElementById('timeSlots');
  if (timeSlotsEl) timeSlotsEl.style.display = '';

  // Hide summary until slot is picked
  const slotSummary = document.getElementById('slotSummary');
  if (slotSummary) slotSummary.style.display = 'none';

  // Render time slot pills
  const slotsList = document.getElementById('slotsList');
  if (slotsList) {
    slotsList.innerHTML = timeSlots.map(s => {
      return `
        <button class="slot-pill" onclick="selectTimeSlot(this, '${s.label}', '${s.time}')">
          ${s.label} · ${s.time}
        </button>
      `;
    }).join('');
  }

  // Disable next button until slot is selected
  const slotNextBtn = document.getElementById('slotNextBtn');
  if (slotNextBtn) { slotNextBtn.disabled = true; slotNextBtn.classList.add('disabled'); }
}

function selectTimeSlot(el, label, time) {
  state.selectedSlot = { label, time };

  // Update pill selection
  document.querySelectorAll('.slot-pill').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');

  // Show summary
  const slotSummary = document.getElementById('slotSummary');
  if (slotSummary) slotSummary.style.display = '';

  document.getElementById('slotConfirmDay').textContent = state.selectedDay;
  document.getElementById('slotConfirmTime').textContent = label + ' · ' + time;

  // Enable next button
  const slotNextBtn = document.getElementById('slotNextBtn');
  if (slotNextBtn) { slotNextBtn.disabled = false; slotNextBtn.classList.remove('disabled'); }
}

function skipSlotBooking() {
  state.slotSkipped = true;
  state.selectedDay = null;
  state.selectedSlot = null;

  // Enable next button
  const slotNextBtn = document.getElementById('slotNextBtn');
  if (slotNextBtn) { slotNextBtn.disabled = false; slotNextBtn.classList.remove('disabled'); }

  showToast("We'll send you a link to pick your slot later.");
  goToPreorderCheckout();
}

// ==========================================
// PRE-ORDER FLOW — CHECKOUT
// ==========================================
function goToPreorderCheckout() {
  // Update order summary
  if (state.selectedUpcomingFestival) {
    document.getElementById('summaryFestivalName').textContent = state.selectedUpcomingFestival.name;
  }

  const packageName = state.selectedPackage.type === 'social' ? 'Social Dance Video' : 'Show Video';
  document.getElementById('summaryPackageName').textContent = packageName;
  document.getElementById('summaryPackagePrice').textContent = '€' + state.selectedPackage.price;

  const collabLine = document.getElementById('summaryCollab');
  collabLine.style.display = state.collabAddon ? 'flex' : 'none';

  // Update slot text
  const summarySlotText = document.getElementById('summarySlotText');
  if (summarySlotText) {
    if (state.selectedSlot && state.selectedDay) {
      summarySlotText.textContent = 'Filming: ' + state.selectedDay + ', ' + state.selectedSlot.label;
    } else {
      summarySlotText.textContent = 'Filming: TBD (we\'ll send a link)';
    }
  }

  const total = state.selectedPackage.price + (state.collabAddon ? 100 : 0);
  document.getElementById('summaryTotal').textContent = '€' + total;
  document.getElementById('checkoutTotal').textContent = '€' + total;
  const applePayTotal = document.getElementById('applePayTotal');
  if (applePayTotal) applePayTotal.textContent = '€' + total;

  // Show/hide collab confirm checkbox
  const collabConfirm = document.getElementById('collabConfirm');
  if (collabConfirm) {
    collabConfirm.style.display = state.collabAddon ? '' : 'none';
  }

  // Update IG required label
  const igLabel = document.getElementById('igRequiredLabel');
  if (igLabel) {
    if (state.collabAddon) {
      igLabel.innerHTML = '<span style="color:var(--sdtv-red);">*</span> required for Collab';
    } else {
      igLabel.textContent = '(optional)';
    }
  }

  showScreen('preorder-checkout');
}

// ==========================================
// PRE-ORDER FLOW — CHECKOUT VALIDATION
// ==========================================
function validatePreorderCheckout() {
  const name = document.getElementById('preorderName').value.trim();
  const email = document.getElementById('preorderEmail').value.trim();
  const instagram = document.getElementById('preorderInstagram').value.trim();
  const collabCheck = document.getElementById('collabConfirmCheck');

  const btn = document.getElementById('preorderCheckoutBtn');

  let valid = name.length >= 2 && isValidEmail(email);

  // If collab is selected, Instagram is required
  if (state.collabAddon) {
    valid = valid && instagram.length >= 2;
    if (collabCheck) {
      valid = valid && collabCheck.checked;
    }
  }

  if (valid) {
    btn.disabled = false;
    btn.classList.remove('disabled');
  } else {
    btn.disabled = true;
    btn.classList.add('disabled');
  }
}

async function simulatePreorderPayment() {
  const name = document.getElementById('preorderName').value.trim();
  const email = document.getElementById('preorderEmail').value.trim();
  const instagram = document.getElementById('preorderInstagram').value.trim();

  if (name.length < 2) {
    const el = document.getElementById('preorderName');
    el.focus();
    shakeElement(el);
    return;
  }
  if (!isValidEmail(email)) {
    const el = document.getElementById('preorderEmail');
    el.focus();
    el.classList.add('error');
    shakeElement(el);
    return;
  }
  if (state.collabAddon && instagram.length < 2) {
    const el = document.getElementById('preorderInstagram');
    el.focus();
    shakeElement(el);
    return;
  }

  const btn = document.getElementById('preorderCheckoutBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="searching-spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;"></span> Processing...';
  btn.disabled = true;

  try {
    // Save reservation to Airtable
    await fetch(`${API}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        festival: state.selectedUpcomingFestival?.name || '',
        day: state.selectedDay || '',
        style: '',
        ig: instagram,
        email: email,
        name: name,
        package: state.selectedPackage?.type === 'pro' ? 'Pro Package' : 'Social Dance',
        notes: state.selectedSlot ? `Slot: ${state.selectedSlot}` : (state.slotSkipped ? 'Flexible timing' : ''),
      })
    });
  } catch (e) {
    console.error('Reservation save error:', e);
  }

  btn.innerHTML = originalText;
  btn.disabled = false;

  if (state.selectedUpcomingFestival) {
    document.getElementById('confirmFestivalName').textContent = state.selectedUpcomingFestival.name;
  }
  populateFilmingPass();
  showScreen('preorder-confirmation');
}

// ==========================================
// DIGITAL FILMING PASS
// ==========================================
function populateFilmingPass() {
  const passEventName = document.getElementById('passEventName');
  const passDate = document.getElementById('passDate');
  const passSlot = document.getElementById('passSlot');

  if (passEventName && state.selectedUpcomingFestival) {
    passEventName.textContent = state.selectedUpcomingFestival.name;
  }
  if (passDate && state.selectedUpcomingFestival) {
    passDate.textContent = state.selectedUpcomingFestival.date;
  }
  if (passSlot) {
    if (state.selectedSlot && state.selectedDay) {
      passSlot.textContent = state.selectedDay + ' · ' + state.selectedSlot.label + ' (' + state.selectedSlot.time + ')';
    } else {
      passSlot.textContent = 'Filming slot: TBD';
    }
  }
}

// ==========================================
// EXPANDABLE MODULE
// ==========================================
function toggleExpandable(id) {
  const module = document.getElementById(id);
  module.classList.toggle('open');
}

function goToVisibilityFromUpsell() {
  state.currentFlow = 'visibility';
  showScreen('visibility-packages');
}

// ==========================================
// VISIBILITY FLOW — INTRO
// ==========================================
function selectVisibilityOutcome(outcome) {
  state.visibilityOutcome = outcome;

  if (outcome === 'custom') {
    showToast("We'll reach out within 24 hours to discuss your needs. DM us @socialdancetv.");
    return;
  }

  showScreen('visibility-packages');
}

// ==========================================
// VISIBILITY FLOW — PACKAGE SELECTION
// ==========================================
function selectVisibilityPlan(plan) {
  state.visibilityPlan = plan;

  if (plan === 'monthly') {
    document.getElementById('visCheckoutTitle').textContent = 'Start Your Monthly Plan';
    document.getElementById('visOrderName').textContent = 'Monthly Visibility';
    document.getElementById('visOrderPrice').textContent = '€349/mo';
    document.getElementById('visOrderTotal').textContent = '€349';
    document.getElementById('visCheckoutTerms').textContent = '€349/month · Cancel anytime · First post within 5 days';
    document.getElementById('visApplePayTotal').textContent = '€349';
    document.getElementById('visCheckoutBtnText').textContent = 'Start Monthly Plan — €349';
  } else if (plan === 'feature') {
    document.getElementById('visCheckoutTitle').textContent = 'Request a Feature Boost';
    document.getElementById('visOrderName').textContent = 'Feature Boost';
    document.getElementById('visOrderPrice').textContent = 'From €150';
    document.getElementById('visOrderTotal').textContent = 'From €150';
    document.getElementById('visCheckoutTerms').textContent = "From €150 · We'll review and get back within 24h";
    document.getElementById('visApplePayTotal').textContent = '€150';
    document.getElementById('visCheckoutBtnText').textContent = 'Submit Request';
  }

  showScreen('visibility-checkout');
}

function contactForSinglePost() {
  showToast("For single posts, DM us on Instagram @socialdancetv — we'll sort you out.");
}

// ==========================================
// VISIBILITY FLOW — CHECKOUT VALIDATION
// ==========================================
function validateVisCheckout() {
  const name = document.getElementById('visName').value.trim();
  const email = document.getElementById('visEmail').value.trim();
  const instagram = document.getElementById('visInstagram').value.trim();

  const btn = document.getElementById('visCheckoutBtn');

  if (name.length >= 2 && isValidEmail(email) && instagram.length >= 2) {
    btn.disabled = false;
    btn.classList.remove('disabled');
  } else {
    btn.disabled = true;
    btn.classList.add('disabled');
  }
}

async function simulateVisibilityPayment() {
  const name = document.getElementById('visName').value.trim();
  const email = document.getElementById('visEmail').value.trim();
  const instagram = document.getElementById('visInstagram').value.trim();

  if (name.length < 2) {
    const el = document.getElementById('visName');
    el.focus();
    shakeElement(el);
    return;
  }
  if (!isValidEmail(email)) {
    const el = document.getElementById('visEmail');
    el.focus();
    el.classList.add('error');
    shakeElement(el);
    return;
  }
  if (instagram.length < 2) {
    const el = document.getElementById('visInstagram');
    el.focus();
    shakeElement(el);
    return;
  }

  const btn = document.getElementById('visCheckoutBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="searching-spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;"></span> Processing...';
  btn.disabled = true;

  try {
    // Save person to People table as Visibility lead
    await fetch(`${API}/api/people/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ig: instagram,
        email: email,
        name: name,
        source: 'Visibility ' + (state.visibilityGoal || 'Lead')
      })
    });
  } catch (e) {
    console.error('Visibility payment save error:', e);
  }

  btn.innerHTML = originalText;
  btn.disabled = false;

  {
    // keep original UI logic

    if (state.visibilityPlan === 'monthly') {
      document.getElementById('visConfirmTitle').textContent = 'Your Visibility Plan is Active';
      document.getElementById('visConfirmSubtitle').textContent = "Welcome aboard! Here's what happens next.";
      document.getElementById('visConfirmTimeline').innerHTML = `
        <div class="timeline-step done">
          <div class="timeline-dot"></div>
          <span>Payment confirmed</span>
        </div>
        <div class="timeline-step active">
          <div class="timeline-dot"></div>
          <span>Onboarding — we'll reach out within 24h</span>
        </div>
        <div class="timeline-step">
          <div class="timeline-dot"></div>
          <span>First post within 5 days</span>
        </div>
        <div class="timeline-step">
          <div class="timeline-dot"></div>
          <span>Weekly posting schedule begins</span>
        </div>
      `;
    } else if (state.visibilityPlan === 'feature') {
      document.getElementById('visConfirmTitle').textContent = 'Your Request is Received';
      document.getElementById('visConfirmSubtitle').textContent = "We'll review your request and send you a checkout link within 24 hours.";
      document.getElementById('visConfirmTimeline').innerHTML = `
        <div class="timeline-step done">
          <div class="timeline-dot"></div>
          <span>Request submitted</span>
        </div>
        <div class="timeline-step active">
          <div class="timeline-dot"></div>
          <span>Team review in progress</span>
        </div>
        <div class="timeline-step">
          <div class="timeline-dot"></div>
          <span>Checkout link sent within 24h</span>
        </div>
        <div class="timeline-step">
          <div class="timeline-dot"></div>
          <span>Your feature goes live</span>
        </div>
      `;
    }

    showScreen('visibility-confirmation');
  }
}

function resetVisConfirmation() {
  const timeline = document.getElementById('visConfirmTimeline');
  if (timeline) {
    timeline.innerHTML = `
      <div class="timeline-step done">
        <div class="timeline-dot"></div>
        <span>Payment confirmed</span>
      </div>
      <div class="timeline-step active">
        <div class="timeline-dot"></div>
        <span>Onboarding — we'll reach out within 24h</span>
      </div>
      <div class="timeline-step">
        <div class="timeline-dot"></div>
        <span>First post within 5 days</span>
      </div>
      <div class="timeline-step">
        <div class="timeline-dot"></div>
        <span>Weekly posting schedule begins</span>
      </div>
    `;
  }
}

// ==========================================
// NOT SURE FLOW — QUIZ (Updated with new paths)
// ==========================================
function quizAnswer(path) {
  switch(path) {
    case 'archive':
      // Now handles: find video, check status, wait for editing — all start with festival selection
      state.currentFlow = 'archive';
      showScreen('archive-festival');
      renderFestivals();
      break;
    case 'preorder':
      state.currentFlow = 'preorder';
      showScreen('preorder-festival');
      renderUpcomingFestivals();
      break;
    case 'visibility':
      state.currentFlow = 'visibility';
      showScreen('visibility-intro');
      break;
    case 'walkup':
      state.currentFlow = 'walkup';
      initWalkup();
      showScreen('walkup');
      break;
    case 'notready':
      // Merged into archive flow — redirect there
      state.currentFlow = 'archive';
      showScreen('archive-festival');
      renderFestivals();
      break;
    case 'contact':
      showToast("You'll be redirected to our Instagram DMs — @socialdancetv");
      break;
  }
}

// ==========================================
// WALK-UP / QUICK BOOKING FLOW
// ==========================================
function initWalkup() {
  // Initialize counter
  state.walkupCounterValue = Math.floor(Math.random() * 31) + 30; // 30-60
  const counterEl = document.getElementById('walkupCounter');
  if (counterEl) counterEl.textContent = state.walkupCounterValue;

  // Start occasional increment
  if (state.walkupCounterInterval) clearInterval(state.walkupCounterInterval);
  state.walkupCounterInterval = setInterval(() => {
    if (Math.random() < 0.3) {
      state.walkupCounterValue++;
      const el = document.getElementById('walkupCounter');
      if (el) el.textContent = state.walkupCounterValue;
    }
  }, 5000);
}

function validateWalkup() {
  const instagram = document.getElementById('walkupInstagram').value.trim();
  const email = document.getElementById('walkupEmail').value.trim();
  const btn = document.getElementById('walkupBtn');

  if (instagram.length >= 2 && isValidEmail(email)) {
    btn.disabled = false;
    btn.classList.remove('disabled');
  } else {
    btn.disabled = true;
    btn.classList.add('disabled');
  }
}

function selectWalkupType(el) {
  document.querySelectorAll('.walkup-type-pills .pill-sm').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  state.walkupType = el.dataset.type;
}

function selectWalkupPayment(option) {
  state.walkupPayment = option;
  document.querySelectorAll('.walkup-price-option').forEach(o => o.classList.remove('walkup-price-option--selected'));

  if (option === 'later') {
    document.querySelectorAll('.walkup-price-option')[0].classList.add('walkup-price-option--selected');
  } else {
    document.querySelectorAll('.walkup-price-option')[1].classList.add('walkup-price-option--selected');
  }
}

async function submitWalkup() {
  const instagram = document.getElementById('walkupInstagram').value.trim();
  const email = document.getElementById('walkupEmail').value.trim();

  if (instagram.length < 2) {
    const el = document.getElementById('walkupInstagram');
    el.focus();
    shakeElement(el);
    return;
  }
  if (!isValidEmail(email)) {
    const el = document.getElementById('walkupEmail');
    el.focus();
    el.classList.add('error');
    shakeElement(el);
    return;
  }

  const btn = document.getElementById('walkupBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="searching-spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;"></span> Booking...';
  btn.disabled = true;

  try {
    await fetch(`${API}/api/people/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ig: instagram,
        email: email,
        source: 'Walk-up'
      })
    });
  } catch (e) {
    console.error('Walk-up save error:', e);
  }

  btn.innerHTML = originalText;
  btn.disabled = false;
  showScreen('walkup-confirmation');
}

function shareStoryCard() {
  if (navigator.share) {
    navigator.share({
      title: 'Getting filmed by Social Dance TV!',
      text: 'I\'m getting filmed by @socialdancetv tonight 🔥🎬',
      url: 'https://socialdancetv.com'
    }).catch(() => {});
  } else {
    showToast('Story card copied! Share it on your Instagram Story.');
  }
}

function acceptWalkupUpsell() {
  const upsellCard = document.getElementById('walkupUpsell');
  upsellCard.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;color:var(--sdtv-green);font-weight:600;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      Feature added — €100
    </div>
    <p style="font-size:var(--text-sm);color:var(--sdtv-text-muted);">We'll feature your dance on @socialdancetv as a Collab post.</p>
  `;
}

function declineWalkupUpsell() {
  const upsellCard = document.getElementById('walkupUpsell');
  upsellCard.style.opacity = '0';
  upsellCard.style.transform = 'translateY(-10px)';
  setTimeout(() => upsellCard.style.display = 'none', 300);
}

// ==========================================
// CHECK STATUS FLOW
// ==========================================
function validateStatusCheck() {
  const email = document.getElementById('statusEmail').value.trim();
  const btn = document.getElementById('statusCheckBtn');

  if (isValidEmail(email)) {
    btn.disabled = false;
    btn.classList.remove('disabled');
  } else {
    btn.disabled = true;
    btn.classList.add('disabled');
  }
}

async function checkVideoStatus() {
  const email = document.getElementById('statusEmail').value.trim();
  if (!isValidEmail(email)) {
    const el = document.getElementById('statusEmail');
    el.focus(); el.classList.add('error'); shakeElement(el);
    return;
  }

  const btn = document.getElementById('statusCheckBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="searching-spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;"></span> Checking...';
  btn.disabled = true;

  try {
    // Search by email via people autocomplete, then search captures by IG
    const peopleRes = await fetch(`${API}/api/people/autocomplete?q=${encodeURIComponent(email)}`);
    const peopleData = await peopleRes.json();
    const person = (peopleData.results || []).find(p => p.email?.toLowerCase() === email.toLowerCase());

    const statusResult = document.getElementById('statusResult');
    if (!person || !person.ig) {
      if (statusResult) {
        statusResult.style.display = '';
        statusResult.innerHTML = '<p style="color:var(--sdtv-text-muted);text-align:center;">No videos found for this email. Try searching by Instagram handle instead.</p><button class="btn-primary" onclick="selectIntent(\'archive\')" style="width:100%;margin-top:12px;">Find My Dance</button>';
      }
      btn.innerHTML = originalText; btn.disabled = false;
      return;
    }

    // Found person — search their captures
    const capRes = await fetch(`${API}/api/captures/search?ig=${encodeURIComponent(person.ig)}`);
    const capData = await capRes.json();
    const results = capData.results || [];

    if (results.length === 0) {
      if (statusResult) {
        statusResult.style.display = '';
        statusResult.innerHTML = '<p style="color:var(--sdtv-text-muted);text-align:center;">No videos found for ' + esc(person.ig) + '. Your footage may not have been processed yet.</p>';
      }
      btn.innerHTML = originalText; btn.disabled = false;
      return;
    }

    // Route to archive flow with results
    state.dancerIdentity = person.ig;
    state.searchResults = results;
    state.currentFlow = 'archive';

    const ready = results.filter(r => r.status === 'Ready' || r.status === 'Delivered' || r.status === 'Notified' || r.previewUrl);
    const notReady = results.filter(r => r.status === 'Captured' || r.status === 'Processing' || r.status === 'Waitlisted');

    if (ready.length > 0) {
      state.selectedClips = [];
      populateClipList([...ready, ...notReady], person.ig.replace('@', ''));
      showScreen('archive-preview');
    } else if (notReady.length > 0) {
      const festName = document.getElementById('notreadyFestival');
      if (festName) festName.textContent = state.selectedFestival?.name || 'the festival';
      const notifyEmail = document.getElementById('notifyEmail');
      if (notifyEmail) notifyEmail.value = email;
      validateNotifyForm();
      showScreen('archive-notready');
    }
  } catch (e) {
    console.error('Status check error:', e);
    showToast('Could not check status. Please try again.');
  }
  btn.innerHTML = originalText; btn.disabled = false;
}

// ==========================================
// SHARE
// ==========================================
function shareSDTV() {
  if (navigator.share) {
    navigator.share({
      title: 'Social Dance TV',
      text: 'Get your dance professionally filmed at your next festival',
      url: 'https://socialdancetv.com'
    }).catch(() => {});
  } else {
    showToast('Link copied: socialdancetv.com — share it with a friend for €10 off each.');
  }
}

// ==========================================
// UTILITIES
// ==========================================
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function shakeElement(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shake 400ms ease';
  setTimeout(() => el.style.animation = '', 400);
}

// Add shake keyframes dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
`;
document.head.appendChild(shakeStyle);

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// ==========================================
// KEYBOARD HANDLING
// ==========================================
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closePopup();
  }
});

// ==========================================
// COLLAB CONFIRM CHECKBOX — re-validate on change
// ==========================================
const collabConfirmCheck = document.getElementById('collabConfirmCheck');
if (collabConfirmCheck) {
  collabConfirmCheck.addEventListener('change', validatePreorderCheckout);
}

// ==========================================
// MONDAY MORNING FLOW
// ==========================================

// Simulated dancer list (in production, synced from Airtable)
const mondayDancers = [
  { name: 'Maria & Carlos', handle: '@maria_bachata', emoji: '💃' },
  { name: 'Svetlana K.', handle: '@sveta_kizomba', emoji: '🕺' },
  { name: 'Jean & Sophie', handle: '@jean_dances', emoji: '💃' },
  { name: 'Pedro Martinez', handle: '@pedro_zouk', emoji: '🕺' },
  { name: 'Anna & David', handle: '@anna_salsa', emoji: '💃' },
  { name: 'Kirill & Elena', handle: '@kirill_dance', emoji: '🕺' },
  { name: 'Lucas Fernandez', handle: '@lucas_bachata', emoji: '🕺' },
  { name: 'Mia & Tom', handle: '@mia_dances', emoji: '💃' },
  { name: 'Natasha P.', handle: '@natasha_kiz', emoji: '💃' },
  { name: 'Roberto & Lucia', handle: '@roberto_salsa', emoji: '🕺' },
  { name: 'Yuki & Hiroshi', handle: '@yuki_dance', emoji: '💃' },
  { name: 'Diana Morales', handle: '@diana_zouk', emoji: '💃' },
];

// Festival configs for Monday morning mode
const mondayFestivals = {
  'benidorm-2026': { name: 'Benidorm Beach Festival', date: 'Jun 2026', location: 'Spain', emoji: '🏖️' },
  'warsaw-2026': { name: 'Warsaw Bachata Festival', date: 'May 2026', location: 'Poland', emoji: '💃' },
  'budapest-2026': { name: 'Budapest Kizomba Festival', date: 'Apr 2026', location: 'Hungary', emoji: '🎶' },
};

let mondaySelectedDancer = null;

function initMondayMorning(festivalKey) {
  const festival = mondayFestivals[festivalKey] || mondayFestivals['benidorm-2026'];
  
  document.getElementById('mondayFestivalTitle').textContent = festival.name;
  document.getElementById('mondayFestivalMeta').textContent = festival.date + ' · ' + festival.location;
  
  // Render dancer list
  renderMondayDancers();
  
  // Random proof count
  const proofCount = Math.floor(Math.random() * 30) + 35;
  document.getElementById('mondayProofText').textContent = proofCount + ' dancers already signed up for notifications';
}

function renderMondayDancers(filter = '') {
  const container = document.getElementById('mondayDancerList');
  const filtered = filter 
    ? mondayDancers.filter(d => 
        d.name.toLowerCase().includes(filter.toLowerCase()) || 
        d.handle.toLowerCase().includes(filter.toLowerCase())
      )
    : mondayDancers;
  
  container.innerHTML = filtered.map(d => `
    <div class="monday-dancer-item" onclick="selectMondayDancer('${d.handle}', '${d.name}')">
      <div class="monday-dancer-avatar">${d.emoji}</div>
      <div class="monday-dancer-info">
        <div class="monday-dancer-name">${d.name}</div>
        <div class="monday-dancer-handle">${d.handle}</div>
      </div>
      <svg class="monday-dancer-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
  `).join('');

  if (filter && filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 16px; text-align: center; color: var(--sdtv-text-muted); font-size: 13px;">
        No match found — add your details below to get notified
      </div>
    `;
    showMondayMatchResult(false);
  }
}

function filterMondayDancers() {
  const query = document.getElementById('mondayDancerSearch').value.trim();
  renderMondayDancers(query);
  
  // Reset selection if searching
  if (query) {
    mondaySelectedDancer = null;
    document.getElementById('mondayMatchResult').style.display = 'none';
  }
}

function selectMondayDancer(handle, name) {
  mondaySelectedDancer = { handle, name };
  
  // Highlight selected
  document.querySelectorAll('.monday-dancer-item').forEach(el => el.classList.remove('highlighted'));
  event.currentTarget.classList.add('highlighted');
  
  // Show match result
  showMondayMatchResult(true);
  
  // Pre-fill Instagram
  document.getElementById('mondayInstagram').value = handle;
  validateMondayForm();
  
  // Scroll to notify form
  setTimeout(() => {
    document.querySelector('.monday-notify-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
}

function showMondayMatchResult(found) {
  const container = document.getElementById('mondayMatchResult');
  container.style.display = 'block';
  document.getElementById('mondayMatchFound').style.display = found ? 'flex' : 'none';
  document.getElementById('mondayMatchNotFound').style.display = found ? 'none' : 'flex';
}

function validateMondayForm() {
  const email = document.getElementById('mondayEmail').value.trim();
  const btn = document.getElementById('mondayNotifyBtn');
  
  if (isValidEmail(email)) {
    btn.disabled = false;
    btn.classList.remove('disabled');
  } else {
    btn.disabled = true;
    btn.classList.add('disabled');
  }
}

function submitMondayNotify() {
  const email = document.getElementById('mondayEmail').value.trim();
  const ig = document.getElementById('mondayInstagram').value.trim();
  const name = document.getElementById('mondayName').value.trim();
  
  // Show confirmation
  document.getElementById('mondayConfirmEmail').textContent = email;
  showScreen('monday-confirm');
  
  // In production: POST to Airtable API to create Claim record
  // Data sent to server — no client-side logging of PII
}

// ==========================================
// URL PARAMETER DETECTION
// ==========================================
function checkURLParams() {
  const params = new URLSearchParams(window.location.search);
  const flow = params.get('flow') || params.get('mode');
  const festival = params.get('festival') || params.get('fest');
  const ig = params.get('ig');
  const email = params.get('email');
  const source = params.get('source') || params.get('utm_source') || '';

  // Pre-fill identity from URL
  if (ig) {
    const handle = ig.startsWith('@') ? ig : '@' + ig;
    state.dancerIdentity = handle;
    const igField = document.getElementById('dancerIdentity');
    if (igField) igField.value = handle;
  }
  if (email) {
    state.collectedEmail = email;
    state.knownEmail = email;
    try { localStorage.setItem('sdtv_email', email); } catch {}
  }
  if (source) state.urlSource = source;

  // Route to flow
  if (flow === 'walkup') {
    state.currentFlow = 'walkup';
    initWalkup();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'slide-back'));
    document.getElementById('screen-walkup').classList.add('active');
    state.currentScreen = 'walkup';
    state.history = [];
    updateProgressBar();
    return 'walkup';
  }

  if (flow === 'monday' || (festival && !flow)) {
    const festivalKey = festival || 'benidorm-2026';
    state.currentFlow = 'monday';
    initMondayMorning(festivalKey);
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'slide-back'));
    document.getElementById('screen-monday-morning').classList.add('active');
    state.currentScreen = 'monday-morning';
    state.history = [];
    updateProgressBar();
    return 'monday';
  }

  if (flow === 'archive') {
    state.currentFlow = 'archive';
    // Pre-select festival if specified
    if (festival) {
      const match = [...liveFestivals, ...festivals].find(f =>
        f.name.toLowerCase().includes(festival.toLowerCase()) ||
        (f.slug && f.slug.toLowerCase() === festival.toLowerCase())
      );
      if (match) state.selectedFestival = match;
    }
    // If IG is known, skip to identity screen with pre-fill
    if (ig && state.selectedFestival) {
      showScreen('archive-identity');
      return 'archive';
    }
    selectIntent('archive');
    return 'archive';
  }

  if (flow === 'preorder') {
    selectIntent('preorder');
    return 'preorder';
  }

  if (flow === 'visibility') {
    selectIntent('visibility');
    return 'visibility';
  }

  return false;
}

// ==========================================
// AUTO-OPEN POPUP ON LOAD
// ==========================================
window.addEventListener('DOMContentLoaded', function() {
  renderFestivals();
  renderUpcomingFestivals();

  const urlMode = checkURLParams();

  // Auto-open popup after a brief delay for demo effect
  setTimeout(() => openPopup(), urlMode ? 200 : 600);

  // Re-apply URL flow after openPopup's resetForm
  if (urlMode) {
    setTimeout(() => checkURLParams(), 250);
  }
});

// ==========================================
// STRIPE PAYMENT INTEGRATION
// ==========================================
const STRIPE_PK = 'pk_live_51S6IiCPXcBjtisWblZnQiSdKhx4KP7zqbSSfTd1EpJayH2seuJ9qT2DCIFricZZ7HQSqYNPNlGAWeCzgu6WZ7ah400cMZxmDOY';
let stripeInstance = null;
let stripeElements = {};

function getStripe() {
  if (!stripeInstance && typeof Stripe !== 'undefined') {
    stripeInstance = Stripe(STRIPE_PK);
  }
  return stripeInstance;
}

function mountStripeCard(containerId, errorsId) {
  const s = getStripe();
  if (!s) return null;

  const elements = s.elements();
  const card = elements.create('card', {
    style: {
      base: {
        color: '#f0ede8',
        fontFamily: 'Inter, -apple-system, sans-serif',
        fontSize: '15px',
        fontSmoothing: 'antialiased',
        '::placeholder': { color: '#6a6660' },
      },
      invalid: { color: '#ef4444', iconColor: '#ef4444' },
    },
    hidePostalCode: true,
  });

  const container = document.getElementById(containerId);
  if (!container) return null;
  card.mount('#' + containerId);

  card.on('focus', () => container.classList.add('stripe-card-element--focus'));
  card.on('blur', () => container.classList.remove('stripe-card-element--focus'));
  card.on('change', (event) => {
    const errEl = document.getElementById(errorsId);
    if (errEl) errEl.textContent = event.error ? event.error.message : '';
    container.classList.toggle('stripe-card-element--invalid', !!event.error);
  });

  return card;
}

// Mount Stripe card elements when checkout screens become visible
const _origShowScreen = showScreen;
showScreen = function(id, ...args) {
  _origShowScreen(id, ...args);
  if (id === 'archive-checkout' && !stripeElements.archive) {
    setTimeout(() => {
      stripeElements.archive = mountStripeCard('archiveCardElement', 'archiveCardErrors');
      // Enable Pay button when card is complete
      if (stripeElements.archive) {
        stripeElements.archive.on('change', (e) => {
          const email = document.getElementById('archiveCheckoutEmail')?.value.trim();
          const btn = document.getElementById('archiveCheckoutBtn');
          btn.disabled = !e.complete || !isValidEmail(email || '');
          btn.classList.toggle('disabled', btn.disabled);
        });
      }
    }, 100);
  }
  if (id === 'preorder-checkout' && !stripeElements.preorder) {
    setTimeout(() => {
      stripeElements.preorder = mountStripeCard('preorderCardElement', 'preorderCardErrors');
      if (stripeElements.preorder) {
        stripeElements.preorder.on('change', (e) => {
          validatePreorderCheckout();
        });
      }
    }, 100);
  }
};

// Archive: real Stripe payment
async function processArchivePayment() {
  const email = document.getElementById('archiveCheckoutEmail').value.trim();
  if (!isValidEmail(email)) {
    const el = document.getElementById('archiveCheckoutEmail');
    el.focus(); el.classList.add('error'); shakeElement(el);
    return;
  }

  const btn = document.getElementById('archiveCheckoutBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="searching-spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;"></span> Processing...';
  btn.disabled = true;

  // Check if total is €0 (fully discounted) — skip payment
  const isEarlyBird = state.isEarlyBird || (state.activeCapture && ['Captured', 'Processing', 'Waitlisted'].includes(state.activeCapture?.status));
  const baseAmount = isEarlyBird ? 8000 : 10000;
  const promoDiscount = state.promo ? state.promo.discount : 0;
  const finalTotal = Math.max(0, baseAmount - promoDiscount);

  if (finalTotal === 0) {
    // Free checkout — save to Airtable and go to confirmation
    try {
      await fetch(`${API}/api/people/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ig: state.dancerIdentity || '', email, source: 'Free Promo Checkout', paid: true })
      });
      await fetch(`${API}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ig: state.dancerIdentity || '', email,
          festival: state.selectedFestival?.name || '',
          channel: 'Email', template: 'Free unlock - ' + (state.promo?.code || 'promo')
        })
      });
    } catch (e) { console.error('Free checkout save error:', e); }
    btn.innerHTML = originalText; btn.disabled = false;
    showScreen('archive-confirmation');
    return;
  }

  try {
    // 1. Create PaymentIntent on backend
    const piRes = await fetch(`${API}/api/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        captureId: state.activeCapture?.id || '',
        amount: state.promo ? state.promo.newTotal : 10000,
        description: 'SDTV HD Dance Video' + (state.promo ? ' (' + state.promo.code + ')' : ''),
        promoId: state.promo?.promoId || '',
        metadata: {
          ig: state.dancerIdentity || '',
          email: email,
          festival: state.selectedFestival?.name || '',
          flow: 'archive',
          product: 'prod_T2OrtAmOZ7MJVV',
        }
      })
    });
    const piData = await piRes.json();
    if (!piRes.ok) throw new Error(piData.error || 'Payment setup failed');

    // 2. Confirm payment with Stripe
    const s = getStripe();
    const { error, paymentIntent } = await s.confirmCardPayment(piData.clientSecret, {
      payment_method: {
        card: stripeElements.archive,
        billing_details: { email: email },
      }
    });

    if (error) {
      document.getElementById('archiveCardErrors').textContent = error.message;
      btn.innerHTML = originalText;
      btn.disabled = false;
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      // 3. Save to Airtable
      try {
        await fetch(`${API}/api/people/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ig: state.dancerIdentity || '', email, source: 'Archive Purchase', paid: true })
        });
        await fetch(`${API}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ig: state.dancerIdentity || '', email,
            festival: state.selectedFestival?.name || '',
            channel: 'Email', template: 'Purchase confirmation'
          })
        });
      } catch (e) { console.error('Airtable save error:', e); }

      btn.innerHTML = originalText;
      btn.disabled = false;
      showScreen('archive-confirmation');
    }
  } catch (e) {
    console.error('Payment error:', e);
    document.getElementById('archiveCardErrors').textContent = e.message || 'Payment failed. Please try again.';
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// Preorder: real Stripe payment
async function processPreorderPayment() {
  const name = document.getElementById('preorderName').value.trim();
  const email = document.getElementById('preorderEmail').value.trim();
  const instagram = document.getElementById('preorderInstagram').value.trim();

  if (name.length < 2) { shakeElement(document.getElementById('preorderName')); return; }
  if (!isValidEmail(email)) { const el = document.getElementById('preorderEmail'); el.focus(); el.classList.add('error'); shakeElement(el); return; }

  const total = state.selectedPackage.price + (state.collabAddon ? 100 : 0);
  const btn = document.getElementById('preorderCheckoutBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="searching-spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;"></span> Processing...';
  btn.disabled = true;

  try {
    const piRes = await fetch(`${API}/api/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: state.promo ? state.promo.newTotal : total * 100,
        description: `SDTV Reserve Filming — ${state.selectedUpcomingFestival?.name || 'Festival'}` + (state.promo ? ` (${state.promo.code})` : ''),
        metadata: {
          ig: instagram, email, name,
          festival: state.selectedUpcomingFestival?.name || '',
          package: state.selectedPackage?.type || '',
          collab: state.collabAddon ? 'yes' : 'no',
          day: state.selectedDay || '',
          slot: state.selectedSlot?.label || '',
          flow: 'preorder',
        }
      })
    });
    const piData = await piRes.json();
    if (!piRes.ok) throw new Error(piData.error || 'Payment setup failed');

    const s = getStripe();
    const { error, paymentIntent } = await s.confirmCardPayment(piData.clientSecret, {
      payment_method: {
        card: stripeElements.preorder,
        billing_details: { email, name },
      }
    });

    if (error) {
      document.getElementById('preorderCardErrors').textContent = error.message;
      btn.innerHTML = originalText; btn.disabled = false;
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      try {
        await fetch(`${API}/api/reservations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            festival: state.selectedUpcomingFestival?.name || '',
            day: state.selectedDay || '', style: '',
            ig: instagram, email, name,
            package: state.selectedPackage?.type === 'pro' ? 'Pro Package' : 'Social Dance',
            notes: state.selectedSlot ? `Slot: ${state.selectedSlot.label}` : 'Flexible timing',
          })
        });
      } catch (e) { console.error('Reservation save error:', e); }

      btn.innerHTML = originalText; btn.disabled = false;
      if (state.selectedUpcomingFestival) {
        document.getElementById('confirmFestivalName').textContent = state.selectedUpcomingFestival.name;
      }
      populateFilmingPass();
      showScreen('preorder-confirmation');
    }
  } catch (e) {
    console.error('Payment error:', e);
    document.getElementById('preorderCardErrors').textContent = e.message || 'Payment failed. Please try again.';
    btn.innerHTML = originalText; btn.disabled = false;
  }
}

// ==========================================
// PROMO CODE SYSTEM
// ==========================================
state.promo = null; // { code, discount, description, newTotal }

// Auto-apply from URL param on load
(function checkUrlPromo() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('promo') || params.get('code') || params.get('discount');
  if (code) {
    state.pendingPromo = code.toUpperCase();
  }
})();

function togglePromoInput(flow) {
  const input = document.getElementById(flow + 'PromoInput');
  const link = document.getElementById(flow + 'PromoLink');
  if (input.style.display === 'none') {
    input.style.display = '';
    link.style.display = 'none';
    document.getElementById(flow + 'PromoCode').focus();
  } else {
    input.style.display = 'none';
    link.style.display = '';
  }
}

async function applyPromo(flow) {
  const input = document.getElementById(flow + 'PromoCode');
  const code = (input.value || '').trim().toUpperCase();
  const errorEl = document.getElementById(flow + 'PromoError');

  if (!code) { errorEl.textContent = 'Enter a code'; return; }

  const isEarlyBird = state.isEarlyBird || (state.activeCapture && ['Captured', 'Processing', 'Waitlisted'].includes(state.activeCapture?.status));
  const baseAmount = (flow === 'archive' || flow === 'unlock') ? (isEarlyBird ? 8000 : 10000) : (state.selectedPackage.price + (state.collabAddon ? 100 : 0)) * 100;

  try {
    const res = await fetch(`${API}/api/validate-promo?code=${encodeURIComponent(code)}&amount=${baseAmount}`);
    const data = await res.json();

    if (!data.valid) {
      errorEl.textContent = data.error || 'Invalid code';
      input.classList.add('error');
      shakeElement(input);
      return;
    }

    errorEl.textContent = '';
    state.promo = data;
    showPromoBanner(flow, data);
    updateCheckoutTotal(flow);
  } catch (e) {
    errorEl.textContent = 'Could not validate code';
  }
}

async function autoApplyPromo(flow) {
  if (!state.pendingPromo) return;
  const code = state.pendingPromo;
  const isEB = state.isEarlyBird || (state.activeCapture && ['Captured', 'Processing', 'Waitlisted'].includes(state.activeCapture?.status));
  const baseAmount = (flow === 'archive' || flow === 'unlock') ? (isEB ? 8000 : 10000) : (state.selectedPackage.price + (state.collabAddon ? 100 : 0)) * 100;

  try {
    const res = await fetch(`${API}/api/validate-promo?code=${encodeURIComponent(code)}&amount=${baseAmount}`);
    const data = await res.json();
    if (data.valid) {
      state.promo = data;
      showPromoBanner(flow, data);
      updateCheckoutTotal(flow);
    }
  } catch (e) { /* silent */ }
  state.pendingPromo = null;
}

function showPromoBanner(flow, data) {
  const banner = document.getElementById(flow + 'PromoBanner');
  const text = document.getElementById(flow + 'PromoText');
  const link = document.getElementById(flow + 'PromoLink');
  const input = document.getElementById(flow + 'PromoInput');

  text.textContent = data.description + ' — ' + data.code;
  banner.style.display = '';
  if (link) link.style.display = 'none';
  if (input) input.style.display = 'none';
}

function removePromo(flow) {
  state.promo = null;
  const banner = document.getElementById(flow + 'PromoBanner');
  const link = document.getElementById(flow + 'PromoLink');
  banner.style.display = 'none';
  if (link) link.style.display = '';
  updateCheckoutTotal(flow);
}

function updateCheckoutTotal(flow) {
  if (flow === 'archive') {
    // Early-bird base is €80, otherwise €100
    const isEarlyBird = state.isEarlyBird ||
      (state.activeCapture && ['Captured', 'Processing', 'Waitlisted'].includes(state.activeCapture.status));
    const base = isEarlyBird ? 8000 : 10000;
    const discount = state.promo ? state.promo.discount : 0;
    const total = Math.max(0, base - discount);

    const totalEl = document.getElementById('archiveTotal');
    if (totalEl) totalEl.textContent = '€' + (total / 100);

    const payLabel = document.getElementById('archivePayLabel');
    if (payLabel) payLabel.textContent = total === 0 ? 'Complete Order' : 'Pay €' + (total / 100);

    const earlybirdRow = document.getElementById('archiveEarlybirdRow');
    if (earlybirdRow) earlybirdRow.style.display = isEarlyBird ? '' : 'none';

    // Hide card details when total is 0 (fully discounted)
    const cardGroup = document.getElementById('archiveCardElement')?.closest('.form-group');
    if (cardGroup) cardGroup.style.display = total === 0 ? 'none' : '';

    // Enable pay button when total is 0 (no card needed)
    const payBtn = document.getElementById('archiveCheckoutBtn');
    if (payBtn && total === 0) {
      payBtn.disabled = false;
    }

    // Add/remove promo discount line in order summary
    let discountRow = document.getElementById('archiveDiscountRow');
    const summaryMini = document.querySelector('#screen-archive-checkout .order-summary-mini');
    if (discount > 0 && state.promo && summaryMini) {
      if (!discountRow) {
        discountRow = document.createElement('div');
        discountRow.id = 'archiveDiscountRow';
        discountRow.className = 'price-row price-discount';
        const divider = summaryMini.querySelector('.price-divider');
        summaryMini.insertBefore(discountRow, divider);
      }
      // Show discount relative to early-bird base, not full price
      const promoDiscount = Math.min(discount, base);
      discountRow.innerHTML = `<span>${esc(state.promo.code)}</span><span>-€${(promoDiscount/100)}</span>`;
    } else if (discountRow) {
      discountRow.remove();
    }
  } else if (flow === 'unlock') {
    const isEarlyBird = state.isEarlyBird ||
      (state.activeCapture && ['Captured', 'Processing', 'Waitlisted'].includes(state.activeCapture?.status));
    const base = isEarlyBird ? 8000 : 10000;
    const discount = state.promo ? state.promo.discount : 0;
    const total = Math.max(0, base - discount);

    const totalEl = document.getElementById('unlockTotal');
    if (totalEl) totalEl.textContent = '€' + (total / 100);

    const payAmount = document.getElementById('unlockPayAmount');
    if (payAmount) payAmount.textContent = '€' + (total / 100);

    // Update unlock button text
    const unlockPayLabel = document.getElementById('unlockPayLabel');
    const unlockPayAmt = document.getElementById('unlockPayAmount');
    if (total === 0) {
      if (unlockPayLabel) unlockPayLabel.textContent = 'Complete Order';
      if (unlockPayAmt) unlockPayAmt.textContent = '';
    } else {
      if (unlockPayLabel) unlockPayLabel.textContent = 'Unlock My Video';
      if (unlockPayAmt) unlockPayAmt.textContent = '€' + (total / 100);
    }

    // Hide card when total is 0
    const cardEl = document.getElementById('unlockCardElement')?.closest('.form-group');
    if (cardEl) cardEl.style.display = total === 0 ? 'none' : '';
    if (unlockBtn && total === 0) unlockBtn.disabled = false;

    // Discount line in summary
    const discountRow = document.getElementById('unlockDiscountRow');
    if (discount > 0 && state.promo && discountRow) {
      discountRow.className = 'price-row price-discount';
      const promoDiscount = Math.min(discount, base);
      discountRow.innerHTML = `<span>${esc(state.promo.code)}</span><span>-€${(promoDiscount/100)}</span>`;
    } else if (discountRow) {
      discountRow.className = '';
      discountRow.innerHTML = '';
    }
  } else if (flow === 'preorder') {
    const base = (state.selectedPackage.price + (state.collabAddon ? 100 : 0)) * 100;
    const discount = state.promo ? state.promo.discount : 0;
    const total = base - discount;
    document.getElementById('summaryTotal').textContent = '€' + (total / 100);
    document.getElementById('checkoutTotal').textContent = '€' + (total / 100);
  }
}

// Hook into showScreen to auto-apply pending promo
const _origShowScreenPromo = showScreen;
showScreen = function(id, ...args) {
  _origShowScreenPromo(id, ...args);
  if (id === 'archive-checkout' && state.pendingPromo) {
    setTimeout(() => autoApplyPromo('archive'), 300);
  }
  if (id === 'preorder-checkout' && state.pendingPromo) {
    setTimeout(() => autoApplyPromo('preorder'), 300);
  }
};

// ==========================================
// UPSELL: INLINE STRIPE CHECKOUT
// ==========================================
function showUpsellCheckout() {
  const checkout = document.getElementById('upsellCheckout');
  const actions = document.getElementById('upsellActions');
  checkout.classList.add('active');
  actions.style.display = 'none';

  // Mount Stripe card if not already
  if (!stripeElements.upsell) {
    setTimeout(() => {
      stripeElements.upsell = mountStripeCard('upsellCardElement', 'upsellCardErrors');
      if (stripeElements.upsell) {
        stripeElements.upsell.on('change', (e) => {
          const btn = document.getElementById('upsellPayBtn');
          btn.disabled = !e.complete;
          btn.classList.toggle('disabled', !e.complete);
        });
      }
    }, 100);
  }
}

async function processUpsellPayment() {
  const btn = document.getElementById('upsellPayBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="searching-spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;"></span> Processing...';
  btn.disabled = true;

  // Get email from earlier checkout
  const email = document.getElementById('archiveCheckoutEmail')?.value.trim() || state.archiveEmail || '';

  try {
    const piRes = await fetch(`${API}/api/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 10000, // €100
        description: 'SDTV Feature on Channel — Collab Post',
        metadata: {
          ig: state.dancerIdentity || '',
          email: email,
          festival: state.selectedFestival?.name || '',
          flow: 'upsell-feature',
        }
      })
    });
    const piData = await piRes.json();
    if (!piRes.ok) throw new Error(piData.error || 'Payment setup failed');

    const s = getStripe();
    const { error, paymentIntent } = await s.confirmCardPayment(piData.clientSecret, {
      payment_method: {
        card: stripeElements.upsell,
        billing_details: { email },
      }
    });

    if (error) {
      document.getElementById('upsellCardErrors').textContent = error.message;
      btn.innerHTML = originalText; btn.disabled = false;
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      // Save notification for feature
      try {
        await fetch(`${API}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ig: state.dancerIdentity || '', email,
            festival: state.selectedFestival?.name || '',
            channel: 'Email', template: 'Upsell Feature confirmed'
          })
        });
      } catch (e) { console.error('Upsell notification error:', e); }

      // Show success
      document.getElementById('upsellCheckout').style.display = 'none';
      document.getElementById('upsellSuccess').style.display = '';
      // Hide price and features since it's done
      const priceEl = document.querySelector('#archiveUpsell .upsell-price');
      if (priceEl) priceEl.style.display = 'none';
    }
  } catch (e) {
    console.error('Upsell payment error:', e);
    document.getElementById('upsellCardErrors').textContent = e.message || 'Payment failed';
    btn.innerHTML = originalText; btn.disabled = false;
  }
}

// ==========================================
// EMAIL AUTO-FILL FROM PEOPLE TABLE
// ==========================================
function setupArchiveCheckoutEmail() {
  const confirmedEl = document.getElementById('archiveEmailConfirmed');
  const emailGroup = document.getElementById('archiveEmailGroup');
  const emailInput = document.getElementById('archiveCheckoutEmail');
  const knownEmailEl = document.getElementById('archiveKnownEmail');

  if (state.knownEmail && isValidEmail(state.knownEmail)) {
    // Known user — show confirmation, hide field
    knownEmailEl.textContent = state.knownEmail;
    confirmedEl.style.display = '';
    emailGroup.style.display = 'none';
    emailInput.value = state.knownEmail;
    // Enable pay button (card check will handle the rest)
    const btn = document.getElementById('archiveCheckoutBtn');
    if (btn) { btn.disabled = false; btn.classList.remove('disabled'); }
  } else {
    // Unknown — show email field
    confirmedEl.style.display = 'none';
    emailGroup.style.display = '';
  }
}

function showArchiveEmailField() {
  document.getElementById('archiveEmailConfirmed').style.display = 'none';
  document.getElementById('archiveEmailGroup').style.display = '';
  document.getElementById('archiveCheckoutEmail').focus();
}

// Hook into showScreen to set up email on checkout
const _origShowScreenEmail = showScreen;
showScreen = function(id, ...args) {
  _origShowScreenEmail(id, ...args);
  if (id === 'archive-checkout') {
    setTimeout(setupArchiveCheckoutEmail, 50);
  }
};

// ==========================================
// UNLOCK SCREEN: EMAIL AUTO-FILL
// ==========================================
function setupUnlockEmail() {
  const confirmedEl = document.getElementById('unlockEmailConfirmed');
  const emailGroup = document.getElementById('unlockEmailGroup');
  const emailInput = document.getElementById('unlockEmail');
  const knownEmailEl = document.getElementById('unlockKnownEmail');
  const btn = document.getElementById('unlockBtn');

  if (state.knownEmail && isValidEmail(state.knownEmail)) {
    knownEmailEl.textContent = state.knownEmail;
    confirmedEl.style.display = '';
    emailGroup.style.display = 'none';
    emailInput.value = state.knownEmail;
    if (btn) { btn.disabled = false; btn.classList.remove('disabled'); }
  } else {
    confirmedEl.style.display = 'none';
    emailGroup.style.display = '';
  }
}

function showUnlockEmailField() {
  document.getElementById('unlockEmailConfirmed').style.display = 'none';
  document.getElementById('unlockEmailGroup').style.display = '';
  document.getElementById('unlockEmail').focus();
}

// Hook into showScreen
const _origShowScreenUnlock = showScreen;
showScreen = function(id, ...args) {
  _origShowScreenUnlock(id, ...args);
  if (id === 'archive-unlock') {
    setTimeout(setupUnlockEmail, 50);
  }
};

// ==========================================
// NEW UNLOCK SCREEN: STRIPE + APPLE PAY
// ==========================================
function setupUnlockScreen() {
  // Populate video info
  const titleEl = document.getElementById('unlockVideoTitle');
  if (titleEl && state.activeCapture) {
    titleEl.textContent = state.activeCapture.videoTitle || 'Your dance video';
  }
  if (state.selectedFestival) {
    const festEl = document.getElementById('unlockFestival');
    if (festEl) festEl.textContent = state.selectedFestival.name;
  }

  // Email auto-fill
  setupUnlockEmail();

  // Mount Stripe card
  if (!stripeElements.unlock) {
    setTimeout(() => {
      stripeElements.unlock = mountStripeCard('unlockCardElement', 'unlockCardErrors');
      if (stripeElements.unlock) {
        stripeElements.unlock.on('change', (e) => {
          const email = document.getElementById('unlockEmail')?.value.trim();
          const hasEmail = (state.knownEmail && isValidEmail(state.knownEmail)) || isValidEmail(email || '');
          const btn = document.getElementById('unlockPayBtn');
          btn.disabled = !e.complete || !hasEmail;
          btn.classList.toggle('disabled', btn.disabled);
        });
      }
      // Mount Payment Request (Apple Pay / Google Pay)
      mountPaymentRequest();
    }, 150);
  }

  // Auto-apply promo from URL
  if (state.pendingPromo) {
    setTimeout(() => autoApplyPromo('unlock'), 300);
  }
}

function mountPaymentRequest() {
  const s = getStripe();
  if (!s) return;

  const amount = state.promo ? state.promo.newTotal : 10000;
  const paymentRequest = s.paymentRequest({
    country: 'ES',
    currency: 'eur',
    total: { label: 'SDTV Dance Video', amount },
    requestPayerEmail: !state.knownEmail,
  });

  const prButton = s.elements().create('paymentRequestButton', { paymentRequest });
  paymentRequest.canMakePayment().then(result => {
    if (result) {
      prButton.mount('#unlockPaymentRequest');
    } else {
      document.getElementById('unlockPaymentRequest').style.display = 'none';
    }
  });

  paymentRequest.on('paymentmethod', async (ev) => {
    const email = ev.payerEmail || state.knownEmail || document.getElementById('unlockEmail')?.value.trim() || '';
    try {
      const piRes = await fetch(`${API}/api/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captureId: state.activeCapture?.id || '',
          amount,
          description: 'SDTV HD Dance Video',
          promoId: state.promo?.promoId || '',
          metadata: {
            ig: state.dancerIdentity || '', email,
            festival: state.selectedFestival?.name || '',
            flow: 'archive', product: 'prod_T2OrtAmOZ7MJVV',
          }
        })
      });
      const piData = await piRes.json();
      const { error, paymentIntent } = await s.confirmCardPayment(piData.clientSecret, {
        payment_method: ev.paymentMethod.id,
      }, { handleActions: false });

      if (error) {
        ev.complete('fail');
        return;
      }
      ev.complete('success');
      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_action') {
        // Save to Airtable
        try {
          await fetch(`${API}/api/people/upsert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ig: state.dancerIdentity || '', email, source: 'Archive Purchase', paid: true })
          });
        } catch (e) {}
        showScreen('archive-confirmation');
      }
    } catch (e) {
      ev.complete('fail');
    }
  });
}

async function processUnlockPayment() {
  const email = document.getElementById('unlockEmail')?.value.trim() || state.knownEmail || '';
  if (!isValidEmail(email)) {
    showUnlockEmailField();
    const el = document.getElementById('unlockEmail');
    if (el) { el.focus(); el.classList.add('error'); shakeElement(el); }
    return;
  }

  const btn = document.getElementById('unlockPayBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="searching-spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;"></span> Processing...';
  btn.disabled = true;

  const amount = state.promo ? state.promo.newTotal : 10000;

  // FREE ORDER: skip Stripe, go straight to confirmation
  if (amount <= 0) {
    try {
      await fetch(`${API}/api/people/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ig: state.dancerIdentity || '', email, source: 'Free Unlock (promo)' })
      });
      await fetch(`${API}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ig: state.dancerIdentity || '', email,
          festival: state.selectedFestival?.name || '',
          channel: 'Email', template: 'Free unlock - ' + (state.promo?.code || 'promo')
        })
      });
    } catch (e) { console.error('Free unlock save error:', e); }
    btn.innerHTML = originalText; btn.disabled = false;
    showScreen('archive-confirmation');
    return;
  }

  try {
    const piRes = await fetch(`${API}/api/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        captureId: state.activeCapture?.id || '',
        amount,
        description: 'SDTV HD Dance Video' + (state.promo ? ' (' + state.promo.code + ')' : ''),
        promoId: state.promo?.promoId || '',
        metadata: {
          ig: state.dancerIdentity || '', email,
          festival: state.selectedFestival?.name || '',
          flow: 'archive', product: 'prod_T2OrtAmOZ7MJVV',
        }
      })
    });
    const piData = await piRes.json();
    if (!piRes.ok) throw new Error(piData.error || 'Payment setup failed');

    const s = getStripe();
    const { error, paymentIntent } = await s.confirmCardPayment(piData.clientSecret, {
      payment_method: {
        card: stripeElements.unlock,
        billing_details: { email },
      }
    });

    if (error) {
      document.getElementById('unlockCardErrors').textContent = error.message;
      btn.innerHTML = originalText; btn.disabled = false;
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      try {
        await fetch(`${API}/api/people/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ig: state.dancerIdentity || '', email, source: 'Archive Purchase', paid: true })
        });
        await fetch(`${API}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ig: state.dancerIdentity || '', email,
            festival: state.selectedFestival?.name || '',
            channel: 'Email', template: 'Purchase confirmation'
          })
        });
      } catch (e) {}

      btn.innerHTML = originalText; btn.disabled = false;
      showScreen('archive-confirmation');
    }
  } catch (e) {
    document.getElementById('unlockCardErrors').textContent = e.message || 'Payment failed';
    btn.innerHTML = originalText; btn.disabled = false;
  }
}

// (Old override removed — confirmArchiveMatch now handles multi-clip natively)

// Hook into showScreen for unlock setup
const _origShowScreenUnlockNew = showScreen;
showScreen = function(id, ...args) {
  _origShowScreenUnlockNew(id, ...args);
  if (id === 'archive-unlock') {
    setTimeout(setupUnlockScreen, 50);
  }
};

// ==========================================
// PROTECTED VIDEO PREVIEW (5-SEC LIMIT)
// ==========================================
const PREVIEW_LIMIT = 5; // seconds
let previewTimer = null;

// Stubs — kept for compatibility with inline onclick in older HTML sections
const playPreviewVideo = () => {};

// Block keyboard shortcuts for saving video
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'VIDEO' || e.target.closest('.video-preview-player')) {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) e.preventDefault();
    if (e.key === 'S' && (e.ctrlKey || e.metaKey)) e.preventDefault();
  }
});

// Unlock screen setup — personalize title with dancer name
const _origSetupUnlock = setupUnlockScreen;
setupUnlockScreen = function() {
  _origSetupUnlock();
  const unlockTitle = document.getElementById('unlockTitle');
  if (unlockTitle) {
    const firstName = state.knownName ? state.knownName.split(' ')[0] : '';
    unlockTitle.textContent = firstName ? `${firstName}, your dance is ready` : 'Your dance is ready';
  }
};

/* (removed: dead loadFoundPreviewVideo, playFoundPreviewVideo stubs) */

// ==========================================
// ADAPTIVE CHECKOUT: HIDE CARD WHEN €0
// ==========================================
function updateUnlockCheckoutState() {
  const total = state.promo ? state.promo.newTotal : 10000;
  const cardGroup = document.getElementById('unlockCardGroup');
  const paymentRequest = document.getElementById('unlockPaymentRequest');
  const payLabel = document.getElementById('unlockPayLabel');
  const payAmount = document.getElementById('unlockPayAmount');
  const payBtn = document.getElementById('unlockPayBtn');

  if (total <= 0) {
    // Free — hide card, change CTA
    if (cardGroup) cardGroup.style.display = 'none';
    if (paymentRequest) paymentRequest.style.display = 'none';
    if (payLabel) payLabel.textContent = 'Get My Video';
    if (payAmount) payAmount.textContent = 'Free';
    // Enable button (no card needed)
    if (payBtn) { payBtn.disabled = false; payBtn.classList.remove('disabled'); }
  } else {
    // Paid — show card
    if (cardGroup) cardGroup.style.display = '';
    if (paymentRequest) paymentRequest.style.display = '';
    if (payLabel) payLabel.textContent = 'Unlock My Video';
    if (payAmount) payAmount.textContent = '€' + (total / 100);
  }
}

// Hook into updateCheckoutTotal for unlock
const _origUpdateCheckoutTotal = updateCheckoutTotal;
updateCheckoutTotal = function(flow) {
  _origUpdateCheckoutTotal(flow);
  if (flow === 'unlock') {
    updateUnlockCheckoutState();
  }
};

// ==========================================
// AUTOCOMPLETE: TOUCH SCROLL FIX
// ==========================================
let _acTouchY = 0;
const AC_TAP_THRESHOLD = 10; // pixels — if finger moved more, it's a scroll

function acTouchStart(e) {
  _acTouchY = e.touches[0].clientY;
}

function acTouchEnd(e, ig, email, name) {
  const dy = Math.abs(e.changedTouches[0].clientY - _acTouchY);
  if (dy < AC_TAP_THRESHOLD) {
    // It was a tap, not a scroll
    e.preventDefault();
    selectIgSuggestion(ig, email, name);
  }
  // If dy >= threshold, it was a scroll — do nothing, let it scroll
}

// ==========================================
// PARTNER SHARE CTA
// ==========================================
function getPartnerInfo() {
  const cap = state.activeCapture;
  if (!cap || !cap.partner1 || !cap.partner2) return null;

  const myIg = ('@' + (state.dancerIdentity || '').replace(/^@/, '')).toLowerCase();
  const p1ig = (cap.partner1.ig || '').toLowerCase();
  const p2ig = (cap.partner2.ig || '').toLowerCase();

  // Determine which partner is "the other one"
  if (p1ig && myIg.includes(p1ig.replace(/[@._\s-]/g, '')) || p1ig.includes(myIg.replace(/[@._\s-]/g, ''))) {
    return cap.partner2.name ? cap.partner2 : null;
  }
  if (p2ig && myIg.includes(p2ig.replace(/[@._\s-]/g, '')) || p2ig.includes(myIg.replace(/[@._\s-]/g, ''))) {
    return cap.partner1.name ? cap.partner1 : null;
  }
  // Fallback: return partner2 if exists
  return cap.partner2.name ? cap.partner2 : (cap.partner1.name ? cap.partner1 : null);
}

function setupPartnerShare() {
  const partner = getPartnerInfo();

  // Unlock screen
  const unlockEl = document.getElementById('unlockPartnerShare');
  const unlockText = document.getElementById('unlockPartnerText');
  // Confirmation screen
  const confirmEl = document.getElementById('confirmPartnerShare');
  const confirmText = document.getElementById('confirmPartnerText');

  const hasName = partner && partner.name && partner.name.length > 1;
  const name = hasName ? partner.name : null;
  const pronoun = name ? guessPronoun(name) : 'they';

  const mainText = name ? `Send to ${name}` : 'Share with your dance partner';
  const subText = pronoun === 'she'
    ? 'She might want her clip too'
    : pronoun === 'he'
    ? 'He might want his clip too'
    : 'They might want their clip too';

  if (unlockEl) {
    unlockEl.style.display = '';
    unlockText.textContent = mainText;
    unlockEl.querySelector('.partner-share-sub').textContent = subText;
  }
  if (confirmEl) {
    confirmEl.style.display = '';
    confirmText.textContent = mainText;
    confirmEl.querySelector('.partner-share-sub').textContent = subText;
  }

  // Store partner IG for share action
  state.partnerIg = partner?.ig || '';
  state.partnerName = name || '';
}

function guessPronoun(name) {
  // Simple heuristic: names ending in a/e/i tend to be female in Latin dance community
  const n = name.trim().toLowerCase();
  const femEndings = ['a', 'e', 'i', 'à', 'è', 'ù', 'ina', 'ella', 'lla'];
  if (femEndings.some(e => n.endsWith(e))) return 'she';
  const mascEndings = ['o', 'os', 'on', 'an', 'el', 'er'];
  if (mascEndings.some(e => n.endsWith(e))) return 'he';
  return 'they';
}

function shareWithPartner() {
  // Build deep link with context so partner lands in the right flow
  const base = window.location.href.split('?')[0];
  const params = new URLSearchParams();
  params.set('flow', 'archive');
  if (state.selectedFestival?.name) params.set('fest', state.selectedFestival.name);
  if (state.partnerIg) params.set('ig', state.partnerIg);
  params.set('source', 'partner-share');
  const url = base + '?' + params.toString();

  const partnerName = state.partnerName || 'your dance partner';
  const text = `Hey ${partnerName}! We were filmed by Social Dance TV — you can find and get your video here:`;

  if (navigator.share) {
    navigator.share({ title: 'Your dance video', text, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(`${text} ${url}`).then(() => {
      showToast('Link copied — send it to ' + partnerName);
    }).catch(() => {
      showToast('Share this link: ' + url);
    });
  }
}

// Hook into showScreen
const _origShowScreenPartner = showScreen;
showScreen = function(id, ...args) {
  _origShowScreenPartner(id, ...args);
  if (id === 'archive-unlock' || id === 'archive-confirmation') {
    setTimeout(setupPartnerShare, 100);
  }
};
