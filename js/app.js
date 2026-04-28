/* ============================================================
   PADMANABH AYURVEDICS — APP.JS
   SPA Router · i18n · Toast · Page Loader · Nav
   ============================================================ */

// ── i18n ──────────────────────────────────────────────────────
let _lang    = localStorage.getItem('pa_lang') || 'en';
let _strings = {};

async function loadStrings(lang) {
  try {
    const res = await fetch(`i18n/${lang}.json`);
    _strings = await res.json();
  } catch (e) {
    console.warn('[i18n] Failed to load', lang, '— falling back to en');
    if (lang !== 'en') {
      const res = await fetch('i18n/en.json');
      _strings = await res.json();
    }
  }
}

function t(key) {
  return _strings[key] || key;
}

function applyStrings() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    // Use innerHTML to support <br>, <em>, <strong> in translation values
    el.innerHTML = val;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-ph'));
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === _lang);
  });
  document.body.className = document.body.className
    .replace(/\blang-\w+\b/g, '')
    .trim() + ` lang-${_lang}`;
}

async function setLang(lang) {
  _lang = lang;
  localStorage.setItem('pa_lang', lang);
  await loadStrings(lang);
  applyStrings();
  // Re-render current page to update dynamic content
  const route = _currentRoute;
  _currentRoute = null;
  navigate(route, true);
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, duration);
}
window.showToast = showToast;

// ── Modals ────────────────────────────────────────────────────
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('hidden');
  }
}
window.closeModal = closeModal;

// ── Cinematic Boot Sequence ───────────────────────────────────
function runInitializationSequence() {
  const loader = document.getElementById('page-loader');
  const quoteEl = document.getElementById('loader-quote');
  const splash = document.getElementById('lang-splash');
  
  if (loader && quoteEl && splash) {
    const quotes = [
      "\"Health is a state of complete harmony of the body, mind and spirit.\"",
      "\"When diet is wrong, medicine is of no use. When diet is correct, medicine is of no need.\"",
      "\"The groundwork of all happiness is health.\"",
      "\"To ensure good health: eat lightly, breathe deeply, live moderately, cultivate cheerfulness, and maintain an interest in life.\""
    ];
    quoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];
    
    // Fade in quote shortly after page load
    setTimeout(() => { quoteEl.style.opacity = '1'; }, 500);

    // Keep loader for 8 seconds total, then show language splash
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 800);
      
      splash.classList.remove('hidden');
      
      // Bind splash language buttons
      document.querySelectorAll('.splash-lang-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          await setLang(btn.dataset.lang);
          splash.classList.add('hidden');
          setTimeout(() => {
            splash.remove();
            window.scrollTo({ top: 0, behavior: 'instant' });
          }, 800);
          startApp();
        });
      });
    }, 8000);
  } else {
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => {
        loader.remove();
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, 800);
    }
    startApp();
  }
}

async function startApp() {
  trackTraffic();

  // Bind navbar language switcher
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  // Navigate to initial route
  let hash = location.hash || '#home';
  if (!location.hash) hash = '#home'; // Default to home if directly loading /
  
  await navigate(hash);
  
  // Dispatch app:ready for animations (specifically hero)
  document.dispatchEvent(new Event('app:ready'));
  
  // Start lead catcher timer after app has actually started
  initLeadCatcherTimer();
}

// ── Router ────────────────────────────────────────────────────
let _currentRoute = null;
const _pageCache  = {};

const ROUTES = {
  '':          'pages/home.html',
  'home':      'pages/home.html',
  'about':     'pages/about.html',
  'catalog':   'pages/catalog.html',
  'product':   'pages/product.html',
  'cart':      'pages/cart.html',
  'dashboard': 'pages/dashboard.html',
  'admin':     'pages/admin.html'
};

