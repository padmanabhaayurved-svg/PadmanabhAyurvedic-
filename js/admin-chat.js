/* ============================================================
   ADMIN — CHAT SESSIONS VIEWER + FAQ MANAGER
   ============================================================ */

// Load Chat Sessions Tab
window.loadAdminChats = function() {
  const wrap = document.getElementById('admin-chats-wrap');
  if (!wrap) return;

  let sessions = [];
  try { sessions = JSON.parse(localStorage.getItem('pa_chat_sessions') || '[]'); } catch(e) {}

  if (sessions.length === 0) {
    wrap.innerHTML = '<p style="color:var(--text-muted);padding:24px">No chat sessions recorded yet.</p>';
    return;
  }

  let html = '<div style="display:flex;flex-direction:column;gap:16px;">';
  sessions.forEach(function(s, i) {
    var d = new Date(s.ts);
    var dateStr = d.toLocaleString();
    var preview = ((s.msgs[0] && s.msgs[0].text) || '').slice(0, 60);
    var msgsHtml = s.msgs.map(function(m) {
      var align = m.role === 'user' ? 'flex-direction:row-reverse' : '';
      var bg = m.role === 'user' ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)';
      return '<div style="display:flex;gap:8px;align-items:flex-start;' + align + '">' +
        '<div style="font-size:0.75rem;padding:2px 6px;border-radius:4px;background:' + bg + ';color:var(--text-muted);white-space:nowrap">' + m.role + '</div>' +
        '<div style="font-size:0.85rem;color:var(--text-primary);background:rgba(255,255,255,0.04);padding:8px 12px;border-radius:10px;max-width:80%">' + (m.text || '') + '</div>' +
        '</div>';
    }).join('');

    html += '<div class="admin-card" style="padding:16px;cursor:pointer" onclick="toggleAdminChat(' + i + ')">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<div>' +
          '<span style="font-weight:600;color:var(--gold)">' + dateStr + '</span>' +
          '<span style="color:var(--text-muted);font-size:0.82rem;margin-left:12px">' + s.msgs.length + ' messages</span>' +
        '</div>' +
        '<span id="chat-toggle-icon-' + i + '" style="color:var(--text-muted)">&#9660;</span>' +
      '</div>' +
      '<div style="color:var(--text-secondary);font-size:0.85rem;margin-top:4px">' + preview + '&#8230;</div>' +
      '<div id="chat-transcript-' + i + '" class="hidden" style="margin-top:12px;display:flex;flex-direction:column;gap:6px">' + msgsHtml + '</div>' +
    '</div>';
  });
  html += '</div>';
  html += '<button class="btn btn-outline btn-sm" onclick="exportChatsCSV()" style="margin-top:16px">&#11015; Export CSV</button>';
  html += '<button class="btn btn-ghost btn-sm" onclick="clearChatSessions()" style="margin-top:16px;margin-left:8px;color:var(--text-muted)">&#128465; Clear All</button>';
  wrap.innerHTML = html;
};

window.toggleAdminChat = function(i) {
  var el = document.getElementById('chat-transcript-' + i);
  var icon = document.getElementById('chat-toggle-icon-' + i);
  if (!el) return;
  el.classList.toggle('hidden');
  if (icon) icon.innerHTML = el.classList.contains('hidden') ? '&#9660;' : '&#9650;';
};

window.clearChatSessions = function() {
  if (!confirm('Clear all chat sessions?')) return;
  localStorage.removeItem('pa_chat_sessions');
  window.loadAdminChats();
  if (window.showToast) showToast('Chat sessions cleared', 'success');
};

