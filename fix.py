import os

filepath = 'css/components.css'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    if line.strip() == 'gap: 0;':
        new_lines.append("""  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.qty-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.1rem;
  transition: var(--transition);
}

.qty-btn:hover { background: var(--border); color: var(--text-primary); }

.qty-value {
  min-width: 40px;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
  padding: 0 4px;
}

/* ── Card ───────────────────────────────────────────────────── */
.card {
  background: rgba(25, 25, 25, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-xl);
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transform: translateY(0);
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.4s ease;
}

.card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 32px -8px rgba(0, 0, 0, 0.6), 0 0 16px rgba(100, 164, 53, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
}

/* ── Image Upload ───────────────────────────────────────────── */
.image-upload-zone {
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: var(--transition);
  color: var(--text-muted);
}

.image-upload-zone:hover {
  border-color: var(--border-gold);
  color: var(--gold);
  background: var(--gold-muted);
}

.image-preview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.image-preview-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border);
}

.image-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
""")

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
