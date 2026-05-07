/* ============================================================
   PADMANABH AYURVEDICS — ADMIN JS
   Neural Hub Logic · Auth · Analytics · CRUD · Drag/Drop
   ============================================================ */

let _adminTopProductsChart = null;
let _adminStatusDonut = null;
let _adminPaymentDonut = null;
let _adminTrafficChart = null;
let _adminProducts = [];
let _adminImages = []; 
let _historyProducts = [];

// Global Login Function (exposed early)
window.loginWithAuth0 = async function() {
  Auth0Helper.login('#admin');
};

async function logoutWithAuth0() {
  Auth0Helper.logout('#admin');
}
window.logoutWithAuth0 = logoutWithAuth0;

document.addEventListener('page:admin', initAdminHub);

async function initAdminHub() {
  console.log('[Admin] Initializing Neural Hub...');

  // Auto-login for local development
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      window.location.hostname === '' ||
      window.location.protocol === 'file:') {
    sessionStorage.setItem('pa_admin_auth', 'true');
    sessionStorage.setItem('pa_auth_provider', 'local');
  }

  document.title = 'Neural Hub — Padmanabh Ayurvedics';

  try {
    // Handle Auth0 Redirect Callback
    const user = await Auth0Helper.handleCallback();
    if (user) {
      sessionStorage.setItem('pa_admin_auth', 'true');
      sessionStorage.setItem('pa_auth_provider', 'auth0');
    }

    const isAuth = sessionStorage.getItem('pa_admin_auth') === 'true';
    const provider = sessionStorage.getItem('pa_auth_provider');

    // Verify Auth0 session if that was the provider
    let finalAuth = isAuth;
    if (isAuth && provider === 'auth0') {
      const user = await Auth0Helper.getUser();
      if (!user) {
        sessionStorage.removeItem('pa_admin_auth');
        finalAuth = false;
      }
    }

    const loginView = document.getElementById('admin-login-view');
    const shellView = document.getElementById('admin-shell');

    console.log('[Admin] Auth state:', { finalAuth, provider });

    if (!finalAuth) {
      if (loginView) loginView.style.display = 'flex';
      if (shellView) shellView.style.display = 'none';
    } else {
      if (loginView) loginView.style.display = 'none';
      if (shellView) shellView.style.display = 'flex';
      loadAdminData();
    }
  } catch (err) {
    console.error('[Admin] Init error:', err);
    // Even if Auth0 fails, we should still show the login view
    const loginView = document.getElementById('admin-login-view');
    if (loginView) loginView.style.display = 'flex';
  }

  // Sidebar Tabs
  const sidebarItems = document.querySelectorAll('.sidebar-item[data-target]');
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      sidebarItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
      const target = document.getElementById(item.dataset.target);
      if (target) target.classList.add('active');

      // Refresh data on tab switch
      if (item.dataset.target === 'tab-history') loadHistory();
      if (item.dataset.target === 'tab-finance') initFinanceAndLedger();
      if (item.dataset.target === 'tab-retarget') initRetargetTab();
      if (item.dataset.target === 'tab-users') loadAdminUsers();
      if (item.dataset.target === 'tab-orders') loadAdminOrders();
      if (item.dataset.target === 'tab-teammates') loadTeammates();
      if (item.dataset.target === 'tab-analytics') { renderAnalytics(30); renderOrderAnalytics(30); }
      
      if (window.innerWidth < 768) {
        document.getElementById('admin-sidebar').classList.remove('mobile-open');
      }
    });
  });

  // Sidebar toggle
  const toggleBtn = document.getElementById('sidebar-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const sb = document.getElementById('admin-sidebar');
      if (window.innerWidth < 768) {
        sb.classList.toggle('mobile-open');
      } else {
        sb.classList.toggle('collapsed');
      }
    });
  }

  // Traffic chart filters
  document.getElementById('chart-filters')?.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;
    if (e.target.id === 'btn-custom-range') {
      document.getElementById('custom-date-picker').classList.toggle('hidden');
      return;
    }
    e.currentTarget.querySelectorAll('.date-filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById('custom-date-picker').classList.add('hidden');
    renderAnalytics(e.target.dataset.days);
  });

  document.getElementById('btn-apply-custom')?.addEventListener('click', () => {
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    if (!start || !end) {
      showToast('Please select both dates', 'warning');
      return;
    }
    renderAnalytics('custom', { start, end });
  });

  // Order chart filters
  document.getElementById('order-chart-filters')?.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;
    e.currentTarget.querySelectorAll('.date-filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    renderOrderAnalytics(e.target.dataset.days);
  });

  // Image Upload handler
  const fileIn = document.getElementById('img-file-input');
  if (fileIn) {
    fileIn.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (_adminImages.length >= 4) {
        showToast('Maximum 4 images allowed', 'warning');
        return;
      }

      showToast('Uploading image...', 'info');
      try {
        const reader = new FileReader();
        reader.onload = (ev) => {
          _adminImages.push(ev.target.result);
          renderImagePreview();
          showToast('Image added', 'success');
        };
        reader.readAsDataURL(file);
      } catch (err) {
        showToast('Upload failed', 'error');
      }
      fileIn.value = '';
    });
  }
}

// Delegated Login Handler (more robust than direct assignment)
document.addEventListener('submit', e => {
  if (e.target.id === 'admin-login-form') {
    e.preventDefault();
    console.log('[Admin] Intercepted login submission');
    const u = document.getElementById('admin-user').value;
    const p = document.getElementById('admin-pass').value;
    const loginView = document.getElementById('admin-login-view');
    const shellView = document.getElementById('admin-shell');

    if (u === 'admin' && p === 'Inafa2026') {
      sessionStorage.setItem('pa_admin_auth', 'true');
      sessionStorage.setItem('pa_auth_provider', 'local');
      if (loginView) loginView.style.display = 'none';
      if (shellView) shellView.style.display = 'flex';
      loadAdminData();
      showToast('Logged in successfully', 'success');
    } else {
      showToast('Invalid credentials', 'error');
    }
  }
});

function adminLogout() {
  const provider = sessionStorage.getItem('pa_auth_provider');
  if (provider === 'auth0') {
    logoutWithAuth0();
  } else {
    sessionStorage.removeItem('pa_admin_auth');
    sessionStorage.removeItem('pa_auth_provider');
    location.reload();
  }
}
window.adminLogout = adminLogout;

// ── 1. Analytics ──────────────────────────────────────────────
async function loadAdminData() {
  // Fix: Wait for Chart.js CDN to be available
  const waitForChart = () => new Promise(resolve => {
    if (window.Chart) return resolve();
    const check = setInterval(() => {
      if (window.Chart) { clearInterval(check); resolve(); }
    }, 100);
    setTimeout(() => { clearInterval(check); resolve(); }, 5000);
  });
  await waitForChart();
  await waitForChart();
  renderAnalytics(30);
  renderOrderAnalytics(30);
  loadShipmentTracker();
  loadProductsTable();
  loadHeroConfig();
  loadLeads();
  loadAdminOrders();
  loadAdminUsers();
}

// ── Order Analytics ────────────────────────────────────────────
let _adminOrdersChart = null;

