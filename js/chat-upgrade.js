/* ============================================================
   PADMANABH AYURVEDICS — CHATBOT UPGRADE ENGINE
   Features: Smart Composer, Typing Indicator, Message Grouping,
   Timestamps, Scroll Anchoring, Streamed Responses, Status Ticks,
   File Attachments, Reply Threading, Optimistic UI
   ============================================================ */

(function() {
  'use strict';

  // ── State ────────────────────────────────────────────────────
  let _lastSender = null;       // 'bot' | 'user'
  let _lastMsgTime = 0;         // timestamp of last message
  let _lastDateStr = null;      // date string for date dividers
  let _pendingReplyText = null; // text being replied to
  let _pendingAttachment = null;// { dataUrl, name, type }
  let _newMsgCount = 0;         // unread new messages while scrolled up
  let _isUserScrolledUp = false;// true when user has scrolled up
  let _typingEl = null;         // current typing indicator element

  const GROUP_MS = 8000; // group messages within 8 seconds

  // ── DOM refs (set after DOMContentLoaded) ───────────────────
  let chatBody, chatInput, chatSend, chatBtn, chatWindow, chatClose,
      newPill, replyStrip, replyText, replyCloseBtn,
      attachStrip, attachPreview, attachRemoveBtn, fileInput;

  // ── Helpers: Format time ─────────────────────────────────────
  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function fmtDate(ts) {
    const d = new Date(ts);
    const today = new Date();
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // ── Date divider ─────────────────────────────────────────────
  function maybeInsertDateDivider(ts) {
    const dateStr = fmtDate(ts);
    if (dateStr === _lastDateStr) return;
    _lastDateStr = dateStr;
    const div = document.createElement('div');
    div.className = 'chat-date-divider';
    div.textContent = dateStr;
    chatBody.appendChild(div);
  }

  // ── Scroll anchor ────────────────────────────────────────────
  function isScrolledToBottom() {
    return chatBody.scrollHeight - chatBody.scrollTop - chatBody.clientHeight < 60;
  }

  function updateScrollState() {
    _isUserScrolledUp = !isScrolledToBottom();
    if (!_isUserScrolledUp) {
      _newMsgCount = 0;
      newPill.classList.remove('visible');
      newPill.textContent = '⬇ New messages';
    }
  }

  function smartScrollDown(force = false) {
    if (force || !_isUserScrolledUp) {
      chatBody.scrollTop = chatBody.scrollHeight;
    } else {
      _newMsgCount++;
      newPill.textContent = _newMsgCount === 1 ? '⬇ New message' : `⬇ ${_newMsgCount} new messages`;
      newPill.classList.add('visible');
    }
  }

  window.chatScrollToBottom = function() {
    chatBody.scrollTop = chatBody.scrollHeight;
    _newMsgCount = 0;
    newPill.classList.remove('visible');
  };

  // ── Typing indicator ─────────────────────────────────────────
  function showTypingIndicator() {
    removeTypingIndicator();
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg-wrap bot';
    wrap.id = 'chat-typing-wrap';
    const el = document.createElement('div');
    el.className = 'chat-typing-indicator';
    el.innerHTML = '<div class="chat-typing-dot"></div><div class="chat-typing-dot"></div><div class="chat-typing-dot"></div>';
    wrap.appendChild(el);
    chatBody.appendChild(wrap);
    _typingEl = wrap;
    smartScrollDown(true);
    return wrap;
  }

  function removeTypingIndicator() {
    if (_typingEl) { _typingEl.remove(); _typingEl = null; }
    document.getElementById('chat-typing-wrap')?.remove();
    // Also remove old plain-text loaders
    chatBody.querySelectorAll('.chat-msg.bot').forEach(m => {
      if (m.textContent === '...' || m.textContent === 'Thinking…' || m.textContent === 'Thinking...') m.remove();
    });
  }

  // ── Streaming typewriter ─────────────────────────────────────
  function streamText(el, text, speed = 18) {
    return new Promise(resolve => {
      let i = 0;
      el.classList.add('chat-streaming');
      el.innerHTML = '';
      const interval = setInterval(() => {
        if (i < text.length) {
          // Handle HTML tags — write char by char for plain text part
          el.innerHTML = text.slice(0, i + 1);
          i++;
          if (!_isUserScrolledUp) chatBody.scrollTop = chatBody.scrollHeight;
        } else {
          clearInterval(interval);
          el.classList.remove('chat-streaming');
          resolve();
        }
      }, speed);
    });
  }

  // ── Build message wrap with reply button ─────────────────────
  function buildWrap(role) {
    const wrap = document.createElement('div');
    wrap.className = `chat-msg-wrap ${role}`;
    const replyBtn = document.createElement('button');
    replyBtn.className = 'chat-msg-reply-btn';
    replyBtn.title = 'Reply';
    replyBtn.innerHTML = '↩';
    wrap.appendChild(replyBtn);
    return { wrap, replyBtn };
  }

  // ── Core: Append user message (Optimistic UI) ────────────────
  window._appendUserMessage = function(text, attachment) {
    const now = Date.now();
    maybeInsertDateDivider(now);

    const isGrouped = _lastSender === 'user' && (now - _lastMsgTime) < GROUP_MS;
    const { wrap, replyBtn } = buildWrap('user');

    // Reply quote
    let replyQuoteHtml = '';
    if (_pendingReplyText) {
      replyQuoteHtml = `<div class="chat-reply-quote">↩ ${_pendingReplyText.slice(0, 60)}</div>`;
      _pendingReplyText = null;
      clearReplyStrip();
    }

    // Attachment
    let attachHtml = '';
    if (attachment) {
      if (attachment.type.startsWith('image/')) {
        attachHtml = `<img src="${attachment.dataUrl}" style="max-width:180px;border-radius:10px;margin-bottom:6px;display:block;">`;
      } else {
        attachHtml = `<div style="font-size:0.8rem;opacity:0.7">📎 ${attachment.name}</div>`;
      }
      _pendingAttachment = null;
      clearAttachStrip();
    }

    const msg = document.createElement('div');
    msg.className = 'chat-msg user' + (isGrouped ? ' grouped' : '');

    // Status element
    const statusEl = document.createElement('div');
    statusEl.className = 'chat-status sending';
    statusEl.innerHTML = '<span>✓</span> <span class="chat-ts">Sending…</span>';

    msg.innerHTML = replyQuoteHtml + attachHtml + `<span class="msg-text">${text.replace(/\n/g, '<br>')}</span>`;
    const tsEl = document.createElement('div');
    tsEl.className = 'chat-ts';
    tsEl.textContent = fmtTime(now);
    msg.appendChild(tsEl);
    msg.appendChild(statusEl);

    wrap.insertBefore(msg, wrap.firstChild);
    replyBtn.addEventListener('click', () => startReply(text));
    chatBody.appendChild(wrap);

    _lastSender = 'user';
    _lastMsgTime = now;
    smartScrollDown(true);

    // Simulate "delivered" after 800ms
    setTimeout(() => {
      statusEl.className = 'chat-status delivered';
      statusEl.innerHTML = '<span>✓✓</span>';
    }, 800);

    return { msg, statusEl };
  };

  // ── Core: Append bot message with streaming ──────────────────
  window._appendBotMessage = function(htmlOrText, options = [], skipStream = false) {
    const now = Date.now();
    maybeInsertDateDivider(now);

    const isGrouped = _lastSender === 'bot' && (now - _lastMsgTime) < GROUP_MS;
    const { wrap, replyBtn } = buildWrap('bot');

    const msg = document.createElement('div');
    msg.className = 'chat-msg bot' + (isGrouped ? ' grouped' : '');

    // Format markdown bold & newlines (strip for streaming plain text)
    const formatted = (htmlOrText || '')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    // Options chips
    let optHtml = '';
    if (options.length > 0) {
      optHtml = '<div class="chat-options">';
      options.forEach(o => {
        const safe = o.replace(/'/g, "\\'");
        optHtml += `<button type="button" onclick="handleChatOption('${safe}')">${o}</button>`;
      });
      optHtml += '</div>';
    }

    const tsEl = document.createElement('div');
    tsEl.className = 'chat-ts bot-ts';
    tsEl.textContent = fmtTime(now);

    const textContainer = document.createElement('span');
    textContainer.className = 'msg-text';

    msg.appendChild(textContainer);
    msg.appendChild(tsEl);
    wrap.insertBefore(msg, wrap.firstChild);
    replyBtn.addEventListener('click', () => startReply(htmlOrText.replace(/<[^>]+>/g, '').slice(0, 80)));
    chatBody.appendChild(wrap);

    _lastSender = 'bot';
    _lastMsgTime = now;

    if (skipStream || formatted.length < 30) {
      textContainer.innerHTML = formatted + optHtml;
      smartScrollDown();
    } else {
      // Stream text only, then append options
      const plainLen = formatted.indexOf('<br>') > -1 || formatted.indexOf('<strong>') > -1
        ? formatted.length
        : formatted.length;
      streamText(textContainer, formatted, 14).then(() => {
        if (optHtml) textContainer.insertAdjacentHTML('beforeend', optHtml);
        smartScrollDown();
      });
    }

    return msg;
  };

  // ── Reply threading ──────────────────────────────────────────
  function startReply(text) {
    _pendingReplyText = text.replace(/<[^>]+>/g, '').slice(0, 80);
    replyStrip.classList.remove('hidden');
    replyText.textContent = _pendingReplyText;
    chatInput.focus();
  }

  function clearReplyStrip() {
    replyStrip.classList.add('hidden');
    replyText.textContent = '';
    _pendingReplyText = null;
  }

  function clearAttachStrip() {
    attachStrip.classList.add('hidden');
    attachPreview.innerHTML = '';
    _pendingAttachment = null;
  }

  // ── File attachment handler ──────────────────────────────────
  function handleFileSelected(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      _pendingAttachment = { dataUrl: e.target.result, name: file.name, type: file.type };
      attachStrip.classList.remove('hidden');
      if (file.type.startsWith('image/')) {
        attachPreview.innerHTML = `<img src="${e.target.result}" alt="${file.name}">`;
      } else {
        attachPreview.innerHTML = `<span>📎 ${file.name}</span>`;
      }
    };
    reader.readAsDataURL(file);
  }

  // ── Smart Composer: Enter sends, Shift+Enter newline ─────────
  function autoResizeTextarea() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  }

  // ── Patch the existing sendChatMessage to use new UI ─────────
  function patchSendMessage() {
    const originalSend = window.sendChatMessage;
    if (!originalSend) return;

    // Store original for fallback
    window._originalSendChatMessage = originalSend;

    window.sendChatMessage = function() {
      const text = chatInput.value.trim();
      if (!text && !_pendingAttachment) return;

      // Optimistic: show user message immediately
      const displayText = text || (_pendingAttachment ? `[${_pendingAttachment.name}]` : '');
      const attachment = _pendingAttachment ? { ..._pendingAttachment } : null;
      window._appendUserMessage(displayText, attachment);

      // Clear input
      chatInput.value = '';
      autoResizeTextarea();

      // Store for retry
      const lastText = text;
      const lastAttachment = attachment;

      // Call original handler with patched input value
      const fakeInput = { value: text, trim: () => text };
      const _realInput = document.getElementById('chat-input');

      // Temporarily set value so original handler reads it
      _realInput.value = text;

      // Patch appendBotMessage globally for this call
      const _origAppend = window.appendBotMessage;
      window.appendBotMessage = function(t, o = []) {
        window._appendBotMessage(t, o);
      };

      // Patch appendLoader for this call
      const _origLoader = window.appendLoader || function() {};
      window.appendLoader = function(t) {
        return showTypingIndicator();
      };
      const _origRemoveLoaders = window.removeLoaders || function() {};
      window.removeLoaders = function() {
        removeTypingIndicator();
      };

      try {
        // Clear original input so original handler triggers properly
        _realInput.value = text;
        originalSend();
      } catch (e) {
        console.error('[ChatUpgrade] sendChatMessage error:', e);
        // Restore on failure
        window.appendBotMessage = _origAppend;
      }
    };
  }

  // ── Init ─────────────────────────────────────────────────────
  function init() {
    chatBody    = document.getElementById('chat-body');
    chatInput   = document.getElementById('chat-input');
    chatSend    = document.getElementById('chat-send');
    chatBtn     = document.getElementById('chatbot-btn');
    chatWindow  = document.getElementById('chatbot-window');
    chatClose   = document.getElementById('chatbot-close');
    newPill     = document.getElementById('chat-new-pill');
    replyStrip  = document.getElementById('chat-reply-strip');
    replyText   = document.getElementById('chat-reply-text');
    replyCloseBtn  = document.getElementById('chat-reply-close');
    attachStrip    = document.getElementById('chat-attach-strip');
    attachPreview  = document.getElementById('chat-attach-preview');
    attachRemoveBtn = document.getElementById('chat-attach-remove');
    fileInput   = document.getElementById('chat-file-input');

    if (!chatBody || !chatInput) return;

    // ── Scroll anchor listener ───────────────────────────────
    chatBody.addEventListener('scroll', updateScrollState, { passive: true });

    // ── Textarea auto-resize ─────────────────────────────────
    chatInput.addEventListener('input', autoResizeTextarea);

    // ── Enter to send / Shift+Enter for newline ──────────────
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        window.sendChatMessage && window.sendChatMessage();
      }
    });

    // ── Attachment file input ────────────────────────────────
    if (fileInput) {
      fileInput.addEventListener('change', e => {
        handleFileSelected(e.target.files[0]);
        e.target.value = ''; // reset so same file can be picked again
      });
    }

    // ── Reply / attach close buttons ─────────────────────────
    if (replyCloseBtn)   replyCloseBtn.addEventListener('click', clearReplyStrip);
    if (attachRemoveBtn) attachRemoveBtn.addEventListener('click', clearAttachStrip);

    // ── Patch send after a tick (so original JS has set up sendChatMessage) ──
    setTimeout(patchSendMessage, 500);

    // ── Also patch appendBotMessage & appendLoader globally ──
    setTimeout(() => {
      const _origAppend = window.appendBotMessage;
      if (_origAppend) {
        window.appendBotMessage = function(t, o = []) {
          return window._appendBotMessage(t, o);
        };
      }
      if (window.appendLoader) {
        window.appendLoader = function() { return showTypingIndicator(); };
      }
      if (window.removeLoaders) {
        window.removeLoaders = function() { removeTypingIndicator(); };
      }

      // Also patch chatShowDetail and showProductsInChat to use new scroll
      const _origShowProducts = window.showProductsInChat;
      if (_origShowProducts) {
        window.showProductsInChat = function(...args) {
          _origShowProducts(...args);
          smartScrollDown();
        };
      }
    }, 600);

    // ── Mark bot messages as "read" when chat is opened ──────
    if (chatBtn) {
      chatBtn.addEventListener('click', () => {
        setTimeout(() => {
          chatBody.querySelectorAll('.chat-status.delivered').forEach(el => {
            el.className = 'chat-status read';
            el.innerHTML = '<span style="color:#3b82f6">✓✓</span>';
          });
        }, 400);
      });
    }

    // ── Save chat history to localStorage ────────────────────
    const _saveSession = debounce(() => {
      try {
        const msgs = [];
        chatBody.querySelectorAll('.chat-msg-wrap').forEach(wrap => {
          const isUser = wrap.classList.contains('user');
          const textEl = wrap.querySelector('.msg-text');
          if (textEl) msgs.push({ role: isUser ? 'user' : 'bot', text: textEl.innerText });
        });
        if (msgs.length > 0) {
          const sessions = JSON.parse(localStorage.getItem('pa_chat_sessions') || '[]');
          const session = { ts: Date.now(), msgs };
          // Replace last session if within 30 min
          if (sessions.length > 0 && Date.now() - sessions[0].ts < 1800000) {
            sessions[0] = session;
          } else {
            sessions.unshift(session);
          }
          localStorage.setItem('pa_chat_sessions', JSON.stringify(sessions.slice(0, 20)));
        }
      } catch(e) {}
    }, 2000);

    // Observe chat body for new messages and save session
    const obs = new MutationObserver(_saveSession);
    obs.observe(chatBody, { childList: true, subtree: true });

    console.log('[ChatUpgrade] Initialized ✓');
  }

  function debounce(fn, delay) {
    let t;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
