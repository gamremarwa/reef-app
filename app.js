/* Reef Technology – working web prototype.
   Single-page app (hash routes), no backend: all data lives in this browser's localStorage. */

const CUR = '₪';
const KEY = 'reef-app-v1';
const ORDER_STEPS = ['جديد', 'قيد التجهيز', 'تم الشحن', 'تم التوصيل'];

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ' + CUR;
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const daysSince = iso => Math.floor((Date.now() - new Date(iso)) / 864e5);
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtTime = ms => new Date(ms).toLocaleString('ar-EG-u-nu-latn', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const uid = () => Math.random().toString(36).slice(2, 9);
const clone = o => JSON.parse(JSON.stringify(o));
const formData = f => Object.fromEntries(new FormData(f));
const norm = s => String(s).replace(/[ً-ْ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();

/* ---------- state ---------- */
function fresh() {
  return {
    products: clone(SEED.products).map(p => ({ ...p, ratings: [], featured: p.id === 'p1' })),
    offers: clone(SEED.offers),
    investments: [], orders: [], subs: [], supply: [], consults: [], complaints: [],
    notes: [{ id: uid(), title: 'أهلاً في ريف تكنولوجي 🌱', text: 'هاي نسخة تجريبية من المنصة. جرّب السوق، الاستثمار عن بُعد، وتتبع المنتجات بالـ QR.', level: 'ok', date: Date.now(), read: false }],
    cart: {}, reports: 0, seq: { order: 1000, code: 200 }, farmer: 'f1',
    fees: { commission: 10, farmerMonthly: 50, qr: 2, report: 15, management: 8, supply: 100, featured: 30 }
  };
}
function load() {
  try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && v.products) return { ...fresh(), ...v }; } catch (e) {}
  return fresh();
}
let S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('تعذّر الحفظ على هذا الجهاز'); } }

const farm = id => SEED.farms.find(f => f.id === id) || { name: '—', region: '' };
const cam = id => SEED.cameras.find(c => c.id === id) || SEED.cameras[0];
const product = id => S.products.find(p => p.id === id);
const offer = id => S.offers.find(o => o.id === id);
const avg = p => p.ratings.length ? p.ratings.reduce((a, r) => a + +r.stars, 0) / p.ratings.length : 0;
const starsTxt = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const traceURL = code => location.origin + location.pathname + '#/trace/' + code;

/* ---------- UI primitives ---------- */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
function modal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.add('on'); }
function closeModal() { $('#modal').classList.remove('on'); }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close-modal]')) closeModal(); });

