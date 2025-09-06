// User-facing reusable UI components

export function toEmbed(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if ((u.hostname.includes('youtube.com') && u.searchParams.get('v')) || u.hostname === 'youtu.be') {
      const vid = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v');
      const params = new URLSearchParams({ rel: '0' }).toString();
      return `https://www.youtube.com/embed/${vid}?${params}`;
    }
    // Google Drive file links -> preview embed
    if (u.hostname.includes('drive.google.com')) {
      // Patterns: /file/d/FILE_ID/view, /open?id=FILE_ID, /uc?id=FILE_ID
      const parts = u.pathname.split('/').filter(Boolean);
      let id = '';
      const idx = parts.findIndex(p => p === 'd');
      if (parts[0] === 'file' && idx >= 0 && parts[idx + 1]) {
        id = parts[idx + 1];
      } else if (u.pathname === '/open' && u.searchParams.get('id')) {
        id = u.searchParams.get('id');
      } else if (u.pathname.startsWith('/uc') && u.searchParams.get('id')) {
        id = u.searchParams.get('id');
      }
      if (id) return `https://drive.google.com/file/d/${id}/preview`;
    }
    return url;
  } catch (e) {
    return url;
  }
}

export function courseCard(course, href) {
  const a = document.createElement('a');
  a.className = 'block glass-card p-4 hover-lift transition';
  a.href = href || '#';
  const h3 = document.createElement('h3');
  h3.className = 'font-semibold';
  h3.textContent = course.title || 'Không tên';
  const p = document.createElement('p');
  p.className = 'text-sm text-gray-600 mt-2';
  p.textContent = course.description || '';
  const meta = document.createElement('div');
  meta.className = 'text-xs text-gray-500 mt-3';
  const lessons = Array.isArray(course.lessons) ? course.lessons.length : 0;
  meta.textContent = `${lessons} bài học`;
  a.appendChild(h3);
  a.appendChild(p);
  a.appendChild(meta);
  return a;
}

export function enrolledCard(course, progressPercent, href) {
  const a = document.createElement('a');
  a.className = 'block glass-card p-4 hover-lift transition';
  a.href = href || '#';
  const h3 = document.createElement('h3');
  h3.className = 'font-semibold';
  h3.textContent = course.title || 'Không tên';
  const barWrap = document.createElement('div');
  barWrap.className = 'mt-3 h-2 bg-gray-200 rounded';
  const bar = document.createElement('div');
  bar.className = 'h-2 rounded';
  bar.style.background = 'linear-gradient(90deg, #60a5fa, #2563eb)';
  bar.style.width = `${progressPercent || 0}%`;
  barWrap.appendChild(bar);
  const meta = document.createElement('div');
  meta.className = 'text-xs text-gray-500 mt-2';
  const lessons = Array.isArray(course.lessons) ? course.lessons.length : 0;
  meta.textContent = `${progressPercent || 0}% hoàn thành · ${lessons} bài học`;
  a.appendChild(h3);
  a.appendChild(barWrap);
  a.appendChild(meta);
  return a;
}