window.exportChatsCSV = function() {
  var sessions = [];
  try { sessions = JSON.parse(localStorage.getItem('pa_chat_sessions') || '[]'); } catch(e) {}
  var csv = 'Session Date,Role,Message\n';
  sessions.forEach(function(s) {
    var d = new Date(s.ts).toLocaleString();
    s.msgs.forEach(function(m) {
      csv += '"' + d + '","' + m.role + '","' + (m.text || '').replace(/"/g, '""') + '"\n';
    });
  });
  var blob = new Blob([csv], { type: 'text/csv' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'chat_sessions.csv'; a.click();
  URL.revokeObjectURL(url);
};

// FAQ Manager
window.loadFAQManager = function() {
  var wrap = document.getElementById('admin-faq-wrap');
  if (!wrap) return;

  var faqs = [];
  try { faqs = JSON.parse(localStorage.getItem('pa_faqs') || '[]'); } catch(e) {}

  var listHtml = '';
  if (faqs.length === 0) {
    listHtml = '<p style="color:var(--text-muted)">No FAQs yet. Click &quot;+ Add FAQ&quot; to create one.</p>';
  } else {
    faqs.forEach(function(faq, i) {
      listHtml += '<div class="admin-card" style="padding:14px">' +
        '<div style="display:flex;justify-content:space-between;gap:12px">' +
          '<div style="flex:1">' +
            '<div style="font-weight:600;color:var(--text-primary);margin-bottom:4px">' + faq.q + '</div>' +
            '<div style="color:var(--text-secondary);font-size:0.85rem">' + faq.a + '</div>' +
            '<div style="margin-top:6px;font-size:0.75rem;color:var(--text-muted)">Keywords: ' + (faq.keywords || []).join(', ') + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:6px;align-items:flex-start">' +
            '<button class="tbl-btn tbl-btn-edit" onclick="editFAQEntry(' + i + ')">Edit</button>' +
            '<button class="tbl-btn tbl-btn-del" onclick="deleteFAQEntry(' + i + ')">Delete</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    });
  }

  wrap.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
    '<h3 style="font-family:var(--font-serif);color:var(--text-primary)">FAQ Entries (' + faqs.length + ')</h3>' +
    '<button class="btn btn-primary btn-sm" onclick="addFAQEntry()">+ Add FAQ</button>' +
    '</div>' +
    '<div id="faq-list" style="display:flex;flex-direction:column;gap:12px">' + listHtml + '</div>';
};

window.addFAQEntry = function() {
  var q = prompt('Question:');
  if (!q) return;
  var a = prompt('Answer:');
  if (!a) return;
  var kws = prompt('Keywords (comma-separated):') || '';
  var faqs = [];
  try { faqs = JSON.parse(localStorage.getItem('pa_faqs') || '[]'); } catch(e) {}
  faqs.push({ q: q, a: a, keywords: kws.split(',').map(function(k) { return k.trim(); }).filter(Boolean) });
  localStorage.setItem('pa_faqs', JSON.stringify(faqs));
  window.loadFAQManager();
  if (window.showToast) showToast('FAQ added', 'success');
};

window.editFAQEntry = function(i) {
  var faqs = [];
  try { faqs = JSON.parse(localStorage.getItem('pa_faqs') || '[]'); } catch(e) {}
  var faq = faqs[i];
  if (!faq) return;
  var q = prompt('Question:', faq.q);
  if (q === null) return;
  var a = prompt('Answer:', faq.a);
  if (a === null) return;
  var kws = prompt('Keywords:', (faq.keywords || []).join(', '));
  faqs[i] = { q: q, a: a, keywords: (kws || '').split(',').map(function(k) { return k.trim(); }).filter(Boolean) };
  localStorage.setItem('pa_faqs', JSON.stringify(faqs));
  window.loadFAQManager();
  if (window.showToast) showToast('FAQ updated', 'success');
};

window.deleteFAQEntry = function(i) {
  if (!confirm('Delete this FAQ?')) return;
  var faqs = [];
  try { faqs = JSON.parse(localStorage.getItem('pa_faqs') || '[]'); } catch(e) {}
  faqs.splice(i, 1);
  localStorage.setItem('pa_faqs', JSON.stringify(faqs));
  window.loadFAQManager();
  if (window.showToast) showToast('FAQ deleted', 'success');
};
