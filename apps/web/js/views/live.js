// Bàn trộn trực tiếp — RTA, cảnh báo hú, 32 kênh, chi tiết kênh và đề xuất EQ.
// Ported from legacy.html: drawRTA, updateMeters, updateFeedbackRadarUI,
// dispatchQuickNotchProposal, loadChannels, renderChannelStrips, openChannelDetail,
// toggleCurrentModalChannelMute, fetchChannelGainStaging, proposeGainStagingTrimFromModal,
// fetchChannelBleedAnalysis, proposeExpanderFromModal, generateProposalForRole,
// generatePastorProposal, drawABCurve, applyActiveProposal (now renderProposal).
//
// Safety: nothing here writes to the mixer without an explicit confirm dialog.
// EQ / notch / trim / expander are proposals only; apply goes through renderProposal
// (POST /api/v1/proposals/apply → server Safety Gate).

import {
  $, esc, fmt, icon, badge, card, callout, pageHead, emptyState, loadingRows, errorBox,
  withLoading, toast, openDialog, confirmDialog, renderProposal, drawCurve,
} from '../ui.js';
import { api, getOperator } from '../api.js';
import { store } from '../store.js';

// ---------- Domain constants ----------
const ROLES = [
  ['PASTOR_SPEECH', 'Giọng nói Mục sư'],
  ['LEAD_VOCAL_FEMALE', 'Nữ đơn ca'],
  ['LEAD_VOCAL_MALE', 'Nam đơn ca'],
  ['CHOIR_OVERHEAD', 'Ca đoàn (mic treo)'],
  ['ACOUSTIC_GUITAR', 'Guitar acoustic'],
  ['PIANO_KEYS', 'Piano / Keyboard'],
  ['BASS_GUITAR', 'Guitar bass'],
];
const ROLE_LABEL = Object.fromEntries([...ROLES, ['FEEDBACK_NOTCH', 'Cắt hú (notch)']]);

// Church-profile role → EQ recommender role (best guess for the default selection).
const CHURCH_TO_EQ_ROLE = {
  PASTOR: 'PASTOR_SPEECH', SERMON: 'PASTOR_SPEECH', PRAYER: 'PASTOR_SPEECH', SPEECH: 'PASTOR_SPEECH',
  FEMALE_LEAD: 'LEAD_VOCAL_FEMALE', MALE_LEAD: 'LEAD_VOCAL_MALE', CHOIR: 'CHOIR_OVERHEAD',
  ACOUSTIC_GUITAR: 'ACOUSTIC_GUITAR', PIANO: 'PIANO_KEYS', KEYS: 'PIANO_KEYS', BASS: 'BASS_GUITAR',
};

const HEALTH = {
  OPTIMAL: ['Tối ưu', 'ok', 'ok'],
  LOW_GAIN: ['Gain thấp', 'warn', 'warn'],
  HIGH_GAIN: ['Gain cao', 'warn', 'warn'],
  CLIPPING_DETECTED: ['Đang clip!', 'bad', 'bad'],
};
const COMB_RISK = { LOW: ['Thấp', 'ok'], MODERATE: ['Vừa', 'warn'], HIGH: ['Cao', 'bad'], SEVERE: ['Nghiêm trọng', 'bad'] };
const PHASE = { IN_PHASE: 'Cùng pha', REVERSED_PHASE: 'Ngược pha', DECORRELATED: 'Không tương quan' };
const SEVERITY = { CRITICAL: ['Nghiêm trọng', 'bad'], ALARM: ['Báo động', 'bad'], WARNING: ['Cảnh báo', 'warn'] };
const BAND_NAMES = ['Trầm', 'Trung trầm', 'Trung cao', 'Cao'];
const DEFAULT_TALKBACK_CH = 11; // DL16 input 11; real channel comes from /api/v1/routing when available.

const METER_FLOOR = -60;  // dBFS shown as empty strip
const RTA_MIN_DB = -90;
const RTA_MAX_DB = 0;
const ALERT_HOLD_MS = 1500; // keep the banner a moment after alerts clear, to avoid flicker

// ---------- X32 normalized value → engineering units (same mappings as packages/eq_optimizer) ----------
const x32Freq = (v) => 20 * Math.pow(1000, +v || 0);          // 20 Hz … 20 kHz
const x32Hpf = (v) => 20 * Math.pow(20, +v || 0);             // 20 Hz … 400 Hz
const x32Gain = (v) => ((+v || 0) - 0.5) * 30;               // −15 … +15 dB
const x32Q = (v) => 0.3 * Math.pow(10 / 0.3, +v || 0);       // 0.3 … 10
function x32FaderDb(f) {
  f = +f;
  if (!Number.isFinite(f) || f <= 0) return -Infinity;
  if (f >= 0.5) return f * 40 - 30;
  if (f >= 0.25) return f * 80 - 50;
  if (f >= 0.0625) return f * 160 - 70;
  return f * 480 - 90;
}

// ---------- Plain-language helpers ----------
const signed = (v, d = 1) => (v === null || v === undefined || Number.isNaN(+v)) ? '—' : `${+v > 0 ? '+' : ''}${(+v).toFixed(d)}`;
function qLabel(q) {
  if (q >= 6) return 'cắt rất hẹp';
  if (q >= 3) return 'hẹp';
  if (q >= 1) return 'vừa';
  return 'rộng';
}
function gainWord(db) {
  if (db > 0.05) return 'tăng';
  if (db < -0.05) return 'cắt';
  return 'phẳng';
}
function freqZone(hz) {
  if (hz < 250) return 'vùng trầm (tiếng ù, rền)';
  if (hz < 2000) return 'vùng trung (tiếng hú tròn, "u u")';
  if (hz < 5000) return 'vùng trung cao (tiếng rít, chói tai)';
  return 'vùng cao (tiếng xì, huýt sáo)';
}
function faderText(f) {
  const db = x32FaderDb(f);
  const pct = Number.isFinite(+f) ? `${Math.round(+f * 100)}%` : '—';
  if (!Number.isFinite(db)) return `${pct} (−∞ dB, kéo hết xuống)`;
  const note = Math.abs(db) < 0.25 ? ' — đúng mức chuẩn (unity)' : '';
  return `${pct} (${signed(db)} dB${note})`;
}
const eqRoleFor = (churchRole) => {
  const r = String(churchRole || '').toUpperCase();
  return ROLE_LABEL[r] && r !== 'FEEDBACK_NOTCH' ? r : CHURCH_TO_EQ_ROLE[r];
};
const isOn = (ch) => +ch?.on === 1 || ch?.on === true;

