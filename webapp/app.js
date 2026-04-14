'use strict';

/**
 * ParentEase webapp — vanilla JS (Phase 2 v1)
 * Handles auth flow (OTP) and dashboard rendering.
 */

const API = '/api';
const TOKEN_KEY = 'parentease_token';
const PHONE_KEY = 'parentease_phone';

// ─── Router ──────────────────────────────────────────────────────────────────
const page = location.pathname.split('/').pop() || 'index.html';
if (page === 'index.html' || page === '') {
  initAuth();
} else if (page === 'dashboard.html') {
  initDashboard();
}

// ─── Token helpers ───────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PHONE_KEY);
}

// ─── Auth page ───────────────────────────────────────────────────────────────
function initAuth() {
  // If already logged in, redirect
  if (getToken()) {
    location.replace('/webapp/dashboard.html');
    return;
  }

  const phoneForm = document.getElementById('phone-form');
  const codeForm = document.getElementById('code-form');
  const phoneInput = document.getElementById('phone');
  const codeInput = document.getElementById('code');
  const backBtn = document.getElementById('back-to-phone');
  const errorBox = document.getElementById('error');

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }
  function clearError() { errorBox.classList.add('hidden'); }

  function showStep(which) {
    clearError();
    phoneForm.classList.toggle('hidden', which !== 'phone');
    codeForm.classList.toggle('hidden', which !== 'code');
    if (which === 'code') codeInput.focus();
    if (which === 'phone') phoneInput.focus();
  }

  phoneForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    const phone = phoneInput.value.trim();
    const btn = phoneForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Envoi…';

    try {
      const res = await fetch(`${API}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();

      if (!res.ok) {
        const errMap = {
          invalid_phone: "Format invalide. Utilise +212... ou tg:123456789",
          user_not_found: data.message || "Aucun compte trouvé. Crée d'abord ton profil sur le bot.",
          rate_limited: "Un code a été envoyé récemment. Réessaie dans 30 secondes.",
          send_failed: "Échec d'envoi du code. Vérifie que tu as bien démarré le bot."
        };
        showError(errMap[data.error] || "Erreur inconnue");
        return;
      }

      localStorage.setItem(PHONE_KEY, phone);
      showStep('code');
    } catch (err) {
      showError("Erreur réseau. Réessaie.");
    } finally {
      btn.disabled = false;
      btn.textContent = 'Recevoir le code';
    }
  });

  codeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    const phone = localStorage.getItem(PHONE_KEY);
    const code = codeInput.value.trim();
    const btn = codeForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Vérification…';

    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });
      const data = await res.json();

      if (!res.ok) {
        const errMap = {
          invalid_input: "Code invalide — 6 chiffres attendus",
          invalid_code: "Code incorrect",
          code_already_used: "Ce code a déjà été utilisé",
          code_expired: "Code expiré — redemande-en un nouveau"
        };
        showError(errMap[data.error] || "Erreur inconnue");
        return;
      }

      setToken(data.token);
      location.replace('/webapp/dashboard.html');
    } catch (err) {
      showError("Erreur réseau. Réessaie.");
    } finally {
      btn.disabled = false;
      btn.textContent = 'Se connecter';
    }
  });

  backBtn.addEventListener('click', () => showStep('phone'));
}

// ─── Dashboard page ──────────────────────────────────────────────────────────
async function initDashboard() {
  const token = getToken();
  if (!token) {
    location.replace('/webapp/index.html');
    return;
  }

  document.getElementById('logout').addEventListener('click', async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (_) { /* ignore */ }
    clearToken();
    location.replace('/webapp/index.html');
  });

  // Load profile + history in parallel
  const [me, history] = await Promise.all([
    apiGet('/me'),
    apiGet('/history?limit=20').catch(() => ({ messages: [] }))
  ]);

  if (!me) {
    // session expired or invalid
    clearToken();
    location.replace('/webapp/index.html');
    return;
  }

  renderProfile(me);
  renderChildren(me.children);
  renderChallenges(me.challenges);
  renderCheckins(me.weekly_checkins);
  renderHistory(history.messages || []);
}

async function apiGet(path) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

function renderProfile(me) {
  const channelLabel = me.channel === 'telegram' ? '📱 Telegram' : '💬 WhatsApp';
  const channelId = me.channel === 'telegram' ? me.phone.replace('tg:', 'tg:') : me.phone;
  const langLabels = { fr: '🇫🇷 Français', en: '🇬🇧 English', es: '🇪🇸 Español', pt: '🇵🇹 Português', ar: '🇲🇦 العربية' };
  const cronLabel = me.cron_active ? '✅ Actifs' : '⏸️ En pause';

  document.getElementById('user-name').textContent = me.parent?.name || 'Parent';

  const dl = document.getElementById('profile');
  dl.innerHTML = '';
  const rows = [
    ['Prénom', me.parent?.name || '—'],
    ['Canal', channelLabel],
    ['Identifiant', channelId],
    ['Langue', langLabels[me.language] || me.language || '—'],
    ['Style parental', me.parenting_style || '—'],
    ['Contexte culturel', me.cultural_context || '—'],
    ['Messages auto', cronLabel],
    ['Membre depuis', me.created_at ? new Date(me.created_at).toLocaleDateString('fr-FR') : '—']
  ];
  for (const [k, v] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    dl.append(dt, dd);
  }
}

function renderChildren(children) {
  const el = document.getElementById('children');
  el.innerHTML = '';
  if (!children || children.length === 0) {
    el.innerHTML = '<p class="muted">Aucun enfant renseigné.</p>';
    return;
  }
  for (const c of children) {
    const chip = document.createElement('div');
    chip.className = 'child-chip';
    const age = c.age ? ` • ${c.age} ans` : '';
    const gender = c.gender ? ` (${c.gender})` : '';
    chip.innerHTML = `<b>${escapeHtml(c.name || '?')}</b>${age}${gender}`;
    el.append(chip);
  }
}

function renderChallenges(challenges) {
  const el = document.getElementById('challenges');
  el.innerHTML = '';
  if (!challenges || challenges.length === 0) {
    el.innerHTML = '<li class="muted">Aucun défi en cours.</li>';
    return;
  }
  for (const c of challenges) {
    const li = document.createElement('li');
    li.textContent = typeof c === 'string' ? c : JSON.stringify(c);
    el.append(li);
  }
}

function renderCheckins(checkins) {
  const el = document.getElementById('checkins');
  el.innerHTML = '';
  if (!checkins || checkins.length === 0) {
    el.innerHTML = '<li class="muted">Pas encore de bilan du soir enregistré.</li>';
    return;
  }
  const recent = checkins.slice(-5).reverse();
  for (const c of recent) {
    const li = document.createElement('li');
    const t = document.createElement('time');
    t.textContent = c.date ? new Date(c.date).toLocaleString('fr-FR') : '';
    const p = document.createElement('span');
    p.textContent = c.response || '';
    li.append(t, p);
    el.append(li);
  }
}

function renderHistory(messages) {
  const el = document.getElementById('history');
  el.innerHTML = '';
  if (!messages || messages.length === 0) {
    el.innerHTML = '<p class="muted">Aucun historique enregistré pour l\'instant. L\'historique sera tracé à partir de maintenant.</p>';
    return;
  }
  for (const m of messages) {
    const div = document.createElement('div');
    div.className = 'msg ' + (m.role === 'user' ? 'user' : 'assistant');
    const body = document.createElement('span');
    body.textContent = m.content;
    const t = document.createElement('time');
    t.textContent = m.created_at ? new Date(m.created_at).toLocaleString('fr-FR') : '';
    div.append(body, t);
    el.append(div);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
