/* ============================================================
   PADMANABH AYURVEDICS — ADMIN JS
   Neural Hub Logic · Auth · Analytics · CRUD · Drag/Drop
   ============================================================ */

let _adminTrafficChart = null;
let _adminProducts = [];
let _adminImages = []; // Array of URL strings
let _historyProducts = [];

document.addEventListener('page:admin', initAdminHub);

function initAdminHub() {
  document.title = 'Neural Hub — Padmanabh Ayurvedics';

  const isAuth = sessionStorage.getItem('pa_admin_auth') === 'true';
  const loginView = document.getElementById('admin-login-view');
  const shellView = document.getElementById('admin-shell');

  if (!isAuth) {
    if (loginView) loginView.style.display = 'flex';
    if (shellView) shellView.style.display = 'none';
    const form = document.getElementById('admin-login-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const u = document.getElementById('admin-user').value;
        const p = document.getElementById('admin-pass').value;
        if (u === 'admin' && p === 'Inafa2026') {
          sessionStorage.setItem('pa_admin_auth', 'true');
          loginView.style.display = 'none';
          shellView.style.display = 'flex';
          loadAdminData();
        } else {
          showToast('Invalid credentials', 'error');
        }
      };
    }
  } else {
    if (loginView) loginView.style.display = 'none';
    if (shellView) shellView.style.display = 'flex';
    loadAdminData();
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
        // Simple base64 conversion for this prototype
        // In production: await uploadImage(file, `products/${Date.now()}_${file.name}`)
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

function adminLogout() {
  sessionStorage.removeItem('pa_admin_auth');
  location.reload();
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
let _adminTopProductsChart = null;
let _adminStatusDonut = null;
let _adminPaymentDonut = null;

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
      <td><img src="${p.images?.[0] || ''}" class="table-product-thumb" alt=""/></td>
      <td style="font-weight:500;color:var(--text-primary)">${p.name}</td>
      <td style="text-transform:uppercase;font-size:0.75rem;color:var(--text-muted)">${p.category}</td>
      <td>₹${p.price}</td>
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
  document.getElementById('pm-name-hi').value = p.nameHi || '';
  document.getElementById('pm-name-mr').value = p.nameMr || '';
  document.getElementById('pm-price').value = p.price;
  document.getElementById('pm-mrp').value = p.mrp || '';
  document.getElementById('pm-cat').value = p.category;
  document.getElementById('pm-stock').value = p.inStock ? 'true' : 'false';
  document.getElementById('pm-desc').value = p.description || '';
  document.getElementById('pm-usage').value = p.usage || '';
  document.getElementById('pm-ing').value = p.ingredients || '';

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
      <img src="${src}" alt=""/>
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

async function saveProduct() {
  const form = document.getElementById('product-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const btn = document.getElementById('btn-save-product');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const id = document.getElementById('pm-id').value;
  const data = {
    name:        document.getElementById('pm-name').value,
    nameHi:      document.getElementById('pm-name-hi').value,
    nameMr:      document.getElementById('pm-name-mr').value,
    price:       Number(document.getElementById('pm-price').value),
    mrp:         Number(document.getElementById('pm-mrp').value) || null,
    category:    document.getElementById('pm-cat').value,
    inStock:     document.getElementById('pm-stock').value === 'true',
    description: document.getElementById('pm-desc').value,
    usage:       document.getElementById('pm-usage').value,
    ingredients: document.getElementById('pm-ing').value,
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
    showToast('Failed to save product', 'error');
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
    showToast('Delete failed', 'error');
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

  document.getElementById('input-desktop-img').value = config.desktopBanner || '';
  document.getElementById('input-mobile-img').value = config.mobileBanner || '';
  document.getElementById('preview-desktop').innerHTML = `<img src="${config.desktopBanner}" alt=""/>`;
  document.getElementById('preview-mobile').innerHTML  = `<img src="${config.mobileBanner}" alt=""/>`;

  const grid = document.getElementById('collection-config-grid');
  if (!grid) return;

  const cats = config.collections || [];
  let html = '';
  for (let i = 0; i < 4; i++) {
    const c = cats[i] || { title: '', image: '', category: 'wellness' };
    html += `
      <div class="collection-config-item" data-idx="${i}">
        <div class="collection-config-thumb">
          <img src="${c.image || ''}" id="cc-img-${i}" alt="Upload Image" onclick="promptImage(${i})"/>
        </div>
        <div class="collection-config-body form-group">
          <input type="text" class="form-input" id="cc-title-${i}" value="${c.title}" placeholder="Title"/>
          <select class="form-select mt-8" id="cc-cat-${i}">
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
    document.getElementById(`input-${type}-img`).addEventListener('input', e => {
      document.getElementById(`preview-${type}`).innerHTML = `<img src="${e.target.value}" alt=""/>`;
    });
  });
}

function promptImage(idx) {
  const url = prompt('Enter image URL:');
  if (url) {
    document.getElementById(`cc-img-${idx}`).src = url;
  }
}
window.promptImage = promptImage;

async function saveHeroConfigAdmin() {
  const btn = document.getElementById('btn-save-hero');
  btn.disabled = true;
  btn.textContent = 'Publishing...';

  const data = {
    desktopBanner: document.getElementById('input-desktop-img').value,
    mobileBanner:  document.getElementById('input-mobile-img').value,
    collections: []
  };

  for (let i = 0; i < 4; i++) {
    data.collections.push({
      title:    document.getElementById(`cc-title-${i}`).value,
      image:    document.getElementById(`cc-img-${i}`).src,
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
        <td><img src="${p.images?.[0] || ''}" class="table-product-thumb" alt=""/></td>
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
function loadAdminOrders() {
  const tbody = document.getElementById('admin-orders-body');
  if (!tbody) return;

  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('pa_orders') || '[]'); } catch(e) {}

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:40px;color:var(--text-muted)">No orders yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const d = new Date(o.createdAt).toLocaleDateString();
    const statusClass = o.status === 'delivered' ? 'pill-success' : o.status === 'shipped' ? 'pill-gold' : o.status === 'processing' ? 'pill-warning' : 'pill-muted';
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