export default {
  mount(root, ctx) {
    // ---------- State ----------
    let channels = [];
    let talkbackCh = DEFAULT_TALKBACK_CH;
    const strips = new Map(); // ch → { el, meter, db, mute, tag, lastScale, lastText, hot }
    let pending = store.telemetry || null;
    let raf = 0;
    let disposed = false;
    let drawer = null; // { ch, close, levelEl, lastText }
    let lastAlertTs = 0;
    let alertKey = '';
    let currentAlerts = [];
    let lastRO = null;
    let rtaEmptyShown = null;
    let rtaGrad = null;
    let rtaGradH = 0;
    let rtaLabelCache = { key: '', marks: [] };
    const curveRedraws = new Set();
    const unsubs = [];

    // ---------- Skeleton ----------
    root.innerHTML = `
      ${pageHead('Bàn trộn trực tiếp',
        'Theo dõi phổ âm, mức tín hiệu 32 kênh và cảnh báo hú. Mọi thay đổi chỉ là đề xuất — bạn duyệt rồi mới ghi xuống mixer.',
        `<button class="btn" id="lvRefresh">${icon('refresh')}Làm mới</button>`)}
      <div class="stack">
        <div id="lvFeedback" class="stack-sm" hidden></div>
        <div id="lvNotch" hidden></div>

        ${card({
          title: `${icon('spectrum')} Phổ âm thời gian thực (RTA)`,
          sub: 'Năng lượng theo tần số 20 Hz – 20 kHz. Cột đỏ: tần số đang có nguy cơ hú.',
          actions: '<span id="lvMode"></span>',
          body: `
            <div class="rta-wrap">
              <canvas id="lvRta" aria-label="Biểu đồ phổ âm thời gian thực"></canvas>
              <div id="lvRtaEmpty" class="empty" style="position:absolute;inset:0;display:grid;place-items:center">Đang chờ dữ liệu phổ âm…</div>
            </div>`,
        })}

        ${card({
          title: `${icon('sliders')} Kênh 1–32`,
          sub: 'Bấm vào một kênh để xem EQ, định tuyến, gain staging và tạo đề xuất.',
          actions: `<span class="small muted" id="lvTbNote"></span>`,
          body: `<div id="lvStrips">${loadingRows(4)}</div>`,
        })}

        ${card({
          title: `${icon('wand')} Đề xuất EQ theo vai trò`,
          sub: 'Chọn kênh và loại nguồn âm, xem đáp tuyến trước/sau (A/B) rồi mới quyết định áp dụng.',
          body: `
            <div class="grid-2">
              <div class="stack-sm">
                <div class="form-grid">
                  <div class="field"><label for="lvEqCh">Kênh</label><select class="select" id="lvEqCh"><option value="1">Kênh 01</option></select></div>
                  <div class="field"><label for="lvEqRole">Vai trò nguồn âm</label><select class="select" id="lvEqRole">${roleOptions('PASTOR_SPEECH')}</select></div>
                </div>
                <div class="row">
                  <button class="btn btn-primary" id="lvEqGen">${icon('wand')}Tạo đề xuất</button>
                  <button class="btn btn-ghost" id="lvEqPastor" title="Kênh 1 · Giọng nói Mục sư">Nhanh: Mục sư (Kênh 1)</button>
                </div>
                <div id="lvEqCurve"></div>
              </div>
              <div id="lvEqResult">${emptyState('Chưa có đề xuất. Chọn kênh và vai trò rồi bấm "Tạo đề xuất".')}</div>
            </div>`,
        })}
      </div>`;

    const rtaCanvas = $('#lvRta', root);
    const rtaEmpty = $('#lvRtaEmpty', root);
    const stripsEl = $('#lvStrips', root);
    const fbEl = $('#lvFeedback', root);
    const notchEl = $('#lvNotch', root);
    const modeEl = $('#lvMode', root);

    // ---------- Data loading ----------
    async function loadAll({ quiet = false } = {}) {
      if (!quiet && !channels.length) stripsEl.innerHTML = loadingRows(4);
      const [chRes, routeRes] = await Promise.allSettled([
        api.get('/api/v1/channels'),
        api.get('/api/v1/routing'),
      ]);
      if (disposed) return false;
      if (routeRes.status === 'fulfilled') {
        const assigned = +routeRes.value?.dl16_input_11_status?.channel_assigned;
        if (assigned >= 1 && assigned <= 32) talkbackCh = assigned;
      }
      $('#lvTbNote', root).innerHTML = `Talkback ban nhạc (DL16 #11) = <strong>${esc(fmt.ch(talkbackCh))}</strong>, chỉ ra P16`;
      if (chRes.status === 'rejected') {
        if (!channels.length) {
          stripsEl.innerHTML = `${errorBox(chRes.reason)}<div class="mt-8"><button class="btn btn-sm" data-retry>${icon('refresh')}Thử lại</button></div>`;
          $('[data-retry]', stripsEl).addEventListener('click', () => loadAll());
        } else if (!quiet) {
          toast(`Không tải lại được danh sách kênh: ${chRes.reason?.message || chRes.reason}`, 'bad');
        }
        return false;
      }
      channels = chRes.value?.channels || [];
      syncStrips();
      fillChannelSelect();
      if (drawer) refreshDrawerInfo();
      return true;
    }

    const chById = (n) => channels.find(c => +c.channel === +n);

    // ---------- Channel strips (built once, then mutated) ----------
    function syncStrips() {
      if (!channels.length) { stripsEl.innerHTML = emptyState('Mixer chưa trả về kênh nào.'); strips.clear(); return; }
      let grid = $('.strips', stripsEl);
      if (!grid) {
        stripsEl.innerHTML = '<div class="strips"></div>';
        grid = $('.strips', stripsEl);
        strips.clear();
      }
      const seen = new Set();
      channels.forEach(ch => {
        const n = +ch.channel;
        seen.add(n);
        let ref = strips.get(n);
        if (!ref) {
          const node = document.createElement('button');
          node.type = 'button';
          node.className = 'strip';
          node.dataset.ch = String(n);
          node.innerHTML = `
            <div class="row-between" style="gap:2px"><span class="strip-num">${String(n).padStart(2, '0')}</span><span class="tiny muted" data-tag></span></div>
            <div class="strip-name" data-name></div>
            <div class="strip-meter"><span></span></div>
            <div class="strip-db">—</div>
            <span class="badge" data-mute style="height:20px;justify-content:center;padding:0 6px;font-size:11px"></span>`;
          grid.appendChild(node);
          ref = {
            el: node, meter: $('.strip-meter > span', node), db: $('.strip-db', node),
            mute: $('[data-mute]', node), tag: $('[data-tag]', node), name: $('[data-name]', node),
            lastScale: -1, lastText: '', hot: false,
          };
          strips.set(n, ref);
        }
        updateStripStatic(ref, ch);
      });
      for (const [n, ref] of strips) if (!seen.has(n)) { ref.el.remove(); strips.delete(n); }
      if (pending) scheduleFrame();
    }

    function updateStripStatic(ref, ch) {
      const n = +ch.channel;
      const prot = n === talkbackCh;
      const on = isOn(ch);
      ref.el.classList.toggle('protected', prot);
      ref.el.classList.toggle('muted-ch', !on);
      ref.name.textContent = ch.name || fmt.ch(n);
      ref.tag.textContent = prot ? 'P16' : (ch.is_foh ? 'FOH' : (ch.is_p16 ? 'P16' : '—'));
      ref.mute.className = `badge ${on ? 'badge-ok' : 'badge-bad'}`;
      ref.mute.textContent = on ? 'ON' : 'MUTE';
      ref.el.title = `${fmt.ch(n)} · ${ch.name || ''}\nFader ${faderText(ch.fader)} · ${on ? 'đang mở' : 'đang tắt tiếng (mute)'}${prot ? '\nKênh talkback được bảo vệ: chỉ ra P16, không ra FOH' : ''}\nBấm để xem chi tiết`;
    }

    stripsEl.addEventListener('click', (e) => {
      const s = e.target.closest('.strip');
      if (s) openChannelDrawer(+s.dataset.ch);
    });

    // ---------- Telemetry → one draw per animation frame ----------
    function scheduleFrame() {
      if (!raf && !disposed) raf = requestAnimationFrame(frame);
    }
    function frame() {
      raf = 0;
      if (disposed || document.hidden || !pending) return;
      const t = pending;
      pending = null;
      const alerts = Array.isArray(t.feedback_alerts) ? t.feedback_alerts : [];
      updateMeters(t.meters || []);
      drawRTA(t.rta || [], alerts);
      updateFeedback(alerts);
      updateMode(t);
    }
    unsubs.push(store.on('telemetry', (t) => { pending = t; scheduleFrame(); }));
    const onVisible = () => { if (!document.hidden && store.telemetry) { pending = store.telemetry; scheduleFrame(); } };
    document.addEventListener('visibilitychange', onVisible);

    function updateMeters(meters) {
      for (let i = 0; i < meters.length; i++) {
        const m = meters[i];
        const db = +m.meter_dbfs;
        const ref = strips.get(+m.channel);
        if (ref) {
          const scale = Math.max(0, Math.min(1, (db - METER_FLOOR) / -METER_FLOOR));
          if (Math.abs(scale - ref.lastScale) > 0.004) {
            ref.meter.style.transform = `scaleY(${scale.toFixed(3)})`;
            ref.lastScale = scale;
          }
          const text = Number.isFinite(db) && db > METER_FLOOR ? db.toFixed(0) : '−∞';
          if (text !== ref.lastText) { ref.db.textContent = text; ref.lastText = text; }
          const hot = db > -3;
          if (hot !== ref.hot) { ref.db.classList.toggle('bad-text', hot); ref.hot = hot; }
        }
        if (drawer && +m.channel === drawer.ch && drawer.levelEl) {
          const t = Number.isFinite(db) && db > METER_FLOOR ? `${db.toFixed(1)} dBFS` : 'Không có tín hiệu';
          if (t !== drawer.lastText) { drawer.levelEl.textContent = t; drawer.lastText = t; }
        }
      }
    }

    function drawRTA(bands, alerts) {
      const w = rtaCanvas.clientWidth, h = rtaCanvas.clientHeight;
      const empty = !bands.length;
      if (empty !== rtaEmptyShown) { rtaEmpty.hidden = !empty; rtaEmptyShown = empty; }
      if (!w || !h) return;
      const dpr = window.devicePixelRatio || 1;
      const W = Math.round(w * dpr), H = Math.round(h * dpr);
      if (rtaCanvas.width !== W || rtaCanvas.height !== H) { rtaCanvas.width = W; rtaCanvas.height = H; rtaGrad = null; }
      const c = rtaCanvas.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      if (empty) return;

      const left = 32, top = 8, bottom = 18;
      const plotW = w - left - 4, plotH = h - top - bottom;
      const yOf = (db) => top + plotH * (1 - Math.max(0, Math.min(1, (db - RTA_MIN_DB) / (RTA_MAX_DB - RTA_MIN_DB))));

      // dB grid
      c.font = '10px ui-monospace, Consolas, monospace';
      c.lineWidth = 1;
      c.strokeStyle = '#1b2533';
      c.fillStyle = '#64748b';
      [-80, -60, -40, -20, 0].forEach(db => {
        const y = Math.round(yOf(db)) + 0.5;
        c.beginPath(); c.moveTo(left, y); c.lineTo(w - 4, y); c.stroke();
        c.fillText(String(db), 4, y + 3);
      });

      if (!rtaGrad || rtaGradH !== h) {
        rtaGrad = c.createLinearGradient(0, top + plotH, 0, top);
        rtaGrad.addColorStop(0, '#2a4f9a');
        rtaGrad.addColorStop(0.6, '#4f8cff');
        rtaGrad.addColorStop(1, '#a8c7ff');
        rtaGradH = h;
      }

      const n = bands.length;
      const slot = plotW / n;
      const bw = Math.max(1, slot - (slot > 4 ? 1.5 : 0.5));
      const af = alerts.map(a => +a.freq_hz).filter(Number.isFinite);
      const base = top + plotH;
      c.fillStyle = rtaGrad;
      const hot = [];
      for (let i = 0; i < n; i++) {
        const b = bands[i];
        const cf = +b.center_freq;
        const y = yOf(+b.level_dbfs);
        let isAlert = false;
        for (let k = 0; k < af.length; k++) if (Math.abs(af[k] - cf) < cf * 0.08) { isAlert = true; break; }
        if (isAlert) { hot.push([i, y]); continue; }
        if (base - y > 0.5) c.fillRect(left + i * slot, y, bw, base - y);
      }
      if (hot.length) {
        c.fillStyle = '#ef4444';
        hot.forEach(([i, y]) => c.fillRect(left + i * slot, y, bw, base - y));
      }

      // Frequency labels (positions cached per band layout)
      const key = `${n}:${bands[0].center_freq}:${bands[n - 1].center_freq}`;
      if (rtaLabelCache.key !== key) {
        const marks = [];
        [100, 250, 1000, 2500, 10000].forEach(target => {
          let best = -1, bestD = Infinity;
          for (let i = 0; i < n; i++) {
            const d = Math.abs(Math.log(+bands[i].center_freq / target));
            if (d < bestD) { bestD = d; best = i; }
          }
          if (best >= 0 && bestD < 0.15) marks.push([best, target >= 1000 ? `${target / 1000}k` : String(target)]);
        });
        rtaLabelCache = { key, marks };
      }
      c.fillStyle = '#64748b';
      rtaLabelCache.marks.forEach(([i, label]) => c.fillText(label, left + i * slot - 6, h - 5));

      // Feedback markers
      if (af.length) {
        c.fillStyle = '#ff8a8a';
        c.strokeStyle = 'rgba(239,68,68,0.6)';
        c.setLineDash([3, 3]);
        af.slice(0, 3).forEach(f => {
          let best = 0, bestD = Infinity;
          for (let i = 0; i < n; i++) { const d = Math.abs(Math.log(+bands[i].center_freq / f)); if (d < bestD) { bestD = d; best = i; } }
          const x = Math.round(left + best * slot + bw / 2) + 0.5;
          c.beginPath(); c.moveTo(x, top); c.lineTo(x, base); c.stroke();
          const label = `Hú ${fmt.hz(f)}`;
          const tx = Math.min(x + 4, w - c.measureText(label).width - 4);
          c.fillText(label, tx, top + 10);
        });
        c.setLineDash([]);
      }
    }

    function updateMode(t) {
      const ro = !!t.read_only_mode;
      if (ro === lastRO) return;
      lastRO = ro;
      modeEl.innerHTML = ro
        ? `<span title="Mixer đang ở chế độ chỉ đọc: vẫn tạo được đề xuất nhưng Safety Gate sẽ từ chối ghi.">${badge('Chỉ đọc', 'info')}</span>`
        : `<span title="Mixer cho phép ghi sau khi bạn duyệt.">${badge('Cho phép ghi', 'warn')}</span>`;
    }

    // ---------- Feedback alert banner ----------
    function updateFeedback(alerts) {
      const now = performance.now();
      if (alerts.length) {
        lastAlertTs = now;
        currentAlerts = alerts.slice(0, 3);
        const key = currentAlerts.map(a => `${a.channel_id}@${Math.round(+a.freq_hz / 10)}`).join('|');
        if (key !== alertKey) { alertKey = key; renderFeedbackBanner(alerts.length); }
        else {
          currentAlerts.forEach((a, i) => {
            const elc = fbEl.querySelector(`[data-conf="${i}"]`);
            if (elc) elc.textContent = fmt.pct(a.confidence ?? 0);
          });
        }
        if (fbEl.hidden) fbEl.hidden = false;
      } else if (!fbEl.hidden && now - lastAlertTs > ALERT_HOLD_MS) {
        fbEl.hidden = true;
        alertKey = '';
        currentAlerts = [];
      }
    }

    function renderFeedbackBanner(total) {
      const rows = currentAlerts.map((a, i) => {
        const f = +a.freq_hz;
        const [sevText, sevKind] = SEVERITY[String(a.severity || '').toUpperCase()] || ['Nguy cơ', 'warn'];
        const ev = (a.evidence || []).filter(Boolean);
        return `
          <div class="row-between" style="align-items:flex-start">
            <div class="grow stack-sm" style="gap:4px">
              <div class="row">
                <strong>Nguy cơ hú ở ${esc(fmt.hz(f))}</strong>
                ${badge(fmt.ch(a.channel_id), 'info')} ${badge(sevText, sevKind)}
                <span class="small muted">Độ tin cậy <span data-conf="${i}">${esc(fmt.pct(a.confidence ?? 0))}</span>${a.level_dbfs !== undefined ? ` · mức ${esc(fmt.num(a.level_dbfs))} dBFS` : ''}</span>
              </div>
              <div class="small text-2">Thuộc ${esc(freqZone(f))}.${ev.length ? ` Căn cứ: ${esc(ev.join(' · '))}.` : ''}</div>
              ${a.recommended_action ? `<div class="small muted">Gợi ý hệ thống: ${esc(a.recommended_action)}</div>` : ''}
            </div>
            <button class="btn btn-danger btn-sm" data-notch="${i}">${icon('scissors')}Tạo đề xuất cắt hú</button>
          </div>`;
      }).join('<hr style="border:0;border-top:1px solid rgba(239,68,68,.3);margin:4px 0">');
      fbEl.innerHTML = callout('bad', `
        <div class="stack-sm">
          ${rows}
          ${total > currentAlerts.length ? `<div class="small muted">… và ${total - currentAlerts.length} tần số khác.</div>` : ''}
          <div class="small muted">Trước khi cắt EQ: kiểm tra hướng mic, khoảng cách tới loa monitor và gain. Không có cách nào bảo đảm hết hú hoàn toàn.</div>
        </div>`, 'alert');
    }

    fbEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-notch]');
      if (!btn) return;
      const a = currentAlerts[+btn.dataset.notch];
      if (!a) return;
      const snap = { channel_id: +a.channel_id, freq_hz: +a.freq_hz, confidence: +(a.confidence ?? 0.88) };
      const data = await withLoading(btn, () => api.post('/api/v1/proposals/generate-notch', snap),
        { errorPrefix: 'Không tạo được đề xuất cắt hú: ' });
      if (!data || disposed) return;
      showNotchProposal(data, snap);
    });

    function showNotchProposal(data, snap) {
      notchEl.hidden = false;
      notchEl.innerHTML = card({
        title: `${icon('scissors')} Đề xuất cắt hú — ${esc(fmt.ch(data.target_channel ?? snap.channel_id))} @ ${esc(fmt.hz(snap.freq_hz))}`,
        sub: 'Bộ lọc notch Q≈7.0 (cắt rất hẹp), sâu khoảng −3.5 dB: chỉ hạ đúng tần số hú, giọng gần như không đổi.',
        cls: 'bad',
        actions: `<button class="btn btn-ghost btn-sm" data-close-notch>${icon('x')}Đóng</button>`,
        body: '<div class="stack-sm"><div data-curve></div><div data-prop></div></div>',
      });
      $('[data-close-notch]', notchEl).addEventListener('click', () => { notchEl.hidden = true; notchEl.innerHTML = ''; });
      mountCurve($('[data-curve]', notchEl), data.tuning_detail?.simulated_curve, 120);
      renderProposal($('[data-prop]', notchEl), data, {
        title: 'Cắt hú (notch)',
        note: 'Ưu tiên xử lý vật lý trước (hướng mic, vị trí monitor). Notch chỉ là biện pháp bổ sung.',
        onApplied: () => { $('[data-curve]', notchEl).innerHTML = ''; loadAll({ quiet: true }); },
        onDismiss: () => { notchEl.hidden = true; notchEl.innerHTML = ''; },
      });
    }

    // ---------- A/B curve (legacy drawABCurve) ----------
    function mountCurve(container, curve, height = 140) {
      if (!container) return;
      if (!Array.isArray(curve) || !curve.length) { container.innerHTML = ''; return; }
      container.innerHTML = `
        <div class="rta-wrap" style="height:${height}px"><canvas aria-label="Đáp tuyến EQ trước và sau"></canvas></div>
        <div class="row small muted mt-8">
          <span class="row" style="gap:6px"><span style="display:inline-block;width:16px;border-top:2px dashed #64748b"></span>A · hiện tại (phẳng)</span>
          <span class="row" style="gap:6px"><span style="display:inline-block;width:16px;border-top:2px solid #2fbf71"></span>B · sau khi áp dụng (mô phỏng)</span>
        </div>`;
      const canvas = $('canvas', container);
      const n = curve.length;
      const pts = curve.map((p, i) => ({
        freq: Number.isFinite(+p.freq) ? +p.freq : 20 * Math.pow(1000, n > 1 ? i / (n - 1) : 0),
        db: +p.response_db || 0,
      }));
      const series = [
        { points: pts.map(p => ({ freq: p.freq, db: 0 })), color: '#64748b', width: 1.5, dash: [4, 4] },
        { points: pts, color: '#2fbf71', width: 2 },
      ];
      const draw = () => { if (canvas.isConnected) drawCurve(canvas, series, { minDb: -18, maxDb: 18 }); else curveRedraws.delete(draw); };
      curveRedraws.add(draw);
      requestAnimationFrame(draw);
    }

    let resizeRaf = 0;
    const onResize = () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => { resizeRaf = 0; curveRedraws.forEach(fn => fn()); if (store.telemetry) { pending = store.telemetry; scheduleFrame(); } });
    };
    window.addEventListener('resize', onResize);

    // ---------- EQ role proposal (legacy generateProposalForRole) ----------
    function roleOptions(selected) {
      return ROLES.map(([v, l]) => `<option value="${v}" ${v === selected ? 'selected' : ''}>${esc(l)}</option>`).join('');
    }
    function fillChannelSelect() {
      const sel = $('#lvEqCh', root);
      const cur = sel.value || '1';
      sel.innerHTML = channels.map(c => `<option value="${+c.channel}">${esc(fmt.ch(c.channel))} · ${esc(c.name || '')}</option>`).join('');
      sel.value = chById(cur) ? cur : String(channels[0]?.channel ?? 1);
    }
    $('#lvEqCh', root).addEventListener('change', (e) => {
      const ch = chById(e.target.value);
      const r = eqRoleFor(ch?.church_role);
      if (r) $('#lvEqRole', root).value = r;
    });

    async function generateRole(channelId, role, btn, resultEl, curveEl) {
      if (+channelId === talkbackCh) {
        const ok = await confirmDialog({
          title: 'Kênh talkback được bảo vệ',
          message: `${esc(fmt.ch(channelId))} là talkback ban nhạc (DL16 #11), chỉ đi P16. Vẫn tạo đề xuất EQ cho kênh này?`,
          confirmText: 'Vẫn tạo',
        });
        if (!ok) return;
      }
      const data = await withLoading(btn, () => api.post('/api/v1/proposals/generate-role', { channel_id: +channelId, role }),
        { errorPrefix: 'Không tạo được đề xuất EQ: ' });
      if (!data || disposed) return;
      renderEqResult(data, resultEl, curveEl);
    }

    function renderEqResult(data, resultEl, curveEl) {
      const d = data.tuning_detail || {};
      const bands = d.bands || [];
      mountCurve(curveEl, d.simulated_curve);
      const items = [];
      if (+d.hpf_freq_hz > 0) {
        items.push(`<li><strong>Lọc cắt trầm (HPF) ${esc(fmt.hz(d.hpf_freq_hz))}</strong> — bỏ tiếng ù, tiếng bước chân và rung sàn bên dưới tần số này.</li>`);
      }
      bands.forEach(b => {
        const q = +b.q;
        items.push(`<li><strong>Dải ${esc(b.band)}: ${esc(gainWord(+b.gain_db))} ${esc(signed(b.gain_db))} dB tại ${esc(fmt.hz(b.freq_hz))}</strong>,
          Q=${esc(fmt.num(q))} (${esc(qLabel(q))})${b.rationale ? ` — ${esc(b.rationale)}` : ''}</li>`);
      });
      resultEl.innerHTML = `
        <div class="stack-sm">
          <div class="row">${badge(ROLE_LABEL[d.role] || d.role || 'EQ', 'info')}<span class="small muted mono">${esc(data.proposal_id || '')}</span></div>
          ${items.length ? `<div><div class="label">Vì sao đề xuất như vậy</div><ul class="small text-2" style="margin:6px 0 0;padding-left:18px">${items.join('')}</ul></div>` : ''}
          <div data-prop></div>
        </div>`;
      renderProposal($('[data-prop]', resultEl), data, {
        title: `EQ cho ${ROLE_LABEL[d.role] || 'kênh'}`,
        onApplied: () => { if (curveEl) curveEl.innerHTML = ''; loadAll({ quiet: true }); },
        onDismiss: () => { if (curveEl) curveEl.innerHTML = ''; resultEl.innerHTML = emptyState('Đã bỏ qua đề xuất.'); },
      });
    }

    $('#lvEqGen', root).addEventListener('click', (e) =>
      generateRole($('#lvEqCh', root).value || 1, $('#lvEqRole', root).value || 'PASTOR_SPEECH', e.currentTarget, $('#lvEqResult', root), $('#lvEqCurve', root)));
    $('#lvEqPastor', root).addEventListener('click', (e) => {
      if (chById(1)) $('#lvEqCh', root).value = '1';
      $('#lvEqRole', root).value = 'PASTOR_SPEECH';
      generateRole(1, 'PASTOR_SPEECH', e.currentTarget, $('#lvEqResult', root), $('#lvEqCurve', root));
    });

    // ---------- Channel drawer (legacy openChannelDetail) ----------
    function openChannelDrawer(n) {
      const ch = chById(n);
      if (!ch) { toast(`Không tìm thấy ${fmt.ch(n)}.`, 'warn'); return; }
      if (drawer) drawer.close();
      const body = document.createElement('div');
      body.className = 'stack';
      body.innerHTML = `
        <div data-info></div>
        <div>
          <div class="tabs" role="tablist">
            <button class="active" data-tab="eq" role="tab">EQ theo vai trò</button>
            <button data-tab="gain" role="tab">Gain staging</button>
            <button data-tab="bleed" role="tab">Bleed &amp; expander</button>
          </div>
          <div data-pane="eq"></div>
          <div data-pane="gain" hidden></div>
          <div data-pane="bleed" hidden></div>
        </div>
        <div class="row small">
          <span class="muted">Quy trình liên quan:</span>
          <button class="btn btn-ghost btn-sm" data-go="3">${icon('mic')}Cân chỉnh vocal (W3)</button>
          <button class="btn btn-ghost btn-sm" data-go="5">${icon('alert')}Dò hú tập dượt (W5)</button>
        </div>`;
      const dlg = openDialog({
        title: `${esc(fmt.ch(n))} · ${esc(ch.name || '')}`,
        body,
        drawer: true,
        onClose: () => { if (drawer && drawer.dlg === dlg) drawer = null; },
      });
      drawer = { ch: n, dlg, close: dlg.close, body, levelEl: null, lastText: '', loaded: new Set() };
      refreshDrawerInfo();

      const tabs = $('.tabs', body);
      tabs.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tab]');
        if (!b) return;
        tabs.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('active', x === b));
        body.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== b.dataset.tab; });
        loadPane(b.dataset.tab);
      });
      body.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
        dlg.close();
        ctx.navigate('wizards', { w: b.dataset.go, ch: String(n) });
      }));
      loadPane('eq');
    }

    function refreshDrawerInfo() {
      if (!drawer) return;
      const ch = chById(drawer.ch);
      const info = $('[data-info]', drawer.body);
      if (!ch || !info) return;
      const n = +ch.channel;
      const prot = n === talkbackCh;
      const on = isOn(ch);
      const hpOn = +ch.hpon === 1 || ch.hpon === true;
      const eqOn = +ch.eq_on === 1 || ch.eq_on === true;
      const route = prot ? badge('Chỉ P16 (bảo vệ)', 'warn')
        : ch.is_foh && ch.is_p16 ? badge('FOH + P16', 'ok')
          : ch.is_foh ? badge('FOH', 'ok')
            : ch.is_p16 ? badge('Chỉ P16', 'info') : badge('Không ra FOH', 'info');
      const bands = ch.eq_bands || [];
      info.innerHTML = `
        <div class="stack">
          ${prot ? callout('warn', `<strong>Kênh talkback ban nhạc (DL16 #11).</strong> Tín hiệu này chỉ được gửi về tai nghe P16 của ban nhạc, tuyệt đối không ra loa hội trường (FOH).`, 'shield') : ''}
          ${prot && ch.is_foh ? callout('bad', `<strong>Vi phạm an toàn:</strong> kênh talkback đang được định tuyến ra FOH. Kiểm tra ngay ở trang <a href="#/safety">An toàn &amp; nhật ký</a>.`) : ''}
          <div class="row">${route}${ch.church_role ? badge(ROLE_LABEL[String(ch.church_role).toUpperCase()] || ch.church_role, 'info') : ''}${!on ? badge('Đang mute', 'bad') : ''}</div>
          <div class="grid-2">
            <div class="stat"><div class="stat-label">Mức tín hiệu</div><div class="stat-value" style="font-size:18px" data-level>—</div><div class="stat-sub">Đo trực tiếp ~10 lần/giây</div></div>
            <div class="stat"><div class="stat-label">Fader</div><div class="stat-value" style="font-size:18px">${esc(Number.isFinite(+ch.fader) ? `${Math.round(+ch.fader * 100)}%` : '—')}</div><div class="stat-sub">${esc(faderText(ch.fader))}</div></div>
            <div class="stat"><div class="stat-label">Lọc cắt trầm (HPF)</div><div class="stat-value" style="font-size:18px">${hpOn ? esc(fmt.hz(x32Hpf(ch.hpf))) : 'Tắt'}</div><div class="stat-sub">${hpOn ? 'Cắt bỏ tiếng ù, rung sàn phía dưới' : 'Không lọc tần số thấp'}</div></div>
            <div class="stat"><div class="stat-label">Tiếng (mute)</div>
              <div class="row-between mt-8">
                <span class="strong ${on ? 'ok-text' : 'bad-text'}">${on ? 'Đang mở' : 'Đang tắt tiếng'}</span>
                <button class="btn btn-sm ${on ? 'btn-danger' : 'btn-ok'}" data-mute>${icon(on ? 'micOff' : 'mic')}${on ? 'Mute kênh' : 'Mở tiếng'}</button>
              </div>
            </div>
          </div>
          <div>
            <div class="row-between"><div class="label">EQ 4 dải hiện tại</div>${badge(eqOn ? 'EQ đang bật' : 'EQ đang tắt', eqOn ? 'ok' : 'info')}</div>
            ${bands.length ? `
            <div class="table-wrap"><table class="table">
              <thead><tr><th>Dải</th><th class="right">Tần số</th><th class="right">Mức</th><th class="right">Độ rộng</th></tr></thead>
              <tbody>${bands.map((b, i) => {
                const g = x32Gain(b.gain), q = x32Q(b.q);
                return `<tr>
                  <td>${esc(b.band)} · ${esc(BAND_NAMES[i] || 'PEQ')}</td>
                  <td class="right mono">${esc(fmt.hz(x32Freq(b.f)))}</td>
                  <td class="right mono ${g < -0.05 ? 'text-2' : g > 0.05 ? 'warn-text' : 'muted'}">${esc(signed(g))} dB <span class="small muted">(${gainWord(g)})</span></td>
                  <td class="right mono">Q=${esc(q.toFixed(1))} <span class="small muted">(${qLabel(q)})</span></td>
                </tr>`;
              }).join('')}</tbody>
            </table></div>` : emptyState('Không đọc được EQ của kênh này.')}
          </div>
          <dl class="kv">
            <dt>Ra loa hội trường (FOH)</dt><dd>${ch.is_foh ? 'Có' : 'Không'}${ch.mix_st !== undefined ? ` <span class="small muted">(gán Main LR: ${+ch.mix_st ? 'bật' : 'tắt'})</span>` : ''}</dd>
            <dt>Ra tai nghe P16</dt><dd>${ch.is_p16 ? `Có${(ch.p16_slots || []).length ? ` — kênh P16: ${esc(ch.p16_slots.join(', '))}` : ''}` : 'Không'}</dd>
          </dl>
        </div>`;
      drawer.levelEl = $('[data-level]', info);
      drawer.lastText = '';
      $('[data-mute]', info).addEventListener('click', (e) => toggleMute(ch, e.currentTarget));
    }

    async function toggleMute(ch, btn) {
      const n = +ch.channel;
      const target = isOn(ch) ? 0 : 1;
      const ok = await confirmDialog({
        title: target ? `Mở tiếng ${fmt.ch(n)}?` : `Mute ${fmt.ch(n)}?`,
        message: `${esc(ch.name || fmt.ch(n))} sẽ ${target ? '<strong>mở tiếng</strong> trở lại' : '<strong>tắt tiếng</strong> ngay lập tức'} trên mixer.
          ${n === talkbackCh ? '<br>Đây là kênh talkback ban nhạc — thay đổi chỉ ảnh hưởng P16.' : ''}
          <br>Người thực hiện: <strong>${esc(getOperator())}</strong>.`,
        confirmText: target ? 'Mở tiếng' : 'Mute',
        danger: !target,
      });
      if (!ok) return;
      const res = await withLoading(btn, () => api.post(`/api/v1/channels/${n}/mute`, { on: target, operator_id: getOperator() }),
        { errorPrefix: 'Không đổi được trạng thái mute: ' });
      if (!res || disposed) return;
      const c = chById(n);
      if (c) c.on = res.on ?? target;
      const ref = strips.get(n);
      if (ref && c) updateStripStatic(ref, c);
      if (drawer && drawer.ch === n) refreshDrawerInfo();
      toast(`${fmt.ch(n)}: ${(res.on ?? target) ? 'đã mở tiếng' : 'đã mute'} (đã xác minh).`, 'ok');
      loadAll({ quiet: true });
    }

    function loadPane(tab) {
      if (!drawer || drawer.loaded.has(tab)) return;
      drawer.loaded.add(tab);
      const pane = $(`[data-pane="${tab}"]`, drawer.body);
      const n = drawer.ch;
      if (tab === 'eq') renderEqPane(pane, n);
      else if (tab === 'gain') renderGainPane(pane, n);
      else if (tab === 'bleed') renderBleedPane(pane, n);
    }

    function renderEqPane(pane, n) {
      const ch = chById(n);
      const def = eqRoleFor(ch?.church_role) || 'PASTOR_SPEECH';
      pane.innerHTML = `
        <div class="stack-sm">
          <p class="small text-2">Tạo EQ khởi điểm an toàn theo loại nguồn âm. Bạn xem trước đáp tuyến rồi mới quyết định.</p>
          <div class="row">
            <select class="select grow" data-role name="drawerRole" aria-label="Vai trò nguồn âm" style="width:auto">${roleOptions(def)}</select>
            <button class="btn btn-primary" data-gen>${icon('wand')}Tạo đề xuất</button>
          </div>
          <div data-curve></div>
          <div data-result></div>
        </div>`;
      $('[data-gen]', pane).addEventListener('click', (e) =>
        generateRole(n, $('[data-role]', pane).value, e.currentTarget, $('[data-result]', pane), $('[data-curve]', pane)));
    }

    async function renderGainPane(pane, n) {
      pane.innerHTML = loadingRows(4);
      let r;
      try { r = await api.get(`/api/v1/gain-staging/${n}`); } catch (e) {
        if (!pane.isConnected) return;
        pane.innerHTML = `${errorBox(e)}<div class="mt-8"><button class="btn btn-sm" data-retry>${icon('refresh')}Thử lại</button></div>`;
        $('[data-retry]', pane).addEventListener('click', () => renderGainPane(pane, n));
        return;
      }
      if (!pane.isConnected) return;
      const [hText, hKind, barKind] = HEALTH[r.health_status] || [r.health_status || '—', 'info', ''];
      const pct = Math.min(100, Math.max(0, ((+r.peak_dbfs + 40) / 40) * 100));
      const delta = +r.recommended_trim_delta_db || 0;
      pane.innerHTML = `
        <div class="stack-sm">
          <div class="row-between"><strong>Headroom &amp; mức vào</strong>${badge(hText, hKind)}</div>
          <div class="grid-3">
            <div class="stat"><div class="stat-label">Đỉnh (peak)</div><div class="stat-value" style="font-size:18px">${esc(signed(r.peak_dbfs))}</div><div class="stat-sub">dBFS · mục tiêu ${esc(signed(r.target_peak_dbfs))}</div></div>
            <div class="stat"><div class="stat-label">Trung bình (RMS)</div><div class="stat-value" style="font-size:18px">${esc(signed(r.rms_dbfs))}</div><div class="stat-sub">dBFS · crest ${esc(fmt.num(r.crest_factor_db))} dB</div></div>
            <div class="stat"><div class="stat-label">Khoảng dự trữ</div><div class="stat-value" style="font-size:18px">${esc(fmt.num(r.headroom_db))} dB</div><div class="stat-sub">trước khi bị méo (clip)</div></div>
          </div>
          <div class="bar ${barKind}" title="Đỉnh tín hiệu trên thang −40…0 dBFS"><span style="width:${pct.toFixed(0)}%"></span></div>
          ${r.advice_vi ? callout('info', esc(r.advice_vi)) : ''}
          <dl class="kv">
            <dt>Trim hiện tại</dt><dd class="mono">${esc(signed(r.current_trim_db))} dB</dd>
            <dt>Trim đề xuất</dt><dd class="mono">${esc(signed(r.proposed_trim_db))} dB <span class="small muted">(${delta > 0 ? 'tăng' : delta < 0 ? 'giảm' : 'giữ nguyên'} ${esc(fmt.num(Math.abs(delta)))} dB)</span></dd>
          </dl>
          <div class="row">
            <button class="btn btn-primary" data-propose>${icon('sliders')}Tạo đề xuất chỉnh trim</button>
            <button class="btn btn-ghost btn-sm" data-reload>${icon('refresh')}Đo lại</button>
          </div>
          ${Math.abs(delta) < 0.1 ? '<p class="small muted">Mức vào đã gần mục tiêu — thường không cần chỉnh.</p>' : ''}
          <div data-prop></div>
        </div>`;
      $('[data-reload]', pane).addEventListener('click', () => renderGainPane(pane, n));
      $('[data-propose]', pane).addEventListener('click', async (e) => {
        const data = await withLoading(e.currentTarget, () => api.post(`/api/v1/gain-staging/${n}/propose-trim`),
          { errorPrefix: 'Không tạo được đề xuất trim: ' });
        if (!data || !pane.isConnected) return;
        renderProposal($('[data-prop]', pane), data, {
          title: 'Chỉnh digital trim',
          note: 'Trim thay đổi mức vào của cả kênh (ảnh hưởng FOH, monitor và livestream). Chỉ áp dụng khi người nói/hát đang ở mức bình thường.',
          onApplied: () => loadAll({ quiet: true }),
        });
      });
    }

    async function renderBleedPane(pane, n) {
      if (n === talkbackCh || n === DEFAULT_TALKBACK_CH) {
        pane.innerHTML = callout('warn', `<strong>Không áp dụng cho kênh này.</strong> ${esc(fmt.ch(n))} là kênh talkback được bảo vệ — hệ thống không phân tích rò âm hay đặt expander/gate cho kênh này.`, 'shield');
        return;
      }
      pane.innerHTML = loadingRows(4);
      let r;
      try { r = await api.get(`/api/v1/bleed-analysis/${n}`); } catch (e) {
        if (!pane.isConnected) return;
        pane.innerHTML = `${errorBox(e)}<div class="mt-8"><button class="btn btn-sm" data-retry>${icon('refresh')}Thử lại</button></div>`;
        $('[data-retry]', pane).addEventListener('click', () => renderBleedPane(pane, n));
        return;
      }
      if (!pane.isConnected) return;
      const [riskText, riskKind] = COMB_RISK[r.comb_filtering_risk] || [r.comb_filtering_risk || '—', 'info'];
      const x = r.recommended_expander || r.expander_settings || {};
      const src = r.bleed_source_name || r.dominant_bleed_source;
      const floor = r.ambient_noise_floor_dbfs ?? r.estimated_noise_floor_dbfs;
      const advice = r.advice_vi || r.tactical_advice_vi;
      pane.innerHTML = `
        <div class="stack-sm">
          <div class="row-between"><strong>Rò âm sân khấu vào mic</strong><span class="row" style="gap:6px"><span class="small muted">Nguy cơ méo pha (comb):</span>${badge(riskText, riskKind)}</span></div>
          <div class="grid-3">
            <div class="stat"><div class="stat-label">Nguồn rò chính</div><div class="stat-value" style="font-size:15px">${esc(src || 'Không đáng kể')}</div><div class="stat-sub">${r.bleed_source_channel_id ? esc(fmt.ch(r.bleed_source_channel_id)) : ''}</div></div>
            <div class="stat"><div class="stat-label">Mức rò so với giọng</div><div class="stat-value" style="font-size:18px">${esc(signed(r.relative_bleed_level_db))} dB</div><div class="stat-sub">càng âm càng ít rò</div></div>
            <div class="stat"><div class="stat-label">Tiếng nền</div><div class="stat-value" style="font-size:18px">${esc(fmt.num(floor))}</div><div class="stat-sub">dBFS khi không nói</div></div>
          </div>
          <dl class="kv">
            <dt>Tương quan với nguồn rò</dt><dd class="mono">${esc(fmt.num(r.correlation_coeff, 2))} <span class="small muted">(${esc(PHASE[r.phase_alignment_status] || r.phase_alignment_status || '—')})</span></dd>
          </dl>
          ${advice ? callout('info', esc(advice)) : ''}
          <div>
            <div class="label">Expander đề xuất (hạ nhẹ khi không nói, không cắt cứng như gate)</div>
            <dl class="kv mt-8">
              <dt>Ngưỡng</dt><dd class="mono">${esc(fmt.num(x.threshold_dbfs ?? x.threshold_db))} dBFS <span class="small muted">— dưới mức này mic được hạ xuống</span></dd>
              <dt>Mức hạ</dt><dd class="mono">${esc(fmt.num(x.range_db))} dB <span class="small muted">— hạ nhẹ, vẫn nghe tự nhiên</span></dd>
              <dt>Attack / Hold / Release</dt><dd class="mono">${esc(fmt.num(x.attack_ms, 0))} / ${esc(fmt.num(x.hold_ms, 0))} / ${esc(fmt.num(x.release_ms, 0))} ms</dd>
              <dt>Lọc sidechain</dt><dd class="mono">${x.filter_on === false ? 'Tắt' : esc(fmt.hz(x.filter_freq_hz ?? x.sidechain_filter_freq_hz))} <span class="small muted">— bỏ qua tiếng trống/rung sàn khi quyết định mở</span></dd>
            </dl>
          </div>
          <div class="row">
            <button class="btn btn-primary" data-propose>${icon('sliders')}Tạo đề xuất expander</button>
            <button class="btn btn-ghost btn-sm" data-reload>${icon('refresh')}Phân tích lại</button>
          </div>
          <p class="small muted">Ưu tiên chỉnh vị trí mic và monitor trước; expander chỉ giảm phần rò còn lại.</p>
          <div data-prop></div>
        </div>`;
      $('[data-reload]', pane).addEventListener('click', () => renderBleedPane(pane, n));
      $('[data-propose]', pane).addEventListener('click', async (e) => {
        const data = await withLoading(e.currentTarget, () => api.post(`/api/v1/bleed-analysis/${n}/propose-expander`),
          { errorPrefix: 'Không tạo được đề xuất expander: ' });
        if (!data || !pane.isConnected) return;
        const box = $('[data-prop]', pane);
        if (!data.proposal) { box.innerHTML = callout('ok', 'Hệ thống không thấy cần thay đổi expander cho kênh này.'); return; }
        renderProposal(box, data.proposal, { title: 'Downward expander', onApplied: () => loadAll({ quiet: true }) });
      });
    }

    // ---------- Wire up & initial load ----------
    $('#lvRefresh', root).addEventListener('click', (e) => withLoading(e.currentTarget, async () => {
      const ok = await loadAll();
      if (ok) toast('Đã cập nhật trạng thái 32 kênh.', 'ok');
    }));

    loadAll().then((ok) => {
      if (!ok || disposed) return;
      const want = +ctx.params?.get('ch');
      if (want >= 1 && want <= 32) openChannelDrawer(want);
    });
    if (pending) scheduleFrame();

    // ---------- Cleanup ----------
    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      raf = 0; resizeRaf = 0;
      unsubs.forEach(u => u());
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('resize', onResize);
      curveRedraws.clear();
      if (drawer) { const d = drawer; drawer = null; d.close(); }
    };
  },
};
