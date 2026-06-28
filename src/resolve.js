const C = $('Constants').first().json;
const STATUS_LABEL = C.STATUS_LABEL, ICON = C.ICON, LABEL_TOKEN = C.LABEL_TOKEN, TOKEN_LABEL = C.TOKEN_LABEL, REACTION = C.REACTION, STATUS_SYNONYMS = C.STATUS_SYNONYMS, CATS = C.CATS, HELP = C.HELP;
const CAT_BY_KEY = {}; CATS.forEach(c => { CAT_BY_KEY[c.key] = c; });
function catOf(r){ const k = String((r && r.category) || '').trim(); return CAT_BY_KEY[k] ? k : 'general'; }
function catLabel(key){ const c = CAT_BY_KEY[key] || CAT_BY_KEY.general; return c.emoji + ' ' + c.label; }

function norm(s){ var x = String(s == null ? '' : s).toLowerCase();
  x = x.replace(/[֑-ׇ]/g, '');
  x = x.replace(/[.,!?:;()\[\]"'׳״«»`-]/g, ' ');
  x = x.replace(/\s+/g, ' ').trim();
  return x; }
function trunc(s, n){ s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function nowIso(){ return new Date().toISOString(); }
function updateRowOf(r, opts){ return { task_id: r.task_id, task: (opts.task != null ? opts.task : r.task), status: (opts.status != null ? opts.status : r.status), category: (opts.category != null ? opts.category : catOf(r)), updated_at: nowIso() }; }
function detectCategory(t){ const tn = norm(t); let best = null; for (const c of CATS){ if (c.key === 'general') continue; for (const w of c.words){ const wn = norm(w); if (!wn) continue; const isWord = (' ' + tn + ' ').indexOf(' ' + wn + ' ') >= 0; const isSub = tn.indexOf(wn) >= 0; if (isWord || isSub){ const score = (isWord ? 100 : 0) + wn.length; if (!best || score > best.score) best = { key: c.key, score: score }; } } } return best ? best.key : 'general'; }
function matchCatByName(name){ const nn = norm(name); if (!nn) return null; for (const c of CATS){ if (norm(c.label) === nn || norm(c.key) === nn) return c.key; } for (const c of CATS){ if (c.key === 'general') continue; for (const w of c.words){ if (norm(w) === nn) return c.key; } } for (const c of CATS){ if (nn.length >= 2 && norm(c.label).indexOf(nn) >= 0) return c.key; } return null; }

const P = $('Parse Update').first().json;
const upd = P.update || {};
const chatId = String(P.chatId || '');

let rows = $input.all().map(i => i.json).filter(r => r && r.task_id);
rows.sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
rows.forEach((r, i) => { r._n = i + 1; });
const active = rows.filter(r => r.status !== 'בוצע' && r.status !== 'בוטל');
const byId = (id) => rows.find(r => String(r.task_id) === String(id));
function reactFor(r, status){ const mid = r && r.msg_id; if (!mid) return null; const emoji = REACTION[status]; if (!emoji) return null; return { chat_id: chatId, message_id: Number(mid), reaction: [{ type: 'emoji', emoji: emoji }] }; }

function statusRank(r){ if (r.status === 'בוצע') return 1; if (r.status === 'בוטל') return 2; return 0; }
function orderRows(vr){ const out = []; CATS.forEach(c => { const inC = vr.filter(r => catOf(r) === c.key); inC.sort((a, b) => statusRank(a) - statusRank(b) || (a._n - b._n)); for (const r of inC) out.push(r); }); return out; }

function listText(vr){
  if (!vr.length) return '📋 אין משימות כרגע.\n\n➕ כדי להוסיף, פשוט כתוב מה צריך לעשות — למשל: "להתקשר לרופא".';
  const ord = orderRows(vr);
  const lines = []; let curCat = null;
  ord.forEach(r => { const ck = catOf(r); if (ck !== curCat){ curCat = ck; lines.push((lines.length ? '\n' : '') + catLabel(ck)); } lines.push('#' + r._n + '  ' + (ICON[r.status] || '•') + '  ' + CAT_BY_KEY[ck].emoji + '  ' + r.task); });
  const done = vr.filter(r => r.status === 'בוצע').length;
  const canceled = vr.filter(r => r.status === 'בוטל').length;
  const act = vr.length - done - canceled;
  return '📋 המשימות שלך (' + vr.length + ')\n\n' + lines.join('\n') + '\n\n⏳ פעילות: ' + act + ' · ✅ בוצעו: ' + done + ' · ❌ בוטלו: ' + canceled + '\n\n👇 בחר משימה כדי לעדכן אותה:';
}
function listKb(vr){
  const ord = orderRows(vr);
  const kb = ord.slice(0, 40).map(r => [{ text: '#' + r._n + ' ' + CAT_BY_KEY[catOf(r)].emoji + ' ' + (ICON[r.status] || '•') + ' ' + trunc(r.task, 24), callback_data: 'card|' + r.task_id }]);
  kb.push([{ text: '🔄 רענון', callback_data: 'refresh' }, { text: '🗑 מחק מסומנים', callback_data: 'delmarked' }]);
  return { inline_keyboard: kb };
}
function cardText(r){
  return '📌 משימה #' + r._n + '\n' + catLabel(catOf(r)) + '  ·  ' + (ICON[r.status] || '') + ' ' + r.status + '\n\n📝 ' + r.task;
}
function cardKb(r){
  return { inline_keyboard: [
    [ { text: '✅ בוצע', callback_data: 'st|done|' + r.task_id }, { text: '🔄 בתהליך', callback_data: 'st|process|' + r.task_id } ],
    [ { text: '❓ צריך חידוד', callback_data: 'st|clarify|' + r.task_id }, { text: '❌ בטל', callback_data: 'st|cancel|' + r.task_id } ],
    [ { text: '✏️ שם', callback_data: 'edit|' + r.task_id }, { text: '🏷️ קטגוריה', callback_data: 'cat|' + r.task_id }, { text: '🗑 מחק', callback_data: 'del|' + r.task_id } ],
    [ { text: '↩️ חזרה לרשימה', callback_data: 'refresh' } ]
  ] };
}
function catPickKb(id){
  const rows2 = [];
  for (let i = 0; i < CATS.length; i += 2){ const row = []; for (let j = i; j < i + 2 && j < CATS.length; j++){ const c = CATS[j]; row.push({ text: c.emoji + ' ' + c.label, callback_data: 'setcat|' + c.key + '|' + id }); } rows2.push(row); }
  rows2.push([{ text: '↩️ חזרה', callback_data: 'card|' + id }]);
  return { inline_keyboard: rows2 };
}
function pickKb(token, list){
  const kb = list.slice(0, 30).map(r => [{ text: (ICON[r.status] || '') + ' ' + trunc(r.task, 40), callback_data: 'pick|' + token + '|' + r.task_id }]);
  kb.push([{ text: '↩️ ביטול', callback_data: 'refresh' }]);
  return { inline_keyboard: kb };
}

let finalAction = 'send', method = 'sendMessage', payload = null, newTask = null, updateRow = null, deleteIndex = null, reaction = null, batchItems = null;

const cb = upd.callback_query;
if (cb) {
  const data = String(cb.data || '');
  const msgId = cb.message && cb.message.message_id;
  const parts = data.split('|');
  const type = parts[0];
  method = 'editMessageText';
  if (type === 'noop' || type === 'refresh') {
    payload = { chat_id: chatId, message_id: msgId, text: listText(rows), reply_markup: listKb(rows) };
  } else if (type === 'card') {
    const id = parts[1]; const r = byId(id);
    if (!r) { payload = { chat_id: chatId, message_id: msgId, text: '⚠️ המשימה לא נמצאה (אולי נמחקה).', reply_markup: listKb(rows) }; }
    else { payload = { chat_id: chatId, message_id: msgId, text: cardText(r), reply_markup: cardKb(r) }; }
  } else if (type === 'cat') {
    const id = parts[1]; const r = byId(id);
    if (!r) { payload = { chat_id: chatId, message_id: msgId, text: '⚠️ המשימה לא נמצאה.', reply_markup: listKb(rows) }; }
    else { payload = { chat_id: chatId, message_id: msgId, text: '🏷️ בחר קטגוריה ל«' + trunc(r.task, 40) + '»:', reply_markup: catPickKb(r.task_id) }; }
  } else if (type === 'setcat') {
    const key = parts[1]; const id = parts[2]; const r = byId(id);
    if (!r) { payload = { chat_id: chatId, message_id: msgId, text: '⚠️ המשימה לא נמצאה.', reply_markup: listKb(rows) }; }
    else { const ck = CAT_BY_KEY[key] ? key : 'general'; finalAction = 'update'; updateRow = updateRowOf(r, { category: ck }); const nr = Object.assign({}, r, { category: ck }); payload = { chat_id: chatId, message_id: msgId, text: cardText(nr) + '\n\n🏷️ הקטגוריה עודכנה: ' + catLabel(ck), reply_markup: cardKb(nr) }; }
  } else if (type === 'st' || type === 'pick' || type === 'cnf') {
    const token = parts[1]; const id = parts[2]; const r = byId(id);
    if (!r) { payload = { chat_id: chatId, message_id: msgId, text: '⚠️ המשימה לא נמצאה (אולי נמחקה).', reply_markup: listKb(rows) }; }
    else {
      const label = TOKEN_LABEL[token] || r.status;
      finalAction = 'update'; updateRow = updateRowOf(r, { status: label });
      reaction = reactFor(r, label);
      const vr = rows.map(x => x.task_id === r.task_id ? Object.assign({}, x, { status: label }) : x);
      payload = { chat_id: chatId, message_id: msgId, text: listText(vr) + '\n\n✅ עודכן: «' + r.task + '» ➜ ' + (ICON[label] || '') + ' ' + label, reply_markup: listKb(vr) };
    }
  } else if (type === 'edit') {
    const id = parts[1]; const r = byId(id);
    if (!r) { payload = { chat_id: chatId, message_id: msgId, text: '⚠️ המשימה לא נמצאה.', reply_markup: listKb(rows) }; }
    else { method = 'sendMessage'; payload = { chat_id: chatId, text: '✏️ שלח עכשיו שם חדש למשימה:\n«' + r.task + '»\n(מזהה: ' + r.task_id + ')', reply_markup: { force_reply: true } }; }
  } else if (type === 'del') {
    const id = parts[1]; const r = byId(id);
    if (!r) { payload = { chat_id: chatId, message_id: msgId, text: '⚠️ המשימה לא נמצאה.', reply_markup: listKb(rows) }; }
    else { payload = { chat_id: chatId, message_id: msgId, text: '🗑 למחוק לצמיתות את «' + r.task + '»?', reply_markup: { inline_keyboard: [[{ text: '🗑 מחק', callback_data: 'delok|' + r.task_id }, { text: '↩️ ביטול', callback_data: 'card|' + r.task_id }]] } }; }
  } else if (type === 'delmarked') {
    const done = rows.filter(r => r.status === 'בוצע');
    if (!done.length) {
      payload = { chat_id: chatId, message_id: msgId, text: '✅ אין משימות מסומנות למחיקה.', reply_markup: listKb(rows) };
    } else {
      payload = { chat_id: chatId, message_id: msgId, text: '🗑 למחוק ' + done.length + ' משימות שבוצעו?\n\n' + done.map(r => '• ' + r.task).join('\n'), reply_markup: { inline_keyboard: [[{ text: '🗑 מחק ' + done.length + ' משימות', callback_data: 'delmarkedok' }, { text: '↩️ ביטול', callback_data: 'refresh' }]] } };
    }
  } else if (type === 'delmarkedok') {
    const done = rows.filter(r => r.status === 'בוצע' && r.row_number != null);
    if (!done.length) {
      payload = { chat_id: chatId, message_id: msgId, text: '✅ אין משימות מסומנות למחיקה.', reply_markup: listKb(rows) };
    } else {
      done.sort((a, b) => b.row_number - a.row_number);
      const vr = rows.filter(r => r.status !== 'בוצע').map((x, i) => Object.assign({}, x, { _n: i + 1 }));
      batchItems = done.map((r, idx) => ({
        json: {
          finalAction: 'delete',
          method: idx === 0 ? 'editMessageText' : 'getMe',
          payload: idx === 0 ? { chat_id: chatId, message_id: msgId, text: listText(vr) + '\n\n🗑 נמחקו ' + done.length + ' משימות שבוצעו.', reply_markup: listKb(vr) } : {},
          newTask: null, updateRow: null, deleteIndex: r.row_number, reaction: null, chatId: chatId
        }
      }));
    }
  } else if (type === 'delok') {
    const id = parts[1]; const r = byId(id);
    if (!r) { payload = { chat_id: chatId, message_id: msgId, text: '⚠️ המשימה לא נמצאה.', reply_markup: listKb(rows) }; }
    else if (r.row_number == null) { payload = { chat_id: chatId, message_id: msgId, text: '⚠️ לא הצלחתי לאתר את השורה למחיקה.', reply_markup: listKb(rows) }; }
    else {
      finalAction = 'delete'; deleteIndex = r.row_number;
      const vr = rows.filter(x => x.task_id !== r.task_id).map((x, i) => Object.assign({}, x, { _n: i + 1 }));
      payload = { chat_id: chatId, message_id: msgId, text: listText(vr) + '\n\n🗑 נמחקה: ' + r.task, reply_markup: listKb(vr) };
    }
  } else {
    payload = { chat_id: chatId, message_id: msgId, text: 'פעולה לא מוכרת.', reply_markup: listKb(rows) };
  }
} else {
  const msg = upd.message || upd.edited_message || {};
  const rawText = String(msg.text || '').trim();
  const text = rawText.replace(/@[A-Za-z0-9_]+/g, '').trim();
  const userName = (msg.from && (msg.from.first_name || msg.from.username)) || '';
  const replyText = (msg.reply_to_message && String(msg.reply_to_message.text || '')) || '';

  function startsAny(t, arr){ const x = t.trim(); for (const w of arr){ if (x === w || x.startsWith(w + ' ')) return w; } return null; }
  function removeLeadingPhrase(t, phrase){ const tn = norm(t), pn = norm(phrase); if (tn === pn) return ''; if (tn.startsWith(pn + ' ')){ const wc = pn.split(' ').length; return t.trim().split(/\s+/).slice(wc).join(' ').trim(); } return null; }
  function detectStatus(t){
    const tn = norm(t); let best = null;
    for (const s of STATUS_SYNONYMS){ for (const w of s.words){ const wn = norm(w); if (!wn) continue;
      const isPrefix = (tn === wn) || tn.startsWith(wn + ' ');
      const isWord = (' ' + tn + ' ').indexOf(' ' + wn + ' ') >= 0;
      if (isPrefix || isWord){ const score = (isPrefix ? 100 : 0) + wn.length; if (!best || score > best.score) best = { label: STATUS_LABEL[s.key], phrase: w, prefix: isPrefix, score: score }; } } }
    return best;
  }
  function addTask(tt){
    tt = String(tt || '').trim();
    if (!tt){ payload = { chat_id: chatId, text: 'לא הבנתי את תוכן המשימה. נסה: הוסף <מה צריך לעשות>' }; return; }
    const id = 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    const iso = nowIso();
    const cat = detectCategory(tt);
    const mid = (msg && msg.message_id) || '';
    newTask = { task_id: id, chat_id: chatId, user_name: userName, task: tt, status: 'ממתין', category: cat, msg_id: mid, created_at: iso, updated_at: iso };
    finalAction = 'append';
    if (mid) reaction = { chat_id: chatId, message_id: Number(mid), reaction: [{ type: 'emoji', emoji: REACTION['ממתין'] }] };
    const r0 = { task_id: id, task: tt, status: 'ממתין', category: cat, _n: rows.length + 1 };
    payload = { chat_id: chatId, text: '✅ נוספה משימה:\n📝 ' + tt + '\n' + catLabel(cat) + '  ·  ⏳ ממתין', reply_markup: cardKb(r0) };
  }
  function splitIntoTasks(t){
    return String(t || '').split(/\r?\n|,\s+/).map(s => s.replace(/^\s*[-•*]\s+/, '').replace(/^\s*\d+[.)]\s+/, '').trim()).filter(s => s.length > 0);
  }
  function addBatch(input){
    const pieces = splitIntoTasks(input);
    if (pieces.length <= 1){ addTask(pieces.length ? pieces[0] : input); return; }
    const base = Date.now();
    const mid = (msg && msg.message_id) || '';
    const made = pieces.slice(0, 50).map((name, idx) => {
      const id = 't' + (base + idx).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
      const iso = new Date(base + idx).toISOString();
      return { task_id: id, chat_id: chatId, user_name: userName, task: name, status: 'ממתין', category: detectCategory(name), msg_id: mid, created_at: iso, updated_at: iso };
    });
    const summary = '✅ נוספו ' + made.length + ' משימות:\n' + made.map(t => '• ' + catLabel(t.category).split(' ')[0] + ' ' + t.task).join('\n');
    const batchReaction = mid ? { chat_id: chatId, message_id: Number(mid), reaction: [{ type: 'emoji', emoji: REACTION['ממתין'] }] } : null;
    const firstPayload = { chat_id: chatId, text: summary, reply_markup: { inline_keyboard: [[{ text: '📋 כל המשימות', callback_data: 'refresh' }]] } };
    batchItems = made.map((nt, idx) => ({ json: { finalAction: 'append', method: idx === 0 ? 'sendMessage' : 'getMe', payload: idx === 0 ? firstPayload : {}, newTask: nt, updateRow: null, deleteIndex: null, reaction: idx === 0 ? batchReaction : null, chatId: chatId } }));
  }
  function setStatusByTarget(label, num, name){
    const token = LABEL_TOKEN[label];
    if (num != null){
      const r = rows.find(x => x._n === num);
      if (!r){ payload = { chat_id: chatId, text: 'אין משימה במספר ' + num + '. הנה הרשימה:\n\n' + listText(rows), reply_markup: listKb(rows) }; return; }
      finalAction = 'update'; updateRow = updateRowOf(r, { status: label }); reaction = reactFor(r, label);
      payload = { chat_id: chatId, text: '✅ עודכן: «' + r.task + '» ➜ ' + (ICON[label] || '') + ' ' + label }; return;
    }
    const nn = norm(name || '');
    if (!nn){
      if (!active.length){ payload = { chat_id: chatId, text: 'אין משימות פעילות לסימון.' }; return; }
      payload = { chat_id: chatId, text: 'איזו משימה לסמן ' + (ICON[label] || '') + ' ' + label + '?', reply_markup: pickKb(token, active) }; return;
    }
    const exact = rows.filter(r => norm(r.task) === nn);
    const partial = rows.filter(r => nn.length >= 2 && (norm(r.task).indexOf(nn) >= 0 || nn.indexOf(norm(r.task)) >= 0));
    if (exact.length === 1){ const r = exact[0]; finalAction = 'update'; updateRow = updateRowOf(r, { status: label }); reaction = reactFor(r, label); payload = { chat_id: chatId, text: '✅ עודכן: «' + r.task + '» ➜ ' + (ICON[label] || '') + ' ' + label }; return; }
    if (partial.length === 1){ const r = partial[0]; payload = { chat_id: chatId, text: 'התכוונת ל: «' + r.task + '»?', reply_markup: { inline_keyboard: [[{ text: '✅ כן, ' + label, callback_data: 'cnf|' + token + '|' + r.task_id }, { text: '↩️ לא', callback_data: 'refresh' }]] } }; return; }
    if (partial.length > 1){ payload = { chat_id: chatId, text: 'נמצאו כמה משימות. איזו לסמן ' + label + '?', reply_markup: pickKb(token, partial) }; return; }
    payload = { chat_id: chatId, text: 'לא מצאתי «' + name + '». איזו משימה לסמן ' + label + '?', reply_markup: pickKb(token, active.length ? active : rows) };
  }

  let renameId = null;
  if (replyText){ const m = replyText.match(/מזהה:\s*([^\s)]+)/); if (m) renameId = m[1]; }

  if (renameId){
    const r = byId(renameId);
    if (!r) payload = { chat_id: chatId, text: '⚠️ המשימה לעריכה לא נמצאה.' };
    else if (!text) payload = { chat_id: chatId, text: 'לא קיבלתי שם חדש.' };
    else { finalAction = 'update'; updateRow = updateRowOf(r, { task: text }); payload = { chat_id: chatId, text: '✏️ השם עודכן ל: «' + text + '»' }; }
  } else if (text === '?' || startsAny(text, ['/start','/help','עזרה','הוראות','הסבר'])){
    payload = { chat_id: chatId, text: HELP };
  } else if (startsAny(text, ['/list','/tasks','רשימה','משימות','המשימות שלי','מה המשימות','מה יש לי','תראה משימות','הצג משימות'])){
    payload = { chat_id: chatId, text: listText(rows), reply_markup: listKb(rows) };
  } else if (startsAny(text, ['/add','/new','הוסף','תוסיף','להוסיף','משימה חדשה','תזכיר לי','צריך לזכור','תוסיפי'])){
    const ph = startsAny(text, ['/add','/new','הוסף','תוסיף','להוסיף','משימה חדשה','תזכיר לי','צריך לזכור','תוסיפי']);
    let rem = removeLeadingPhrase(text, ph); if (rem == null) rem = '';
    rem = rem.replace(/^[:\-]\s*/, '').trim();
    addBatch(rem);
  } else if (startsAny(text, ['קטגוריה','/category','/cat','תייג','לתייג','שייך'])){
    const cv = startsAny(text, ['קטגוריה','/category','/cat','תייג','לתייג','שייך']);
    let rem = removeLeadingPhrase(text, cv); if (rem == null) rem = '';
    rem = rem.replace(/^את\s+/, '').trim();
    const mnum = rem.match(/^(\d+)\s*([\s\S]*)$/);
    if (!mnum){ payload = { chat_id: chatId, text: 'לשיוך קטגוריה: קטגוריה <מספר> <שם קטגוריה>\nלמשל: קטגוריה 2 רפואי\nאו פתח משימה ברשימה ולחץ 🏷️ קטגוריה.\n\nקטגוריות: ' + CATS.map(c => c.emoji + ' ' + c.label).join(' · ') }; }
    else {
      const num = parseInt(mnum[1], 10); const cname = (mnum[2] || '').trim();
      const r = rows.find(x => x._n === num);
      if (!r) payload = { chat_id: chatId, text: 'אין משימה במספר ' + num + '.' };
      else if (!cname) payload = { chat_id: chatId, text: '🏷️ בחר קטגוריה ל«' + trunc(r.task, 40) + '»:', reply_markup: catPickKb(r.task_id) };
      else { const key = matchCatByName(cname); if (!key) payload = { chat_id: chatId, text: 'לא זיהיתי קטגוריה «' + cname + '».\nקטגוריות: ' + CATS.map(c => c.emoji + ' ' + c.label).join(' · ') }; else { finalAction = 'update'; updateRow = updateRowOf(r, { category: key }); payload = { chat_id: chatId, text: '🏷️ «' + r.task + '» ➜ ' + catLabel(key) }; } }
    }
  } else if (startsAny(text, ['ערוך','/edit','/rename','שנה שם','עדכן שם','שנה'])){
    const ev = startsAny(text, ['ערוך','/edit','/rename','שנה שם','עדכן שם','שנה']);
    let rem = removeLeadingPhrase(text, ev); if (rem == null) rem = '';
    rem = rem.replace(/^את\s+/, '').trim();
    const mnum = rem.match(/^(\d+)\s*([\s\S]*)$/);
    if (mnum){
      const num = parseInt(mnum[1], 10); const nt = (mnum[2] || '').trim();
      const r = rows.find(x => x._n === num);
      if (!r) payload = { chat_id: chatId, text: 'אין משימה במספר ' + num + '.' };
      else if (!nt) payload = { chat_id: chatId, text: '✏️ שלח עכשיו שם חדש למשימה:\n«' + r.task + '»\n(מזהה: ' + r.task_id + ')', reply_markup: { force_reply: true } };
      else { finalAction = 'update'; updateRow = updateRowOf(r, { task: nt }); payload = { chat_id: chatId, text: '✏️ «' + r.task + '» ➜ «' + nt + '»' }; }
    } else {
      const parts2 = rem.split(/\sל-?\s*/);
      if (parts2.length >= 2 && parts2[0].trim()){
        const oldN = parts2[0].trim(); const newN = parts2.slice(1).join(' ל ').trim(); const nn = norm(oldN);
        const cand = rows.filter(r => nn.length >= 2 && (norm(r.task) === nn || norm(r.task).indexOf(nn) >= 0));
        if (cand.length === 1){ const r = cand[0]; finalAction = 'update'; updateRow = updateRowOf(r, { task: newN }); payload = { chat_id: chatId, text: '✏️ «' + r.task + '» ➜ «' + newN + '»' }; }
        else if (cand.length > 1) payload = { chat_id: chatId, text: 'כמה התאמות ל«' + oldN + '». נסה: ערוך <מספר> <שם חדש>' };
        else payload = { chat_id: chatId, text: 'לא מצאתי «' + oldN + '». נסה: ערוך <מספר> <שם חדש>' };
      } else {
        payload = { chat_id: chatId, text: 'לעריכה: ערוך <מספר> <שם חדש>, או לחץ ✏️ ברשימה.' };
      }
    }
  } else if (startsAny(text, ['מחק מסומנים','תמחק מסומנים','הסר מסומנים','מחק בוצעו','תמחק בוצעו','/deletedone'])){
    const done = rows.filter(r => r.status === 'בוצע');
    if (!done.length) {
      payload = { chat_id: chatId, text: '✅ אין משימות מסומנות למחיקה.' };
    } else {
      payload = { chat_id: chatId, text: '🗑 למחוק ' + done.length + ' משימות שבוצעו?\n\n' + done.map(r => '• ' + r.task).join('\n'), reply_markup: { inline_keyboard: [[{ text: '🗑 מחק ' + done.length + ' משימות', callback_data: 'delmarkedok' }, { text: '↩️ ביטול', callback_data: 'refresh' }]] } };
    }
  } else if (startsAny(text, ['מחק','תמחק','הסר','/delete'])){
    const dv = startsAny(text, ['מחק','תמחק','הסר','/delete']);
    let rem = removeLeadingPhrase(text, dv); if (rem == null) rem = '';
    rem = rem.trim();
    let r = null;
    if (/^\d+$/.test(rem)) r = rows.find(x => x._n === parseInt(rem, 10));
    else if (rem){ const nn = norm(rem); const c = rows.filter(x => nn.length >= 2 && norm(x.task).indexOf(nn) >= 0); if (c.length === 1) r = c[0]; else if (c.length > 1){ payload = { chat_id: chatId, text: 'כמה התאמות. בחר מהרשימה ולחץ 🗑.', reply_markup: listKb(rows) }; } }
    if (!payload){
      if (!r) payload = { chat_id: chatId, text: 'לא מצאתי משימה למחיקה. הנה הרשימה:', reply_markup: listKb(rows) };
      else payload = { chat_id: chatId, text: '🗑 למחוק לצמיתות את «' + r.task + '»?', reply_markup: { inline_keyboard: [[{ text: '🗑 מחק', callback_data: 'delok|' + r.task_id }, { text: '↩️ ביטול', callback_data: 'card|' + r.task_id }]] } };
    }
  } else {
    const det = detectStatus(text);
    if (det){
      const nm = text.match(/\d+/);
      const num = nm ? parseInt(nm[0], 10) : null;
      let name = '';
      if (det.prefix){ const rr = removeLeadingPhrase(text, det.phrase); name = (rr == null ? '' : rr); }
      name = name.replace(/\d+/g, '').replace(/[«»"']/g, '').trim();
      setStatusByTarget(det.label, num, name);
    } else {
      addBatch(text);
    }
  }
}

if (batchItems) return batchItems;
return [{ json: { finalAction: finalAction, method: method, payload: payload, newTask: newTask, updateRow: updateRow, deleteIndex: deleteIndex, reaction: reaction, chatId: chatId } }];