export function lessonItem(lesson, index, checked, onToggle) {
  const li = document.createElement('li');
  li.id = `lesson-${index + 1}`;
  li.className = 'glass-card p-4';
  li.innerHTML = `
    <div class="flex items-start justify-between">
      <div>
        <h3 class="font-medium"></h3>
        <p class="text-sm text-gray-600 mt-1 short"></p>
      </div>
      <label class="inline-flex items-center gap-2 text-sm ml-4">
        <input type="checkbox" class="w-4 h-4" /> Hoàn thành
      </label>
    </div>
    <div class="mt-4 space-y-4 details">
      <!-- Media row: video + resources side by side on md+ -->
      <div class="media md:flex md:gap-4">
        <div class="video hidden md:flex-1 md:min-w-0">
          <div class="section-head">
            <span class="icon" aria-hidden="true">▶</span>
            <span class="label">Video</span>
          </div>
          <div class="aspect-video w-full bg-black/5 rounded overflow-hidden">
            <iframe class="w-full h-full" src="" title="Video bài giảng" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>
        </div>
        <div class="resources hidden md:flex-none md:basis-40 glass-card p-3">
          <div class="section-head">
            <span class="icon" aria-hidden="true">📎</span>
            <span class="label">Tài liệu</span>
          </div>
          <ul class="resource-list"></ul>
        </div>
      </div>
      <div class="content hidden">
        <div class="section-head">
          <span class="icon" aria-hidden="true">✎</span>
          <span class="label">Nội dung</span>
        </div>
        <div class="doc text-sm leading-relaxed"></div>
      </div>
      <div class="notes hidden">
        <div class="section-head">
          <span class="icon" aria-hidden="true">🗒</span>
          <span class="label">Ghi chú</span>
        </div>
        <div class="doc text-sm text-gray-700"></div>
      </div>
      <div class="exercises hidden">
        <div class="section-head">
          <span class="icon" aria-hidden="true">✓</span>
          <span class="label">Bài tập</span>
        </div>
        <ul class="resource-list"></ul>
      </div>
    </div>
  `;

  li.querySelector('h3').textContent = `${index + 1}. ${lesson.title || ''}`;
  const summary = (lesson.content || '').toString();
  const short = summary.length > 140 ? summary.slice(0, 140) + '…' : summary;
  const shortEl = li.querySelector('p.short');
  if (shortEl) shortEl.textContent = short;

  // Videos (multiple) or single videoUrl
  const videosArr = Array.isArray(lesson.videos) && lesson.videos.length ? lesson.videos : (lesson.videoUrl ? [{ title: undefined, url: lesson.videoUrl }] : []);
  if (videosArr.length) {
    const vwrap = li.querySelector('.video');
    vwrap.id = `lesson-${index + 1}-video`;
    vwrap.innerHTML = '';
    videosArr.forEach((v, idx) => {
      const block = document.createElement('div');
      block.className = 'space-y-2';
      if (v.title) {
        const caption = document.createElement('div');
        caption.className = 'text-sm font-medium';
        caption.textContent = v.title;
        block.appendChild(caption);
      }
      const frameWrap = document.createElement('div');
      frameWrap.className = 'lesson-embed aspect-video w-full bg-black/5 rounded';
      const iframe = document.createElement('iframe');
      iframe.className = 'w-full h-full';
      const embed = toEmbed(v.url);
      const playerUrl = `/player.html?embed=${encodeURIComponent(btoa(embed))}&o=${encodeURIComponent(btoa(v.url || ''))}&t=${encodeURIComponent(v.title || '')}`;
      iframe.src = playerUrl;
      iframe.title = 'Video bài giảng';
      iframe.frameBorder = '0';
      iframe.referrerPolicy = 'no-referrer';
      iframe.loading = 'lazy';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      frameWrap.appendChild(iframe);
      block.appendChild(frameWrap);
      vwrap.appendChild(block);
    });
    vwrap.classList.remove('hidden');
  }

  // Full content
  if (lesson.content) {
    const cwrap = li.querySelector('.content');
    cwrap.id = `lesson-${index + 1}-content`;
    const div = cwrap.querySelector('.doc');
    // Keep safe: plain text with preserved line breaks
    div.textContent = lesson.content;
    div.style.whiteSpace = 'pre-line';
    cwrap.classList.remove('hidden');
  }

  // Notes
  if (lesson.notes) {
    const nwrap = li.querySelector('.notes');
    nwrap.id = `lesson-${index + 1}-notes`;
    const nd = nwrap.querySelector('.doc');
    nd.textContent = lesson.notes;
    nd.style.whiteSpace = 'pre-line';
    nwrap.classList.remove('hidden');
  }

  // Exercises
  if (Array.isArray(lesson.exercises) && lesson.exercises.length) {
    const ewrap = li.querySelector('.exercises');
    ewrap.id = `lesson-${index + 1}-exercises`;
    const ul = ewrap.querySelector('.resource-list');
    ul.innerHTML = '';
    lesson.exercises.forEach((item, i) => {
      const liItem = document.createElement('li');
      liItem.className = 'resource-item';
      const left = document.createElement('div');
      left.className = 'resource-left';
      left.innerHTML = `<span class="file-ico" aria-hidden="true">✅</span><span class="resource-text"></span>`;
      left.querySelector('.resource-text').textContent = typeof item === 'string' ? item : (item?.title || `Bài tập ${i+1}`);
      liItem.appendChild(left);
      ul.appendChild(liItem);
    });
    ewrap.classList.remove('hidden');
  }

  // Resources
  if (Array.isArray(lesson.resources) && lesson.resources.length) {
    const rwrap = li.querySelector('.resources');
    rwrap.id = `lesson-${index + 1}-resources`;
    const ul = rwrap.querySelector('.resource-list');
    ul.innerHTML = '';
    lesson.resources.forEach(item => {
      const href = typeof item === 'string' ? item : (item?.url || '');
      const text = typeof item === 'string' ? item : (item?.title || item?.url || '');

      const li2 = document.createElement('li');
      li2.className = 'resource-item';

      const left = document.createElement('div');
      left.className = 'resource-left';
      const ico = document.createElement('span');
      ico.className = 'file-ico';
      const svg = fileIcon(href);
      if (svg) ico.appendChild(svg); else ico.textContent = '🔗';
      const a = document.createElement('a');
      a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.className = 'resource-link';
      a.textContent = text;
      left.appendChild(ico);
      left.appendChild(a);

      const right = document.createElement('div');
      right.className = 'resource-right';
      const host = hostChip(href);
      if (host) right.appendChild(host);

      li2.appendChild(left);
      li2.appendChild(right);
      ul.appendChild(li2);
    });
    rwrap.classList.remove('hidden');
  }

  const chk = li.querySelector('input[type="checkbox"]');
  chk.checked = !!checked;
  if (typeof onToggle === 'function') {
    chk.addEventListener('change', () => onToggle(chk.checked));
  }

  return li;
}

