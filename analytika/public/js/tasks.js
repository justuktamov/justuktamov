// Vazifalar: direktor/PM beradi, ijrochi bajaradi
import { $, esc, api, state, shell, toast, modal, ICONS, spinnerBlock, shortDate, initials, refreshMe, addDays, isStale } from './core.js';

const isManager = () => ['admin', 'pm'].includes(state.me.user.role);
let filter = 'active';
let usersCache = null;

async function users() {
  usersCache ||= await api('/api/team-users').catch(() => []);
  return usersCache;
}

// Vazifa berish oynasi; prefill — tavsiyadan (sarlavha, loyiha, rol)
export async function openTaskForm(prefill = {}, onDone = () => {}) {
  const list = await users();
  const projects = state.projects.filter((p) => p.active);
  const byRole = prefill.role ? list.find((u) => u.role === prefill.role) : null;
  const m = modal(`<form id="taskForm" class="stack">
    <div class="modal-head"><h2>Vazifa berish</h2><button type="button" class="btn icon ghost" data-close aria-label="Yopish">${ICONS.x}</button></div>
    <input name="title" id="tTitle" required maxlength="200" value="${esc(prefill.title || '')}" placeholder="Nima qilish kerak…" aria-label="Vazifa">
    <div class="fields">
      <label class="field">Kimga<select name="assignee_id" id="tWho">${list.map((u) => `<option value="${u.id}" ${(byRole?.id ?? prefill.assignee_id) === u.id ? 'selected' : ''}>${esc(u.name)} · ${esc(state.me.roles[u.role])}</option>`).join('')}</select></label>
      <label class="field">Loyiha<select name="project_id" id="tProject"><option value="">—</option>${projects.map((p) => `<option value="${p.id}" ${Number(prefill.project_id) === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
      <label class="field">Muddat<input type="date" name="due_date" id="tDue" value="${prefill.due_date || addDays(state.me.today, 1)}"></label>
    </div>
    ${prefill.detail ? `<input type="hidden" name="detail" value="${esc(prefill.detail)}"><div class="small muted">${esc(prefill.detail)}</div>` : ''}
    <div class="row"><button class="btn primary">${ICONS.send} Berish</button><button type="button" class="btn ghost" data-close>Bekor</button></div>
  </form>`);
  $('#taskForm', m.el).onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/api/tasks', { method: 'POST', body: { ...Object.fromEntries(new FormData(e.target)), source: prefill.source || null } });
      m.close();
      toast('Vazifa berildi ✓');
      onDone();
    } catch (err) { toast(err.message, true); }
  };
}

export function taskRow(t, { compact = false } = {}) {
  const st = { open: '', doing: 'info', done: 'good' }[t.status];
  return `<div class="task ${t.status === 'done' ? 'done' : ''}" data-id="${t.id}">
    <button class="tick ${t.status === 'done' ? 'on' : ''}" data-a="toggle" aria-label="${t.status === 'done' ? 'Qayta ochish' : 'Bajarildi deb belgilash'}">${ICONS.check}</button>
    <div class="task-main"><b>${esc(t.title)}</b>
      <small>${t.project_name ? `<span class="dot" style="background:${esc(t.project_color || '#4c86ff')};color:${esc(t.project_color || '#4c86ff')}"></span>${esc(t.project_name)} · ` : ''}${compact ? '' : `${esc(t.assignee_name || '—')} · `}${t.due_date ? `<span class="${t.overdue ? 'late' : ''}">${shortDate(t.due_date)}</span>` : ''}</small></div>
    ${t.status !== 'done' ? `<button class="pill ${st}" data-a="doing" title="Holatni o'zgartirish">${esc(t.status_label)}</button>` : ''}
    ${isManager() && !compact ? `<button class="btn small ghost icon danger" data-a="del" aria-label="O'chirish">${ICONS.trash}</button>` : ''}
  </div>`;
}

export function bindTasks(root, list, rerenderFn) {
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]');
    const row = e.target.closest('.task');
    if (!b || !row) return;
    const t = list.find((x) => String(x.id) === row.dataset.id);
    try {
      if (b.dataset.a === 'toggle') await api(`/api/tasks/${t.id}`, { method: 'PUT', body: { status: t.status === 'done' ? 'open' : 'done' } });
      if (b.dataset.a === 'doing') await api(`/api/tasks/${t.id}`, { method: 'PUT', body: { status: t.status === 'open' ? 'doing' : 'open' } });
      if (b.dataset.a === 'del') await api(`/api/tasks/${t.id}`, { method: 'DELETE' });
      await refreshMe();
      rerenderFn();
    } catch (err) { toast(err.message, true); }
  });
}

export async function renderTasks() {
  const manager = isManager();
  shell(`<div class="page-head"><h1><span class="grad">Vazifalar</span></h1>
    <div class="row"><div class="seg" id="tFilter">${[['active', 'Ochiq'], ['done', 'Bajarilgan'], ['', 'Hammasi']].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${manager ? `<button class="btn primary" id="tNew">${ICONS.plus} Vazifa</button>` : ''}</div></div>
    <div id="tasks">${spinnerBlock()}</div>`);
  const rid = state.renderId;
  $('#tFilter').onclick = (e) => { if (e.target.dataset.f !== undefined) { filter = e.target.dataset.f; renderTasks(); } };
  if ($('#tNew')) $('#tNew').onclick = () => openTaskForm({}, renderTasks);
  const list = await api(`/api/tasks?${new URLSearchParams(filter ? { status: filter } : {})}`);
  const box = $('#tasks');
  if (!box || isStale(rid)) return;
  if (!list.length) { box.innerHTML = `<div class="card empty">${filter === 'active' ? 'Ochiq vazifa yo\'q 👍' : 'Hech narsa yo\'q'}</div>`; return; }
  // Rahbar uchun — ijrochi bo'yicha guruhlab
  const groups = {};
  for (const t of list) (groups[manager ? (t.assignee_name || 'Biriktirilmagan') : 'Mening vazifalarim'] ||= []).push(t);
  box.innerHTML = `<div class="grid g2">${Object.entries(groups).map(([who, ts]) => `<div class="card"><div class="card-head"><h2 class="row"><span class="avatar xs">${esc(initials(who))}</span>${esc(who)}</h2>
    <span class="pill ${ts.some((t) => t.overdue) ? 'crit' : ''}">${ts.filter((t) => t.status !== 'done').length} ochiq</span></div>
    <div class="tasks">${ts.map((t) => taskRow(t, { compact: !manager })).join('')}</div></div>`).join('')}</div>`;
  bindTasks(box, list, renderTasks);
}

// Kiritish sahifasi tepasida — xodimning ochiq vazifalari
export async function myTasksStrip(el) {
  const list = await api('/api/tasks?mine=1&status=active').catch(() => []);
  if (!el.isConnected) return;
  if (!list.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="card"><div class="card-head"><h2>Vazifalaringiz</h2><a class="small" href="#/vazifalar">Hammasi →</a></div><div class="tasks">${list.slice(0, 5).map((t) => taskRow(t, { compact: true })).join('')}</div></div>`;
  bindTasks(el.firstElementChild, list, () => myTasksStrip(el)); // har safar yangi element — tinglovchi takrorlanmaydi
}
