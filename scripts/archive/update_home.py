import re

with open('pages/home.html', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update normalize
old_normalize = """  const normalize = (val) => {
    if (Array.isArray(val)) return val.filter(v => typeof v === 'string' && v.length > 0);
    if (typeof val === 'string' && val.length > 0) return [val];
    return [];
  };"""

new_normalize = """  const normalize = (val) => {
    if (Array.isArray(val)) return val.map(v => typeof v === 'string' ? { url: v, link: '' } : v).filter(v => v.url);
    if (typeof val === 'string' && val.length > 0) return [{ url: val, link: '' }];
    return [];
  };"""

code = code.replace(old_normalize, new_normalize)

# 2. Update initial mapping
old_init_map = """    let mImgs = normalize(cachedConfig.mobileBanner).map(u => Store.convertDriveLink(u));
    let dImgs = normalize(cachedConfig.desktopBanner).map(u => Store.convertDriveLink(u));"""
new_init_map = """    let mImgs = normalize(cachedConfig.mobileBanner).map(item => ({ ...item, url: Store.convertDriveLink(item.url) }));
    let dImgs = normalize(cachedConfig.desktopBanner).map(item => ({ ...item, url: Store.convertDriveLink(item.url) }));"""
code = code.replace(old_init_map, new_init_map)

# 3. Update db mapping
old_db_map = """    let mImages = normalize(config.mobileBanner).map(u => Store.convertDriveLink(u));
    let dImages = normalize(config.desktopBanner).map(u => Store.convertDriveLink(u));"""
new_db_map = """    let mImages = normalize(config.mobileBanner).map(item => ({ ...item, url: Store.convertDriveLink(item.url) }));
    let dImages = normalize(config.desktopBanner).map(item => ({ ...item, url: Store.convertDriveLink(item.url) }));"""
code = code.replace(old_db_map, new_db_map)

# 4. Update fallback array
old_fallback = """    initialImages = isMobile 
      ? [
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1000&q=80',
          'https://images.unsplash.com/photo-1608283088555-8f6dfc794017?w=1000&q=80'
        ]
      : [
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1600&q=80',
          'https://images.unsplash.com/photo-1608283088555-8f6dfc794017?w=1600&q=80'
        ];"""
new_fallback = """    initialImages = isMobile 
      ? [
          { url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1000&q=80', link: '' },
          { url: 'https://images.unsplash.com/photo-1608283088555-8f6dfc794017?w=1000&q=80', link: '' }
        ]
      : [
          { url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1600&q=80', link: '' },
          { url: 'https://images.unsplash.com/photo-1608283088555-8f6dfc794017?w=1600&q=80', link: '' }
        ];"""
code = code.replace(old_fallback, new_fallback)

# 5. Update renderImages
old_render = """    carousel.innerHTML = imgs.map((src, i) => `
      <img src="${src}" alt="Ayurvedic wellness" referrerpolicy="no-referrer" class="carousel-img" loading="${i === 0 ? 'eager' : 'lazy'}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;opacity:${i===0 ? 0.55 : 0};transition:opacity 2s ease-in-out;"/>
    `).join('');"""
new_render = """    carousel.innerHTML = imgs.map((item, i) => `
      <a href="${item.link || '#'}" class="carousel-img" style="position:absolute;top:0;left:0;width:100%;height:100%;display:block;opacity:${i===0 ? 1 : 0};transition:opacity 2s ease-in-out;z-index:2;">
        <img src="${item.url}" alt="Ayurvedic wellness" referrerpolicy="no-referrer" loading="${i === 0 ? 'eager' : 'lazy'}" style="width:100%;height:100%;object-fit:cover;"/>
      </a>
    `).join('');"""
code = code.replace(old_render, new_render)

# 6. Update interval opacity 0.55 to 1
code = code.replace("imgElements[currentIndex].style.opacity = '0.55';", "imgElements[currentIndex].style.opacity = '1';")

with open('pages/home.html', 'w', encoding='utf-8') as f:
    f.write(code)