function qr(el, code, size = 150) {
  el.innerHTML = '';
  if (window.QRCode) new QRCode(el, { text: traceURL(code), width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
  else el.textContent = code;
}

function notify(title, text, level = 'info') {
  S.notes.unshift({ id: uid(), title, text, level, date: Date.now(), read: false });
  S.notes = S.notes.slice(0, 60);
  save(); renderBadges();
}
function renderBadges() {
  const n = S.notes.filter(x => !x.read).length;
  $('#bellN').textContent = n; $('#bellN').classList.toggle('hide', !n);
  const c = Object.values(S.cart).reduce((a, b) => a + b, 0);
  $('#cartN').textContent = c; $('#cartN').classList.toggle('hide', !c);
}
$('#bellBtn').onclick = e => {
  e.stopPropagation();
  const box = $('#notes');
  if (!box.classList.contains('hide')) { box.classList.add('hide'); return; }
  box.innerHTML = S.notes.length ? S.notes.map(n => `<div class="note ${n.level}"><b>${esc(n.title)}</b>${esc(n.text)}<div class="muted small">${fmtTime(n.date)}</div></div>`).join('') : '<div class="empty">ما في إشعارات</div>';
  box.classList.remove('hide');
  S.notes.forEach(n => n.read = true); save(); renderBadges();
};
document.addEventListener('click', e => { if (!e.target.closest('#notes')) $('#notes').classList.add('hide'); });
$('#menuBtn').onclick = () => $('#drawer').classList.add('on');
$('#drawer').addEventListener('click', e => { if (e.target.closest('a') || e.target.hasAttribute('data-close')) $('#drawer').classList.remove('on'); });

/* ---------- live camera + simulated sensors ---------- */
function camHTML(c) {
  const v = 60 + (c.id.charCodeAt(1) * 37) % 90;
  return `<div class="cam"><span class="live">LIVE</span><span class="viewers">👁 ${v}</span>
    <img src="${c.img}" alt="${esc(c.name)}"><div class="stamp"><span>${esc(c.name)}</span><span data-clock></span></div></div>`;
}
setInterval(() => { const t = new Date().toLocaleTimeString('ar-EG-u-nu-latn'); $$('[data-clock]').forEach(el => el.textContent = t); }, 1000);

const sim = {};
function sensors(key, kind) {
  if (!sim[key]) {
    sim[key] = kind === 'animal'
      ? { kind, health: 94, temp: 38.9, activity: 72, feed: 88, hist: [], lastAlert: 0 }
      : { kind, moist: 66, temp: 24, health: 91, light: 78, hist: [], lastAlert: 0 };
    for (let i = 0; i < 24; i++) step(sim[key], false);
  }
  return sim[key];
}
// drift=false is used to pre-fill history without draining soil moisture
function step(s, drift = true) {
  const j = (v, a, lo, hi) => Math.min(hi, Math.max(lo, v + (Math.random() - .5) * a));
  if (s.kind === 'animal') {
    s.health = j(s.health, 2.4, 82, 99); s.temp = j(s.temp, .25, 38.3, 40.6); s.activity = j(s.activity, 6, 35, 95); s.feed = j(s.feed, 4, 50, 100);
    s.hist.push(s.health);
  } else {
    s.moist = j(s.moist - (drift ? .7 : 0), 3, 40, 85); s.temp = j(s.temp, .8, 14, 36); s.health = j(s.health, 1.5, 75, 99); s.light = j(s.light, 5, 30, 100);
    s.hist.push(s.moist);
  }
  if (s.hist.length > 40) s.hist.shift();
}
// alerts raised by the sensor model; the irrigation one also "fixes" the reading like an automatic system would
function checkAlerts(s, label) {
  if (Date.now() - s.lastAlert < 45000) return;
  if (s.kind !== 'animal' && s.moist < 55) {
    s.lastAlert = Date.now(); s.moist += 16;
    notify('💧 رطوبة التربة منخفضة', `${label}: الرطوبة نزلت تحت 55٪، وتم تشغيل الري بالتنقيط تلقائياً.`, 'warn');
  } else if (s.kind === 'animal' && (s.health < 87 || s.temp > 40.1)) {
    s.lastAlert = Date.now(); s.health += 5; s.temp -= .6;
    notify('🩺 تنبيه صحي', `${label}: مؤشرات غير طبيعية، وتم إبلاغ الطبيب البيطري للمتابعة.`, 'warn');
  }
}
function gauge(v, label, color) { return `<div class="gauge" style="--v:${Math.round(v)};--c:${color}" data-label="${label}"></div>`; }
function spark(hist, color = '#2e7d4f') {
  if (hist.length < 2) return '';
  const lo = Math.min(...hist), hi = Math.max(...hist), w = 300, h = 60;
  const pts = hist.map((v, i) => `${(i / (hist.length - 1)) * w},${h - 4 - ((v - lo) / ((hi - lo) || 1)) * (h - 8)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="${color}" stroke-width="2.5" points="${pts}"/></svg>`;
}
function sensorPanel(s) {
  if (s.kind === 'animal') return `<div class="grid g4">
    <div class="kpi"><h4>الحالة الصحية</h4>${gauge(s.health, Math.round(s.health) + '%', s.health > 90 ? '#2e7d4f' : '#e8a33d')}<div class="small muted">${s.health > 90 ? 'ممتازة' : 'تحت المتابعة'}</div></div>
    <div class="kpi"><h4>حرارة الجسم</h4>${gauge((s.temp - 37) / 4 * 100, s.temp.toFixed(1) + '°', s.temp < 40 ? '#2f7fd1' : '#d6453d')}<div class="small muted">الطبيعي 38.5–40°</div></div>
    <div class="kpi"><h4>النشاط والحركة</h4>${gauge(s.activity, Math.round(s.activity) + '%', '#7a4b2a')}<div class="small muted">آخر ساعة</div></div>
    <div class="kpi"><h4>استهلاك العلف</h4>${gauge(s.feed, Math.round(s.feed) + '%', '#e8a33d')}<div class="small muted">من الحصة اليومية</div></div></div>
    <h4 class="small muted" style="margin-top:10px">مؤشر الصحة – آخر القراءات</h4>${spark(s.hist)}`;
  return `<div class="grid g4">
    <div class="kpi"><h4>رطوبة التربة</h4>${gauge(s.moist, Math.round(s.moist) + '%', s.moist > 58 ? '#2f7fd1' : '#e8a33d')}<div class="small muted">${s.moist > 58 ? 'رطوبة مثالية' : 'منخفضة'}</div></div>
    <div class="kpi"><h4>درجة الحرارة</h4>${gauge((s.temp / 45) * 100, Math.round(s.temp) + '°', '#e8a33d')}<div class="small muted">حرارة الجو</div></div>
    <div class="kpi"><h4>صحة النبات</h4>${gauge(s.health, Math.round(s.health) + '%', '#2e7d4f')}<div class="small muted">مؤشر الغطاء الأخضر</div></div>
    <div class="kpi"><h4>الإضاءة</h4>${gauge(s.light, Math.round(s.light) + '%', '#cfa21c')}<div class="small muted">شدة الضوء</div></div></div>
    <h4 class="small muted" style="margin-top:10px">رطوبة التربة – آخر القراءات</h4>${spark(s.hist, '#2f7fd1')}`;
}

/* ---------- router ---------- */
let timers = [], scanner = null;
const every = (fn, ms) => timers.push(setInterval(fn, ms));
function stopScan() { if (scanner) { const s = scanner; scanner = null; s.stop().then(() => s.clear()).catch(() => {}); } }
function cleanupPage() { timers.forEach(clearInterval); timers = []; stopScan(); closeModal(); }

const routes = { '': home, market, product, cart, boxes, supply, trace, invest, dashboard, report, live, advisor, farmer, admin };
function route() {
  cleanupPage();
  const [name, ...args] = location.hash.replace(/^#\/?/, '').split('/');
  const fn = routes[name] || home;
  const app = $('#app');
  app.innerHTML = ''; app.onclick = app.onchange = null;
  fn(app, ...args.map(decodeURIComponent));
  const base = '#/' + (routes[name] ? name : '');
  $$('#nav a, #bottom a, #drawer a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === base || (base === '#/product' && a.getAttribute('href') === '#/market')));
  scrollTo(0, 0);
  renderBadges();
}
addEventListener('hashchange', route);
const demoNote = '<div class="demo-note">🧪 نسخة تجريبية: البيانات والقراءات للتجربة فقط، ومحفوظة على هذا الجهاز.</div>';

/* =========================================================
   HOME
   ========================================================= */
function home(app) {
  const doors = [
    ['#/market', '🛍️', 'السوق الإلكتروني', 'اشترِ مباشرة من المزارع بدون وسطاء'],
    ['#/boxes', '📦', 'الصناديق والاشتراكات', 'صناديق غذائية دورية ومرنة'],
    ['#/trace', '🔍', 'تتبع المنتج QR', 'اعرف مصدر منتجك ورحلته كاملة'],
    ['#/invest', '🌱', 'استثمر عن بُعد', 'استأجر أرضاً أو رأس ماشية'],
    ['#/dashboard', '📊', 'لوحة المستثمر', 'حساسات، تنبيهات، وتقارير ذكية'],
    ['#/live', '🎥', 'البث المباشر', 'شاهد المزارع لحظة بلحظة'],
    ['#/advisor', '💬', 'المستشار الذكي', 'إرشاد زراعي وبيطري فوري'],
    ['#/farmer', '🧑‍🌾', 'بوابة المزارع', 'اعرض منتجاتك وأصدر رموز QR'],
    ['#/supply', '🏨', 'عقود التوريد', 'للمطاعم والفنادق ومصانع الأغذية'],
    ['#/admin', '⚙️', 'الإدارة والتقارير', 'الإيرادات والطلبات والشكاوى']
  ];
  const steps = [['🌱', 'الإنتاج والزراعة في الريف'], ['🎥', 'المراقبة اللحظية والبث المباشر'], ['🔳', 'توليد رمز QR لتوثيق الجودة'], ['🚚', 'الشحن عبر شبكة اللوجستيات'], ['🧺', 'وصول المنتج للمستهلك']];
  app.innerHTML = `
  <section class="hero">
    <div>
      <span class="tag" style="background:rgba(255,255,255,.18);color:#fff">مستقبل الاستثمار الزراعي الذكي</span>
      <h1 style="margin-top:10px">من الريف إلى طاولتك… بثقة وشفافية</h1>
      <p>منصة لرقمنة القطاعين الزراعي والحيواني: استثمر وازرع عن بُعد، تابع مزرعتك بالبث المباشر، واشترِ منتجات موثّقة بالـ QR مباشرة من المزارع.</p>
      <div class="row"><a class="btn" href="#/market">🛍️ تسوّق الآن</a><a class="btn ghost" href="#/invest">🌱 استثمر عن بُعد</a><a class="btn ghost" href="#/trace">🔍 تتبع منتج</a></div>
    </div>
    <a href="#/live">${camHTML(cam('c1'))}</a>
  </section>

  <div class="grid g4" style="margin:16px 0">
    <div class="card stat"><b>${S.products.length}</b>منتج موثّق</div>
    <div class="card stat"><b>${SEED.farms.length}</b>مزارع شريكة</div>
    <div class="card stat"><b>${S.investments.length}</b>استثمار فعّال</div>
    <div class="card stat"><b>${S.orders.length}</b>طلب</div>
  </div>

  <h2 style="margin:22px 0 12px">شو بتقدر تعمل على المنصة؟</h2>
  <div class="grid g3">${doors.map(d => `<a class="card door" href="${d[0]}"><div class="ic">${d[1]}</div><h3>${d[2]}</h3><div class="muted small">${d[3]}</div></a>`).join('')}</div>

  <h2 style="margin:26px 0 12px">رحلة المنتج من الريف إلى المستهلك</h2>
  <div class="grid g4" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">${steps.map((s, i) => `<div class="card" style="text-align:center"><div style="font-size:34px">${s[0]}</div><span class="tag">${i + 1}</span><div style="font-weight:700;margin-top:6px">${s[1]}</div></div>`).join('')}</div>

  <div class="card" style="margin-top:22px">
    <h3>🔍 جرّب التتبع الآن</h3>
    <p class="muted small" style="margin:0 0 10px">اكتب رمز منتج، مثلاً رمز علبة التمور: REEF-TR-2024-00125</p>
    <form class="row" id="quickTrace"><input class="search sp" name="code" value="REEF-TR-2024-00125" dir="ltr"><button class="btn">تحقق</button></form>
  </div>`;
  $('#quickTrace').onsubmit = e => { e.preventDefault(); location.hash = '#/trace/' + formData(e.target).code.trim().toUpperCase(); };
}

/* =========================================================
   MARKET
   ========================================================= */
function addToCart(id, n = 1) {
  const p = product(id); if (!p) return;
  const cur = S.cart[id] || 0;
  if (cur + n > p.stock) { toast('الكمية المتوفرة: ' + p.stock + ' ' + p.unit); return; }
  S.cart[id] = cur + n; save(); renderBadges(); toast('✓ انضاف «' + p.name + '» للسلة');
}
function market(app) {
  let cat = 'الكل', q = '';
  app.innerHTML = `
  <div class="page-h"><div><h1>🛍️ السوق الإلكتروني</h1><p class="muted">منتجات طازجة وموثّقة مباشرة من المزارع، بدون وسطاء.</p></div>
    <input class="search" id="q" placeholder="ابحث عن منتج…"></div>
  <div class="chips" id="cats">${SEED.categories.map(c => `<button class="chip ${c === cat ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
  <div class="grid g3" id="list"></div>
  <a class="card row" href="#/supply" style="margin-top:18px;background:var(--leaf)"><span style="font-size:34px">🏨</span><div class="sp"><h3>مطعم، فندق أو مصنع أغذية؟</h3><div class="muted small">اطلب عقد توريد ثابت بكميات وأسعار متفق عليها.</div></div><span class="btn">اطلب عقد توريد</span></a>`;
  const draw = () => {
    const list = S.products
      .filter(p => (cat === 'الكل' || p.cat === cat) && (!q || norm(p.name + farm(p.farm).name).includes(norm(q))))
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    $('#list').innerHTML = list.length ? list.map(p => `
      <div class="card prod">
        <a href="#/product/${p.id}"><div class="pic">${p.emoji}</div></a>
        <div class="row" style="margin-bottom:4px"><span class="tag">✓ موثّق QR</span>${p.featured ? '<span class="tag amber">⭐ مميز</span>' : ''}</div>
        <a href="#/product/${p.id}"><h3>${esc(p.name)}</h3></a>
        <div class="muted small">${esc(farm(p.farm).name)} • ${esc(p.method)}</div>
        <div class="small"><span class="stars">${starsTxt(avg(p))}</span> <span class="muted">(${p.ratings.length})</span></div>
        <div class="row" style="margin-top:8px"><span class="price">${money(p.price)}</span><span class="muted small">/ ${p.unit}</span><span class="sp"></span>
          ${p.stock > 0 ? `<button class="btn sm" data-add="${p.id}">+ للسلة</button>` : '<span class="tag red">نفدت الكمية</span>'}</div>
      </div>`).join('') : '<div class="empty card">ما في منتجات مطابقة</div>';
  };
  $('#cats').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; cat = b.dataset.c; $$('#cats .chip').forEach(x => x.classList.toggle('on', x === b)); draw(); };
  $('#q').oninput = e => { q = e.target.value; draw(); };
  $('#list').onclick = e => { const b = e.target.closest('[data-add]'); if (b) addToCart(b.dataset.add); };
  draw();
}

// `product` is the lookup helper, so the product page route is registered separately
routes.product = function (app, id) {
  const p = product(id);
  if (!p) { app.innerHTML = '<div class="empty card">المنتج غير موجود. <a class="btn sm" href="#/market">رجوع للسوق</a></div>'; return; }
  const f = farm(p.farm);
  app.innerHTML = `
  <a href="#/market" class="muted">→ رجوع للسوق</a>
  <div class="grid g2" style="margin-top:10px">
    <div class="card">
      <div class="prod"><div class="pic" style="height:160px;font-size:90px">${p.emoji}</div></div>
      <div class="row"><span class="tag">✓ موثّق QR</span><span class="tag soil">${esc(p.cat)}</span></div>
      <h1 style="margin:8px 0 2px">${esc(p.name)}</h1>
      <div class="muted">${esc(f.name)} – ${esc(f.region)} • المزارع: ${esc(f.farmer)}</div>
      <div class="small"><span class="stars">${starsTxt(avg(p))}</span> ${avg(p).toFixed(1)} (${p.ratings.length} تقييم)</div>
      <div class="row" style="margin:12px 0"><span class="price" style="font-size:26px">${money(p.price)}</span><span class="muted">/ ${p.unit}</span><span class="sp"></span><span class="muted small">المتوفر: ${p.stock}</span></div>
      <div class="row"><div class="qty"><button id="m">−</button><span id="n">1</span><button id="pl">+</button></div><button class="btn sp" id="add" ${p.stock ? '' : 'disabled'}>أضف للسلة</button></div>
    </div>
    <div class="card">
      <h3>معلومات الجودة والمصدر</h3>
      <dl class="kv">
        <dt>رمز التتبع</dt><dd dir="ltr" style="text-align:right">${p.code}</dd>
        <dt>طريقة الزراعة</dt><dd>${esc(p.method)}</dd>
        <dt>نوع السماد / العلف</dt><dd>${esc(p.fertilizer)}</dd>
        <dt>الري</dt><dd>${esc(p.water)}</dd>
        <dt>المبيدات</dt><dd>${esc(p.pesticide)}</dd>
        ${p.planted ? `<dt>تاريخ الزراعة</dt><dd>${p.planted}</dd>` : ''}
        <dt>تاريخ الحصاد</dt><dd>${p.harvest}</dd>
        <dt>الفحص</dt><dd>${esc(p.inspection)}</dd>
      </dl>
      <div class="row" style="margin-top:12px"><div class="qrbox" id="qr"></div><div class="sp"><div class="muted small">امسح الرمز بكاميرا الجوال لتشوف رحلة المنتج كاملة.</div><a class="btn ghost sm" style="margin-top:8px" href="#/trace/${p.code}">صفحة التتبع</a></div></div>
    </div>
  </div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3>🎥 بث مباشر من المزرعة</h3>${camHTML(cam(p.camera))}</div>
    <div class="card">
      <h3>⭐ التقييمات</h3>
      <div id="revs">${p.ratings.length ? p.ratings.slice().reverse().map(r => `<div style="border-bottom:1px solid var(--line);padding:8px 0"><b>${esc(r.name)}</b> <span class="stars">${starsTxt(r.stars)}</span><div>${esc(r.text)}</div><div class="muted small">${fmtDate(r.date)}</div></div>`).join('') : '<p class="muted">لسا ما في تقييمات. كن أول واحد!</p>'}</div>
      <form id="rf" style="margin-top:10px">
        <div class="f2"><label class="f">اسمك<input name="name" required maxlength="40"></label>
        <label class="f">التقييم<select name="stars">${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${starsTxt(n)}</option>`).join('')}</select></label></div>
        <label class="f">رأيك<textarea name="text" rows="2" maxlength="300"></textarea></label>
        <div class="row"><button class="btn">أرسل التقييم</button><button type="button" class="btn ghost" id="complain">⚠️ تقديم شكوى</button></div>
      </form>
    </div>
  </div>`;
  qr($('#qr'), p.code, 130);
  let n = 1;
  $('#m').onclick = () => { n = Math.max(1, n - 1); $('#n').textContent = n; };
  $('#pl').onclick = () => { n = Math.min(p.stock, n + 1); $('#n').textContent = n; };
  $('#add').onclick = () => addToCart(p.id, n);
  $('#rf').onsubmit = e => {
    e.preventDefault(); const d = formData(e.target);
    p.ratings.push({ name: d.name, stars: +d.stars, text: d.text, date: today() }); save();
    toast('شكراً على تقييمك 🌟'); routes.product(app, id);
  };
  $('#complain').onclick = () => complaintForm(p);
};
function complaintForm(p) {
  modal(`<h2>⚠️ تقديم شكوى</h2><p class="muted">بخصوص: ${esc(p.name)} (${p.code})</p>
    <form id="cf"><label class="f">الاسم<input name="name" required></label><label class="f">رقم التواصل<input name="phone" required dir="ltr"></label>
    <label class="f">رقم الطلب (إن وجد)<input name="order" dir="ltr"></label><label class="f">تفاصيل الشكوى<textarea name="text" rows="3" required></textarea></label>
    <div class="row"><button class="btn">إرسال</button><button type="button" class="btn ghost" data-close-modal>إلغاء</button></div></form>`);
  $('#cf').onsubmit = e => {
    e.preventDefault(); const d = formData(e.target);
    S.complaints.unshift({ id: uid(), product: p.id, ...d, date: Date.now(), status: 'مفتوحة' });
    notify('📨 تم استلام شكواك', 'رح يتواصل معك فريق الجودة خلال 24 ساعة بخصوص ' + p.name + '.', 'info');
    closeModal(); toast('تم إرسال الشكوى');
  };
}

/* =========================================================
   CART, CHECKOUT & MY ORDERS
   ========================================================= */
function cart(app) {
  const items = Object.entries(S.cart).map(([id, q]) => ({ p: product(id), q })).filter(x => x.p);
  const total = items.reduce((a, x) => a + x.p.price * x.q, 0);
  const mine = S.orders.filter(o => o.kind === 'order');
  app.innerHTML = `
  <div class="page-h"><h1>🛒 السلة</h1></div>
  ${items.length ? `<div class="grid g2">
    <div class="card"><div class="tbl"><table><tr><th>المنتج</th><th>الكمية</th><th>المجموع</th><th></th></tr>
      ${items.map(x => `<tr><td>${x.p.emoji} ${esc(x.p.name)}<div class="muted small">${money(x.p.price)} / ${x.p.unit}</div></td>
      <td><div class="qty"><button data-d="${x.p.id}">−</button><span>${x.q}</span><button data-i="${x.p.id}">+</button></div></td>
      <td><b>${money(x.p.price * x.q)}</b></td><td><button class="btn ghost sm" data-r="${x.p.id}">✕</button></td></tr>`).join('')}
      </table></div>
      <div class="row" style="margin-top:12px;font-size:20px"><b>الإجمالي</b><span class="sp"></span><b class="price">${money(total)}</b></div>
    </div>
    <form class="card" id="co">
      <h3>إتمام الطلب</h3>
      <div class="f2"><label class="f">الاسم<input name="name" required></label><label class="f">رقم الجوال<input name="phone" required dir="ltr" pattern="[0-9+ ]{7,}"></label></div>
      <label class="f">العنوان<input name="addr" required></label>
      <label class="f">ملاحظة للتوصيل<input name="note"></label>
      <label class="f">طريقة الدفع<select name="pay"><option>دفع إلكتروني آمن</option><option>الدفع عند الاستلام</option></select></label>
      <p class="muted small" style="margin-top:-4px">🧪 نسخة تجريبية: ما في دفع حقيقي، وما رح نطلب أي بيانات بطاقة.</p>
      <button class="btn" style="width:100%">تأكيد الطلب (${money(total)})</button>
    </form></div>`
  : `<div class="card empty">السلة فاضية 🧺<br><a class="btn" style="margin-top:10px" href="#/market">تسوّق الآن</a></div>`}
  <h2 style="margin:24px 0 10px">📦 طلباتي</h2>
  <div id="mine">${mine.length ? mine.map(orderCard).join('') : '<div class="card empty">ما في طلبات لسا</div>'}</div>`;

  app.onclick = e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.i) { addToCart(t.dataset.i); cart(app); }
    if (t.dataset.d) { S.cart[t.dataset.d]--; if (S.cart[t.dataset.d] <= 0) delete S.cart[t.dataset.d]; save(); cart(app); }
    if (t.dataset.r) { delete S.cart[t.dataset.r]; save(); cart(app); }
  };
  const co = $('#co');
  if (co) co.onsubmit = e => {
    e.preventDefault(); const d = formData(co);
    const no = 'R-' + (++S.seq.order);
    S.orders.unshift({ no, kind: 'order', date: Date.now(), ...d, items: items.map(x => ({ id: x.p.id, q: x.q, price: x.p.price, farm: x.p.farm })), total, status: 'جديد' });
    items.forEach(x => x.p.stock -= x.q);
    S.cart = {};
    notify('✅ تم استلام طلبك ' + no, 'المزارع رح يجهّز طلبك، وبتوصلك إشعارات بكل مرحلة.', 'ok');
    modal(`<div style="text-align:center"><div style="font-size:60px">✅</div><h2>تم تأكيد طلبك!</h2><p>رقم الطلب: <b dir="ltr">${no}</b></p><p class="muted">بتقدر تتابع حالته من «طلباتي»، وكل منتج فيه رمز QR بتقدر تتحقق منه لما يوصلك.</p><button class="btn" data-close-modal>تمام</button></div>`);
    app.onclick = null; cart(app); $('#modal').classList.add('on');
  };
}
function orderCard(o) {
  const i = ORDER_STEPS.indexOf(o.status);
  return `<div class="card" style="margin-bottom:10px">
    <div class="row"><b dir="ltr">${o.no}</b><span class="tag ${i === 3 ? '' : 'amber'}">${o.status}</span><span class="sp"></span><span class="muted small">${fmtTime(o.date)}</span></div>
    <div class="small" style="margin:6px 0">${o.items.map(x => { const p = product(x.id); return p ? `${p.emoji} ${esc(p.name)} × ${x.q}` : ''; }).join(' • ')}</div>
    <div class="bar"><i style="width:${(i + 1) * 25}%"></i></div>
    <div class="row small muted" style="justify-content:space-between;margin-top:4px">${ORDER_STEPS.map(s => `<span>${s}</span>`).join('')}</div>
    <div class="row" style="margin-top:6px"><span class="muted small">${esc(o.pay)}</span><span class="sp"></span><b>${money(o.total)}</b></div></div>`;
}

/* =========================================================
   SUBSCRIPTION BOXES
   ========================================================= */
function boxes(app) {
  app.innerHTML = `
  <div class="page-h"><div><h1>📦 الصناديق الغذائية والاشتراكات</h1><p class="muted">اشتراك مرن: أوقفه، رجّعه أو ألغِه وقت ما بدك.</p></div></div>
  <div class="grid g3">${SEED.plans.map(b => `<div class="card"><div style="font-size:46px">${b.emoji}</div><h3>${b.name}</h3><p class="muted small">${b.items}</p>
    <div class="row"><span class="price">${money(b.price)}</span><span class="muted small">/ ${b.every}</span><span class="sp"></span><button class="btn sm" data-sub="${b.id}">اشترك</button></div></div>`).join('')}</div>
  <h2 style="margin:24px 0 10px">اشتراكاتي</h2><div id="subs"></div>`;
  const draw = () => {
    $('#subs').innerHTML = S.subs.length ? `<div class="tbl"><table><tr><th>الصندوق</th><th>البداية</th><th>التوصيل القادم</th><th>الحالة</th><th></th></tr>
      ${S.subs.map(s => { const b = SEED.plans.find(x => x.id === s.plan); return `<tr><td>${b.emoji} ${b.name}<div class="muted small">${money(b.price)} / ${b.every}</div></td><td>${s.start}</td>
      <td>${s.status === 'فعّال' ? nextDelivery(s, b) : '—'}</td><td><span class="tag ${s.status === 'فعّال' ? '' : s.status === 'موقوف' ? 'amber' : 'red'}">${s.status}</span></td>
      <td>${s.status === 'ملغي' ? '' : `<button class="btn ghost sm" data-t="${s.id}">${s.status === 'فعّال' ? '⏸ إيقاف مؤقت' : '▶ استئناف'}</button> <button class="btn ghost sm" data-x="${s.id}">إلغاء</button>`}</td></tr>`; }).join('')}</table></div>`
      : '<div class="card empty">ما عندك اشتراكات لسا</div>';
  };
  app.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.sub) subscribeForm(b.dataset.sub, draw);
    const s = S.subs.find(x => x.id === (b.dataset.t || b.dataset.x)); if (!s) return;
    if (b.dataset.t) s.status = s.status === 'فعّال' ? 'موقوف' : 'فعّال';
    if (b.dataset.x && confirm('متأكد بدك تلغي الاشتراك؟')) s.status = 'ملغي';
    save(); draw();
  };
  draw();
}
function nextDelivery(s, b) {
  const step = b.every === 'شهري' ? 30 : 7;
  let d = s.start; while (d < today()) d = addDays(d, step);
  return d;
}
function subscribeForm(planId, done) {
  const b = SEED.plans.find(x => x.id === planId);
  modal(`<h2>${b.emoji} ${b.name}</h2><p class="muted">${money(b.price)} / ${b.every}</p>
    <form id="sf"><div class="f2"><label class="f">الاسم<input name="name" required></label><label class="f">الجوال<input name="phone" required dir="ltr"></label></div>
    <label class="f">العنوان<input name="addr" required></label><label class="f">تاريخ أول توصيل<input type="date" name="start" value="${addDays(today(), 2)}" required></label>
    <div class="row"><button class="btn">تأكيد الاشتراك</button><button type="button" class="btn ghost" data-close-modal>إلغاء</button></div></form>`);
  $('#sf').onsubmit = e => {
    e.preventDefault(); const d = formData(e.target);
    S.subs.unshift({ id: uid(), plan: planId, ...d, status: 'فعّال', date: Date.now() });
    notify('📦 اشتراك جديد', `اشتركت بـ «${b.name}». أول توصيل: ${d.start}.`, 'ok');
    closeModal(); done(); toast('تم الاشتراك ✓');
  };
}

/* =========================================================
   SUPPLY CONTRACTS (restaurants, hotels, factories)
   ========================================================= */
function supply(app) {
  app.innerHTML = `
  <div class="page-h"><div><h1>🏨 عقود التوريد الثابتة</h1><p class="muted">للمطاعم، الفنادق، المتاجر ومصانع الأغذية والتعليب: مصدر تزويد ثابت وموثّق.</p></div></div>
  <div class="grid g2">
    <form class="card" id="sup">
      <div class="f2"><label class="f">اسم المنشأة<input name="business" required></label>
      <label class="f">النوع<select name="type"><option>مطعم</option><option>فندق</option><option>متجر غذائي</option><option>مصنع أغذية وتعليب</option></select></label></div>
      <div class="f2"><label class="f">المنتج المطلوب<select name="product">${S.products.map(p => `<option value="${p.id}">${p.emoji} ${esc(p.name)}</option>`).join('')}</select></label>
      <label class="f">الكمية لكل دفعة<input name="qty" type="number" min="1" required></label></div>
      <div class="f2"><label class="f">التكرار<select name="freq"><option>يومي</option><option>أسبوعي</option><option>شهري</option></select></label>
      <label class="f">مدة العقد<select name="months"><option value="3">3 شهور</option><option value="6">6 شهور</option><option value="12">سنة</option></select></label></div>
      <div class="f2"><label class="f">اسم المسؤول<input name="contact" required></label><label class="f">الجوال<input name="phone" required dir="ltr"></label></div>
      <button class="btn">إرسال طلب العقد</button>
    </form>
    <div class="card"><h3>طلباتي</h3><div id="sl"></div></div>
  </div>`;
  const draw = () => $('#sl').innerHTML = S.supply.length ? S.supply.map(s => { const p = product(s.product); return `<div style="border-bottom:1px solid var(--line);padding:8px 0"><div class="row"><b>${esc(s.business)}</b><span class="tag ${s.status === 'معتمد' ? '' : s.status === 'مرفوض' ? 'red' : 'amber'}">${s.status}</span></div><div class="small muted">${p ? p.emoji + ' ' + esc(p.name) : ''} • ${s.qty} ${p ? p.unit : ''} • ${s.freq} • ${s.months} شهور</div></div>`; }).join('') : '<p class="muted">ما في طلبات لسا</p>';
  $('#sup').onsubmit = e => {
    e.preventDefault(); const d = formData(e.target);
    S.supply.unshift({ id: uid(), ...d, date: Date.now(), status: 'قيد المراجعة' });
    notify('🏨 طلب عقد توريد', `وصل طلب ${d.business}. المزرعة رح تراجعه وترد عليك.`, 'info');
    e.target.reset(); draw(); toast('تم إرسال الطلب ✓');
  };
  draw();
}

/* =========================================================
   QR TRACE
   ========================================================= */
function loadScript(src) {
  return new Promise((ok, fail) => { if ($(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
}
function trace(app, code = '') {
  code = code.trim().toUpperCase();
  const p = code && S.products.find(x => x.code === code);
  app.innerHTML = `
  <div class="page-h"><div><h1>🔍 تتبع المنتج</h1><p class="muted">امسح رمز الـ QR على المنتج أو اكتب رمز التتبع.</p></div></div>
  <div class="card no-print">
    <form class="row" id="tf"><input class="search sp" name="code" placeholder="REEF-TR-2024-00125" value="${esc(code)}" dir="ltr"><button class="btn">تحقق</button><button type="button" class="btn ghost" id="scan">📷 امسح بالكاميرا</button></form>
    <div id="reader" style="margin-top:10px"></div>
    <div class="chips" style="margin:10px 0 0">${S.products.slice(0, 4).map(x => `<a class="chip" href="#/trace/${x.code}" dir="ltr">${x.code}</a>`).join('')}</div>
  </div>
  <div id="res" style="margin-top:14px"></div>`;
  $('#tf').onsubmit = e => { e.preventDefault(); location.hash = '#/trace/' + formData(e.target).code.trim().toUpperCase(); };
  $('#scan').onclick = () => {
    if (scanner) { stopScan(); $('#scan').textContent = '📷 امسح بالكاميرا'; return; }
    $('#scan').textContent = '⏹ إيقاف الكاميرا';
    loadScript('https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js').then(() => {
      scanner = new Html5Qrcode('reader');
      return scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, txt => {
        const m = txt.match(/REEF-[A-Z]{2}-\d{4}-\d+/i);
        stopScan();
        location.hash = '#/trace/' + (m ? m[0].toUpperCase() : encodeURIComponent(txt));
      });
    }).catch(() => { scanner = null; $('#scan').textContent = '📷 امسح بالكاميرا'; toast('ما قدرنا نفتح الكاميرا. اسمح بالوصول أو اكتب الرمز يدوياً.'); });
  };
  if (!code) return;
  if (!p) {
    $('#res').innerHTML = `<div class="card" style="border-color:#f4c4c0;background:#fff6f5"><h2 style="color:var(--red)">✕ لم يتم التحقق من هذا الرمز</h2><p>الرمز <b dir="ltr">${esc(code)}</b> مش مسجّل على المنصة. ممكن يكون المنتج غير موثّق، أو في خطأ بكتابة الرمز.</p></div>`;
    return;
  }
  const f = farm(p.farm);
  const tl = [
    ['🌱', 'الزراعة / الإنتاج', p.planted ? fmtDate(p.planted) : 'في ' + f.name, `${p.method} • ${p.fertilizer}`],
    ['🎥', 'المراقبة اللحظية', 'طوال فترة الإنتاج', 'بث مباشر وحساسات رطوبة وحرارة'],
    ['🌾', 'الحصاد', fmtDate(p.harvest), 'حصاد في الوقت المثالي'],
    ['🔬', 'الفحص وتوليد رمز QR', fmtDate(addDays(p.harvest, 1)), p.inspection],
    ['🚚', 'الشحن عبر شبكة اللوجستيات', fmtDate(addDays(p.harvest, 2)), 'نقل مبرّد ومتتبّع'],
    ['🧺', 'وصول المنتج للمستهلك', '', 'طازج وموثّق']
  ];
  $('#res').innerHTML = `
  <div class="grid g2">
    <div class="verified">
      <h2>✅ تم التحقق من المنتج</h2>
      <p dir="ltr" style="text-align:right;font-weight:800;margin:4px 0 12px">${p.code}</p>
      <dl class="kv">
        <dt>📍 المزرعة</dt><dd>${esc(f.name)} – ${esc(f.region)}</dd>
        <dt>${p.emoji} نوع المنتج</dt><dd>${esc(p.name)}</dd>
        <dt>📅 تاريخ الحصاد</dt><dd>${p.harvest}</dd>
        <dt>🌿 طريقة الزراعة</dt><dd>${esc(p.method)}</dd>
        <dt>🧪 السماد</dt><dd>${esc(p.fertilizer)}</dd>
        <dt>💧 المياه</dt><dd>${esc(p.water)}</dd>
        <dt>🛡️ المبيدات</dt><dd>${esc(p.pesticide)}</dd>
        <dt>🏅 الجودة</dt><dd>${esc(p.inspection)}</dd>
      </dl>
      <div class="row" style="margin-top:14px"><div class="qrbox" id="qr"></div>
        <div class="sp"><a class="btn sm" href="#/product/${p.id}">اشترِ المنتج</a><br><a class="btn ghost sm" style="margin-top:6px" href="#/live/${p.camera}">🎥 شاهد المزرعة الآن</a></div></div>
    </div>
    <div class="card"><h3>رحلة المنتج</h3>
      <ul class="timeline">${tl.map((s, i) => `<li class="${i === 5 ? 'wait' : ''}"><span class="dot">${s[0]}</span><b>${s[1]}</b> <span class="muted small">${s[2]}</span><div class="small">${esc(s[3])}</div></li>`).join('')}</ul>
    </div>
  </div>`;
  qr($('#qr'), p.code, 130);
}

/* =========================================================
   INVEST REMOTELY
   ========================================================= */
function invest(app) {
  let type = 'all';
  app.innerHTML = `
  <div class="page-h"><div><h1>🌱 استثمر وازرع عن بُعد</h1><p class="muted">ما عندك أرض؟ استأجر مساحة زراعية أو رأس ماشية، والفريق بيدير الزراعة والرعاية عنك، وإنت بتتابع كل شي بالبث المباشر.</p></div></div>
  ${demoNote}
  <div class="chips" id="tt"><button class="chip on" data-t="all">الكل</button><button class="chip" data-t="land">🌾 مساحات زراعية</button><button class="chip" data-t="livestock">🐑 مواشي</button></div>
  <div class="grid g3" id="ol"></div>
  <div class="card" style="margin-top:18px"><h3>كيف بتشتغل؟</h3>
    <div class="grid g4" style="margin-top:8px">${[['1️⃣', 'اختار حصة', 'أرض، نخلة، خط بالدفيئة أو رأس ماشية'], ['2️⃣', 'وقّع العقد الرقمي', 'يضمن حقوقك وحقوق المزارع'], ['3️⃣', 'تابع لحظة بلحظة', 'بث مباشر، حساسات، وتنبيهات ذكية'], ['4️⃣', 'استلم العائد', 'حسب الإنتاج الفعلي، مع تقرير مفصّل']].map(x => `<div><div style="font-size:26px">${x[0]}</div><b>${x[1]}</b><div class="muted small">${x[2]}</div></div>`).join('')}</div></div>`;
  const draw = () => $('#ol').innerHTML = S.offers.filter(o => type === 'all' || o.type === type).map(o => { const f = farm(o.farm); return `
    <div class="card"><div class="cam" style="aspect-ratio:16/8;margin-bottom:10px"><span class="live">LIVE</span><img src="${cam(o.camera).img}" alt=""></div>
      <div class="row"><span style="font-size:30px">${o.emoji}</span><div><h3 style="margin:0">${esc(o.title)}</h3><div class="muted small">${esc(f.name)} – ${esc(f.region)}</div></div></div>
      <dl class="kv small" style="margin:10px 0"><dt>مدة الدورة</dt><dd>${o.season} يوم</dd><dt>العائد المتوقع</dt><dd>${esc(o.yield)}</dd><dt>الحصص المتبقية</dt><dd>${o.left}</dd></dl>
      <div class="row"><span class="price">${money(o.price)}</span><span class="muted small">/ حصة</span><span class="sp"></span><button class="btn sm" data-o="${o.id}" ${o.left ? '' : 'disabled'}>استثمر الآن</button></div></div>`; }).join('');
  $('#tt').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; type = b.dataset.t; $$('#tt .chip').forEach(x => x.classList.toggle('on', x === b)); draw(); };
  $('#ol').onclick = e => { const b = e.target.closest('[data-o]'); if (b) investForm(b.dataset.o); };
  draw();
}
function investForm(id) {
  const o = offer(id), f = farm(o.farm);
  modal(`<h2>${o.emoji} ${esc(o.title)}</h2><p class="muted">${esc(f.name)} – ${money(o.price)} للحصة • ${o.season} يوم</p>
  <form id="if">
    <div class="f2"><label class="f">الاسم الكامل<input name="name" required></label><label class="f">الجوال<input name="phone" required dir="ltr"></label></div>
    <label class="f">عدد الحصص<input type="number" name="qty" min="1" max="${o.left}" value="1" required></label>
    <div class="card" style="background:var(--leaf);box-shadow:none;margin-bottom:10px">
      <b>📄 ملخص العقد الرقمي (نموذج تجريبي)</b>
      <ul class="small" style="margin:6px 0 0;padding-inline-start:18px">
        <li>المنصة والمزارع الشريك بيديروا ${o.type === 'land' ? 'الزراعة والري والتسميد' : 'التغذية والرعاية'} بإشراف ${o.type === 'land' ? 'مهندس زراعي' : 'طبيب بيطري'}.</li>
        <li>للمستثمر حق المتابعة بالبث المباشر ولوحة التحكم، واستلام تقارير دورية.</li>
        <li>العائد حسب الإنتاج الفعلي بنهاية الدورة (${esc(o.yield)}).</li>
        <li>رسوم الإشراف والمتابعة الإدارية مشمولة بسعر الحصة.</li>
      </ul></div>
    <label class="row small" style="margin-bottom:12px"><input type="checkbox" required> قرأت ملخص العقد وبوافق على الشروط</label>
    <div class="row"><button class="btn">تأكيد الاستثمار</button><button type="button" class="btn ghost" data-close-modal>إلغاء</button></div>
  </form>`);
  $('#if').onsubmit = e => {
    e.preventDefault(); const d = formData(e.target), qty = Math.min(+d.qty, o.left);
    const inv = { id: uid(), contract: 'CT-' + Date.now().toString().slice(-6), offer: o.id, qty, name: d.name, phone: d.phone, start: today(), total: o.price * qty };
    S.investments.unshift(inv); o.left -= qty;
    notify('🌱 استثمار جديد', `تم توقيع عقد ${inv.contract}: ${o.title} × ${qty}. بلّش تتابع من لوحة المستثمر.`, 'ok');
    closeModal(); location.hash = '#/dashboard/' + inv.id;
  };
}

/* =========================================================
   INVESTOR DASHBOARD
   ========================================================= */
function stageOf(o, pct) {
  const land = ['تحضير التربة والزراعة', 'الإنبات والنمو الخضري', 'النمو والإزهار', 'النضج', 'جاهز للحصاد'];
  const animal = ['الاستلام والفحص البيطري', 'التغذية والرعاية', 'النمو والتسمين', 'المتابعة الصحية الدورية', 'نهاية الدورة'];
  const i = pct < 10 ? 0 : pct < 35 ? 1 : pct < 65 ? 2 : pct < 100 ? 3 : 4;
  return (o.type === 'land' ? land : animal)[i];
}
function opsLog(o, inv) {
  const land = ['💧 ري بالتنقيط', '🧪 تسميد عضوي', '📡 معايرة الحساسات', '🐞 مكافحة حيوية للآفات', '👨‍🌾 زيارة المهندس الزراعي'];
  const animal = ['🩺 فحص بيطري دوري', '🌿 تغذية بأعلاف طبيعية', '⚖️ وزن وقياس', '💉 تحصين حسب الجدول', '🧹 تنظيف وتعقيم الحظيرة'];
  const list = o.type === 'land' ? land : animal, out = [];
  const days = Math.min(daysSince(inv.start), o.season);
  for (let d = 0, i = 0; d <= days; d += 4, i++) out.push([addDays(inv.start, d), list[i % list.length]]);
  return out.reverse().slice(0, 6);
}
function dashboard(app, id) {
  if (!S.investments.length) {
    app.innerHTML = `<div class="page-h"><h1>📊 لوحة المستثمر</h1></div>
    <div class="card empty"><div style="font-size:50px">🌱</div><h3>ما عندك استثمارات لسا</h3><p>اختار حصة زراعية أو حيوانية وابدأ تتابعها من هون.</p>
    <div class="row" style="justify-content:center"><a class="btn" href="#/invest">تصفّح فرص الاستثمار</a><button class="btn ghost" id="demo">جرّب بحصة تجريبية</button></div></div>`;
    $('#demo').onclick = () => {
      const o = S.offers[0];
      const inv = { id: uid(), contract: 'CT-DEMO', offer: o.id, qty: 1, name: 'مستثمر تجريبي', phone: '-', start: addDays(today(), -60), total: o.price };
      S.investments.unshift(inv); save(); location.hash = '#/dashboard/' + inv.id;
    };
    return;
  }
  const inv = S.investments.find(x => x.id === id) || S.investments[0];
  const o = offer(inv.offer), f = farm(o.farm), c = cam(o.camera);
  const kind = o.type === 'land' ? 'crop' : 'animal';
  const s = sensors(inv.id, kind);
  const elapsed = Math.max(0, daysSince(inv.start)), pct = Math.min(100, elapsed / o.season * 100);
  const harvest = addDays(inv.start, o.season), left = Math.max(0, o.season - elapsed);
  const totalInv = S.investments.reduce((a, x) => a + x.total, 0);

  app.innerHTML = `
  <div class="page-h"><div><h1>📊 لوحة المستثمر</h1><p class="muted">${S.investments.length} استثمار • إجمالي ${money(totalInv)}</p></div>
    <div class="row no-print"><a class="btn" href="#/report/${inv.id}">📄 التقرير الذكي</a><a class="btn ghost" href="#/advisor">💬 المستشار</a></div></div>
  ${demoNote}
  <div class="inv-tabs">${S.investments.map(x => { const ox = offer(x.offer); return `<a class="chip ${x.id === inv.id ? 'on' : ''}" href="#/dashboard/${x.id}">${ox.emoji} ${esc(ox.title)}${x.qty > 1 ? ' × ' + x.qty : ''}</a>`; }).join('')}</div>

  <div class="grid g2">
    <div class="card"><div class="row" style="margin-bottom:8px"><h3 style="margin:0">🎥 بث مباشر</h3><span class="sp"></span><span class="muted small">${esc(f.name)}</span></div>${camHTML(c)}</div>
    <div class="card">
      <h3>${o.emoji} ${esc(o.title)}${inv.qty > 1 ? ' × ' + inv.qty : ''}</h3>
      <dl class="kv small" style="margin-bottom:12px">
        <dt>رقم العقد</dt><dd dir="ltr" style="text-align:right">${inv.contract}</dd>
        <dt>المزرعة</dt><dd>${esc(f.name)} – ${esc(f.region)}</dd>
        <dt>المزارع المسؤول</dt><dd>${esc(f.farmer)}</dd>
        <dt>تاريخ البدء</dt><dd>${inv.start}</dd>
        <dt>${o.type === 'land' ? 'تاريخ الحصاد المتوقع' : 'نهاية الدورة'}</dt><dd>${harvest} <span class="muted">(${left} يوم متبقي)</span></dd>
        <dt>المرحلة الحالية</dt><dd><span class="tag">${stageOf(o, pct)}</span></dd>
        <dt>العائد المتوقع</dt><dd>${esc(o.yield)}</dd>
      </dl>
      <div class="row small"><b>تقدّم الدورة</b><span class="sp"></span>${Math.round(pct)}٪</div><div class="bar"><i style="width:${pct}%"></i></div>
    </div>
  </div>

  <div class="card" style="margin-top:14px"><div class="row"><h3 style="margin:0">📡 قراءات الحساسات اللحظية</h3><span class="sp"></span><span class="tag blue">تتحدث كل 3 ثواني</span></div><div id="sp" style="margin-top:10px">${sensorPanel(s)}</div></div>

  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3>🗒️ سجل العمليات بالمزرعة</h3>${opsLog(o, inv).map(x => `<div class="row small" style="border-bottom:1px solid var(--line);padding:6px 0"><span>${x[1]}</span><span class="sp"></span><span class="muted">${x[0]}</span></div>`).join('')}</div>
    <div class="card"><h3>🔔 آخر التنبيهات</h3><div id="al"></div></div>
  </div>`;
  const label = o.title;
  const drawAlerts = () => { const list = S.notes.filter(n => n.level === 'warn').slice(0, 5); $('#al').innerHTML = list.length ? list.map(n => `<div class="note warn" style="border-radius:8px;margin-bottom:6px"><b>${esc(n.title)}</b>${esc(n.text)}<div class="muted small">${fmtTime(n.date)}</div></div>`).join('') : '<p class="muted small">كل شي تمام ✓ – التنبيهات الذكية بتطلع هون لما الحساسات تلاحظ إشي.</p>'; };
  drawAlerts();
  every(() => { step(s); checkAlerts(s, label); $('#sp').innerHTML = sensorPanel(s); drawAlerts(); }, 3000);
}

/* ---------- smart report (printable) ---------- */
function report(app, id) {
  const inv = S.investments.find(x => x.id === id);
  if (!inv) { app.innerHTML = '<div class="card empty">التقرير غير موجود. <a class="btn sm" href="#/dashboard">لوحة المستثمر</a></div>'; return; }
  const o = offer(inv.offer), f = farm(o.farm), s = sensors(inv.id, o.type === 'land' ? 'crop' : 'animal');
  const elapsed = Math.max(0, daysSince(inv.start)), pct = Math.min(100, elapsed / o.season * 100);
  const a = s.hist.reduce((x, y) => x + y, 0) / s.hist.length;
  S.reports++; save();
  const readings = s.kind === 'animal'
    ? [['الحالة الصحية', Math.round(s.health) + '٪'], ['حرارة الجسم', s.temp.toFixed(1) + '°'], ['النشاط', Math.round(s.activity) + '٪'], ['استهلاك العلف', Math.round(s.feed) + '٪'], ['متوسط الصحة للفترة', Math.round(a) + '٪']]
    : [['رطوبة التربة', Math.round(s.moist) + '٪'], ['درجة الحرارة', Math.round(s.temp) + '°'], ['صحة النبات', Math.round(s.health) + '٪'], ['الإضاءة', Math.round(s.light) + '٪'], ['متوسط الرطوبة للفترة', Math.round(a) + '٪']];
  const tips = s.kind === 'animal'
    ? ['الاستمرار بالتغذية الطبيعية والفحص البيطري الدوري.', s.temp > 39.8 ? 'مراقبة حرارة الجسم خلال الأيام القادمة.' : 'المؤشرات الحيوية ضمن الطبيعي.', 'الالتزام بجدول التحصين.']
    : [s.moist < 60 ? 'زيادة عدد دورات الري الصباحي.' : 'رطوبة التربة مناسبة، ولا حاجة لتعديل الري.', 'تسميد عضوي حسب الجدول في المرحلة القادمة.', 'متابعة الآفات بالمكافحة الحيوية.'];
  app.innerHTML = `
  <div class="row no-print" style="margin-bottom:12px"><a class="muted" href="#/dashboard/${inv.id}">→ رجوع للوحة</a><span class="sp"></span><button class="btn" onclick="print()">🖨️ طباعة / حفظ PDF</button></div>
  <div class="card">
    <div class="row"><img src="images/logo.jpg" style="width:60px;border-radius:10px" alt=""><div><h1 style="font-size:24px">التقرير الذكي للمستثمر</h1><div class="muted">ريف تكنولوجي – منصة الزراعة الرقمية</div></div><span class="sp"></span><div class="small muted">تاريخ التقرير: ${today()}</div></div>
    <hr style="border:0;border-top:1px solid var(--line);margin:14px 0">
    <div class="grid g2">
      <dl class="kv"><dt>المستثمر</dt><dd>${esc(inv.name)}</dd><dt>رقم العقد</dt><dd>${inv.contract}</dd><dt>الأصل</dt><dd>${o.emoji} ${esc(o.title)} × ${inv.qty}</dd><dt>قيمة الاستثمار</dt><dd>${money(inv.total)}</dd></dl>
      <dl class="kv"><dt>المزرعة</dt><dd>${esc(f.name)} – ${esc(f.region)}</dd><dt>تاريخ البدء</dt><dd>${inv.start}</dd><dt>نهاية الدورة</dt><dd>${addDays(inv.start, o.season)}</dd><dt>المرحلة</dt><dd>${stageOf(o, pct)} (${Math.round(pct)}٪)</dd></dl>
    </div>
    <h3 style="margin-top:16px">القراءات الحالية</h3>
    <div class="tbl"><table>${readings.map(r => `<tr><th>${r[0]}</th><td><b>${r[1]}</b></td></tr>`).join('')}</table></div>
    <h3 style="margin-top:16px">آخر العمليات</h3>
    <div class="tbl"><table>${opsLog(o, inv).map(x => `<tr><td>${x[0]}</td><td>${x[1]}</td></tr>`).join('')}</table></div>
    <h3 style="margin-top:16px">الجودة والسلامة</h3>
    <p>${o.type === 'land' ? 'زراعة بأسمدة عضوية ومكافحة حيوية، والمياه محسوبة بالحساسات.' : 'رعاية بإشراف بيطري وأعلاف طبيعية بدون هرمونات.'} العائد المتوقع: ${esc(o.yield)}.</p>
    <h3>التوصيات</h3><ul>${tips.map(t => `<li>${t}</li>`).join('')}</ul>
    <p class="muted small">🧪 تقرير من نسخة تجريبية؛ القراءات محاكاة.</p>
  </div>`;
}

/* =========================================================
   LIVE CAMERAS
   ========================================================= */
function live(app, id) {
  const c = cam(id || 'c1');
  const s = sensors('cam-' + c.id, c.kind);
  app.innerHTML = `
  <div class="page-h"><div><h1>🎥 البث المباشر</h1><p class="muted">مراقبة المحاصيل والمواشي لحظة بلحظة من المزارع الشريكة.</p></div></div>
  ${demoNote}
  <div class="cam-list" style="margin-bottom:14px">${SEED.cameras.map((x, i) => `<a class="cam-pick ${x.id === c.id ? 'on' : ''}" href="#/live/${x.id}"><b>${esc(x.name)}</b><div class="muted small">كاميرا ${i + 1} • ${esc(farm(x.farm).name)}</div></a>`).join('')}</div>
  <div class="grid g2">
    <div class="card">${camHTML(c)}</div>
    <div class="card"><h3>📡 حساسات ${c.kind === 'animal' ? 'الحظيرة' : 'الحقل'}</h3><div id="sp">${sensorPanel(s)}</div></div>
  </div>`;
  every(() => { step(s); checkAlerts(s, c.name); $('#sp').innerHTML = sensorPanel(s); }, 3000);
}

/* =========================================================
   SMART ADVISOR (rule-based guidance)
   ========================================================= */
const ADVICE = [
  { k: ['حمى', 'مريض', 'مريضه', 'خمول', 'ما بياكل', 'لا ياكل', 'ما بتاكل', 'حراره الحيوان', 'حراره الغنم', 'حراره البقره', 'حراره الماشيه'],
    a: 'للحيوان المريض أو الخامل:\n• اعزله عن القطيع فوراً.\n• قِس حرارته: الطبيعي للأغنام والأبقار تقريباً 38.5–40°.\n• وفّر ماء نظيف وظل.\n• إذا الحرارة فوق 40° أو ما بياكل أكثر من يوم، تواصل مع الطبيب البيطري فوراً من «احجز استشارة» تحت.' },
  { k: ['اسهال'], a: 'الإسهال عند المواشي:\n• اعزل الحيوان ووفّر ماء نظيف باستمرار، فالجفاف هو الخطر الأكبر.\n• خفّف العلف الأخضر الطازج مؤقتاً.\n• نظّف الحظيرة والمعالف.\n• إذا استمر أكثر من يوم أو فيه دم، لازم بيطري.' },
  { k: ['ضرع', 'التهاب الضرع', 'الحليب متكتل', 'حليب'], a: 'علامات التهاب الضرع: انتفاخ أو سخونة بالضرع، أو كتل ودم بالحليب.\n• اعزل حليب البقرة المصابة.\n• نظافة الحلب وتعقيم الحلمات بعد كل حلبة.\n• العلاج بالمضاد الحيوي بيكون بوصفة بيطرية فقط.' },
  { k: ['تطعيم', 'لقاح', 'تحصين'], a: 'التحصين بيكون حسب جدول يحدده الطبيب البيطري حسب المنطقة والعمر. سجّل كل تطعيم بتاريخه بالمنصة، وبتوصلك تنبيهات بالمواعيد القادمة.' },
  { k: ['علف', 'تغذيه الماشيه', 'تغذيه'], a: 'تغذية المواشي:\n• علف متوازن (شعير + برسيم أو دريس) مع أملاح معدنية.\n• ماء نظيف دائماً.\n• غيّر العلف تدريجياً على مدى أسبوع، مش مرة وحدة.\n• بتلاقي أعلاف طبيعية بسعر منافس بقسم «مدخلات إنتاج» بالسوق.' },
  { k: ['اصفرار', 'صفرا', 'اصفر', 'صفراء'], a: 'اصفرار الأوراق غالباً سببه:\n• إذا كان بالأوراق القديمة (التحت): نقص نيتروجين، فاستعمل سماد عضوي غني بالنيتروجين.\n• إذا كان بالأوراق الجديدة: ممكن نقص حديد.\n• كمان الري الزائد بيعمل اصفرار، فراقب حساس رطوبة التربة وخليها 60–75٪.' },
  { k: ['حشرات', 'حشره', 'من', 'ذبابه بيضاء', 'افه', 'افات', 'دود', 'سوسه'], a: 'لمكافحة الآفات بطريقة آمنة:\n• حط مصائد صفراء لاصقة لتعرف نوع الحشرة.\n• رش صابون بوتاسي أو زيت النيم على الأوراق من الجهتين.\n• شيل الأجزاء المصابة كثير.\n• المكافحة الحيوية (حشرات نافعة مثل الدعسوقة) أفضل من الكيماوي.\n• سوسة النخيل الحمراء: بلّغ فوراً، لأنها بتنتشر بسرعة.' },
  { k: ['فطر', 'بياض', 'عفن', 'تبقع', 'بقع'], a: 'الأمراض الفطرية:\n• قلّل بلل الأوراق، والري بالتنقيط أفضل من الرش.\n• حسّن التهوية بين النباتات.\n• شيل الأوراق المصابة وأتلفها بعيد عن الحقل.\n• إذا انتشر، استخدم مبيد فطري آمن حسب توصية المهندس الزراعي.' },
  { k: ['ري', 'سقايه', 'سقي', 'رطوبه', 'مي', 'مياه'], a: 'نصائح الري:\n• الري الصباحي الباكر بيقلل التبخر.\n• الري بالتنقيط بيوفّر لحد 50٪ من المياه.\n• خلّي رطوبة التربة بين 60 و75٪، والمنصة بتنبّهك وبتشغّل الري لما تنزل.' },
  { k: ['سماد', 'تسميد', 'كمبوست'], a: 'التسميد العضوي:\n• الكمبوست قبل الزراعة: 2–3 كغ لكل متر مربع.\n• سماد أخضر (بقوليات) بين المواسم بيحسّن التربة.\n• بلاش زيادة النيتروجين وقت الإزهار.\n• السماد العضوي متوفر بقسم «مدخلات إنتاج».' },
  { k: ['تربه', 'ملوحه', 'حموضه', 'ph'], a: 'صحة التربة:\n• افحص التربة مرة بالسنة (حموضة، ملوحة، مادة عضوية).\n• أغلب الخضار بتحب pH بين 6 و7.\n• لمعالجة الملوحة: غسيل بالماء العذب وزيادة المادة العضوية.' },
  { k: ['صقيع', 'برد', 'حر', 'حراره'], a: 'حماية المحصول من الطقس:\n• الصقيع: غطّي النباتات بالليل، واسقِ قبلها بيوم لأن التربة الرطبة بتحفظ الحرارة.\n• الحر الشديد: تظليل جزئي، وري الصبح بكير.\n• المنصة بتبعتلك تنبيه لما الحساسات تسجّل حرارة غير طبيعية.' },
  { k: ['نخل', 'تمر', 'تمور', 'تلقيح'], a: 'رعاية النخيل:\n• التلقيح بموسم الإزهار (الربيع)، خلال 2–4 أيام من تفتح الطلع.\n• ري منتظم، ويزيد بالصيف.\n• خف الثمار بيحسّن الحجم والجودة.\n• راقب سوسة النخيل الحمراء: ثقوب بالجذع وإفرازات بنية.' }
];
function answer(q) {
  const t = norm(q);
  const hit = ADVICE.find(r => r.k.some(k => t.includes(norm(k))));
  return hit ? hit.a : 'ما فهمت سؤالك بالضبط 🤔\nجرّب تكتب المشكلة بكلمات مثل: اصفرار، حشرات، فطر، ري، سماد، تربة، صقيع، نخل، أو للمواشي: حمى، إسهال، ضرع، علف، تطعيم.\nأو احجز استشارة مع مختص من تحت.';
}
function advisor(app) {
  app.innerHTML = `
  <div class="page-h"><div><h1>💬 المستشار الذكي</h1><p class="muted">إرشاد زراعي وبيطري فوري. للحالات الطارئة، احجز استشارة مع مهندس زراعي أو طبيب بيطري.</p></div></div>
  <div class="grid g2">
    <div class="card">
      <div class="chat" id="chat"></div>
      <div class="chips" style="margin:10px 0 0">${['أوراق الطماطم صفرا', 'في حشرات بيضاء على النبات', 'كيف أسقي صح؟', 'الغنمة ما بتاكل وخاملة', 'التهاب الضرع', 'تلقيح النخل'].map(q => `<button class="chip" data-q="${q}">${q}</button>`).join('')}</div>
      <form class="chat-in" id="cin"><input name="q" placeholder="اكتب مشكلتك…" autocomplete="off" required><button class="btn">إرسال</button></form>
    </div>
    <form class="card" id="book">
      <h3>📅 احجز استشارة مع مختص</h3>
      <label class="f">نوع الاستشارة<select name="type"><option>زراعية (مهندس زراعي)</option><option>بيطرية (طبيب بيطري)</option></select></label>
      <div class="f2"><label class="f">الاسم<input name="name" required></label><label class="f">الجوال<input name="phone" required dir="ltr"></label></div>
      <label class="f">وصف المشكلة<textarea name="text" rows="4" required></textarea></label>
      <button class="btn">احجز</button>
    </form>
  </div>`;
  const chat = $('#chat');
  const say = (txt, who) => { const d = document.createElement('div'); d.className = 'msg ' + who; d.textContent = txt; chat.appendChild(d); chat.scrollTop = chat.scrollHeight; };
  say('أهلاً! أنا المستشار الذكي لريف تكنولوجي 🌱\nاحكيلي شو المشكلة بالمحصول أو بالمواشي، وبعطيك إرشادات فورية.', 'bot');
  const ask = q => { say(q, 'me'); setTimeout(() => say(answer(q), 'bot'), 450); };
  $('#cin').onsubmit = e => { e.preventDefault(); const q = e.target.q.value.trim(); if (q) ask(q); e.target.reset(); };
  app.querySelector('.chips').onclick = e => { const b = e.target.closest('[data-q]'); if (b) ask(b.dataset.q); };
  $('#book').onsubmit = e => {
    e.preventDefault(); const d = formData(e.target);
    S.consults.unshift({ id: uid(), ...d, date: Date.now(), status: 'بانتظار الرد' });
    notify('📅 تم حجز الاستشارة', `${d.type}: رح يتواصل معك المختص على ${d.phone} بأقرب وقت.`, 'ok');
    e.target.reset(); toast('تم الحجز ✓');
  };
}

/* =========================================================
   FARMER PORTAL
   ========================================================= */
const EMOJIS = ['🍅', '🥒', '🥬', '🥕', '🧅', '🥔', '🌶️', '🍆', '🍓', '🍇', '🍊', '🍋', '🍉', '🫒', '🌴', '🌾', '🍯', '🥛', '🧀', '🥚', '🥩', '🐟', '🪴', '🌿'];
function farmer(app, tab = 'products') {
  const f = farm(S.farmer);
  const tabs = [['products', '🧺 منتجاتي'], ['add', '➕ منتج جديد'], ['orders', '📦 الطلبات'], ['supply', '🏨 عقود التوريد'], ['offers', '🌱 عروض الاستثمار']];
  app.innerHTML = `
  <div class="page-h"><div><h1>🧑‍🌾 بوابة المزارع</h1><p class="muted">اعرض منتجاتك، أصدر رموز QR، وتابع الطلبات مباشرة بدون وسطاء.</p></div>
    <label class="f" style="margin:0">المزرعة<select id="fs">${SEED.farms.map(x => `<option value="${x.id}" ${x.id === S.farmer ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label></div>
  ${demoNote}
  <div class="chips">${tabs.map(t => `<a class="chip ${t[0] === tab ? 'on' : ''}" href="#/farmer/${t[0]}">${t[1]}</a>`).join('')}</div>
  <div id="ft"></div>`;
  $('#fs').onchange = e => { S.farmer = e.target.value; save(); farmer(app, tab); };
  const box = $('#ft');
  const mine = S.products.filter(p => p.farm === S.farmer);

  if (tab === 'products') {
    box.innerHTML = mine.length ? `<div class="tbl"><table><tr><th>المنتج</th><th>رمز التتبع</th><th>السعر</th><th>المخزون</th><th>التقييم</th><th></th></tr>
      ${mine.map(p => `<tr><td>${p.emoji} ${esc(p.name)} ${p.featured ? '<span class="tag amber">⭐ مميز</span>' : ''}</td><td dir="ltr">${p.code}</td><td>${money(p.price)} / ${p.unit}</td>
      <td><div class="qty"><button data-s="-10" data-id="${p.id}">−</button><span>${p.stock}</span><button data-s="10" data-id="${p.id}">+</button></div></td>
      <td><span class="stars">${starsTxt(avg(p))}</span></td>
      <td class="row"><button class="btn sm" data-qr="${p.id}">🔳 QR</button><button class="btn ghost sm" data-fe="${p.id}">${p.featured ? 'إلغاء الترويج' : '⭐ روّج'}</button><button class="btn ghost sm" data-del="${p.id}">حذف</button></td></tr>`).join('')}</table></div>`
      : `<div class="card empty">ما في منتجات لهاي المزرعة. <a class="btn sm" href="#/farmer/add">أضف منتج</a></div>`;
    box.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      const p = product(b.dataset.id || b.dataset.qr || b.dataset.fe || b.dataset.del); if (!p) return;
      if (b.dataset.s) { p.stock = Math.max(0, p.stock + +b.dataset.s); }
      if (b.dataset.qr) { qrModal(p); return; }
      if (b.dataset.fe) { p.featured = !p.featured; toast(p.featured ? 'المنتج صار مميز بالسوق ⭐' : 'تم إلغاء الترويج'); }
      if (b.dataset.del) { if (!confirm('حذف ' + p.name + '؟')) return; S.products = S.products.filter(x => x !== p); }
      save(); farmer(app, tab);
    };
  }

  if (tab === 'add') {
    box.innerHTML = `<form class="card" id="pf">
      <div class="f2"><label class="f">اسم المنتج<input name="name" required></label>
      <label class="f">التصنيف<select name="cat">${SEED.categories.slice(1).map(c => `<option>${c}</option>`).join('')}</select></label></div>
      <label class="f">الأيقونة</label><div class="chips" id="em">${EMOJIS.map((e, i) => `<button type="button" class="chip ${i ? '' : 'on'}" data-e="${e}" style="font-size:20px">${e}</button>`).join('')}</div>
      <div class="f2"><label class="f">السعر (${CUR})<input name="price" type="number" min="0" step="0.5" required></label><label class="f">الوحدة<input name="unit" value="كغ" required></label></div>
      <div class="f2"><label class="f">الكمية المتوفرة<input name="stock" type="number" min="0" required></label>
      <label class="f">كاميرا المزرعة<select name="camera">${SEED.cameras.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label></div>
      <div class="f2"><label class="f">تاريخ الزراعة<input name="planted" type="date"></label><label class="f">تاريخ الحصاد<input name="harvest" type="date" value="${today()}" required></label></div>
      <div class="f2"><label class="f">طريقة الزراعة<input name="method" value="زراعة عضوية ذكية" required></label><label class="f">نوع السماد / العلف<input name="fertilizer" value="سماد عضوي" required></label></div>
      <div class="f2"><label class="f">الري<input name="water" value="ري بالتنقيط محسوب"></label><label class="f">المبيدات<input name="pesticide" value="بدون مبيدات كيميائية"></label></div>
      <button class="btn">حفظ وتوليد رمز QR</button></form>`;
    let emoji = EMOJIS[0];
    $('#em').onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; emoji = b.dataset.e; $$('#em .chip').forEach(x => x.classList.toggle('on', x === b)); };
    $('#pf').onsubmit = e => {
      e.preventDefault(); const d = formData(e.target);
      const code = `REEF-TR-${new Date().getFullYear()}-${String(++S.seq.code).padStart(5, '0')}`;
      const p = { id: 'p' + Date.now(), code, emoji, ...d, price: +d.price, stock: +d.stock, farm: S.farmer, inspection: 'ناجح – ' + today(), ratings: [], featured: false };
      S.products.push(p);
      notify('🔳 تم إصدار رمز QR', `${p.name}: ${code}`, 'ok');
      qrModal(p); location.hash = '#/farmer/products';
    };
  }

  if (tab === 'orders') {
    const orders = S.orders.filter(o => o.items.some(x => x.farm === S.farmer));
    box.innerHTML = orders.length ? `<div class="tbl"><table><tr><th>الطلب</th><th>الزبون</th><th>المنتجات من مزرعتك</th><th>القيمة</th><th>الحالة</th></tr>
      ${orders.map(o => { const its = o.items.filter(x => x.farm === S.farmer); return `<tr><td dir="ltr">${o.no}<div class="muted small">${fmtTime(o.date)}</div></td><td>${esc(o.name)}<div class="muted small" dir="ltr">${esc(o.phone)}</div><div class="muted small">${esc(o.addr)}</div></td>
      <td>${its.map(x => { const p = product(x.id); return p ? `${p.emoji} ${esc(p.name)} × ${x.q}` : ''; }).join('<br>')}</td><td>${money(its.reduce((a, x) => a + x.price * x.q, 0))}</td>
      <td><select data-o="${o.no}">${ORDER_STEPS.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`; }).join('')}</table></div>`
      : '<div class="card empty">ما في طلبات على منتجات هاي المزرعة لسا.</div>';
    box.onchange = e => {
      const o = S.orders.find(x => x.no === e.target.dataset.o); if (!o) return;
      o.status = e.target.value;
      notify('🚚 تحديث طلب ' + o.no, 'حالة طلبك صارت: ' + o.status, o.status === 'تم التوصيل' ? 'ok' : 'info');
      toast('تم تحديث الحالة وإشعار الزبون');
    };
  }

  if (tab === 'supply') {
    const list = S.supply.filter(s => { const p = product(s.product); return p && p.farm === S.farmer; });
    box.innerHTML = list.length ? list.map(s => { const p = product(s.product); return `<div class="card" style="margin-bottom:10px"><div class="row"><b>${esc(s.business)}</b><span class="tag soil">${esc(s.type)}</span><span class="tag ${s.status === 'معتمد' ? '' : s.status === 'مرفوض' ? 'red' : 'amber'}">${s.status}</span></div>
      <div class="small" style="margin:6px 0">${p.emoji} ${esc(p.name)} • ${s.qty} ${p.unit} • ${s.freq} • ${s.months} شهور • ${esc(s.contact)} <span dir="ltr">${esc(s.phone)}</span></div>
      ${s.status === 'قيد المراجعة' ? `<div class="row"><button class="btn sm" data-ok="${s.id}">اعتماد العقد</button><button class="btn ghost sm" data-no="${s.id}">رفض</button></div>` : ''}</div>`; }).join('')
      : '<div class="card empty">ما في طلبات توريد على منتجات هاي المزرعة.</div>';
    box.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      const s = S.supply.find(x => x.id === (b.dataset.ok || b.dataset.no)); if (!s) return;
      s.status = b.dataset.ok ? 'معتمد' : 'مرفوض';
      notify('🏨 عقد توريد ' + s.status, `${s.business}: تم ${b.dataset.ok ? 'اعتماد' : 'رفض'} طلب التوريد.`, b.dataset.ok ? 'ok' : 'info');
      farmer(app, tab);
    };
  }

  if (tab === 'offers') {
    const list = S.offers.filter(o => o.farm === S.farmer);
    box.innerHTML = `<div class="grid g2">
      <div class="card"><h3>عروضك الحالية</h3>${list.length ? list.map(o => `<div class="row" style="border-bottom:1px solid var(--line);padding:6px 0"><span style="font-size:24px">${o.emoji}</span><div class="sp"><b>${esc(o.title)}</b><div class="muted small">${money(o.price)} • ${o.season} يوم • متبقي ${o.left}</div></div></div>`).join('') : '<p class="muted">ما في عروض</p>'}
        <p class="muted small" style="margin-top:10px">عندك أرض غير مستغلة أو مواشي؟ اعرضها كحصص للمستثمرين، والمنصة بتربطك فيهم.</p></div>
      <form class="card" id="of"><h3>عرض جديد</h3>
        <div class="f2"><label class="f">النوع<select name="type"><option value="land">مساحة زراعية</option><option value="livestock">مواشي</option></select></label><label class="f">الأيقونة<select name="emoji">${['🌾', '🍅', '🌴', '🥬', '🫒', '🐑', '🐄', '🐐', '🐔'].map(e => `<option>${e}</option>`).join('')}</select></label></div>
        <label class="f">العنوان<input name="title" placeholder="مثال: حصة زيتون 10 أشجار" required></label>
        <div class="f2"><label class="f">سعر الحصة<input name="price" type="number" min="1" required></label><label class="f">عدد الحصص<input name="left" type="number" min="1" required></label></div>
        <div class="f2"><label class="f">مدة الدورة (يوم)<input name="season" type="number" min="7" required></label><label class="f">الكاميرا<select name="camera">${SEED.cameras.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label></div>
        <label class="f">العائد المتوقع<input name="yield" required></label>
        <button class="btn">نشر العرض</button></form></div>`;
    $('#of').onsubmit = e => {
      e.preventDefault(); const d = formData(e.target);
      S.offers.push({ id: 'o' + Date.now(), ...d, price: +d.price, left: +d.left, season: +d.season, farm: S.farmer });
      save(); toast('تم نشر العرض بصفحة الاستثمار ✓'); farmer(app, tab);
    };
  }
}
function qrModal(p) {
  modal(`<div style="text-align:center">
    <div style="background:#f6f1e6;border:2px dashed var(--green);border-radius:16px;padding:16px;display:inline-block">
      <img src="images/logo.jpg" style="width:60px;margin:auto;border-radius:8px" alt="">
      <h3 style="color:var(--green);margin:6px 0 0">منتج تتبع</h3><b dir="ltr">${p.code}</b><div>${p.emoji} ${esc(p.name)}</div>
      <div class="qrbox" id="mq" style="margin:10px 0"></div>
      <div class="small">امسح الرمز للتعرف على معلومات المنتج كاملة</div>
      <div class="row small" style="justify-content:center;color:var(--green);margin-top:6px">🌱 زراعة ذكية • 💧 مياه محسوبة • 🛡️ مبيدات آمنة • 🏅 جودة مضمونة</div>
    </div>
    <div class="row" style="justify-content:center;margin-top:14px"><button class="btn" id="pl">🖨️ طباعة الملصق</button><a class="btn ghost" href="#/trace/${p.code}">صفحة التتبع</a><button class="btn ghost" data-close-modal>إغلاق</button></div></div>`);
  qr($('#mq'), p.code, 170);
  $('#pl').onclick = () => printLabel(p);
}
function printLabel(p) {
  const tmp = document.createElement('div'); qr(tmp, p.code, 260);
  const cv = tmp.querySelector('canvas'), src = cv ? cv.toDataURL() : '';
  const w = window.open('', '_blank'); if (!w) { toast('اسمح بالنوافذ المنبثقة عشان تطبع'); return; }
  w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${p.code}</title><style>
    body{font-family:Tahoma,sans-serif;display:grid;place-items:center;margin:0;padding:20px}
    .l{border:2px dashed #1f5e3b;border-radius:16px;padding:20px;text-align:center;width:320px;background:#f6f1e6}
    h2{color:#1f5e3b;margin:6px 0}.i{display:flex;justify-content:space-between;font-size:11px;color:#1f5e3b;margin-top:10px}</style></head>
    <body><div class="l"><img src="${new URL('images/logo.jpg', location.href)}" width="70"><h2>منتج تتبع</h2><b dir="ltr">${p.code}</b><p>${esc(p.name)}</p>
    <img src="${src}" width="220"><p style="font-size:13px">امسح الرمز للتعرف على معلومات المنتج كاملة</p>
    <div class="i"><span>🌱 زراعة ذكية</span><span>💧 مياه محسوبة</span><span>🛡️ مبيدات آمنة</span><span>🏅 جودة مضمونة</span></div></div>
    <script>onload=()=>setTimeout(print,300)<\/script></body></html>`);
  w.document.close();
}

/* =========================================================
   ADMIN: KPIs, revenue streams, complaints, consults
   ========================================================= */
function admin(app) {
  const F = S.fees;
  const orders = S.orders.filter(o => o.kind === 'order');
  const sales = orders.reduce((a, o) => a + o.total, 0);
  const activeSubs = S.subs.filter(s => s.status === 'فعّال');
  const subRev = activeSubs.reduce((a, s) => a + SEED.plans.find(b => b.id === s.plan).price, 0);
  const invTotal = S.investments.reduce((a, x) => a + x.total, 0);
  const approved = S.supply.filter(s => s.status === 'معتمد').length;
  const featured = S.products.filter(p => p.featured).length;
  const streams = [
    ['عمولات البيع المباشر', sales * F.commission / 100],
    ['اشتراكات المزارعين والتجار', SEED.farms.length * F.farmerMonthly],
    ['رسوم الزراعة الرقمية (استئجار المساحات)', invTotal],
    ['رسوم إصدار رموز QR', S.products.length * F.qr],
    ['رسوم التقارير الرقمية', S.reports * F.report],
    ['اتفاقيات التوريد الثابتة', approved * F.supply],
    ['الإشراف والمتابعة الإدارية للحصص', invTotal * F.management / 100],
    ['التسويق والترويج للمنتجين', featured * F.featured]
  ];
  const max = Math.max(1, ...streams.map(s => s[1]));
  const total = streams.reduce((a, s) => a + s[1], 0);
  app.innerHTML = `
  <div class="page-h"><div><h1>⚙️ لوحة الإدارة والتقارير</h1><p class="muted">مؤشرات المنصة ومصادر الإيرادات حسب نموذج العمل.</p></div>
    <div class="row"><button class="btn ghost" id="csv">⬇️ تصدير الطلبات CSV</button><button class="btn red" id="reset">إعادة ضبط البيانات</button></div></div>
  ${demoNote}
  <div class="grid g4">
    ${[['💰', 'إجمالي المبيعات', money(sales)], ['📦', 'الطلبات', orders.length], ['🔁', 'اشتراكات فعّالة', activeSubs.length + ' (' + money(subRev) + ')'], ['🌱', 'الاستثمارات', S.investments.length + ' (' + money(invTotal) + ')'],
       ['🔳', 'رموز QR المُصدرة', S.products.length], ['🏨', 'عقود توريد معتمدة', approved], ['📄', 'تقارير صادرة', S.reports], ['⚠️', 'شكاوى مفتوحة', S.complaints.filter(c => c.status === 'مفتوحة').length]]
      .map(k => `<div class="card"><div style="font-size:24px">${k[0]}</div><div class="muted small">${k[1]}</div><b style="font-size:20px">${k[2]}</b></div>`).join('')}
  </div>

  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3>📈 مصادر الإيرادات</h3><p class="muted small">محسوبة من نشاط المنصة والرسوم المحددة جنبها.</p>
      ${streams.map(s => `<div class="hbar"><span>${s[0]}</span><div class="bar"><i style="width:${s[1] / max * 100}%"></i></div><b>${money(s[1])}</b></div>`).join('')}
      <div class="row" style="border-top:1px solid var(--line);padding-top:8px"><b>الإجمالي</b><span class="sp"></span><b class="price">${money(total)}</b></div></div>
    <form class="card" id="fees"><h3>🧾 الرسوم والعمولات</h3>
      <div class="f2">
        <label class="f">عمولة البيع (٪)<input type="number" name="commission" value="${F.commission}" min="0" step="0.5"></label>
        <label class="f">اشتراك المزارع الشهري<input type="number" name="farmerMonthly" value="${F.farmerMonthly}" min="0"></label>
        <label class="f">رسم رمز QR<input type="number" name="qr" value="${F.qr}" min="0" step="0.5"></label>
        <label class="f">رسم التقرير<input type="number" name="report" value="${F.report}" min="0"></label>
        <label class="f">رسوم الإشراف (٪)<input type="number" name="management" value="${F.management}" min="0" step="0.5"></label>
        <label class="f">عقد التوريد<input type="number" name="supply" value="${F.supply}" min="0"></label>
        <label class="f">ترويج منتج<input type="number" name="featured" value="${F.featured}" min="0"></label>
      </div><button class="btn">حفظ</button></form>
  </div>

  <div class="card" style="margin-top:14px"><h3>📦 آخر الطلبات</h3>${orders.length ? `<div class="tbl"><table><tr><th>الطلب</th><th>الزبون</th><th>القيمة</th><th>الدفع</th><th>الحالة</th></tr>${orders.slice(0, 10).map(o => `<tr><td dir="ltr">${o.no}</td><td>${esc(o.name)}</td><td>${money(o.total)}</td><td>${esc(o.pay)}</td><td>${o.status}</td></tr>`).join('')}</table></div>` : '<p class="muted">ما في طلبات</p>'}</div>

  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3>⚠️ الشكاوى والملاحظات</h3><div id="cl">${S.complaints.length ? S.complaints.map(c => { const p = product(c.product); return `<div style="border-bottom:1px solid var(--line);padding:8px 0"><div class="row"><b>${esc(c.name)}</b><span class="tag ${c.status === 'مفتوحة' ? 'red' : ''}">${c.status}</span><span class="sp"></span>${c.status === 'مفتوحة' ? `<button class="btn sm" data-c="${c.id}">تم الحل</button>` : ''}</div><div class="small">${p ? p.emoji + ' ' + esc(p.name) + ' – ' : ''}${esc(c.text)}</div><div class="muted small">${fmtTime(c.date)} • <span dir="ltr">${esc(c.phone)}</span></div></div>`; }).join('') : '<p class="muted">ما في شكاوى 👍</p>'}</div></div>
    <div class="card"><h3>📅 طلبات الاستشارة</h3><div id="cs">${S.consults.length ? S.consults.map(c => `<div style="border-bottom:1px solid var(--line);padding:8px 0"><div class="row"><b>${esc(c.name)}</b><span class="tag ${c.status === 'تم الرد' ? '' : 'amber'}">${c.status}</span><span class="sp"></span>${c.status !== 'تم الرد' ? `<button class="btn sm" data-k="${c.id}">تم الرد</button>` : ''}</div><div class="small">${esc(c.type)}: ${esc(c.text)}</div><div class="muted small">${fmtTime(c.date)} • <span dir="ltr">${esc(c.phone)}</span></div></div>`).join('') : '<p class="muted">ما في طلبات استشارة</p>'}</div></div>
  </div>`;

  $('#fees').onsubmit = e => { e.preventDefault(); const d = formData(e.target); for (const k in d) S.fees[k] = +d[k] || 0; save(); toast('تم حفظ الرسوم'); admin(app); };
  app.onclick = e => {
    const b = e.target.closest('button[data-c],button[data-k]'); if (!b) return;
    if (b.dataset.c) { S.complaints.find(c => c.id === b.dataset.c).status = 'تم الحل'; notify('✅ تم حل شكواك', 'شكراً لملاحظتك، ساعدتنا نحسّن الجودة.', 'ok'); }
    if (b.dataset.k) { S.consults.find(c => c.id === b.dataset.k).status = 'تم الرد'; save(); }
    app.onclick = null; admin(app);
  };
  $('#csv').onclick = () => {
    const rows = [['رقم الطلب', 'التاريخ', 'الاسم', 'الجوال', 'العنوان', 'المنتجات', 'الإجمالي', 'الدفع', 'الحالة']]
      .concat(orders.map(o => [o.no, new Date(o.date).toISOString(), o.name, o.phone, o.addr, o.items.map(x => (product(x.id) || {}).name + ' × ' + x.q).join(' | '), o.total, o.pay, o.status]));
    const csv = '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'reef-orders.csv'; a.click();
  };
  $('#reset').onclick = () => { if (confirm('رح تنمسح كل البيانات التجريبية على هذا الجهاز وترجع للبداية. متأكد؟')) { S = fresh(); save(); route(); toast('تمت إعادة الضبط'); } };
}

route();