async function navigate(hash, force = false) {
  hash = (hash || '').replace(/^#\/?/, '');
  const [page, param] = hash.split('/');
  const route = page || '';

  if (route === _currentRoute && !force) return;

  const src = ROUTES[route];
  if (!src) { navigate('home', true); return; }

  const app = document.getElementById('app');
  app.classList.add('transitioning');

  await new Promise(r => setTimeout(r, 150));

  try {
    let html;
    if (_pageCache[src]) {
      html = _pageCache[src];
    } else {
      const res = await fetch(src);
      html = await res.text();
      _pageCache[src] = html;
    }

    app.innerHTML = html;

    // Execute inline <script> tags (innerHTML does not run scripts)
    app.querySelectorAll('script').forEach(oldScript => {
      const newScript = document.createElement('script');
      [...oldScript.attributes].forEach(attr => newScript.setAttribute(attr.name, attr.value));
      newScript.textContent = oldScript.textContent;
      oldScript.replaceWith(newScript);
    });

    app.classList.remove('transitioning');
    window.scrollTo({ top: 0, behavior: 'instant' });

    _currentRoute = route;

    // Track page view
    trackPageView('#' + hash).catch(() => {});

    // Update nav active state
    updateNavActive(route);

    // Run page init
    const inits = {
      '':          initHome,
      'home':      initHome,
      'about':     initAbout,
      'catalog':   initCatalog,
      'product':   () => initProduct(param),
      'cart':      initCart,
      'dashboard': initDashboard,
      'admin':     initAdmin
    };
    if (inits[route]) inits[route]();

    applyStrings();
    initScrollAnimations();
  } catch (e) {
    console.error('[Router] Failed to load page:', src, e);
    app.innerHTML = '<div class="container section text-center"><h2>Page not found</h2></div>';
    app.classList.remove('transitioning');
  }
}

function updateNavActive(route) {
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.route === route || (route === '' && el.dataset.route === 'home'));
  });
}

// ── Navbar scroll effect ──────────────────────────────────────
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hamburger
  const burger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      mobileNav.classList.toggle('open');
    });
    mobileNav.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove('open');
        mobileNav.classList.remove('open');
      });
    });
  }

  // Nav link clicks
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.nav));
  });
}

// ── Hash routing ──────────────────────────────────────────────
window.addEventListener('hashchange', () => navigate(location.hash));

// ── Page Initialisers (stubs — full logic in page HTML) ──────

function initHome()      { setTimeout(() => document.dispatchEvent(new Event('page:home')), 50); }
function initAbout()     { setTimeout(() => document.dispatchEvent(new Event('page:about')), 50); }
function initCatalog()   { setTimeout(() => document.dispatchEvent(new Event('page:catalog')), 50); }
function initProduct(id) { setTimeout(() => document.dispatchEvent(new CustomEvent('page:product', { detail: { id } })), 50); }
function initCart()      { setTimeout(() => document.dispatchEvent(new Event('page:cart')), 50); }
function initDashboard() { setTimeout(() => document.dispatchEvent(new Event('page:dashboard')), 50); }
function initAdmin()     { setTimeout(() => document.dispatchEvent(new Event('page:admin')), 50); }

// ── Global nav helper ─────────────────────────────────────────
window.navigate = navigate;

// ── Boot ──────────────────────────────────────────────────────
async function boot() {
  await loadStrings(_lang);
  initNavbar();
  applyStrings();

  // Cart icon click
  const cartBtn = document.getElementById('cart-btn');
  if (cartBtn) cartBtn.addEventListener('click', () => navigate('cart'));

  // Start cinematic initialization sequence
  runInitializationSequence();
}

document.addEventListener('DOMContentLoaded', boot);

// ── Animations & Tracking ─────────────────────────────────────
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  document.querySelectorAll('.animate-on-scroll:not(.is-visible)').forEach(el => {
    observer.observe(el);
  });
}

async function trackTraffic() {
  if (sessionStorage.getItem('pa_tracked')) return;
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const visitData = {
      ip: data.ip,
      location: `${data.city}, ${data.region}, ${data.country_name}`,
      device: isMobile ? 'Mobile' : 'Desktop',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    
    console.log('[Analytics] New Visit recorded:', visitData);
    
    // In production, send to Firebase:
    // await db.collection('traffic').add(visitData);
    
    sessionStorage.setItem('pa_tracked', 'true');
  } catch(e) {
    console.warn('Traffic tracking failed', e);
  }
}