function renderOrderAnalytics(days = 30) {
  if (!window.Chart) {
    setTimeout(() => renderOrderAnalytics(days), 300);
    return;
  }

  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}

  const now = new Date();
  let filtered = [];

  if (days === 'lifetime') {
    filtered = orders;
  } else {
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - parseInt(days));
    filtered = orders.filter(o => new Date(o.createdAt) >= cutoff);
  }

  // ─── KPI Cards ─────────────────────────────────────────
  const totalOrders  = filtered.length;
  const totalRevenue = filtered.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const avgOrder     = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;
  const pending      = filtered.filter(o => !o.status || o.status === 'pending').length;

  const el = id => document.getElementById(id);
  if (el('o-total'))   el('o-total').textContent   = totalOrders;
  if (el('o-revenue')) el('o-revenue').textContent = '\u20B9' + totalRevenue.toLocaleString('en-IN');
  if (el('o-avg'))     el('o-avg').textContent     = '\u20B9' + avgOrder.toLocaleString('en-IN');
  if (el('o-pending')) el('o-pending').textContent = pending;

  // ─── Delivery KPI Cards ─────────────────────────────────────
  const delivered  = filtered.filter(o => (o.status||'') === 'delivered').length;
  const inTransit  = filtered.filter(o => (o.status||'') === 'shipped').length;
  const processing = filtered.filter(o => (o.status||'') === 'processing').length;
  const cancelled  = filtered.filter(o => (o.status||'') === 'cancelled').length;
  if (el('o-delivered'))  el('o-delivered').textContent  = delivered;
  if (el('o-transit'))    el('o-transit').textContent    = inTransit;
  if (el('o-processing')) el('o-processing').textContent = processing;
  if (el('o-cancelled'))  el('o-cancelled').textContent  = cancelled;

  // ─── Orders Over Time (line chart) ─────────────────────
  let oLabels = [], oValues = [];
  if (filtered.length > 0) {
    const dailyMap = {};
    const dayCount = days === 'lifetime' ? Math.max(30, Math.ceil((now - new Date(filtered[filtered.length-1].createdAt)) / (1000*60*60*24))) : parseInt(days);
    
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().slice(0, 10)] = 0;
    }
    filtered.forEach(o => {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      if (key in dailyMap) dailyMap[key]++;
    });
    oLabels = Object.keys(dailyMap).sort();
    oValues = oLabels.map(k => dailyMap[k]);
  }

  _adminOrdersChart?.destroy();
  const owrap = document.getElementById('order-chart-wrapper');
  if (owrap) owrap.innerHTML = '<canvas id="orders-chart"></canvas>';
  const oCtx = document.getElementById('orders-chart');
  if (oCtx && oLabels.length > 0) {
    _adminOrdersChart = new Chart(oCtx, {
      type: 'line',
      data: {
        labels: oLabels,
        datasets: [{
          label: 'Orders',
          data: oValues,
          borderColor: '#64a435',
          backgroundColor: 'rgba(100,164,53,0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#64a435',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // ─── Top Products by Revenue (horizontal bar) ───────────
  const productRevMap = {};
  filtered.forEach(o => {
    (o.items || []).forEach(item => {
      const name = item.name || 'Unknown';
      productRevMap[name] = (productRevMap[name] || 0) + (item.qty * (item.price || 0));
    });
  });
  const sortedProds = Object.entries(productRevMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 6);
  const pLabels = sortedProds.map(([n]) => n.length > 20 ? n.slice(0, 18) + '\u2026' : n);
  const pValues = sortedProds.map(([, v]) => v);

  _adminTopProductsChart?.destroy();
  const tpwrap = document.getElementById('top-products-chart-wrapper');
  if (tpwrap) tpwrap.innerHTML = '<canvas id="top-products-chart"></canvas>';
  const tpCtx = document.getElementById('top-products-chart');
  if (tpCtx) {
    if (sortedProds.length === 0) {
      tpwrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.85rem">No data</div>';
    } else {
      _adminTopProductsChart = new Chart(tpCtx, {
        type: 'bar',
        data: {
          labels: pLabels,
          datasets: [{
            label: 'Revenue (\u20B9)',
            data: pValues,
            backgroundColor: '#64a435',
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { grid: { display: false } }
          }
        }
      });
    }
  }

  // ─── Status & Payment Donuts (simplified for brevity) ────
  // ... similar logic for status and payment mapping ...
}

async function renderAnalytics(type, customRange = null) {
  if (!window.Chart) {
    setTimeout(() => renderAnalytics(type, customRange), 300);
    return;
  }
  
  let data;
  if (type === 'custom' && customRange) {
    // Manually calculate custom range from local data
    data = await calculateCustomAnalytics(customRange.start, customRange.end);
  } else {
    data = await getAnalyticsSummary(type === 'lifetime' ? 3650 : parseInt(type));
  }

  // Counters
  document.getElementById('m-today').textContent = data.viewsToday;
  document.getElementById('m-lifetime').textContent = data.lifetimeViews;
  document.getElementById('m-active').textContent = data.activeSessions;
  document.getElementById('m-carts').textContent = data.cartAdds;

  // Chart
  _adminTrafficChart?.destroy();
  const wrapper = document.getElementById('chart-wrapper');
  if (wrapper) wrapper.innerHTML = '<canvas id="traffic-chart"></canvas>';
  const ctx = document.getElementById('traffic-chart');
  if (!ctx) return;

  const labels = Object.keys(data.dailyViews).sort();
  const values = labels.map(k => data.dailyViews[k]);

  _adminTrafficChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Views',
        data: values,
        backgroundColor: '#64a435',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

async function calculateCustomAnalytics(startStr, endStr) {
  // In a real app, this would be a Firestore query. 
  // Here we simulate it by using getAnalyticsSummary and filtering.
  const summary = await getAnalyticsSummary(365);
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  const dailyViews = {};
  Object.keys(summary.dailyViews).forEach(date => {
    const d = new Date(date);
    if (d >= start && d <= end) dailyViews[date] = summary.dailyViews[date];
  });
  
  return { ...summary, dailyViews };
}

async function loadLeads() {
  const tbody = document.getElementById('leads-tbody');
  if (!tbody) return;

  let leads = [];
  try {
    leads = JSON.parse(localStorage.getItem('pa_leads') || '[]');
  } catch (e) {}

  if (leads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:24px;color:var(--text-muted)">No leads found yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = leads.map(lead => {
    const d = new Date(lead.timestamp);
    const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    return `
      <tr>
        <td style="color:var(--text-muted);font-size:0.85rem">${dateStr}</td>
        <td style="font-weight:500;color:var(--gold)">${lead.name}</td>
        <td>${lead.phone}</td>
        <td>${lead.location}</td>
        <td><span class="pill pill-success">${lead.service}</span></td>
      </tr>
    `;
  }).join('');
}

// ── 2. Product CRUD ───────────────────────────────────────────
async function loadProductsTable() {
  _adminProducts = await getProducts();
  const tbody = document.getElementById('admin-product-body');
  if (!tbody) return;

  if (_adminProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:40px">No products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = _adminProducts.map((p, idx) => `
    <tr data-id="${p.id}" draggable="true" ondragstart="dragStart(event, ${idx})" ondragover="dragOver(event)" ondrop="drop(event, ${idx})">
      <td class="drag-handle" title="Drag to reorder">⋮⋮</td>
      <td><img src="${p.images?.[0] || ''}" referrerpolicy="no-referrer" class="table-product-thumb" alt=""/></td>
      <td style="font-weight:500;color:var(--text-primary)">${p.name}</td>
      <td style="text-transform:uppercase;font-size:0.75rem;color:var(--text-muted)">${p.category}</td>
      <td>₹${p.price}</td>
      <td>${(p.weight || 0.5).toFixed(1)} kg</td>
      <td>
        <span class="pill ${p.inStock ? 'pill-success' : 'pill-error'}">
          ${p.inStock ? 'In Stock' : 'Out'}
        </span>
      </td>
      <td>
        <div class="table-actions" style="justify-content:flex-end">
          <button class="tbl-btn tbl-btn-edit" onclick="editProduct('${p.id}')">Edit</button>
          <button class="tbl-btn tbl-btn-del" onclick="softDeleteProduct('${p.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openProductModal() {
  document.getElementById('pm-title').textContent = 'Add Product';
  document.getElementById('product-form').reset();
  document.getElementById('pm-id').value = '';
  _adminImages = [];
  renderImagePreview();
  document.getElementById('product-modal').classList.remove('hidden');
}
window.openProductModal = openProductModal;



function closeProductModal() {
  document.getElementById('product-modal').classList.add('hidden');
}
window.closeProductModal = closeProductModal;

function editProduct(id) {
  const p = _adminProducts.find(x => x.id === id);
  if (!p) return;

  document.getElementById('pm-title').textContent = 'Edit Product';
  document.getElementById('pm-id').value = p.id;
  document.getElementById('pm-name').value = p.name;
  if(document.getElementById('pm-name-hi')) document.getElementById('pm-name-hi').value = p.nameHi || '';
  if(document.getElementById('pm-name-mr')) document.getElementById('pm-name-mr').value = p.nameMr || '';
  document.getElementById('pm-price').value = p.price;
  if(document.getElementById('pm-mrp')) document.getElementById('pm-mrp').value = p.mrp || '';
  document.getElementById('pm-cat').value = p.category;
  document.getElementById('pm-stock').value = p.inStock ? 'true' : 'false';
  if(document.getElementById('pm-weight')) document.getElementById('pm-weight').value = p.weight || 0.5;
  if(document.getElementById('pm-desc')) document.getElementById('pm-desc').value = p.description || '';
  if(document.getElementById('pm-usage')) document.getElementById('pm-usage').value = p.usage || '';
  if(document.getElementById('pm-ing')) document.getElementById('pm-ing').value = p.ingredients || '';

  _adminImages = [...(p.images || [])];
  renderImagePreview();

  document.getElementById('product-modal').classList.remove('hidden');
}
window.editProduct = editProduct;

function renderImagePreview() {
  const grid = document.getElementById('pm-img-preview');
  if (!grid) return;
  grid.innerHTML = _adminImages.map((src, i) => `
    <div class="image-preview-item">
      <img src="${src}" referrerpolicy="no-referrer" alt=""/>
      <button type="button" class="image-preview-remove" onclick="removeImage(${i})">×</button>
    </div>
  `).join('');
}
window.renderImagePreview = renderImagePreview;

function removeImage(idx) {
  _adminImages.splice(idx, 1);
  renderImagePreview();
}
window.removeImage = removeImage;

function convertGDriveUrl(url) {
  if (!url) return '';
  // Already in a usable direct format — return as-is
  if (url.includes('lh3.googleusercontent.com')) return url;
  if (url.includes('drive.google.com/thumbnail')) return url;
  if (url.includes('drive.usercontent.google.com')) return url;
  // Extract file ID from share link (/d/ID/) or query param (?id=ID or &id=ID)
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    // lh3.googleusercontent.com is confirmed working for public Drive files.
    // img tags MUST have referrerpolicy="no-referrer" or Google blocks the request.
    return `https://lh3.googleusercontent.com/d/${match[1]}=s800`;
  }
  return url;
}
window.convertGDriveUrl = convertGDriveUrl;

function addGDriveImage() {
  const input = document.getElementById('pm-gdrive-input');
  if (!input) return;
  const url = input.value.trim();
  if (!url) return;
  
  if (_adminImages.length >= 4) {
    showToast('Maximum 4 images allowed.');
    return;
  }
  
  const directUrl = convertGDriveUrl(url);
  _adminImages.push(directUrl);
  input.value = '';
  renderImagePreview();
}
window.addGDriveImage = addGDriveImage;

async function saveProduct() {
  const form = document.getElementById('product-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const btn = document.getElementById('btn-save-product');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const id = document.getElementById('pm-id').value;
  const data = {
    name:        document.getElementById('pm-name').value,
    nameHi:      document.getElementById('pm-name-hi')?.value || '',
    nameMr:      document.getElementById('pm-name-mr')?.value || '',
    price:       Number(document.getElementById('pm-price').value),
    mrp:         Number(document.getElementById('pm-mrp')?.value) || null,
    category:    document.getElementById('pm-cat').value,
    weight:      Number(document.getElementById('pm-weight')?.value) || 0.5,
    inStock:     document.getElementById('pm-stock').value === 'true',
    description: document.getElementById('pm-desc')?.value || '',
    usage:       document.getElementById('pm-usage')?.value || '',
    ingredients: document.getElementById('pm-ing')?.value || '',
    images:      _adminImages
  };

  try {
    if (id) {
      await updateProduct(id, data);
      showToast('Product updated', 'success');
    } else {
      await addProduct(data);
      showToast('Product added', 'success');
    }
    closeProductModal();
    loadProductsTable();
    Store.loadProducts(); // Refresh storefront cache
  } catch (e) {
    console.error('Failed to save product:', e);
    showToast(`Failed to save product: ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Product';
  }
}
window.saveProduct = saveProduct;

async function softDeleteProduct(id) {
  if (!confirm('Move this product to History Archive?')) return;
  try {
    await deleteProduct(id);
    showToast('Product moved to history', 'info');
    loadProductsTable();
    Store.loadProducts();
  } catch (e) {
    console.error('Delete failed:', e);
    showToast(`Delete failed: ${e.message}`, 'error');
  }
}
window.softDeleteProduct = softDeleteProduct;

// Drag & Drop Reordering
let _dragSourceIdx = null;

function dragStart(e, idx) {
  _dragSourceIdx = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.target.style.opacity = '0.5';
}
window.dragStart = dragStart;

function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const tr = e.target.closest('tr');
  if (tr) tr.classList.add('drag-over');
}
window.dragOver = dragOver;

async function drop(e, targetIdx) {
  e.preventDefault();
  document.querySelectorAll('tr').forEach(tr => {
    tr.style.opacity = '1';
    tr.classList.remove('drag-over');
  });

  if (_dragSourceIdx === null || _dragSourceIdx === targetIdx) return;

  const item = _adminProducts.splice(_dragSourceIdx, 1)[0];
  _adminProducts.splice(targetIdx, 0, item);

  // Optimistic UI update
  const tbody = document.getElementById('admin-product-body');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center">Updating order...</td></tr>';

  try {
    await updateProductOrder(_adminProducts.map(p => p.id));
    loadProductsTable();
    Store.loadProducts();
  } catch (err) {
    showToast('Failed to update order', 'error');
    loadProductsTable();
  }
}
window.drop = drop;

// ── 3. Hero Config ────────────────────────────────────────────
async function loadHeroConfig() {
  const config = await getHeroConfig();

  const dImages = Array.isArray(config.desktopBanner) ? config.desktopBanner : (config.desktopBanner ? [config.desktopBanner] : []);
  const mImages = Array.isArray(config.mobileBanner) ? config.mobileBanner : (config.mobileBanner ? [config.mobileBanner] : []);

  document.getElementById('desktop-banner-inputs').innerHTML = '';
  document.getElementById('mobile-banner-inputs').innerHTML = '';

  if (dImages.length === 0) addBannerInput('desktop', '');
  else dImages.forEach(img => addBannerInput('desktop', img));

  if (mImages.length === 0) addBannerInput('mobile', '');
  else mImages.forEach(img => addBannerInput('mobile', img));

  updateBannerPreview('desktop');
  updateBannerPreview('mobile');

  const grid = document.getElementById('collection-config-grid');
  if (!grid) return;

  const cats = config.collections || [];
  let html = '';
  for (let i = 0; i < 4; i++) {
    const c = cats[i] || { title: '', image: '', category: 'wellness' };
    html += `
      <div class="collection-config-item" data-idx="${i}">
        <div class="collection-config-thumb">
          <img src="${c.image || ''}" id="cc-img-${i}" alt="Collection Image" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>
        </div>
        <div class="collection-config-body form-group" style="padding-top:12px">
          <label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;text-transform:uppercase;">GDrive Image Link</label>
          <input type="text" class="form-input mb-4" id="cc-img-input-${i}" value="${c.image || ''}" placeholder="Paste GDrive View Link" oninput="document.getElementById('cc-img-${i}').src = convertGDriveUrl(this.value)"/>
          <p class="text-muted" style="font-size:0.7rem;margin-bottom:12px;">Recommended size: 600x600px (1:1 ratio)</p>

          <label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;text-transform:uppercase;">Title</label>
          <input type="text" class="form-input mb-8" id="cc-title-${i}" value="${c.title}" placeholder="Collection Title"/>
          
          <label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;text-transform:uppercase;margin-top:4px;">Category Route</label>
          <select class="form-select" id="cc-cat-${i}">
            <option value="wellness" ${c.category==='wellness'?'selected':''}>Wellness</option>
            <option value="skincare" ${c.category==='skincare'?'selected':''}>Skincare</option>
            <option value="haircare" ${c.category==='haircare'?'selected':''}>Haircare</option>
            <option value="immunity" ${c.category==='immunity'?'selected':''}>Immunity</option>
          </select>
        </div>
      </div>
    `;
  }
  grid.innerHTML = html;

  // Add listeners to main image inputs
  ['desktop', 'mobile'].forEach(type => {
    const mainInput = document.getElementById(`input-${type}-img`);
    if(mainInput) {
      mainInput.addEventListener('input', e => {
        document.getElementById(`preview-${type}`).innerHTML = `<img src="${e.target.value}" alt=""/>`;
      });
    }
  });
}

async function saveHeroConfigAdmin() {
  const btn = document.getElementById('btn-save-hero');
  btn.disabled = true;
  btn.textContent = 'Publishing...';

  const desktopLines = Array.from(document.querySelectorAll('.banner-input-desktop')).map(el => el.value.trim()).filter(Boolean);
  const mobileLines = Array.from(document.querySelectorAll('.banner-input-mobile')).map(el => el.value.trim()).filter(Boolean);

  const data = {
    desktopBanner: desktopLines.map(convertGDriveUrl),
    mobileBanner:  mobileLines.map(convertGDriveUrl),
    collections: []
  };

  for (let i = 0; i < 4; i++) {
    data.collections.push({
      title:    document.getElementById(`cc-title-${i}`).value.trim(),
      image:    convertGDriveUrl(document.getElementById(`cc-img-input-${i}`).value.trim()),
      category: document.getElementById(`cc-cat-${i}`).value
    });
  }

  try {
    await saveHeroConfig(data);
    showToast('Hero config updated', 'success');
  } catch (e) {
    showToast('Failed to save config', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Publish Changes';
  }
}
window.saveHeroConfigAdmin = saveHeroConfigAdmin;

window.addBannerInput = function(type, value = '') {
  const container = document.getElementById(`${type}-banner-inputs`);
  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.gap = '8px';
  div.innerHTML = `
    <input type="text" class="form-input banner-input-${type}" style="flex:1" placeholder="GDrive Image Link" value="${value}"/>
    <button class="btn btn-outline" style="padding:0 12px;color:var(--danger)" onclick="this.parentElement.remove();updateBannerPreview('${type}')">X</button>
  `;
  container.appendChild(div);
  div.querySelector('input').addEventListener('input', () => updateBannerPreview(type));
};

window.updateBannerPreview = function(type) {
  const inputs = document.querySelectorAll(`.banner-input-${type}`);
  if (inputs.length > 0 && inputs[0].value) {
    document.getElementById(`preview-${type}`).innerHTML = `<img src="${convertGDriveUrl(inputs[0].value)}" alt=""/>`;
  } else {
    document.getElementById(`preview-${type}`).innerHTML = '';
  }
};

// ── 4. History Archive ────────────────────────────────────────
async function loadHistory() {
  const tbody = document.getElementById('admin-history-body');
  tbody.innerHTML = '<tr><td colspan="4" class="history-empty">Loading...</td></tr>';

  _historyProducts = await getDeletedProducts();

  if (_historyProducts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="history-empty">Archive is empty.</td></tr>';
    return;
  }

  tbody.innerHTML = _historyProducts.map(p => {
    const d = p.updatedAt ? p.updatedAt.toDate().toLocaleDateString() : 'Unknown';
    return `
      <tr>
        <td><img src="${p.images?.[0] || ''}" referrerpolicy="no-referrer" class="table-product-thumb" alt=""/></td>
        <td style="color:var(--text-primary);font-weight:500">${p.name}</td>
        <td>${d}</td>
        <td>
          <div class="table-actions" style="justify-content:flex-end">
            <button class="tbl-btn tbl-btn-restore" onclick="restoreProduct('${p.id}')">Republish</button>
            <button class="tbl-btn tbl-btn-del" onclick="permDeleteProduct('${p.id}')">Permanently Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function restoreProduct(id) {
  try {
    await republishProduct(id);
    showToast('Product restored', 'success');
    loadHistory();
    loadProductsTable(); // Update memory array
    Store.loadProducts();
  } catch (e) {
    showToast('Restore failed', 'error');
  }
}
window.restoreProduct = restoreProduct;

async function permDeleteProduct(id) {
  if (!confirm('Permanently delete this product? This action CANNOT be undone.')) return;
  try {
    await permanentDeleteProduct(id);
    showToast('Product permanently deleted', 'success');
    loadHistory();
  } catch (e) {
    showToast('Delete failed', 'error');
  }
}
window.permDeleteProduct = permDeleteProduct;

// ── 5. Orders Management ─────────────────────────────────────
async function loadAdminOrders() {
  const tbody = document.getElementById('admin-orders-body');
  if (!tbody) return;

  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:40px;color:var(--text-muted)">No orders yet.</td></tr>`;
    return;
  }

  const renderOrders = (orderList) => {
    tbody.innerHTML = orderList.map(o => {
      const d = new Date(o.createdAt).toLocaleDateString();
      const statusClass = o.status === 'delivered' ? 'pill-success' : (o.status === 'shipped' || o.status === 'in transit') ? 'pill-gold' : o.status === 'processing' ? 'pill-warning' : 'pill-muted';
      return `
        <tr>
          <td style="font-weight:600;color:var(--gold)">#${o.id.slice(-6).toUpperCase()}</td>
          <td>${o.customerName || 'Guest'}<br><span style="font-size:0.75rem;color:var(--text-muted)">${o.customerPhone || ''}</span></td>
          <td>${d}</td>
          <td>₹${o.total}</td>
          <td><span style="font-size:0.8rem">${o.payment || 'COD'}</span></td>
          <td><span class="pill ${statusClass}">${(o.status || 'pending').toUpperCase()}</span></td>
          <td>
            <div style="display:flex;gap:6px;justify-content:flex-end">
              <button class="tbl-btn tbl-btn-edit" onclick="adminViewOrder('${o.id}')">Details</button>
              <button class="tbl-btn" style="background:rgba(100,164,53,0.15);color:var(--gold)" onclick="generateInvoice('${o.id}')">Invoice</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  // Immediate render
  renderOrders(orders);

  // Background sync tracking
  let changed = false;
  if (window.Shiprocket) {
    await Promise.allSettled(orders.map(async (o) => {
      if (o.trackingId && !['delivered', 'cancelled', 'rto'].includes(o.status?.toLowerCase())) {
        try {
          const trackData = await window.Shiprocket.trackAWB(o.trackingId);
          if (trackData && trackData.statusText) {
            const newStatus = trackData.delivered ? 'delivered' : trackData.statusText.toLowerCase();
            if (o.status !== newStatus) {
              o.status = newStatus;
              changed = true;
            }
          }
        } catch (e) {
          console.warn('[Sync] Tracking failed for', o.trackingId);
        }
      }
    }));
    
    if (changed) {
      localStorage.setItem('pa_orders', JSON.stringify(orders));
      renderOrders(orders); // Re-render with updated statuses
    }
  }
}
window.loadAdminOrders = loadAdminOrders;

function adminViewOrder(orderId) {
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}
  const o = orders.find(x => x.id === orderId);
  if (!o) return;

  const itemsHtml = (o.items || []).map(item => `
    <div class="order-item-row">
      <img src="${item.image || 'https://via.placeholder.com/48'}" class="order-item-thumb" alt=""/>
      <div style="flex:1">
        <div style="font-weight:500">${item.name}</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">Qty: ${item.qty} × ₹${item.price}</div>
      </div>
      <div style="font-weight:600">₹${item.qty * item.price}</div>
    </div>
  `).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay order-detail-modal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Order #${o.id.slice(-6).toUpperCase()}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <div class="order-info-grid">
          <div class="order-info-item"><div class="order-info-label">Customer</div><div class="order-info-value">${o.customerName || 'Guest'}</div></div>
          <div class="order-info-item"><div class="order-info-label">Phone</div><div class="order-info-value">${o.customerPhone || '-'}</div></div>
          <div class="order-info-item"><div class="order-info-label">Payment</div><div class="order-info-value">${o.payment || 'COD'}</div></div>
          <div class="order-info-item"><div class="order-info-label">Date</div><div class="order-info-value">${new Date(o.createdAt).toLocaleString()}</div></div>
        </div>
        <div class="order-info-item" style="margin-bottom:16px"><div class="order-info-label">Delivery Address</div><div class="order-info-value">${o.address || '-'}</div></div>
        <div style="font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">Items Ordered</div>
        <div class="order-items-list">${itemsHtml}</div>
        <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--text-muted)">Subtotal</span><span>₹${o.subtotal || o.total}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--text-muted)">Shipping</span><span>${(o.shipping || 0) === 0 ? 'FREE' : '₹' + o.shipping}</span></div>
          <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.05rem"><span>Total</span><span style="color:var(--gold)">₹${o.total}</span></div>
        </div>
        <div style="margin-top:20px">
          <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:6px">SHIPROCKET TRACKING ID (AWB)</label>
          <div style="display:flex;gap:8px">
            <input type="text" id="awb-input-${o.id}" class="form-input" value="${o.trackingId || ''}" placeholder="Enter AWB number" style="flex:1"/>
            <button class="btn btn-primary" onclick="saveTracking('${o.id}')">Save</button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Close</button>
        <button class="btn btn-primary" onclick="generateInvoice('${o.id}')">📄 Generate Invoice</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
window.adminViewOrder = adminViewOrder;

function saveTracking(orderId) {
  const input = document.getElementById(`awb-input-${orderId}`);
  if (!input) return;
  const awb = input.value.trim();
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}
  const o = orders.find(x => x.id === orderId);
  if (o) {
    o.trackingId = awb;
    o.status = awb ? 'shipped' : o.status;
    localStorage.setItem('pa_orders', JSON.stringify(orders));
    showToast('Tracking ID saved!', 'success');
    loadAdminOrders();
  }
}
window.saveTracking = saveTracking;

function generateInvoice(orderId) {
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}
  const o = orders.find(x => x.id === orderId);
  if (!o) return;

  // CORRECT CALCULATIONS
  const itemsSubtotal = (o.items || []).reduce((s, item) => s + (item.qty * (item.price || 0)), 0);
  const gst = Math.round(itemsSubtotal * 0.18); // 18% GST
  const shipping = Number(o.shipping) || 0;
  const grandTotal = itemsSubtotal + gst + shipping;

  const itemRows = (o.items || []).map(item => `
    <tr>
      <td>${item.name}</td>
      <td style="text-align:center">${item.qty}</td>
      <td style="text-align:right">₹${item.price}</td>
      <td style="text-align:right">₹${item.qty * item.price}</td>
    </tr>
  `).join('');

  const invoiceHtml = `
    <div class="invoice-wrap" id="invoice-content" style="padding: 40px; color: #333; background: white;">
      <div class="invoice-header">
        <div>
          <div style="font-size: 1.8rem; font-weight: 700; color: #000;">Padmanabh Ayurvedics</div>
          <div style="font-size:0.85rem; color:#666; margin-top:8px; line-height: 1.4;">
            Dr. A.P.J. Abdul Kalam Chauk, Nagardeole<br>
            Ahilyanagar, Maharashtra 414003<br>
            GSTIN: 27AAAAA0000A1Z5
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">TAX INVOICE</div>
          <div style="font-size: 0.9rem;">Invoice #: <strong>INV-${o.id.slice(-6).toUpperCase()}</strong></div>
          <div style="font-size: 0.9rem;">Date: <strong>${new Date(o.createdAt).toLocaleDateString('en-IN')}</strong></div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 40px 0;">
        <div>
          <div style="font-size: 0.75rem; text-transform: uppercase; color: #888; font-weight: 700; margin-bottom: 8px; letter-spacing: 1px;">Billed To</div>
          <div style="font-size: 1rem; font-weight: 700;">${o.customerName || 'Valued Customer'}</div>
          <div style="font-size: 0.9rem; color: #555; margin-top: 4px;">
            Phone: ${o.customerPhone || 'N/A'}<br>
            ${o.address || 'Address not provided'}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.75rem; text-transform: uppercase; color: #888; font-weight: 700; margin-bottom: 8px; letter-spacing: 1px;">Shipment Details</div>
          <div style="font-size: 0.9rem; color: #555;">
            AWB: ${o.trackingId || 'Pending'}<br>
            Method: ${o.payment || 'Standard'}<br>
            Status: ${(o.status || 'Pending').toUpperCase()}
          </div>
        </div>
      </div>

      <table class="invoice-table" style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #000;">Description</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #000;">Qty</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #000;">Unit Price</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #000;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="display: flex; justify-content: flex-end;">
        <div style="width: 300px;">
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Subtotal</span>
            <span>₹${itemsSubtotal.toLocaleString('en-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">GST (18%)</span>
            <span>₹${gst.toLocaleString('en-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Shipping</span>
            <span>${shipping === 0 ? 'FREE' : '₹' + shipping.toLocaleString('en-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 1.25rem; font-weight: 700; color: #000;">
            <span>Grand Total</span>
            <span>₹${grandTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.8rem; color: #888; text-align: center;">
        This is a computer-generated invoice. No signature required.<br>
        <strong>Padmanabh Ayurvedics</strong> | Contact: +91 98765 43210 | Website: padmanabhayurvedics.com
      </div>
    </div>
  `;

  // Use the existing modal structure if possible, or create a temporary one for printing
  const modal = document.createElement('div');
  modal.className = 'modal-overlay no-print-overlay';
  modal.style.zIndex = '9999';
  modal.innerHTML = `
    <div class="modal" style="max-width:850px; background: white;">
      <div class="modal-header no-print" style="background: #f8f9fa;">
        <h3 class="modal-title" style="color: #333;">Preview Invoice</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body" style="padding:0">${invoiceHtml}</div>
      <div class="modal-footer no-print">
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Close</button>
        <button class="btn btn-primary" onclick="downloadInvoicePDF('${o.id}')">⬇ Download PDF</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
window.generateInvoice = generateInvoice;

function downloadInvoicePDF(orderId) {
  const invoiceElement = document.getElementById('invoice-content');
  if (!invoiceElement) return;
  
  const btn = event.currentTarget;
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Generating...';
  btn.disabled = true;

  // Load html2pdf dynamically if not present
  if (typeof html2pdf === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => executePDFDownload(invoiceElement, orderId, btn, originalText);
    document.body.appendChild(script);
  } else {
    executePDFDownload(invoiceElement, orderId, btn, originalText);
  }
}
window.downloadInvoicePDF = downloadInvoicePDF;

function executePDFDownload(element, orderId, btn, originalText) {
  const opt = {
    margin:       10,
    filename:     `Invoice_${orderId}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    btn.innerHTML = originalText;
    btn.disabled = false;
    showToast('PDF Downloaded successfully!', 'success');
  }).catch(err => {
    console.error('PDF Generation Error:', err);
    btn.innerHTML = originalText;
    btn.disabled = false;
    showToast('Failed to generate PDF', 'error');
  });
}
window.executePDFDownload = executePDFDownload;

// ── 6. Users Database ─────────────────────────────────────────
function loadAdminUsers() {
  const tbody = document.getElementById('admin-users-body');
  if (!tbody) return;

  let users = [];
  try { users = JSON.parse(localStorage.getItem('pa_user_db') || '[]'); } catch(e) {}

  // Also extract users from orders (chatbot-created)
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}
  
  // Merge by phone
  const phoneMap = {};
  orders.forEach(o => {
    if (o.customerPhone) {
      if (!phoneMap[o.customerPhone]) {
        phoneMap[o.customerPhone] = { name: o.customerName, phone: o.customerPhone, orderCount: 0, registeredOn: o.createdAt };
      }
      phoneMap[o.customerPhone].orderCount++;
    }
  });
  users.forEach(u => {
    if (!phoneMap[u.phone]) phoneMap[u.phone] = { ...u, orderCount: 0 };
  });

  const allUsers = Object.values(phoneMap);

  if (allUsers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:40px;color:var(--text-muted)">No users yet. Users appear when orders are placed or leads are captured.</td></tr>`;
    return;
  }

  tbody.innerHTML = allUsers.map(u => `
    <tr>
      <td style="font-weight:500;color:var(--text-primary)">${u.name || '-'}</td>
      <td>${u.phone || u.email || '-'}</td>
      <td style="color:var(--text-muted);font-size:0.82rem">${u.registeredOn ? new Date(u.registeredOn).toLocaleDateString() : 'Lead Only'}</td>
      <td><span style="font-weight:600;color:var(--gold)">${u.orderCount || 0}</span></td>
      <td><span class="pill pill-success">Active</span></td>
    </tr>
  `).join('');
}
window.loadAdminUsers = loadAdminUsers;

// ══════════════════════════════════════════════════════════════
// LIVE SHIPMENT TRACKER
// ══════════════════════════════════════════════════════════════

const STATUS_META = {
  pending:    { label: 'Pending',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  processing: { label: 'Processing', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  shipped:    { label: 'In Transit', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  delivered:  { label: 'Delivered',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  cancelled:  { label: 'Cancelled',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
};

function getStatusBadge(status) {
  const s = STATUS_META[status] || STATUS_META.pending;
  return `<span style="
    display:inline-flex;align-items:center;gap:5px;
    padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;
    background:${s.bg};color:${s.color};border:1px solid ${s.color}33;
    white-space:nowrap">
    <span style="width:6px;height:6px;border-radius:50%;background:${s.color};display:inline-block"></span>
    ${s.label}
  </span>`;
}

function loadShipmentTracker() {
  const tbody = document.getElementById('shipment-tracker-body');
  if (!tbody) return;

  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:40px;color:var(--text-muted)">
      No orders yet. Orders placed via the chatbot will appear here.
    </td></tr>`;
    return;
  }

  // Sort newest first
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  tbody.innerHTML = orders.map((o, idx) => {
    const orderId    = o.id || ('ORD-' + String(idx + 1).padStart(4, '0'));
    const customer   = o.customerName || o.name || 'Unknown';
    const phone      = o.customerPhone || o.phone || '-';
    const awb        = o.trackingId || o.awb || '-';
    const status     = (o.status || 'pending').toLowerCase();
    const itemCount  = (o.items || []).reduce((s, i) => s + (i.qty || 1), 0);
    const itemNames  = (o.items || []).slice(0, 2).map(i => i.name).join(', ') + ((o.items||[]).length > 2 ? ' +more' : '');
    const updatedAt  = o.updatedAt || o.createdAt || null;
    const timeStr    = updatedAt ? new Date(updatedAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '-';
    const hasAwb     = awb !== '-';

    return `<tr id="row-${orderId}">
      <td style="font-family:monospace;font-size:0.8rem;color:var(--gold)">${orderId}</td>
      <td>
        <div style="font-weight:600;color:var(--text-primary)">${customer}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">${new Date(o.createdAt||Date.now()).toLocaleDateString('en-IN')}</div>
      </td>
      <td style="color:var(--text-secondary)">${phone}</td>
      <td>
        <div style="font-size:0.82rem;color:var(--text-secondary)">${itemNames || '-'}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${itemCount} item${itemCount !== 1 ? 's' : ''}</div>
      </td>
      <td>
        ${hasAwb
          ? `<span style="font-family:monospace;font-size:0.8rem;background:var(--bg-elevated);padding:3px 8px;border-radius:4px;border:1px solid var(--border)">${awb}</span>`
          : `<span style="color:var(--text-muted);font-size:0.8rem">Not assigned</span>`}
      </td>
      <td id="status-${orderId}">${getStatusBadge(status)}</td>
      <td id="updated-${orderId}" style="color:var(--text-muted);font-size:0.8rem">${timeStr}</td>
      <td>
        <div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
          ${hasAwb ? `<button class="tbl-btn tbl-btn-edit" onclick="trackSingleOrder('${awb}','${orderId}')" title="Track on Shiprocket">🔍 Track</button>` : ''}
          ${status !== 'delivered' ? `<button class="tbl-btn tbl-btn-restore" onclick="markDelivered('${orderId}')" title="Mark as Delivered">✅ Delivered</button>` : ''}
          ${status === 'pending' ? `<button class="tbl-btn" style="border-color:rgba(59,130,246,0.3);color:#3b82f6" onclick="markShipped('${orderId}')" title="Mark as Shipped">🚚 Ship</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}
window.loadShipmentTracker = loadShipmentTracker;

// Track a single shipment via Shiprocket public URL
function trackSingleOrder(awb, orderId) {
  // Try Shiprocket public tracking page
  const url = `https://shiprocket.co/tracking/${awb}`;
  window.open(url, '_blank');

  // Also try to fetch real-time status via proxy if configured
  if (typeof ShiprocketHelper !== 'undefined' && !url.includes('YOUR_REGION')) {
    const cell = document.getElementById('status-' + orderId);
    if (cell) cell.innerHTML = `<span style="color:var(--text-muted);font-size:0.8rem">⏳ Fetching…</span>`;

    ShiprocketHelper.trackShipment(awb).then(data => {
      const activity = data?.tracking_data?.shipment_track_activities?.[0];
      const rawStatus = (activity?.activity || 'unknown').toLowerCase();
      let mapped = 'processing';
      if (rawStatus.includes('deliver')) mapped = 'delivered';
      else if (rawStatus.includes('transit') || rawStatus.includes('out for')) mapped = 'shipped';
      else if (rawStatus.includes('cancel')) mapped = 'cancelled';
      if (cell) cell.innerHTML = getStatusBadge(mapped);
      _persistOrderStatus(orderId, mapped, activity?.date);
    }).catch(() => {});
  }
}
window.trackSingleOrder = trackSingleOrder;

// Mark an order as shipped
function markShipped(orderId) {
  _persistOrderStatus(orderId, 'processing', new Date().toISOString());
  const cell = document.getElementById('status-' + orderId);
  if (cell) cell.innerHTML = getStatusBadge('processing');
  const upd = document.getElementById('updated-' + orderId);
  if (upd) upd.textContent = new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  showToast('Order marked as Processing');
  renderOrderAnalytics(30);
}
window.markShipped = markShipped;

// Mark an order as delivered
function markDelivered(orderId) {
  _persistOrderStatus(orderId, 'delivered', new Date().toISOString());
  const cell = document.getElementById('status-' + orderId);
  if (cell) cell.innerHTML = getStatusBadge('delivered');
  const upd = document.getElementById('updated-' + orderId);
  if (upd) upd.textContent = new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  showToast('Order marked as Delivered ✅');
  renderOrderAnalytics(30);
}
window.markDelivered = markDelivered;

// Persist status change to localStorage
function _persistOrderStatus(orderId, status, updatedAt) {
  try {
    let orders = JSON.parse(localStorage.getItem('pa_orders') || '[]');
    orders = orders.map(o => {
      const oid = o.id || ('ORD-' + String(orders.indexOf(o) + 1).padStart(4, '0'));
      if (oid === orderId || o.id === orderId) {
        return { ...o, status, updatedAt: updatedAt || new Date().toISOString() };
      }
      return o;
    });
    localStorage.setItem('pa_orders', JSON.stringify(orders));
  } catch(e) { console.warn('[Tracker] persist error:', e); }
}

// Refresh all tracked shipments (those with AWB)
async function refreshAllTracking() {
  const btn = document.getElementById('btn-refresh-tracking');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Refreshing…'; }

  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}

  const tracked = orders.filter(o => o.trackingId || o.awb);

  if (tracked.length === 0) {
    showToast('No orders with AWB numbers to track yet.');
    if (btn) { btn.disabled = false; btn.innerHTML = '🔄 Refresh All'; }
    return;
  }

  let refreshed = 0;
  for (const order of tracked) {
    const awb = order.trackingId || order.awb;
    const orderId = order.id || 'ORD-0001';
    try {
      if (typeof ShiprocketHelper !== 'undefined') {
        const data = await ShiprocketHelper.trackShipment(awb);
        const activity = data?.tracking_data?.shipment_track_activities?.[0];
        const rawStatus = (activity?.activity || '').toLowerCase();
        let mapped = order.status || 'processing';
        if (rawStatus.includes('deliver')) mapped = 'delivered';
        else if (rawStatus.includes('transit') || rawStatus.includes('out for')) mapped = 'shipped';
        else if (rawStatus.includes('cancel')) mapped = 'cancelled';
        _persistOrderStatus(orderId, mapped, activity?.date);
        refreshed++;
      }
    } catch(e) { /* skip individual errors */ }
  }

  loadShipmentTracker();
  renderOrderAnalytics(30);
  if (btn) { btn.disabled = false; btn.innerHTML = '🔄 Refresh All'; }
  showToast(refreshed > 0 ? `Updated ${refreshed} shipment(s) ✅` : 'Tracking updated from local data');
}
window.refreshAllTracking = refreshAllTracking;

// Dummy Order Generator
window.addDummyOrder = function() {
  const dummy = {
    id: 'ORD-' + Math.floor(Math.random() * 1000000),
    customerName: 'Aarav Sharma',
    customerPhone: '+91 98765 43210',
    address: '12/A, Lotus Apartments, MG Road, Bangalore, 560001',
    payment: 'Prepaid (Razorpay)',
    status: 'processing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    trackingId: '',
    items: [
      { name: 'Ashwagandha Elixir', qty: 2, price: 899, image: 'assets/products/ashwa.webp' },
      { name: 'Kumkumadi Tailam', qty: 1, price: 1299, image: 'assets/products/kumkumadi.webp' }
    ],
    subtotal: 3097,
    shipping: 0,
    total: 3097
  };
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}
  orders.unshift(dummy);
  localStorage.setItem('pa_orders', JSON.stringify(orders));
  
  // Refresh views
  if (typeof loadAdminOrders === 'function') loadAdminOrders();
  if (typeof renderOrderAnalytics === 'function') renderOrderAnalytics(30);
  if (typeof loadShipmentTracker === 'function') loadShipmentTracker();
  
  showToast('Dummy order added successfully!', 'success');
};

// Helper toast (reuse existing or create simple one)
function showToast(msg) {
  let t = document.getElementById('admin-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'admin-toast';
    t.style.cssText = `position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(20px);
      background:var(--bg-elevated);border:1px solid var(--border-gold);color:var(--text-primary);
      padding:12px 24px;border-radius:40px;font-size:0.85rem;font-weight:500;
      box-shadow:0 8px 32px rgba(0,0,0,0.4);z-index:9999;opacity:0;
      transition:all 0.3s ease;pointer-events:none;white-space:nowrap`;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 3000);
}
window.showToast = showToast;


/* ------------------------------------------------------------
   New Feature Implementations for Finance, Retargeting, Backup & System Management
   ------------------------------------------------------------ */

// ── 1. Finance KPI Calculations ────────────────────────────────────────
function calculateFinanceKPIs() {
  // Load orders
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}

  const now = new Date();
  // Helper to get month key "YYYY-MM"
  const monthKey = d => `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;

  // Group orders by month
  const monthly = {};
  orders.forEach(o => {
    const d = new Date(o.createdAt);
    const key = monthKey(d);
    monthly[key] = (monthly[key] || 0) + (Number(o.total) || 0);
  });

  // MRR = revenue of the most recent month
  const monthKeys = Object.keys(monthly).sort();
  const lastMonthKey = monthKeys[monthKeys.length - 1];
  const mrr = lastMonthKey ? monthly[lastMonthKey] : 0;
  const arr = mrr * 12;

  // Churn Rate: customers who ordered in previous month but not in current month
  const prevMonthKey = monthKeys[monthKeys.length - 2];
  const customersByMonth = {};
  orders.forEach(o => {
    const d = new Date(o.createdAt);
    const key = monthKey(d);
    const phone = o.customerPhone || o.customerEmail || o.id;
    if (!customersByMonth[key]) customersByMonth[key] = new Set();
    customersByMonth[key].add(phone);
  });
  let churnRate = 0;
  if (prevMonthKey && lastMonthKey) {
    const prev = customersByMonth[prevMonthKey] || new Set();
    const cur = customersByMonth[lastMonthKey] || new Set();
    const lost = [...prev].filter(p => !cur.has(p)).length;
    churnRate = prev.size ? (lost / prev.size) * 100 : 0;
  }

  // Avg profit per order – assuming 20% profit margin for demo purposes
  const totalRevenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const avgOrder = orders.length ? totalRevenue / orders.length : 0;
  const avgProfit = avgOrder * 0.20; // 20% margin

  // Update UI
  const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  setText('fin-mrr', '₹' + mrr.toLocaleString('en-IN'));
  setText('fin-arr', '₹' + arr.toLocaleString('en-IN'));
  setText('fin-churn', churnRate.toFixed(1) + '%');
  setText('fin-profit', '₹' + Math.round(avgProfit).toLocaleString('en-IN'));
}

// ── 2. Cash Flow Forecast (Simple Moving Average) ─────────────────────
function renderCashFlowForecast(months = 3) {
  // Prepare historical monthly revenue
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}
  const monthKey = d => `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
  const monthlyMap = {};
  orders.forEach(o => {
    const key = monthKey(new Date(o.createdAt));
    monthlyMap[key] = (monthlyMap[key] || 0) + (Number(o.total) || 0);
  });
  const sortedMonths = Object.keys(monthlyMap).sort();
  if (sortedMonths.length === 0) return; // Prevent NaN errors when no data

  const labels = [];
  const values = [];
  sortedMonths.forEach(m => { labels.push(m); values.push(monthlyMap[m]); });

  // Simple Moving Average forecast based on last 3 months (or available count)
  const smaPeriod = Math.min(3, values.length);
  const recentVals = values.slice(-smaPeriod);
  const sma = recentVals.reduce((a,b)=>a+b,0)/smaPeriod || 0;
  const forecastLabels = [];
  const forecastValues = [];
  for (let i = 1; i <= months; i++) {
    const futureMonth = new Date(sortedMonths[sortedMonths.length-1]);
    futureMonth.setMonth(futureMonth.getMonth() + i);
    const key = monthKey(futureMonth);
    forecastLabels.push(key);
    forecastValues.push(Math.round(sma));
  }

  // Combine for chart
  const allLabels = labels.concat(forecastLabels);
  const historicalDataset = { label: 'Historical', data: values, borderColor: '#64a435', backgroundColor: 'rgba(100,164,53,0.1)', fill: true };
  const forecastDataset = { label: 'SMA Forecast', data: new Array(labels.length).fill(null).concat(forecastValues), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', borderDash: [6,4], fill: false };

  // Render chart
  const ctx = document.getElementById('cashflow-chart');
  if (!ctx) return;
  if (window._adminCashflowChart) window._adminCashflowChart.destroy();
  window._adminCashflowChart = new Chart(ctx, {
    type: 'line',
    data: { labels: allLabels, datasets: [historicalDataset, forecastDataset] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => '₹' + v } } }
    }
  });
}

// Hook cash‑flow filter buttons
document.getElementById('forecast-filters')?.addEventListener('click', e => {
  if (e.target.tagName !== 'BUTTON') return;
  const months = parseInt(e.target.dataset.months);
  // Update active state
  e.currentTarget.querySelectorAll('.date-filter-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  renderCashFlowForecast(months);
});

// ── 3. Monthly Transaction Ledger ------------------------------------------------
function populateLedgerMonthSelect() {
  const select = document.getElementById('ledger-month-select');
  if (!select) return;
  const orders = JSON.parse(localStorage.getItem('pa_orders') || '[]');
  const months = new Set();
  orders.forEach(o => {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
    months.add(key);
  });
  const sorted = Array.from(months).sort().reverse();
  select.innerHTML = sorted.map(m => `<option value="${m}">${m}</option>`).join('');
  if (sorted.length) select.value = sorted[0];
}

function loadLedgerForMonth(monthKey) {
  const tbody = document.getElementById('ledger-tbody');
  const countEl = document.getElementById('ledger-count');
  const totalEl = document.getElementById('ledger-total');
  if (!tbody) return;
  const orders = JSON.parse(localStorage.getItem('pa_orders') || '[]');
  const filtered = orders.filter(o => {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
    return key === monthKey;
  });
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted)">No transactions for ${monthKey}</td></tr>`;
    countEl.textContent = '0';
    totalEl.textContent = '₹0';
    return;
  }
  tbody.innerHTML = filtered.map(o => {
    const d = new Date(o.createdAt).toLocaleDateString();
    return `
      <tr>
        <td>#${o.id.slice(-6).toUpperCase()}</td>
        <td>${d}</td>
        <td>${o.customerName || '-'}<br><span style="font-size:0.75rem;color:var(--text-muted)">${o.customerPhone || ''}</span></td>
        <td>${(o.items||[]).map(i=>i.name).join(', ')}</td>
        <td>${o.payment || 'COD'}</td>
        <td>${o.status || 'pending'}</td>
        <td style="text-align:right;color:var(--gold)">₹${(Number(o.total)||0).toLocaleString('en-IN')}</td>
      </tr>`;
  }).join('');
  const total = filtered.reduce((s,o)=>s+(Number(o.total)||0),0);
  countEl.textContent = filtered.length + ' transactions';
  totalEl.textContent = '₹' + total.toLocaleString('en-IN');
}

// Ledger month change handler
document.getElementById('ledger-month-select')?.addEventListener('change', e => {
  loadLedgerForMonth(e.target.value);
});

function exportMonthlyReport() {
  // Use html2pdf to export the ledger table as PDF
  const ledgerDiv = document.getElementById('ledger-table');
  if (!ledgerDiv) return;
  const btn = event.currentTarget;
  const original = btn.innerHTML;
  btn.innerHTML = '⏳ Generating...';
  btn.disabled = true;

  const opt = { margin:10, filename:`Ledger_${document.getElementById('ledger-month-select').value}.pdf`, html2canvas:{scale:2}, jsPDF:{unit:'mm', format:'a4'} };
  html2pdf().set(opt).from(ledgerDiv).save().then(()=>{
    btn.innerHTML = original; btn.disabled = false; showToast('Ledger PDF generated', 'success');
  }).catch(err=>{ console.error(err); btn.innerHTML = original; btn.disabled = false; showToast('Failed to generate PDF', 'error'); });
}

// Initialize ledger on admin load
function initLedger() {
  populateLedgerMonthSelect();
  const select = document.getElementById('ledger-month-select');
  if (select && select.value) loadLedgerForMonth(select.value);
}

// ── 4. Retargeting (Repeat Order Insights) -----------------------------------
function applyRetargetFilters() {
  const minOrders = parseInt(document.getElementById('rt-min-orders').value) || 1;
  const minSpend = parseFloat(document.getElementById('rt-min-spend').value) || 0;
  const productFilter = document.getElementById('rt-product-filter').value;
  renderRetargetingTable(minOrders, minSpend, productFilter);
}

function renderRetargetingTable(minOrders = 1, minSpend = 0, product = '') {
  const tbody = document.getElementById('retarget-tbody');
  if (!tbody) return;
  // Aggregate orders by phone/email
  const orders = JSON.parse(localStorage.getItem('pa_orders') || '[]');
  const customers = {};
  orders.forEach(o => {
    const key = o.customerPhone || o.customerEmail || o.id;
    if (!customers[key]) customers[key] = { name: o.customerName || '-', phone: o.customerPhone || '-', email: o.customerEmail || '-', orders: [], total: 0 };
    customers[key].orders.push(o);
    customers[key].total += Number(o.total) || 0;
  });
  // Filter
  const filtered = Object.values(customers).filter(c => {
    if (c.orders.length < minOrders) return false;
    if (c.total < minSpend) return false;
    if (product) {
      const hasProd = c.orders.some(o => (o.items||[]).some(i => i.name.toLowerCase().includes(product.toLowerCase())));
      return hasProd;
    }
    return true;
  });

  // Update KPI cards
  const setKPI = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setKPI('rt-repeat', filtered.length);
  const avgOrders = filtered.reduce((s,c)=>s+c.orders.length,0) / (filtered.length || 1);
  setKPI('rt-avg-orders', avgOrders.toFixed(1));
  const topLTV = filtered.reduce((max,c)=> c.total > max ? c.total : max,0);
  setKPI('rt-top-ltv', '₹' + topLTV.toLocaleString('en-IN'));
  setKPI('rt-segment', filtered.length);

  // Render table rows
  tbody.innerHTML = filtered.map(c => {
    const lastOrder = c.orders[c.orders.length-1];
    const lastDate = lastOrder ? new Date(lastOrder.createdAt).toLocaleDateString() : '-';
    const productsBought = c.orders.flatMap(o=> (o.items||[]).map(i=>i.name)).join(', ');
    return `
      <tr>
        <td>${c.name}</td>
        <td>${c.phone}</td>
        <td>${c.email}</td>
        <td>${c.orders.length}</td>
        <td>${productsBought}</td>
        <td>${lastDate}</td>
        <td style="text-align:right;color:var(--gold)">₹${c.total.toLocaleString('en-IN')}</td>
        <td>🟢</td>
      </tr>`;
  }).join('') || `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">No customers match the criteria.</td></tr>`;
}

// Export CSV of retarget table
function exportRetargetCSV() {
  const rows = [];
  const header = ['Customer','Phone','Email','Orders','Products Bought','Last Order','Lifetime Value','Segment'];
  rows.push(header.join(','));
  const tbody = document.getElementById('retarget-tbody');
  if (!tbody) return;
  const trs = tbody.querySelectorAll('tr');
  trs.forEach(tr => {
    const cols = Array.from(tr.querySelectorAll('td')).map(td => `"${td.textContent.replace(/"/g,'""')}"`);
    if (cols.length) rows.push(cols.join(','));
  });
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'repeat_customers.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported', 'success');
}

// Populate product filter dropdown based on existing products
function populateProductFilter() {
  const select = document.getElementById('rt-product-filter');
  if (!select) return;
  const products = (window._adminProducts || []);
  const options = products.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
  select.innerHTML = `<option value="">All Products</option>` + options;
}

// Initialise retarget tab when displayed
function initRetargetTab() {
  populateProductFilter();
  applyRetargetFilters();
}

// Listen for tab activation
document.querySelectorAll('.sidebar-item[data-target="tab-retarget"]').forEach(item => {
  item.addEventListener('click', initRetargetTab);
});

// ── 5. Backup & Restore -------------------------------------------------------
function exportBackup(scope = 'all') {
  const data = {};
  if (scope === 'all' || scope === 'orders') data.orders = JSON.parse(localStorage.getItem('pa_orders') || '[]');
  if (scope === 'all' || scope === 'leads') data.leads = JSON.parse(localStorage.getItem('pa_leads') || '[]');
  if (scope === 'all' || scope === 'products') data.products = JSON.parse(localStorage.getItem('pa_products') || '[]');
  if (scope === 'all' || scope === 'hero') data.hero = JSON.parse(localStorage.getItem('pa_hero') || '[]');
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `pa_backup_${scope}_${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast(`Backup (${scope}) exported`, 'success');
}
window.exportBackup = exportBackup;

function handleRestoreFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const json = JSON.parse(e.target.result);
      // Confirm overwrite
      if (!confirm('This will overwrite existing data. Continue?')) return;
      if (json.orders) localStorage.setItem('pa_orders', JSON.stringify(json.orders));
      if (json.leads) localStorage.setItem('pa_leads', JSON.stringify(json.leads));
      if (json.products) localStorage.setItem('pa_products', JSON.stringify(json.products));
      if (json.hero) localStorage.setItem('pa_hero', JSON.stringify(json.hero));
      showToast('Data restored from backup', 'success');
      // Reload admin views
      loadAdminData();
    } catch(err) {
      console.error(err);
      showToast('Invalid backup file', 'error');
    }
  };
  reader.readAsText(file);
}
window.handleRestoreFile = handleRestoreFile;

// ── 6. UI Theme Switching ----------------------------------------------------
function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  // Update active button UI
  document.querySelectorAll('.theme-card').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}
window.applyTheme = applyTheme;

// ── 7. System Reset Workflow -------------------------------------------------
function startSystemReset() {
  document.getElementById('reset-step-1').classList.add('hidden');
  document.getElementById('reset-step-2').classList.remove('hidden');
}
window.startSystemReset = startSystemReset;

function confirmResetStep2() {
  const input = document.getElementById('reset-confirm-input');
  if (!input || input.value.trim() !== 'RESET ALL DATA') {
    showToast('Please type exactly "RESET ALL DATA" to proceed', 'warning');
    return;
  }
  document.getElementById('reset-step-2').classList.add('hidden');
  document.getElementById('reset-step-3').classList.remove('hidden');
}
window.confirmResetStep2 = confirmResetStep2;

function cancelReset() {
  // Reset UI to initial state
  document.getElementById('reset-step-1').classList.remove('hidden');
  document.getElementById('reset-step-2').classList.add('hidden');
  document.getElementById('reset-step-3').classList.add('hidden');
  const input = document.getElementById('reset-confirm-input');
  if (input) input.value = '';
  const pass = document.getElementById('reset-admin-pass');
  if (pass) pass.value = '';
}
window.cancelReset = cancelReset;

function executeSystemReset() {
  const pass = document.getElementById('reset-admin-pass').value;
  // Use the same admin password defined in login logic (Inafa2026)
  if (pass !== 'Inafa2026') {
    showToast('Incorrect admin password', 'error');
    return;
  }
  // Wipe all known keys
  const keys = ['pa_orders','pa_leads','pa_products','pa_user_db','pa_hero'];
  keys.forEach(k => localStorage.removeItem(k));
  showToast('All data wiped. Reloading…', 'success');
  setTimeout(() => location.reload(), 1500);
}
window.executeSystemReset = executeSystemReset;

// ── 8. Initialise Finance & Ledger on Admin Load ----------------------------
function initFinanceAndLedger() {
  calculateFinanceKPIs();
  renderCashFlowForecast(3); // default 3 months forecast
  initLedger();
}
// Call after admin data load
const _originalLoadAdminData = loadAdminData;
loadAdminData = async function() {
  await _originalLoadAdminData();
  initFinanceAndLedger();
};

// End of previous implementations

/* ============================================================
   PADMANABH AYURVEDICS — PRINTER MODULE
   WebUSB thermal printer · ESC/POS · Auto-print on order
   ============================================================ */

const PrinterManager = (() => {
  /* ── State ──────────────────────────────────────────────── */
  let _device   = null;     // WebUSB USBDevice
  let _interface = null;
  let _endpoint  = null;
  let _queue     = [];      // pending orders to print
  let _log       = [];      // recent print history
  let _connected = false;
  let _settings  = {};

  /* ── Constants ──────────────────────────────────────────── */
  const ESC = 0x1B, GS = 0x1D, LF = 0x0A, CR = 0x0D;

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    _loadSettings();
    _restoreLog();
    _renderLog();
    _renderQueue();
    _applySettingsToUI();

    // Restore a previously-paired device if browser remembers it
    if (navigator.usb) {
      navigator.usb.getDevices().then(devices => {
        if (devices.length > 0) {
          _tryConnectDevice(devices[0]);
        }
      });

      // Listen for plug events
      navigator.usb.addEventListener('connect',    e => { showToast('Printer plugged in', 'info'); _tryConnectDevice(e.device); });
      navigator.usb.addEventListener('disconnect', e => {
        if (_device && e.device === _device) {
          _device = null; _connected = false;
          _updateUI(false);
          showToast('Printer disconnected', 'warning');
        }
      });
    }
  }

  /* ── Settings ────────────────────────────────────────────── */
  function _loadSettings() {
    const saved = JSON.parse(localStorage.getItem('pa_printer_settings') || '{}');
    _settings = Object.assign({
      triggerOnline : true,
      triggerCOD    : true,
      triggerAdmin  : true,
      printHeader   : true,
      printAddress  : true,
      printItems    : true,
      printPayment  : true,
      printFooter   : true,
      paperWidth    : '80',
    }, saved);
  }

  function _saveSettings() {
    localStorage.setItem('pa_printer_settings', JSON.stringify(_settings));
  }

  function _applySettingsToUI() {
    const map = {
      'pt-online'    : 'triggerOnline',
      'pt-cod'       : 'triggerCOD',
      'pt-admin'     : 'triggerAdmin',
      'ps-header'    : 'printHeader',
      'ps-address'   : 'printAddress',
      'ps-items'     : 'printItems',
      'ps-payment'   : 'printPayment',
      'ps-footer'    : 'printFooter',
    };
    Object.entries(map).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!_settings[key];
    });
    const pw = document.getElementById('ps-paper-width');
    if (pw) pw.value = _settings.paperWidth || '80';
  }

  /* ── Connect / Disconnect ───────────────────────────────── */
  async function connect() {
    if (!navigator.usb) {
      showToast('WebUSB not supported. Use Chrome or Edge.', 'error');
      return;
    }
    try {
      const device = await navigator.usb.requestDevice({ filters: [] }); // show all USB devices
      await _tryConnectDevice(device);
    } catch (e) {
      if (e.name !== 'NotFoundError') {
        showToast('Could not connect: ' + e.message, 'error');
        _updateUI(false, 'error');
      }
    }
  }

  async function _tryConnectDevice(device) {
    try {
      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1);

      // Find bulk-out endpoint (ESC/POS printers expose one)
      let found = false;
      for (const iface of device.configuration.interfaces) {
        try { await device.claimInterface(iface.interfaceNumber); } catch {}
        for (const alt of iface.alternates) {
          const ep = alt.endpoints.find(e => e.direction === 'out' && e.type === 'bulk');
          if (ep) {
            _interface = iface;
            _endpoint  = ep;
            found = true;
            break;
          }
        }
        if (found) break;
      }

      if (!found) {
        showToast('No bulk-out endpoint found. Is this a thermal printer?', 'error');
        _updateUI(false, 'error');
        return;
      }

      _device    = device;
      _connected = true;
      _updateUI(true, device.productName || 'Thermal Printer');
      showToast('✅ Printer connected: ' + (device.productName || 'Thermal Printer'), 'success');

      // Flush any queued orders now that we're connected
      await _flushQueue();
    } catch (e) {
      console.error('[Printer] Connection error:', e);
      showToast('Connection failed: ' + e.message, 'error');
      _updateUI(false, 'error');
    }
  }

  async function disconnect() {
    if (_device) {
      try { await _device.close(); } catch {}
      _device    = null;
      _connected = false;
    }
    _updateUI(false);
    showToast('Printer disconnected', 'info');
  }

  /* ── UI State ────────────────────────────────────────────── */
  function _updateUI(connected, nameOrErr) {
    const banner     = document.getElementById('printer-banner');
    const bannerDot  = document.getElementById('printer-banner-dot');
    const bannerTitle= document.getElementById('printer-banner-title');
    const bannerSub  = document.getElementById('printer-banner-sub');
    const btnCon     = document.getElementById('btn-connect-printer');
    const btnDis     = document.getElementById('btn-disconnect-printer');
    const infoCard   = document.getElementById('printer-info-card');
    const sidebarDot = document.getElementById('sidebar-printer-dot');

    if (connected) {
      banner?.classList.add('connected');
      banner?.classList.remove('error');
      if (bannerTitle) bannerTitle.textContent = '🖨️ Printer Connected';
      if (bannerSub)   bannerSub.textContent   = nameOrErr || 'Ready to print';
      btnCon?.classList.add('hidden');
      btnDis?.classList.remove('hidden');
      infoCard?.classList.remove('hidden');

      // Fill info card
      if (_device) {
        const el = id => document.getElementById(id);
        if (el('pi-name'))      el('pi-name').textContent      = _device.productName || '—';
        if (el('pi-interface')) el('pi-interface').textContent = 'USB / WebUSB';
        if (el('pi-status'))    el('pi-status').textContent    = 'Online ✅';
        if (el('pi-paper'))     el('pi-paper').textContent     = (_settings.paperWidth || '80') + ' mm';
      }

      sidebarDot?.classList.add('connected');
      sidebarDot?.classList.remove('error');
      if (sidebarDot) sidebarDot.title = 'Printer connected';
    } else {
      banner?.classList.remove('connected');
      const isErr = nameOrErr === 'error';
      if (isErr) banner?.classList.add('error'); else banner?.classList.remove('error');
      if (bannerTitle) bannerTitle.textContent = isErr ? '⚠️ Printer Error' : 'No Printer Connected';
      if (bannerSub)   bannerSub.textContent   = isErr
        ? 'Check USB cable or driver and try reconnecting.'
        : 'Connect a USB / Bluetooth thermal printer to enable auto-printing.';
      btnCon?.classList.remove('hidden');
      btnDis?.classList.add('hidden');
      infoCard?.classList.add('hidden');

      sidebarDot?.classList.remove('connected');
      if (isErr) sidebarDot?.classList.add('error'); else sidebarDot?.classList.remove('error');
      if (sidebarDot) sidebarDot.title = isErr ? 'Printer error' : 'No printer connected';
    }
  }

  /* ── ESC/POS Helpers ─────────────────────────────────────── */
  function _txt(str) {
    // Encode string as Uint8Array (basic ASCII; extend for Unicode if needed)
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      bytes.push(code < 256 ? code : 63); // '?' for unsupported chars
    }
    return bytes;
  }

  function _buildSlip(order) {
    const paperW = parseInt(_settings.paperWidth) || 80;
    const cols   = paperW === 58 ? 32 : 48;
    const s      = _settings;

    const bytes = [];

    const push = (...args) => args.forEach(b => {
      if (Array.isArray(b)) b.forEach(x => bytes.push(x));
      else bytes.push(b);
    });

    const line = (txt = '') => { push(..._txt(txt.substring(0, cols))); push(LF); };
    const centre = (txt) => {
      const pad = Math.max(0, Math.floor((cols - txt.length) / 2));
      line(' '.repeat(pad) + txt);
    };
    const divider = () => line('─'.repeat(cols));
    const bold  = on => push(ESC, 0x45, on ? 1 : 0);
    const dblH  = on => push(ESC, 0x21, on ? 0x10 : 0x00);

    // Init
    push(ESC, 0x40); // ESC @ — reset printer

    // Header
    if (s.printHeader) {
      dblH(true); bold(true);
      centre('PADMANABH AYURVEDICS');
      dblH(false); bold(false);
      centre('Ayurvedic Wellness Products');
      centre('Tel: +91 00000 00000');
      divider();
    }

    // Order meta
    bold(true); line(`ORDER #${order.id || '—'}`); bold(false);
    line(`Date : ${new Date(order.date || order.createdAt || Date.now()).toLocaleString()}`);
    line(`Type : ${order.paymentMethod || 'Online'}`);

    // Customer
    if (s.printAddress) {
      divider();
      bold(true); line('CUSTOMER'); bold(false);
      line(`Name  : ${order.customerName || order.name || '—'}`);
      if (order.phone) line(`Phone : ${order.phone}`);
      if (order.email) line(`Email : ${order.email}`);
      if (order.address) line(`Addr  : ${String(order.address).substring(0, cols - 8)}`);
    }

    // Items
    if (s.printItems && order.items && order.items.length) {
      divider();
      bold(true); line('ITEMS'); bold(false);
      order.items.forEach(item => {
        const name = (item.name || item.productName || '').substring(0, cols - 12);
        const price = `${item.qty || 1} x ₹${item.price || 0}`;
        const pad   = Math.max(1, cols - name.length - price.length);
        line(name + ' '.repeat(pad) + price);
      });
      divider();
      const total = order.total || order.amount || 0;
      bold(true); line(`TOTAL: ₹${total}`); bold(false);
    }

    // Payment ref
    if (s.printPayment && order.paymentId) {
      divider();
      line(`Payment Ref: ${order.paymentId}`);
    }

    // Footer
    if (s.printFooter) {
      divider();
      centre('Thank you for your order!');
      centre('www.padmanabhayurvedics.com');
    }

    // Feed and cut
    push(LF, LF, LF);
    push(GS, 0x56, 0x42, 0x00); // Full cut

    return new Uint8Array(bytes);
  }

  /* ── Send bytes to printer ───────────────────────────────── */
  async function _sendBytes(data) {
    if (!_device || !_endpoint) throw new Error('Printer not connected');
    // Chunk into 512-byte packets (most USB printers require this)
    const chunkSize = 512;
    for (let offset = 0; offset < data.length; offset += chunkSize) {
      const chunk = data.slice(offset, offset + chunkSize);
      await _device.transferOut(_endpoint.endpointNumber, chunk);
    }
  }

  /* ── Print Queue ─────────────────────────────────────────── */
  async function _flushQueue() {
    if (!_connected || !_queue.length) return;
    const toSend = [..._queue];
    _queue = [];
    for (const entry of toSend) {
      await _printOrder(entry.order, entry.trigger, false);
    }
    _renderQueue();
  }

  async function flushQueuePublic() {
    if (!_connected) { showToast('Connect a printer first', 'warning'); return; }
    await _flushQueue();
    showToast('Print queue flushed', 'success');
  }

  function _enqueue(order, trigger) {
    _queue.push({ order, trigger });
    _renderQueue();
    showToast(`🖨️ Order #${order.id || '?'} queued for printing`, 'info');
  }

  function _renderQueue() {
    const el = document.getElementById('print-queue-list');
    if (!el) return;
    if (!_queue.length) {
      el.innerHTML = '<div style="color:var(--text-muted);font-size:0.82rem">Queue is empty</div>';
      return;
    }
    el.innerHTML = _queue.map((e,i) =>
      `<div style="font-size:0.82rem;padding:4px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
        <span>#${e.order.id || 'Order ' + (i+1)}</span>
        <span class="badge-print-queued">${e.trigger}</span>
      </div>`
    ).join('');
  }

  /* ── Print ───────────────────────────────────────────────── */
  async function _printOrder(order, trigger, enqueueIfOffline = true) {
    if (!_connected) {
      if (enqueueIfOffline) {
        _enqueue(order, trigger);
      }
      return;
    }
    try {
      const slip = _buildSlip(order);
      await _sendBytes(slip);
      _logPrint(order, trigger, 'ok');
      showToast(`🖨️ Slip printed for Order #${order.id || '?'}`, 'success');
    } catch (e) {
      console.error('[Printer] Print error:', e);
      _logPrint(order, trigger, 'fail');
      showToast('Print failed: ' + e.message, 'error');
      if (enqueueIfOffline) _enqueue(order, trigger);
    }
  }

  /* ── Auto-Print Hook (called from order-save logic) ─────── */
  function autoPrintOrder(order, trigger = 'online') {
    _loadSettings(); // refresh in case settings changed
    const allowed = (trigger === 'online' && _settings.triggerOnline)
                 || (trigger === 'cod'    && _settings.triggerCOD)
                 || (trigger === 'admin'  && _settings.triggerAdmin);
    if (!allowed) return;
    _printOrder(order, trigger, true);
  }

  /* ── Test Print ──────────────────────────────────────────── */
  async function testPrint() {
    const sample = {
      id          : 'TEST-001',
      date        : new Date().toISOString(),
      customerName: 'Sample Customer',
      phone       : '+91 98765 43210',
      email       : 'customer@example.com',
      address     : '123, MG Road, Pune, Maharashtra 411001',
      paymentMethod: 'Online (Razorpay)',
      paymentId   : 'pay_TESTID12345',
      items: [
        { name: 'Ashwagandha Churna', qty: 2, price: 299 },
        { name: 'Triphala Tablets',   qty: 1, price: 449 },
      ],
      total: 1047,
    };
    await _printOrder(sample, 'test', true);
  }

  /* ── Print Log ───────────────────────────────────────────── */
  function _logPrint(order, trigger, status) {
    _log.unshift({
      time    : new Date().toLocaleTimeString(),
      orderId : order.id || '—',
      customer: order.customerName || order.name || '—',
      trigger,
      status,
    });
    if (_log.length > 50) _log.pop();
    localStorage.setItem('pa_print_log', JSON.stringify(_log));
    _renderLog();
  }

  function _restoreLog() {
    try { _log = JSON.parse(localStorage.getItem('pa_print_log') || '[]'); } catch { _log = []; }
  }

  function _renderLog() {
    const tbody = document.getElementById('print-log-tbody');
    if (!tbody) return;
    if (!_log.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">No prints yet</td></tr>';
      return;
    }
    tbody.innerHTML = _log.map(entry => {
      const badge = entry.status === 'ok'     ? `<span class="badge-print-ok">✓ Printed</span>`
                  : entry.status === 'fail'   ? `<span class="badge-print-fail">✗ Failed</span>`
                  :                             `<span class="badge-print-queued">⏳ Queued</span>`;
      return `<tr>
        <td>${entry.time}</td>
        <td>#${entry.orderId}</td>
        <td>${entry.customer}</td>
        <td style="text-transform:capitalize">${entry.trigger}</td>
        <td>${badge}</td>
      </tr>`;
    }).join('');
  }

  /* ── Save Settings from UI ───────────────────────────────── */
  function saveSettingsFromUI() {
    _settings.triggerOnline = !!document.getElementById('pt-online')?.checked;
    _settings.triggerCOD    = !!document.getElementById('pt-cod')?.checked;
    _settings.triggerAdmin  = !!document.getElementById('pt-admin')?.checked;
    _settings.printHeader   = !!document.getElementById('ps-header')?.checked;
    _settings.printAddress  = !!document.getElementById('ps-address')?.checked;
    _settings.printItems    = !!document.getElementById('ps-items')?.checked;
    _settings.printPayment  = !!document.getElementById('ps-payment')?.checked;
    _settings.printFooter   = !!document.getElementById('ps-footer')?.checked;
    _settings.paperWidth    = document.getElementById('ps-paper-width')?.value || '80';
    _saveSettings();

    // Update paper info in card
    const pi = document.getElementById('pi-paper');
    if (pi) pi.textContent = _settings.paperWidth + ' mm';

    showToast('Printer settings saved', 'success');
  }

  return {
    init,
    connect,
    disconnect,
    testPrint,
    autoPrintOrder,
    saveSettings: saveSettingsFromUI,
    flushQueue  : flushQueuePublic,
  };
})();

/* ── Global functions wired to HTML onclick ─────────────────── */
window.connectPrinter    = () => PrinterManager.connect();
window.disconnectPrinter = () => PrinterManager.disconnect();
window.testPrint         = () => PrinterManager.testPrint();
window.savePrinterSettings = () => PrinterManager.saveSettings();
window.flushPrintQueue   = () => PrinterManager.flushQueue();

/* ── Patch loadAdminData to init the printer module ──────────── */
const _loadAdminWithPrinter = loadAdminData;
loadAdminData = async function() {
  await _loadAdminWithPrinter();
  PrinterManager.init();
};

/* ── Hook into the order-save path so every new confirmed
     order auto-prints if a printer is connected.
     Wrap the global saveOrder / placeOrder functions that
     commit an order to localStorage.  ─────────────────────── */
(function patchOrderSave() {
  // Patch any function named saveOrder, placeOrder, or confirmCODOrder
  // that may be defined in other scripts (cart.js, checkout.js, etc.)
  const HOOK_FNS = ['saveOrder', 'placeOrder', 'confirmCODOrder', 'submitOrder'];

  HOOK_FNS.forEach(fnName => {
    const original = window[fnName];
    if (typeof original === 'function') {
      window[fnName] = async function(...args) {
        const result = await original.apply(this, args);
        // result should be the saved order object; if not, try args[0]
        const order  = (result && result.id) ? result : (args[0] && args[0].id ? args[0] : null);
        if (order) {
          const trigger = fnName === 'confirmCODOrder' ? 'cod' : 'online';
          PrinterManager.autoPrintOrder(order, trigger);
        }
        return result;
      };
      console.log('[Printer] Patched', fnName, 'for auto-print');
    }
  });

  // Also listen to a custom DOM event dispatched by the checkout flow
  document.addEventListener('pa:order:confirmed', (e) => {
    if (e.detail && e.detail.order) {
      const trigger = (e.detail.paymentMethod === 'cod') ? 'cod' : 'online';
      PrinterManager.autoPrintOrder(e.detail.order, trigger);
    }
  });
})();

// End of Printer Module

// ══════════════════════════════════════════════════════════════
// SHIPROCKET ADMIN TAB
// ══════════════════════════════════════════════════════════════

// Shiprocket settings (persisted in localStorage)
function getSRSettings() {
  try { return JSON.parse(localStorage.getItem('sr_settings') || '{}'); } catch { return {}; }
}
function saveSRSettings(s) { localStorage.setItem('sr_settings', JSON.stringify(s)); }

// Initialize Shiprocket tab
document.addEventListener('page:admin', () => {
  // Wait for Shiprocket module to be available
  setTimeout(() => {
    if (window.Shiprocket) initShiprocketTab();
  }, 500);
});

function initShiprocketTab() {
  // Load settings into fields
  const settings = getSRSettings();
  if (settings.pickupName) document.getElementById('sr-pickup-name').value = settings.pickupName;
  if (settings.pickupPin) document.getElementById('sr-pickup-pin').value = settings.pickupPin;
  if (settings.length) document.getElementById('sr-default-length').value = settings.length;
  if (settings.breadth) document.getElementById('sr-default-breadth').value = settings.breadth;
  if (settings.height) document.getElementById('sr-default-height').value = settings.height;
  if (settings.weight) document.getElementById('sr-default-weight').value = settings.weight;

  // Update Shiprocket client settings
  if (settings.pickupPin) Shiprocket.PICKUP.pincode = settings.pickupPin;
  if (settings.pickupName) Shiprocket.PICKUP.name = settings.pickupName;

  // Check connection
  checkSRConnection();

  // Load orders
  loadSROrders();
  loadSRTracking();
}

async function checkSRConnection() {
  const dot = document.getElementById('sr-status-dot');
  const text = document.getElementById('sr-status-text');
  const expiry = document.getElementById('sr-token-expiry');

  if (!window.Shiprocket) {
    dot.style.background = '#ef4444';
    text.textContent = 'Shiprocket module not loaded';
    return;
  }

  try {
    const result = await Shiprocket.testConnection();
    if (result.connected) {
      dot.style.background = '#22c55e';
      text.textContent = 'Connected';
      text.style.color = '#22c55e';

      const token = Shiprocket._getToken();
      if (token && token.expiresAt) {
        const remaining = Math.max(0, token.expiresAt - Date.now());
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        expiry.textContent = `Token expires in ${days}d ${hours % 24}h`;
      }
    } else {
      dot.style.background = '#ef4444';
      text.textContent = `Disconnected: ${result.error || 'Unknown'}`;
      text.style.color = '#ef4444';
      expiry.textContent = '';
    }
  } catch (e) {
    dot.style.background = '#ef4444';
    text.textContent = `Error: ${e.message}`;
    text.style.color = '#ef4444';
  }
}

async function reconnectShiprocket() {
  const btn = document.getElementById('btn-sr-reconnect');
  btn.disabled = true;
  btn.textContent = 'Reconnecting...';
  try {
    await Shiprocket.reconnect();
    showToast('Shiprocket reconnected', 'success');
    checkSRConnection();
  } catch (e) {
    showToast(`Reconnect failed: ${e.message}`, 'error');
  }
  btn.disabled = false;
  btn.textContent = '🔄 Reconnect';
}

function saveShiprocketSettings() {
  const settings = {
    pickupName: document.getElementById('sr-pickup-name').value,
    pickupPin:  document.getElementById('sr-pickup-pin').value,
    length:     Number(document.getElementById('sr-default-length').value) || 15,
    breadth:    Number(document.getElementById('sr-default-breadth').value) || 10,
    height:     Number(document.getElementById('sr-default-height').value) || 10,
    weight:     Number(document.getElementById('sr-default-weight').value) || 0.5
  };
  saveSRSettings(settings);

  // Update Shiprocket client
  Shiprocket.PICKUP.name = settings.pickupName;
  Shiprocket.PICKUP.pincode = settings.pickupPin;

  showToast('Shiprocket settings saved', 'success');
}

async function adminCheckServiceability() {
  const pin = document.getElementById('sr-check-pin').value.trim();
  if (!pin || !/^\d{6}$/.test(pin)) {
    showToast('Enter valid 6-digit pincode', 'warning');
    return;
  }

  const resultEl = document.getElementById('sr-check-result');
  resultEl.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem">Checking...</div>';

  try {
    const pickupPin = Shiprocket.PICKUP.pincode;
    const weight = Number(document.getElementById('sr-default-weight').value) || 0.5;
    const couriers = await Shiprocket.checkServiceability(pickupPin, pin, weight);

    if (!couriers || couriers.length === 0) {
      resultEl.innerHTML = `<div style="color:var(--error);font-size:0.85rem">⚠️ No couriers available for pincode ${pin}</div>`;
      return;
    }

    let html = `<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px">${couriers.length} couriers available:</div>`;
    html += '<table class="data-table" style="font-size:0.8rem"><thead><tr><th>Courier</th><th>Charge</th><th>ETA</th><th>COD</th></tr></thead><tbody>';

    couriers.sort((a, b) => (Number(a.freight_charge || a.charge) || 999) - (Number(b.freight_charge || b.charge) || 999));

    couriers.slice(0, 8).forEach(c => {
      const charge = Number(c.freight_charge || c.charge || c.rate || 0);
      const etaMin = Number(c.etamin || c.eta_min || 2);
      const etaMax = Number(c.etamax || c.eta_max || 5);
      const cod = c.cod === 1 || c.cod === true;
      html += `<tr>
        <td>${c.courier_name || c.name || 'Standard'}</td>
        <td style="color:var(--gold)">₹${charge}</td>
        <td>${etaMin}–${etaMax} days</td>
        <td>${cod ? '✅' : '—'}</td>
      </tr>`;
    });

    html += '</tbody></table>';
    resultEl.innerHTML = html;
  } catch (e) {
    resultEl.innerHTML = `<div style="color:var(--error);font-size:0.85rem">⚠️ ${e.message}</div>`;
  }
}

// Load SR orders table
function loadSROrders() {
  const tbody = document.getElementById('sr-orders-body');
  if (!tbody) return;

  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No orders yet</td></tr>`;
    return;
  }

  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  tbody.innerHTML = orders.map(o => {
    const awb = o.trackingId || o.awb || '';
    const courier = o.courierCompany || o.courier || '';
    const srStatus = o.srStatus || '';
    const pincode = o.address?.pincode || o.pincode || '-';
    const customer = o.customerName || o.name || 'Guest';
    const hasAwb = !!awb;
    const hasSR = !!o.srOrderId;

    let statusBadge = '';
    if (srStatus === 'pickup_done') statusBadge = '<span style="color:#22c55e;font-size:0.78rem">✅ Pickup Done</span>';
    else if (srStatus === 'awb_assigned') statusBadge = '<span style="color:#8b5cf6;font-size:0.78rem">AWB Assigned</span>';
    else if (srStatus === 'created') statusBadge = '<span style="color:#f59e0b;font-size:0.78rem">SR Order Created</span>';
    else if (hasAwb) statusBadge = '<span style="color:#22c55e;font-size:0.78rem">Active</span>';
    else statusBadge = '<span style="color:var(--text-muted);font-size:0.78rem">Not Synced</span>';

    let actions = [];
    if (!hasSR) actions.push(`<button class="tbl-btn tbl-btn-edit" onclick="srCreateOrder('${o.id}')" style="font-size:0.75rem">Create SR Order</button>`);
    if (hasSR && !hasAwb) actions.push(`<button class="tbl-btn" style="background:rgba(139,92,246,0.15);color:#8b5cf6;font-size:0.75rem" onclick="srAssignAWB('${o.id}')">Assign AWB</button>`);
    if (hasAwb) actions.push(`<button class="tbl-btn" style="background:rgba(34,197,94,0.15);color:#22c55e;font-size:0.75rem" onclick="srGeneratePickup('${o.id}')">Pickup</button>`);
    if (hasAwb) actions.push(`<button class="tbl-btn" style="background:rgba(59,130,246,0.15);color:#3b82f6;font-size:0.75rem" onclick="srDownloadLabel('${o.id}')">Label</button>`);
    if (hasAwb) actions.push(`<button class="tbl-btn" style="background:rgba(245,158,11,0.15);color:#f59e0b;font-size:0.75rem" onclick="srDownloadInvoice('${o.id}')">Invoice</button>`);
    if (hasAwb) actions.push(`<button class="tbl-btn tbl-btn-edit" style="font-size:0.75rem" onclick="srTrackAWB('${o.id}')">Track</button>`);

    return `<tr>
      <td style="font-family:monospace;font-size:0.8rem;color:var(--gold)">#${o.id.slice(-6).toUpperCase()}</td>
      <td>${customer}</td>
      <td style="font-family:monospace;font-size:0.8rem">${pincode}</td>
      <td style="font-size:0.85rem">${courier || '—'}</td>
      <td style="font-family:monospace;font-size:0.8rem">${awb || '—'}</td>
      <td>${statusBadge}</td>
      <td style="text-align:right;display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap">${actions.join('')}</td>
    </tr>`;
  }).join('');
}

async function srCreateOrder(orderId) {
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}
  const o = orders.find(x => x.id === orderId);
  if (!o) { showToast('Order not found', 'error'); return; }

  showToast('Creating Shiprocket order...', 'info');

  try {
    const result = await Shiprocket.createOrder({
      orderId:       o.id,
      orderDate:     new Date(o.createdAt).toISOString().slice(0, 10),
      customerName:  o.customerName || o.name || '',
      address:       o.address?.address || o.address || '',
      city:          o.address?.city || o.city || '',
      pincode:       o.address?.pincode || o.pincode || '',
      state:         o.address?.state || o.state || '',
      country:       'India',
      email:         o.address?.email || o.email || '',
      phone:         o.address?.phone || o.phone || '',
      items:         (o.items || []).map(i => ({
        name: i.name,
        sku: i.productId || i.sku || 'N/A',
        qty: i.qty,
        price: i.price
      })),
      paymentMethod: o.payment || 'Prepaid',
      subtotal:      o.subtotal || o.total || 0,
      courierCompany: o.courierCompany || o.courier || '',
      weight:        o.weight || 0.5,
      length:        Shiprocket.PICKUP?.length || 15,
      breadth:       Shiprocket.PICKUP?.breadth || 10,
      height:        Shiprocket.PICKUP?.height || 10
    });

    // Update local order
    o.srOrderId = result.srOrderId;
    o.shipmentId = result.shipmentId;
    o.srStatus = 'created';
    localStorage.setItem('pa_orders', JSON.stringify(orders));

    showToast(`Shiprocket order created: ${result.srOrderId}`, 'success');
    loadSROrders();
  } catch (e) {
    showToast(`Failed: ${e.message}`, 'error');
  }
}

async function srAssignAWB(orderId) {
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}
  const o = orders.find(x => x.id === orderId);
  if (!o || !o.shipmentId) { showToast('Shipment ID not found. Create SR order first.', 'error'); return; }

  const courier = o.courierCompany || o.courier || 'Delhivery';
  showToast(`Assigning AWB via ${courier}...`, 'info');

  try {
    const result = await Shiprocket.assignAWB(o.shipmentId, courier);

    o.awb = result.awb;
    o.trackingId = result.awb;
    o.courierName = result.courierName;
    o.srStatus = 'awb_assigned';
    localStorage.setItem('pa_orders', JSON.stringify(orders));

    showToast(`AWB assigned: ${result.awb}`, 'success');
    loadSROrders();
    loadSRTracking();
  } catch (e) {
    showToast(`Failed: ${e.message}`, 'error');
  }
}

async function srGeneratePickup(orderId) {
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}
  const o = orders.find(x => x.id === orderId);
  if (!o || !o.shipmentId) { showToast('Shipment ID not found', 'error'); return; }

  showToast('Generating pickup...', 'info');

  try {
    await Shiprocket.generatePickup(o.shipmentId);
    o.srStatus = 'pickup_done';
    localStorage.setItem('pa_orders', JSON.stringify(orders));
    showToast('Pickup scheduled', 'success');
    loadSROrders();
  } catch (e) {
    showToast(`Failed: ${e.message}`, 'error');
  }
}

async function srDownloadLabel(orderId) {
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}
  const o = orders.find(x => x.id === orderId);
  if (!o || !o.shipmentId) { showToast('Shipment ID not found', 'error'); return; }

  showToast('Generating label...', 'info');

  try {
    const result = await Shiprocket.generateLabel(o.shipmentId);
    if (result.success && result.labelUrl) {
      window.open(result.labelUrl, '_blank');
    } else {
      showToast('Label generation returned no URL. Check Shiprocket dashboard.', 'warning');
    }
  } catch (e) {
    showToast(`Failed: ${e.message}`, 'error');
  }
}

async function srDownloadInvoice(orderId) {
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}
  const o = orders.find(x => x.id === orderId);
  if (!o || !o.srOrderId) { showToast('Shiprocket Order ID not found', 'error'); return; }

  showToast('Generating invoice...', 'info');

  try {
    const result = await Shiprocket.generateInvoice(o.srOrderId);
    if (result.success && result.invoiceUrl) {
      window.open(result.invoiceUrl, '_blank');
    } else {
      showToast('Invoice generation returned no URL. Check Shiprocket dashboard.', 'warning');
    }
  } catch (e) {
    showToast(`Failed: ${e.message}`, 'error');
  }
}

async function srTrackAWB(orderId) {
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}
  const o = orders.find(x => x.id === orderId);
  const awb = o?.trackingId || o?.awb;
  if (!awb) { showToast('No AWB found for this order', 'error'); return; }

  showToast(`Tracking AWB: ${awb}...`, 'info');

  try {
    const result = await Shiprocket.trackAWB(awb);

    let activitiesHtml = '';
    if (result.activities && result.activities.length > 0) {
      activitiesHtml = result.activities.slice(0, 5).map(a =>
        `<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.82rem">
          <span style="color:var(--text-muted);flex-shrink:0;min-width:120px">${a.date || a.scan_time || a.timestamp || ''}</span>
          <span style="color:var(--text-primary)">${a.activity || a.status || a.description || ''}</span>
          <span style="color:var(--text-muted);margin-left:auto">${a.location || ''}</span>
        </div>`
      ).join('');
    }

    // Show in a modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
      <div class="modal" style="max-width:700px">
        <div class="modal-header">
          <h3 class="modal-title">Tracking — AWB ${awb}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
            <div>
              <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase">Courier</div>
              <div style="font-weight:600">${result.courierName || o?.courierName || '—'}</div>
            </div>
            <div>
              <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase">Status</div>
              <div style="font-weight:600">${result.statusText || 'Unknown'}</div>
            </div>
          </div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase">Tracking History</div>
          ${activitiesHtml || '<div style="color:var(--text-muted);font-size:0.85rem">No tracking data available</div>'}
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } catch (e) {
    showToast(`Tracking failed: ${e.message}`, 'error');
  }
}

// Manifest & Labels bulk actions
async function generateManifestForSelected() {
  showToast('Generating manifest...', 'info');
  try {
    const result = await Shiprocket.generateManifest();
    const printResult = await Shiprocket.printManifest();
    if (printResult.success && printResult.manifestUrl) {
      window.open(printResult.manifestUrl, '_blank');
      showToast('Manifest opened in new tab', 'success');
    } else {
      showToast('No manifest URL returned. Check Shiprocket dashboard.', 'warning');
    }
  } catch (e) {
    showToast(`Manifest failed: ${e.message}`, 'error');
  }
}

async function printLabelsForSelected() {
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}

  const awbOrders = orders.filter(o => o.shipmentId);
  if (awbOrders.length === 0) {
    showToast('No orders with shipment ID found', 'warning');
    return;
  }

  showToast(`Generating labels for ${awbOrders.length} orders...`, 'info');

  for (const o of awbOrders) {
    try {
      const result = await Shiprocket.generateLabel(o.shipmentId);
      if (result.success && result.labelUrl) {
        window.open(result.labelUrl, '_blank');
      }
    } catch (e) {
      console.warn(`Label failed for order ${o.id}:`, e.message);
    }
  }

  showToast('Labels generated (check popup blocker)', 'success');
}

// Live Tracking Dashboard
async function loadSRTracking() {
  const tbody = document.getElementById('sr-tracking-body');
  if (!tbody) return;

  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}

  const activeOrders = orders.filter(o => o.awb || o.trackingId);

  if (activeOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No active shipments</td></tr>`;
    return;
  }

  tbody.innerHTML = activeOrders.map(o => {
    const awb = o.trackingId || o.awb;
    const courier = o.courierName || o.courierCompany || o.courier || '—';
    const customer = o.customerName || o.name || 'Guest';
    return `<tr id="sr-track-${o.id}">
      <td style="font-family:monospace;font-size:0.8rem;color:var(--gold)">#${o.id.slice(-6).toUpperCase()}</td>
      <td>${customer}</td>
      <td style="font-size:0.85rem">${courier}</td>
      <td style="font-family:monospace;font-size:0.8rem">${awb}</td>
      <td class="sr-track-status" style="font-size:0.85rem">Loading...</td>
      <td class="sr-track-activity" style="font-size:0.78rem;color:var(--text-muted)">—</td>
      <td style="text-align:right">
        <button class="tbl-btn tbl-btn-edit" style="font-size:0.75rem" onclick="srTrackAWB('${o.id}')">Details</button>
      </td>
    </tr>`;
  }).join('');

  // Load tracking for each
  for (const o of activeOrders) {
    const awb = o.trackingId || o.awb;
    if (!awb) continue;
    try {
      const result = await Shiprocket.trackAWB(awb);
      const statusCell = document.querySelector(`#sr-track-${o.id} .sr-track-status`);
      const activityCell = document.querySelector(`#sr-track-${o.id} .sr-track-activity`);
      if (statusCell) {
        const color = result.delivered ? '#22c55e' : result.status === 7 ? '#22c55e' : '#8b5cf6';
        statusCell.innerHTML = `<span style="color:${color};font-weight:600">${result.statusText || 'In Transit'}</span>`;
      }
      if (activityCell && result.activities && result.activities.length > 0) {
        const latest = result.activities[0];
        activityCell.textContent = `${latest.activity || latest.status || ''} — ${latest.location || ''}`;
      }
    } catch (e) {
      const statusCell = document.querySelector(`#sr-track-${o.id} .sr-track-status`);
      if (statusCell) statusCell.textContent = 'Error';
    }
  }
}

async function refreshShiprocketTracking() {
  const btn = document.getElementById('btn-sr-refresh-track');
  btn.disabled = true;
  btn.textContent = 'Refreshing...';
  await loadSRTracking();
  btn.disabled = false;
  btn.textContent = '🔄 Refresh All';
}

// Hook Shiprocket tab into admin tab switching
document.addEventListener('page:admin', () => {
  const srTabBtn = document.querySelector('[data-target="tab-shiprocket"]');
  if (srTabBtn) {
    srTabBtn.addEventListener('click', () => {
      setTimeout(() => {
        if (window.Shiprocket) {
          initShiprocketTab();
        }
      }, 300);
    });
  }
});


/** ── TEAMMATES & EMPLOYEES ─────────────────────────────────── **/
let _teammates = [];

window.openTeammateModal = function(id = null) {
  const modal = document.getElementById('teammate-modal');
  const form = document.getElementById('teammate-form');
  const title = document.getElementById('tm-title');
  
  form.reset();
  document.getElementById('tm-id').value = '';
  title.textContent = 'Add Teammate';

  if (id) {
    const tm = _teammates.find(t => t.id === id);
    if (tm) {
      title.textContent = 'Edit Teammate';
      document.getElementById('tm-id').value = tm.id;
      document.getElementById('tm-name').value = tm.name || '';
      document.getElementById('tm-role').value = tm.role || 'Employee';
      document.getElementById('tm-status').value = tm.status || 'active';
      document.getElementById('tm-email').value = tm.email || '';
      document.getElementById('tm-phone').value = tm.phone || '';
      document.getElementById('tm-photo').value = tm.photo || '';
      document.getElementById('tm-bio').value = tm.bio || '';
      document.getElementById('tm-featured').checked = tm.featured || false;
    }
  }

  modal.classList.remove('hidden');
};

window.closeTeammateModal = function() {
  document.getElementById('teammate-modal').classList.add('hidden');
};


window.loadTeammates = async function() {
  const body = document.getElementById('admin-teammates-body');
  body.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:40px">Loading teammates...</td></tr>';

  try {
    let data = [];
    if (window.getTeammates) {
       data = await getTeammates();
    } else {
       data = JSON.parse(localStorage.getItem('pa_teammates') || '[]');
    }
    
    _teammates = data;
    renderTeammates();
  } catch (err) {
    console.error('Failed to load teammates', err);
    body.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:40px;color:var(--error)">Error loading data.</td></tr>';
  }
};

function renderTeammates() {
  const body = document.getElementById('admin-teammates-body');
  if (_teammates.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:40px;color:var(--text-muted)">No teammates found. Click "+ Add Teammate" to start.</td></tr>';
    return;
  }

  body.innerHTML = _teammates.map(tm => `
    <tr>
      <td>
        <img src="${tm.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(tm.name) + '&background=random'}" 
             style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid var(--border)" />
      </td>
      <td><strong>${tm.name}</strong></td>
      <td><span class="badge badge-outline">${tm.role}</span></td>
      <td style="font-size:0.85rem">
        <div>${tm.email}</div>
        <div style="color:var(--text-muted)">${tm.phone || '-'}</div>
      </td>
      <td>
        <span class="badge ${tm.status === 'active' ? 'badge-success' : 'badge-ghost'}">${tm.status}</span>
        ${tm.featured ? '<div style="font-size:0.7rem;color:var(--gold);margin-top:4px">★ Featured</div>' : ''}
      </td>
      <td style="text-align:right">
        <button class="btn btn-ghost btn-sm" onclick="openTeammateModal('${tm.id}')">Edit</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--error)" onclick="deleteTeammate('${tm.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}


window.saveTeammate = async function() {
  const btn = document.getElementById('btn-save-teammate');
  const id = document.getElementById('tm-id').value;
  
  const payload = {
    name: document.getElementById('tm-name').value,
    role: document.getElementById('tm-role').value,
    status: document.getElementById('tm-status').value,
    email: document.getElementById('tm-email').value,
    phone: document.getElementById('tm-phone').value,
    photo: document.getElementById('tm-photo').value,
    bio: document.getElementById('tm-bio').value,
    featured: document.getElementById('tm-featured').checked,
    updatedAt: new Date().toISOString()
  };

  if (!payload.name || !payload.email) {
    showToast('Name and Email are required', 'warning');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    if (window.saveTeammateToDB) {
      await saveTeammateToDB(id, payload);
    } else {
      // Local Fallback
      let data = JSON.parse(localStorage.getItem('pa_teammates') || '[]');
      if (id) {
        data = data.map(t => t.id === id ? { ...t, ...payload } : t);
      } else {
        data.push({ id: 'tm_' + Date.now(), ...payload, createdAt: new Date().toISOString() });
      }
      localStorage.setItem('pa_teammates', JSON.stringify(data));
    }

    showToast('Teammate saved successfully', 'success');
    closeTeammateModal();
    loadTeammates();
  } catch (err) {
    console.error('Save failed', err);
    showToast('Failed to save teammate', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Teammate';
  }
};


window.deleteTeammate = async function(id) {
  if (!confirm('Are you sure you want to remove this teammate?')) return;

  try {
    if (window.deleteTeammateFromDB) {
      await deleteTeammateFromDB(id);
    } else {
      let data = JSON.parse(localStorage.getItem('pa_teammates') || '[]');
      data = data.filter(t => t.id !== id);
      localStorage.setItem('pa_teammates', JSON.stringify(data));
    }
    showToast('Teammate removed', 'success');
    loadTeammates();
  } catch (err) {
    showToast('Delete failed', 'error');
  }
};
