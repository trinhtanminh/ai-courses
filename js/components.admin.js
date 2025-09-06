// Admin reusable helpers and UI building blocks

export function el(html) {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstChild;
}

export function setChildren(node, children) {
  node.innerHTML = '';
  if (Array.isArray(children)) children.forEach(ch => node.appendChild(ch));
  else if (children) node.appendChild(children);
}

// Helpers: dynamic Resources rows in lesson forms
export function bindResourceRows(form, opts = {}) {
  const group = form?.querySelector?.('.resources-group');
  if (!group) return;
  const rowsWrap = group.querySelector('.resourcesRows');
  const addBtn = group.querySelector('.addResource');
  if (opts.reset) rowsWrap.innerHTML = '';
  function addRow() {
    const row = document.createElement('div');
    row.className = 'resourceRow grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-2';
    row.innerHTML = `
      <input name="resTitle" class="border rounded px-2 py-1" placeholder="Tiêu đề tài liệu" />
      <input name="resUrl" class="border rounded px-2 py-1" placeholder="Link tài liệu" />
      <button type="button" class="removeResource text-xs bg-gray-200 rounded px-2">×</button>
    `;
    row.querySelector('.removeResource').addEventListener('click', () => row.remove());
    rowsWrap.appendChild(row);
  }
  addBtn?.addEventListener('click', (e) => { e.preventDefault(); addRow(); });
  if (!rowsWrap.querySelector('.resourceRow')) addRow();
}

export function collectResourceRows(scope) {
  const rows = Array.from(scope.querySelectorAll('.resourceRow'));
  return rows.map(r => {
    const title = (r.querySelector('input[name="resTitle"]')?.value || '').trim();
    const url = (r.querySelector('input[name="resUrl"]')?.value || '').trim();
    if (!title && !url) return null;
    if (!url) return null;
    return { title: title || url, url };
  }).filter(Boolean);
}

// Helpers: dynamic Videos rows in lesson forms
export function bindVideoRows(form, opts = {}) {
  const group = form?.querySelector?.('.videos-group');
  if (!group) return;
  const rowsWrap = group.querySelector('.videosRows');
  const addBtn = group.querySelector('.addVideo');
  if (opts.reset) rowsWrap.innerHTML = '';
  function addRow() {
    const row = document.createElement('div');
    row.className = 'videoRow grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-2';
    row.innerHTML = `
      <input name="vidTitle" class="border rounded px-2 py-1" placeholder="Tiêu đề video" />
      <input name="vidUrl" class="border rounded px-2 py-1" placeholder="Link video (YouTube, Google Drive, ... )" />
      <button type="button" class="removeVideo text-xs bg-gray-200 rounded px-2">×</button>
    `;
    row.querySelector('.removeVideo').addEventListener('click', () => row.remove());
    rowsWrap.appendChild(row);
  }
  addBtn?.addEventListener('click', (e) => { e.preventDefault(); addRow(); });
  if (!rowsWrap.querySelector('.videoRow')) addRow();
}

export function collectVideoRows(scope) {
  const rows = Array.from(scope.querySelectorAll('.videoRow'));
  return rows.map(r => {
    const title = (r.querySelector('input[name="vidTitle"]')?.value || '').trim();
    const url = (r.querySelector('input[name="vidUrl"]')?.value || '').trim();
    if (!title && !url) return null;
    if (!url) return null;
    return { title: title || undefined, url };
  }).filter(Boolean);
}