// ── Chatbot & Lead Catcher ────────────────────────────────────
function initLeadCatcherTimer() {
  // 10 Second Lead Catcher
  if (!sessionStorage.getItem('pa_lead_shown')) {
    setTimeout(() => {
      const leadModal = document.getElementById('lead-modal');
      if (leadModal) {
        leadModal.classList.remove('hidden');
        sessionStorage.setItem('pa_lead_shown', 'true');
      }
    }, 10000);
  }
}

document.addEventListener('DOMContentLoaded', () => {

  // Handle Lead Form
  const leadForm = document.getElementById('lead-form');
  if (leadForm) {
    leadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = leadForm.querySelector('button');
      const originalText = btn.textContent;
      btn.textContent = "Sending...";
      btn.disabled = true;

      const data = {
        name: document.getElementById('lead-name').value,
        phone: document.getElementById('lead-phone').value,
        location: document.getElementById('lead-location').value,
        service: document.getElementById('lead-service').value,
        timestamp: new Date().toISOString()
      };

      try {
        console.log('[Lead Captured]', data);
        
        // Save to localStorage for Admin Panel simulation
        let leads = [];
        try { leads = JSON.parse(localStorage.getItem('pa_leads') || '[]'); } catch(e){}
        leads.unshift(data);
        localStorage.setItem('pa_leads', JSON.stringify(leads));

        await new Promise(r => setTimeout(r, 1000)); // Simulate network
        
        closeModal('lead-modal');
        showToast('Thank you! Our expert will contact you soon.', 'success');
      } catch (err) {
        showToast('Something went wrong. Please try again.', 'error');
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  }

  // Chatbot logic
  const chatBtn = document.getElementById('chatbot-btn');
  const chatWindow = document.getElementById('chatbot-window');
  const chatClose = document.getElementById('chatbot-close');
  const chatSend = document.getElementById('chat-send');
  const chatInput = document.getElementById('chat-input');
  const chatBody = document.getElementById('chat-body');

  let chatState = 'INIT';
  let chatData = { name: '', phone: '', product: '', address: '', payment: '' };

  function toggleChat() {
    chatWindow.classList.toggle('open');
    if (chatWindow.classList.contains('open')) {
      chatInput.focus();
      // On first open, try to get lead data
      if (chatState === 'INIT') {
        try {
          const leads = JSON.parse(localStorage.getItem('pa_leads') || '[]');
          if (leads.length > 0) {
            const lead = leads[0];
            chatData.name = lead.name;
            chatData.phone = lead.phone;
          }
        } catch(e) {}
        
        chatBody.innerHTML = '';
        if (chatData.name) {
          chatState = 'ASK_PRODUCT';
          appendBotMessage(`Namaste ${chatData.name}! What product or service are you looking for today?`, [
            'Ortho Secure Capsule', 'Arshas Cure Capsule', 'Taka Tak Powder', 'Consultation'
          ]);
        } else {
          chatState = 'ASK_NAME';
          appendBotMessage(`Namaste! Welcome to Padmanabh Ayurvedics. May I know your name?`);
        }
      }
    }
  }

  if (chatBtn) chatBtn.addEventListener('click', toggleChat);
  if (chatClose) chatClose.addEventListener('click', toggleChat);

  window.handleChatOption = function(option) {
    if (chatInput) {
      chatInput.value = option;
      sendChatMessage();
    }
  };

  function appendBotMessage(text, options = []) {
    const botMsg = document.createElement('div');
    botMsg.className = 'chat-msg bot';
    let html = text;
    if (options.length > 0) {
      html += `<div class="chat-options" style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">`;
      options.forEach(opt => {
        html += `<button class="btn btn-outline btn-sm" onclick="handleChatOption('${opt}')" style="text-align:left; font-size:0.8rem; padding:6px 10px;">${opt}</button>`;
      });
      html += `</div>`;
    }
    botMsg.innerHTML = html;
    chatBody.appendChild(botMsg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg user';
    userMsg.textContent = text;
    chatBody.appendChild(userMsg);
    chatInput.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;

    // Process State
    setTimeout(() => {
      switch(chatState) {
        case 'ASK_NAME':
          chatData.name = text;
          chatState = 'ASK_PHONE';
          appendBotMessage(`Thank you, ${chatData.name}. Could you please share your WhatsApp number?`);
          break;
        case 'ASK_PHONE':
          chatData.phone = text;
          chatState = 'ASK_PRODUCT';
          appendBotMessage(`Got it! What product or service are you looking for today?`, [
            'Ortho Secure Capsule', 'Arshas Cure Capsule', 'Taka Tak Powder',
            'Bone Setting Relief Oil', 'Ashwagandha Vitality Capsules',
            'Joint Care Combo Pack', 'Consultation / Bone Setting'
          ]);
          break;
        case 'ASK_PRODUCT':
          chatData.product = text;
          if (text === 'Consultation') {
            chatState = 'CLOSE_DEAL';
            appendBotMessage(`We'll schedule your consultation shortly. Our expert will contact you on ${chatData.phone}. Is there anything else?`, ['No, thanks', 'Shop Products']);
          } else {
            chatState = 'ASK_ADDRESS';
            // Try adding to cart
            if (window.Store && Store.getCachedProducts) {
              const prods = Store.getCachedProducts();
              const p = prods.find(x => x.name.toLowerCase().includes(text.toLowerCase()) || text.toLowerCase().includes(x.name.toLowerCase()));
              if (p) {
                Store.addToCart(p);
                appendBotMessage(`I've noted your interest in ${text} and added it to your cart! Could you please provide your full delivery address?`);
              } else {
                appendBotMessage(`I've noted your interest in ${text}. Could you please provide your full delivery address?`);
              }
            } else {
              appendBotMessage(`I've noted your interest in ${text}. Could you please provide your full delivery address?`);
            }
          }
          break;
        case 'ASK_ADDRESS':
          chatData.address = text;
          chatState = 'ASK_PAYMENT';
          appendBotMessage(`Thank you. How would you like to pay?`, ['Cash on Delivery (COD)', 'Online Payment (Razorpay)']);
          break;
        case 'ASK_PAYMENT':
          chatData.payment = text;
          chatState = 'CLOSE_DEAL';
          // Save order to localStorage
          try {
            const cartItems = Store.getCart();
            const cartTotal = Store.getCartTotal();
            const shipping = cartTotal >= 499 ? 0 : 60;
            const orderId = 'ORD' + Date.now();
            const newOrder = {
              id: orderId,
              customerName: chatData.name,
              customerPhone: chatData.phone,
              address: chatData.address,
              payment: text,
              items: cartItems.length > 0 ? cartItems : [{ name: chatData.product, qty: 1, price: 0, image: '' }],
              subtotal: cartTotal,
              shipping,
              total: cartTotal + shipping,
              status: 'pending',
              trackingId: '',
              createdAt: new Date().toISOString()
            };
            let orders = [];
            try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e){}
            orders.unshift(newOrder);
            localStorage.setItem('pa_orders', JSON.stringify(orders));
            // Also save user to user_db
            let users = [];
            try { users = JSON.parse(localStorage.getItem('pa_user_db') || '[]'); } catch(e){}
            if (!users.find(u => u.phone === chatData.phone)) {
              users.push({ name: chatData.name, phone: chatData.phone, registeredOn: new Date().toISOString() });
              localStorage.setItem('pa_user_db', JSON.stringify(users));
            }
            appendBotMessage(`✅ Order #${orderId.slice(-6).toUpperCase()} confirmed! Payment: ${text}. Delivering to: ${chatData.address}. We'll send updates to ${chatData.phone}. Check "My Orders" to track your order. Thank you for choosing Padmanabh Ayurvedics! 🌿`);
          } catch(e) {
            appendBotMessage(`Perfect! Your order is confirmed using ${text}. We will send updates to ${chatData.phone}. Thank you for choosing Padmanabh Ayurvedics!`);
          }
          break;
        case 'CLOSE_DEAL':
          if (text === 'Shop Products') {
             chatState = 'ASK_PRODUCT';
             if (window.navigate) navigate('catalog');
             toggleChat();
          } else {
             appendBotMessage(`Thank you! Have a great day ahead.`);
          }
          break;
        default:
          appendBotMessage(`I am here to help you with your Ayurvedic journey.`);
      }
    }, 800);
  }

  if (chatSend) chatSend.addEventListener('click', sendChatMessage);
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendChatMessage();
    });
  }
});