// Helpers for nicer resource UI
function fileIcon(url) {
  // Returns an inline SVG element approximating Heroicons/Feather style
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');

  function path(d) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    return p;
  }
  function rect(attrs) {
    const r = document.createElementNS(NS, 'rect');
    Object.entries(attrs).forEach(([k,v])=>r.setAttribute(k,String(v)));
    return r;
  }
  function circle(attrs) {
    const c = document.createElementNS(NS, 'circle');
    Object.entries(attrs).forEach(([k,v])=>c.setAttribute(k,String(v)));
    return c;
  }

  try {
    const u = new URL(url);
    const p = (u.pathname || '').toLowerCase();
    const isImage = ['.png','.jpg','.jpeg','.gif','.webp','.svg','.bmp','.tiff'].some(ext => p.endsWith(ext));
    const isArchive = ['.zip','.rar','.7z','.tar','.gz'].some(ext => p.endsWith(ext));
    const isDoc = ['.pdf','.doc','.docx','.ppt','.pptx','.xls','.xlsx','.txt','.md'].some(ext => p.endsWith(ext));

    if (isImage) {
      // Image icon: photo frame with sun and mountains
      svg.appendChild(rect({x:3,y:5,width:18,height:14,rx:2}));
      svg.appendChild(circle({cx:8.5,cy:10.5,r:1.5}));
      svg.appendChild(path('M21 16l-5-5-4 4-2-2-5 5'));
      return svg;
    }

    if (isArchive) {
      // Archive/zip icon: box with zipper bar
      svg.appendChild(rect({x:4,y:3,width:16,height:18,rx:2}));
      svg.appendChild(path('M12 3v3m0 3v3m0 3v3'));
      return svg;
    }

    if (isDoc) {
      // Document icon with folded corner
      svg.appendChild(path('M7 3h8l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z'));
      svg.appendChild(path('M15 3v5h5'));
      return svg;
    }

    // Default: external link/file link icon
    svg.appendChild(rect({x:3,y:7,width:14,height:14,rx:2}));
    svg.appendChild(path('M14 3h7v7'));
    svg.appendChild(path('M10 14L21 3'));
    return svg;
  } catch (e) {
    return null;
  }
}

function hostChip(url) {
  try {
    const u = new URL(url);
    const host = (u.hostname || '').replace(/^www\./, '');
    const span = document.createElement('span');
    span.className = 'chip';
    span.textContent = host;
    return span;
  } catch (e) { return null; }
}
