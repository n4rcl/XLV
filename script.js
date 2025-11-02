/* X いいねビューア v41 - 軽量化版 */

(() => {
  // DOM要素
  const fileInput = document.getElementById('jsonFile');
  const gallery = document.getElementById('gallery');
  const searchInput = document.getElementById('searchInput');
  const tagInput = document.getElementById('tagInput');
  const langSelect = document.getElementById('langSelect');
  const themeToggle = document.getElementById('themeToggle');
  const startDateEl = document.getElementById('startDate');
  const endDateEl = document.getElementById('endDate');
  const sortSelect = document.getElementById('sortSelect');
  const applyBtn = document.getElementById('applyFilter');
  const clearBtn = document.getElementById('clearFilter');
  const autoPlayToggle = document.getElementById('autoPlayToggle');

  // モーダル
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modalImg');
  const modalVideo = document.getElementById('modalVideo');
  const modalText = document.getElementById('modalText');
  const closeModal = document.getElementById('closeModal');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const modalCounter = document.getElementById('modalCounter');

  // 状態管理
  let allTweets = [];
  let viewTweets = [];
  let modalList = [];
  let modalIndex = 0;

  // キャッシュ管理
  const CACHE_LIST_KEY = 'xviewer_json_list';
  const CACHE_CURRENT_KEY = 'xviewer_current_cache_id';
  let jsonCacheList = [];

  // Intersection Observer
  let videoObserver = null;
  let videoPlayTimeout = new Map();

  // 初期化
  (function init() {
    const theme = localStorage.getItem('xviewer_theme') || 'light';
    if (theme === 'dark') document.body.classList.add('dark');
    else if (theme === 'amoled') document.body.classList.add('amoled');
    
    langSelect.value = localStorage.getItem('xviewer_lang') || 'ja';
    applyLanguage(langSelect.value);
    
    // Intersection Observer初期化
    if ('IntersectionObserver' in window) {
      videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const video = entry.target;
          if (entry.isIntersecting) {
            const timeout = setTimeout(() => {
              if (autoPlayToggle && !autoPlayToggle.checked) {
                videoPlayTimeout.delete(video);
                return;
              }
              if (video.paused && entry.isIntersecting) video.play().catch(() => {});
              videoPlayTimeout.delete(video);
            }, 300);
            videoPlayTimeout.set(video, timeout);
          } else {
            const timeout = videoPlayTimeout.get(video);
            if (timeout) {
              clearTimeout(timeout);
              videoPlayTimeout.delete(video);
            }
            video.pause();
            if (entry.intersectionRatio === 0) {
              video.removeAttribute('src');
              video.load();
            }
          }
        });
      }, { threshold: 0.25, rootMargin: '50px' });
    }
    
    loadCacheList();
    const currentId = localStorage.getItem(CACHE_CURRENT_KEY);
    if (currentId) loadCachedJsonById(currentId);

    // 自動再生トグル
    if (autoPlayToggle) {
      const saved = localStorage.getItem('xviewer_autoplay');
      autoPlayToggle.checked = saved === '1';
      autoPlayToggle.addEventListener('change', () => {
        localStorage.setItem('xviewer_autoplay', autoPlayToggle.checked ? '1' : '0');
        document.querySelectorAll('.thumb video').forEach(v => {
          if (autoPlayToggle.checked) {
            if (!v.getAttribute('src') && v.dataset.src) v.src = v.dataset.src;
            v.play().catch(() => {});
          } else {
            v.pause();
            v.currentTime = 0;
          }
        });
      });
    }
  })();

  // ヘルパー関数
  function stripSpaces(u) {
    if (!u) return null;
    return String(u).replace(/\uFEFF/g, '').trim();
  }

  function tryOrigFromThumb(u) {
    if (!u) return u;
    return /name=thumb/i.test(u) ? u.replace(/name=thumb/i, 'name=orig') : u;
  }

  function isImage(u) { return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(u) || /pbs\.twimg\.com/i.test(u); }
  function isVideo(u) { return /\.(mp4|webm|mov)(\?|$)/i.test(u) || /video/i.test(u); }

  function extractTweetsFromJson(data) {
    if (!data) return [];
    if (data.globalObjects?.tweets) return Object.values(data.globalObjects.tweets);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.tweets)) return data.tweets;
    const found = [];
    (function walk(o) {
      if (!o || typeof o !== 'object') return;
      if ((o.created_at || o.date) && (o.full_text || o.text)) { found.push(o); return; }
      for (const k in o) if (Object.prototype.hasOwnProperty.call(o, k)) walk(o[k]);
    })(data);
    return found;
  }

  function gatherMedia(tweet) {
    const src = tweet.media || tweet.extended_entities?.media || tweet.entities?.media || null;
    let arr = [];
    if (Array.isArray(src) && src.length) {
      arr = src.map(m => {
        const type = (m.type || '').toLowerCase();
        const thumb = stripSpaces(m.thumbnail || m.thumb);
        let full = stripSpaces(m.original || m.original_url || m.url);
        if ((type === 'video' || type === 'animated_gif') && m.original) full = stripSpaces(m.original);
        if (!full && thumb) full = tryOrigFromThumb(thumb);
        
        // 🔧 動画の長さを取得（ミリ秒単位）
        let duration = 0;
        if (type === 'video' || type === 'animated_gif') {
          if (m.video_info?.duration_millis) {
            duration = Math.floor(m.video_info.duration_millis / 1000); // 秒に変換
          } else if (m.duration) {
            duration = Math.floor(m.duration);
          }
        }
        
        return { type, full, thumb, duration };
      }).filter(Boolean);
    } else {
      const p = (tweet.full_text || tweet.text || '').match(/https?:\/\/pbs\.twimg\.com\/[^\s"']+/ig) || [];
      arr = p.map(u => ({ type: isVideo(u) ? 'video' : 'photo', full: tryOrigFromThumb(stripSpaces(u)), thumb: stripSpaces(u), duration: 0 }));
    }
    return arr.filter(m => m.full || m.thumb);
  }

  function extractFirstLink(text) {
    const m = (text || '').match(/https?:\/\/[^\s]+/);
    return m ? m[0] : '';
  }

  // キャッシュ管理
  function loadCacheList() {
    try {
      const stored = localStorage.getItem(CACHE_LIST_KEY);
      if (stored) {
        jsonCacheList = JSON.parse(stored);
        updateCacheDropdown();
      }
    } catch (err) {
      console.warn('キャッシュ読み込みエラー:', err);
      jsonCacheList = [];
    }
  }

  function saveCacheList() {
    try {
      localStorage.setItem(CACHE_LIST_KEY, JSON.stringify(jsonCacheList));
    } catch (err) {
      console.warn('キャッシュ保存エラー:', err);
    }
  }

  function loadCachedJsonById(id) {
    try {
      const cacheItem = jsonCacheList.find(item => item.id === id);
      if (!cacheItem) return;

      const extracted = extractTweetsFromJson(cacheItem.data);
      if (!extracted.length) return;

      allTweets = extracted.map(raw => ({
        id: raw.id_str || raw.id || '',
        created_at: raw.created_at || raw.date || '',
        full_text: raw.full_text || raw.text || '',
        name: raw.name || raw.user?.name || '',
        screen_name: raw.screen_name || raw.user?.screen_name || raw.user?.screen_name_str || '',
        profile_image_url: stripSpaces(raw.profile_image_url || raw.user?.profile_image_url),
        url: raw.url || extractFirstLink(raw.full_text || raw.text || '') || '',
        favorite_count: Number(raw.favorite_count || raw.favorite_count_str || raw.favourite_count || 0),
        retweet_count: Number(raw.retweet_count || raw.retweet_count_str || 0),
        views_count: Number(raw.views_count || raw.views || 0),
        media: gatherMedia(raw)
      }));
      
      localStorage.setItem(CACHE_CURRENT_KEY, id);
      applyFiltersAndRender();
      updateCacheDropdown();
      console.log('✅ キャッシュ復元:', cacheItem.name);
    } catch (err) {
      console.warn('キャッシュ読み込みエラー:', err);
    }
  }

  function saveJsonToCache(data, filename) {
    try {
      const id = 'cache_' + Date.now();
      const name = filename || `JSON_${new Date().toLocaleString('ja-JP')}`;
      jsonCacheList.push({ id, name, timestamp: Date.now(), data });
      if (jsonCacheList.length > 10) {
        jsonCacheList.sort((a, b) => b.timestamp - a.timestamp);
        jsonCacheList = jsonCacheList.slice(0, 10);
      }
      saveCacheList();
      localStorage.setItem(CACHE_CURRENT_KEY, id);
      updateCacheDropdown();
      console.log('✅ キャッシュ保存:', name);
    } catch (err) {
      console.warn('キャッシュ保存エラー:', err);
    }
  }

  function updateCacheDropdown() {
    const lang = window.currentLanguage || { cacheSelect: '履歴を選択', deleteCache: '現在の履歴を削除' };
    const currentId = localStorage.getItem(CACHE_CURRENT_KEY);
    const container = document.querySelector('.cache-dropdown-container');
    
    if (!container) {
      createCacheDropdown();
      return;
    }

    const select = container.querySelector('select');
    if (!select) return;

    select.innerHTML = `<option value="">${lang.cacheSelect}</option>`;
    jsonCacheList.sort((a, b) => b.timestamp - a.timestamp).forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name;
      if (item.id === currentId) option.selected = true;
      select.appendChild(option);
    });

    const deleteBtn = container.querySelector('.delete-cache-btn');
    if (deleteBtn) {
      deleteBtn.style.display = currentId ? 'inline-block' : 'none';
      deleteBtn.title = lang.deleteCache;
    }
  }

  function createCacheDropdown() {
    const lang = window.currentLanguage || { cacheSelect: '履歴を選択', deleteCache: '現在の履歴を削除' };
    const container = document.createElement('div');
    container.className = 'cache-dropdown-container';
    container.style.cssText = 'display:flex;gap:6px;align-items:center';

    const select = document.createElement('select');
    select.id = 'cacheSelect';
    select.className = 'cache-select-theme';
    select.style.cssText = 'padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);min-width:150px';
    select.innerHTML = `<option value="">${lang.cacheSelect}</option>`;

    const currentId = localStorage.getItem(CACHE_CURRENT_KEY);
    jsonCacheList.sort((a, b) => b.timestamp - a.timestamp).forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name;
      if (item.id === currentId) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      if (e.target.value) loadCachedJsonById(e.target.value);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-cache-btn';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = lang.deleteCache;
    deleteBtn.style.cssText = 'padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);cursor:pointer;display:' + (currentId ? 'inline-block' : 'none');

    deleteBtn.addEventListener('click', () => {
      const id = select.value;
      if (!id) return;
      
      const confirmMsg = lang.cacheSelect.includes('history') ? 'Delete this history?' 
                       : lang.cacheSelect.includes('历史') ? '删除此历史记录？'
                       : lang.cacheSelect.includes('기록') ? '이 기록을 삭제하시겠습니까?'
                       : 'この履歴を削除しますか？';
      
      if (confirm(confirmMsg)) {
        jsonCacheList = jsonCacheList.filter(item => item.id !== id);
        saveCacheList();
        if (localStorage.getItem(CACHE_CURRENT_KEY) === id) {
          localStorage.removeItem(CACHE_CURRENT_KEY);
          allTweets = [];
          viewTweets = [];
          renderGallery();
        }
        updateCacheDropdown();
      }
    });

    container.appendChild(select);
    container.appendChild(deleteBtn);

    const controls = document.querySelector('.controls');
    if (controls && fileInput) {
      fileInput.parentNode.insertBefore(container, fileInput.nextSibling);
    }
  }

  // ファイル読み込み
  fileInput.addEventListener('change', e => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      let txt = ev.target.result;
      if (txt?.charCodeAt(0) === 0xFEFF) txt = txt.slice(1);
      try {
        const parsed = JSON.parse(txt);
        const extracted = extractTweetsFromJson(parsed);
        if (!extracted.length) { alert('ツイートデータが見つかりませんでした'); return; }
        
        saveJsonToCache(parsed, f.name);
        
        allTweets = extracted.map(raw => ({
          id: raw.id_str || raw.id || '',
          created_at: raw.created_at || raw.date || '',
          full_text: raw.full_text || raw.text || '',
          name: raw.name || raw.user?.name || '',
          screen_name: raw.screen_name || raw.user?.screen_name || raw.user?.screen_name_str || '',
          profile_image_url: stripSpaces(raw.profile_image_url || raw.user?.profile_image_url),
          url: raw.url || extractFirstLink(raw.full_text || raw.text || '') || '',
          favorite_count: Number(raw.favorite_count || raw.favorite_count_str || raw.favourite_count || 0),
          retweet_count: Number(raw.retweet_count || raw.retweet_count_str || 0),
          views_count: Number(raw.views_count || raw.views || 0),
          media: gatherMedia(raw)
        }));
        applyFiltersAndRender();
      } catch (err) {
        console.error(err);
        alert('JSON解析エラー: ' + (err?.message || err));
      }
    };
    r.onerror = () => alert('ファイル読み込みエラー');
    r.readAsText(f, 'UTF-8');
  });

  // 高度な検索
  function advancedSearch(query, haystack) {
    const minusTerms = [];
    const minusMatches = query.match(/-(\S+)/g);
    if (minusMatches) {
      minusMatches.forEach(term => minusTerms.push(term.substring(1).toLowerCase()));
    }
    
    for (const term of minusTerms) {
      if (haystack.includes(term)) return false;
    }
    
    let cleanQuery = query.replace(/-\S+/g, '').trim();
    if (!cleanQuery) return true;
    
    if (/\sOR\s/i.test(cleanQuery) || /\|/.test(cleanQuery)) {
      const orTerms = cleanQuery.split(/\sOR\s|\|/i).map(t => t.trim().toLowerCase());
      return orTerms.some(term => {
        if (/\sAND\s/i.test(term) || /\s&\s/.test(term)) {
          const andTerms = term.split(/\sAND\s|\s&\s/i).map(t => t.trim());
          return andTerms.every(t => haystack.includes(t));
        }
        return haystack.includes(term);
      });
    }
    
    if (/\sAND\s/i.test(cleanQuery) || /\s&\s/.test(cleanQuery)) {
      const andTerms = cleanQuery.split(/\sAND\s|\s&\s/i).map(t => t.trim().toLowerCase());
      return andTerms.every(term => haystack.includes(term));
    }
    
    const terms = cleanQuery.split(/\s+/).filter(Boolean);
    return terms.every(term => haystack.toLowerCase().includes(term.toLowerCase()));
  }

  // フィルタリング
  function applyFiltersAndRender() {
    const q = searchInput.value.trim();
    const tagQ = tagInput.value.trim();
    const start = startDateEl.value ? new Date(startDateEl.value) : null;
    const end = endDateEl.value ? new Date(endDateEl.value + 'T23:59:59') : null;

    viewTweets = allTweets.filter(t => {
      const dt = t.created_at ? new Date(t.created_at) : null;
      if (start && (!dt || dt < start)) return false;
      if (end && (!dt || dt > end)) return false;
      
      if (q) {
        const hay = ((t.full_text || '') + ' ' + (t.name || '') + ' ' + (t.screen_name || '')).toLowerCase();
        if (!advancedSearch(q, hay)) return false;
      }
      
      if (tagQ) {
        const tagHay = (t.full_text || '').toLowerCase();
        if (!advancedSearch(tagQ, tagHay)) return false;
      }
      
      return true;
    });

    const s = sortSelect.value;
    if (s === 'newest') viewTweets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (s === 'oldest') viewTweets.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (s === 'likes') viewTweets.sort((a, b) => (b.favorite_count || 0) - (a.favorite_count || 0));

    renderGallery();
  }

  // レンダリング
  function renderGallery() {
    const lang = window.currentLanguage || {
      noResults: '表示する投稿がありません。',
      noText: '(本文なし)',
      imageCount: '枚',
      openTweet: '投稿を開く'
    };
    
    gallery.innerHTML = '';
    if (!viewTweets.length) { 
      gallery.innerHTML = `<div style="padding:18px;color:var(--muted)">${lang.noResults}</div>`; 
      return; 
    }
    
    viewTweets.forEach((t) => {
      const card = document.createElement('article');
      card.className = 'card';

      if (!t.media?.length) {
        // テキストのみ
        card.classList.add('text-only-card');
        
        const userInfo = document.createElement('div');
        userInfo.className = 'text-card-user';
        userInfo.textContent = `${t.name || ''} (@${t.screen_name || ''})`;
        
        const stats = document.createElement('div');
        stats.className = 'text-card-stats';
        stats.innerHTML = `❤ ${t.favorite_count || 0}　🔁 ${t.retweet_count || 0}`;
        
        const textContent = document.createElement('div');
        textContent.className = 'text-card-content';
        const fullText = t.full_text || lang.noText;
        if (fullText.length > 140) textContent.classList.add('long-text');
        textContent.textContent = fullText;
        
        const footer = document.createElement('div');
        footer.className = 'text-card-footer';
        
        const dateSpan = document.createElement('span');
        dateSpan.textContent = t.created_at || '';
        
        const noMediaLabel = document.createElement('span');
        noMediaLabel.className = 'no-media-label';
        noMediaLabel.textContent = 'No Media';
        
        const linkSpan = document.createElement('span');
        if (t.url || (t.screen_name && t.id)) {
          const tweetLink = document.createElement('a');
          tweetLink.href = t.url || `https://twitter.com/${t.screen_name}/status/${t.id}`;
          tweetLink.target = '_blank';
          tweetLink.rel = 'noopener noreferrer';
          tweetLink.textContent = lang.openTweet;
          tweetLink.className = 'text-card-link';
          tweetLink.addEventListener('click', e => e.stopPropagation());
          linkSpan.appendChild(tweetLink);
        }
        
        footer.append(dateSpan, noMediaLabel, linkSpan);
        card.append(userInfo, stats, textContent, footer);
        card.addEventListener('click', () => openModalWithText(fullText));
        gallery.appendChild(card);
        return;
      }

      // メディアあり
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      
      const first = t.media[0];

      if (first && (first.type === 'video' || first.type === 'animated_gif' || isVideo(first.full || first.thumb))) {
        const v = document.createElement('video');
        const srcUrl = (first.full || first.thumb || '').trim();
        v.dataset.src = srcUrl;
        v.src = srcUrl;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.loading = 'lazy';
        v.preload = 'none';
        if (first.thumb) v.poster = first.thumb;
        if (videoObserver) videoObserver.observe(v);
        thumb.appendChild(v);

        const icon = document.createElement('div');
        icon.className = 'video-icon';
        
        // 🔧 動画時間を MM:SS 形式で表示
        let iconText = (first.type === 'animated_gif' || /gif/i.test(first.type)) ? 'GIF' : '🎥';
        if (first.duration && first.duration > 0) {
          const minutes = Math.floor(first.duration / 60);
          const seconds = first.duration % 60;
          const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          iconText += ` ${timeStr}`;
        }
        
        icon.textContent = iconText;
        thumb.appendChild(icon);
      } else {
        const img = document.createElement('img');
        img.src = (first.thumb || first.full || '').trim();
        img.alt = (t.full_text || '').slice(0, 120);
        img.loading = 'lazy';
        img.decoding = 'async'; // 🔧 非同期デコード
        thumb.appendChild(img);
      }

      if (t.media.length > 1) {
        const count = document.createElement('div');
        count.className = 'count';
        count.textContent = `${t.media.length}${lang.imageCount}`;
        thumb.appendChild(count);
      }

      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        const arr = t.media.map(m => (m.full || m.thumb || '').trim()).filter(Boolean);
        openModalWithMedia(arr);
      });

      const info = document.createElement('div');
      info.className = 'info';
      
      const meta = document.createElement('div');
      meta.className = 'meta';
      const left = document.createElement('div');
      left.textContent = `${t.name || ''} (@${t.screen_name || ''})`;
      const right = document.createElement('div');
      right.innerHTML = `❤ ${t.favorite_count || 0}　🔁 ${t.retweet_count || 0}`;
      meta.append(left, right);

      const preview = document.createElement('div');
      preview.className = 'preview';
      preview.textContent = (t.full_text || '').slice(0, 180);

      const date = document.createElement('div');
      date.className = 'meta';
      date.style.cssText = 'font-size:12px;opacity:0.8;display:flex;justify-content:space-between;align-items:center';
      
      const dateText = document.createElement('span');
      dateText.textContent = t.created_at || '';
      
      const linkWrapper = document.createElement('span');
      if (t.url || (t.screen_name && t.id)) {
        const tweetLink = document.createElement('a');
        tweetLink.href = t.url || `https://twitter.com/${t.screen_name}/status/${t.id}`;
        tweetLink.target = '_blank';
        tweetLink.rel = 'noopener noreferrer';
        tweetLink.textContent = lang.openTweet;
        tweetLink.style.cssText = 'color:#1d9bf0;text-decoration:none;font-size:12px';
        tweetLink.addEventListener('click', e => e.stopPropagation());
        linkWrapper.appendChild(tweetLink);
      }
      
      date.append(dateText, linkWrapper);
      info.append(meta, preview, date);
      card.append(thumb, info);

      card.addEventListener('click', () => {
        const arr = t.media.map(m => (m.full || m.thumb || '').trim()).filter(Boolean);
        openModalWithMedia(arr);
      });

      gallery.appendChild(card);
    });

    // 自動再生制御
    if (autoPlayToggle && !autoPlayToggle.checked) {
      document.querySelectorAll('.thumb video').forEach(v => v.pause());
    }
  }

  // モーダル
  function openModalWithMedia(list) {
    modalText.style.display = 'none';
    modalImg.style.display = 'none';
    modalVideo.style.display = 'none';
    modalList = list;
    modalIndex = 0;
    showModalAt(modalIndex);
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    modalCounter.textContent = `${modalIndex + 1} / ${modalList.length}`;
    updateModalNavVisibility();
  }

  function openModalWithText(text) {
    modalList = [];
    modalIndex = 0;
    modalImg.style.display = 'none';
    modalVideo.style.display = 'none';
    modalText.style.display = 'block';
    modalText.textContent = text;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    modalCounter.textContent = '';
    updateModalNavVisibility();
  }

  function showModalAt(i) {
    if (!modalList.length) return;
    modalIndex = (i + modalList.length) % modalList.length;
    window.modalIndex = modalIndex;
    const url = modalList[modalIndex];
    if (isVideo(url)) {
      modalImg.style.display = 'none';
      modalVideo.style.display = 'block';
      modalVideo.src = url;
      modalVideo.play().catch(() => {});
    } else {
      modalVideo.pause();
      modalVideo.src = '';
      modalVideo.style.display = 'none';
      modalImg.style.display = 'block';
      modalImg.src = url;
      modalImg.style.transform = 'translate(0,0) scale(1)';
    }
    modalCounter.textContent = `${modalIndex + 1} / ${modalList.length}`;
  }

  function updateModalNavVisibility() {
    const visible = modalList.length > 1;
    prevBtn.style.display = visible ? 'inline-block' : 'none';
    nextBtn.style.display = visible ? 'inline-block' : 'none';
  }

  closeModal.addEventListener('click', () => {
    modal.classList.add('hidden');
    modalVideo.pause();
    modalVideo.src = '';
    document.body.style.overflow = '';
    modalImg.style.transform = 'translate(0,0) scale(1)';
    modalText.textContent = '';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modalImg || e.target === modalVideo || e.target === modalText || 
        e.target.closest('#modalInner') || e.target.closest('.modal-btn')) return;
    closeModal.click();
  });

  prevBtn.addEventListener('click', () => showModalAt(modalIndex - 1));
  nextBtn.addEventListener('click', () => showModalAt(modalIndex + 1));
  
  document.addEventListener('keydown', (e) => {
    if (modal.classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft') showModalAt(modalIndex - 1);
    if (e.key === 'ArrowRight') showModalAt(modalIndex + 1);
    if (e.key === 'Escape') closeModal.click();
  });

  // タッチスワイプ
  (function() {
    let startX = null;
    modal.addEventListener('touchstart', e => {
      if (e.touches?.[0]) startX = e.touches[0].clientX;
    }, { passive: true });
    
    modal.addEventListener('touchend', e => {
      if (startX === null) return;
      const endX = e.changedTouches?.[0]?.clientX;
      if (!endX) { startX = null; return; }
      const dx = endX - startX;
      if (dx > 40) showModalAt(modalIndex - 1);
      else if (dx < -40) showModalAt(modalIndex + 1);
      startX = null;
    }, { passive: true });

    // ピンチズーム
    let mz_scale = 1, mz_originX = 0, mz_originY = 0, lastTouchDist = 0, mz_isDragging = false, mz_lastX = 0, mz_lastY = 0;

    function getDistance(touches) {
      const [a, b] = touches;
      return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
    }

    modalImg.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        lastTouchDist = getDistance(e.touches);
      } else if (e.touches.length === 1 && mz_scale > 1) {
        mz_isDragging = true;
        mz_lastX = e.touches[0].pageX - mz_originX;
        mz_lastY = e.touches[0].pageY - mz_originY;
      }
    }, { passive: true });

    modalImg.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        const newDist = getDistance(e.touches);
        if (lastTouchDist > 0) {
          const delta = newDist / lastTouchDist;
          mz_scale = Math.min(Math.max(mz_scale * delta, 1), 4);
          modalImg.style.transform = `translate(${mz_originX}px, ${mz_originY}px) scale(${mz_scale})`;
        }
        lastTouchDist = newDist;
      } else if (e.touches.length === 1 && mz_isDragging) {
        mz_originX = e.touches[0].pageX - mz_lastX;
        mz_originY = e.touches[0].pageY - mz_lastY;
        modalImg.style.transform = `translate(${mz_originX}px, ${mz_originY}px) scale(${mz_scale})`;
        e.preventDefault();
      }
    }, { passive: false });

    modalImg.addEventListener('touchend', () => {
      if (mz_scale <= 1.01) {
        mz_scale = 1; mz_originX = 0; mz_originY = 0;
        modalImg.style.transform = 'translate(0,0) scale(1)';
      }
      mz_isDragging = false;
    }, { passive: true });
  })();

  // ズーム&パン
  (function() {
    let scale = 1, originX = 0, originY = 0, lastTapTime = 0, tapTimeout = null;
    let panStartX = 0, panStartY = 0, initialTouchX = 0, initialTouchY = 0;
    let touchStartTime = 0, hasMoved = false, isPanning = false;

    modalImg.style.transition = 'transform 0.25s ease';

    modalImg.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return;
      const now = Date.now();
      const touch = e.touches[0];
      initialTouchX = touch.clientX;
      initialTouchY = touch.clientY;
      touchStartTime = now;
      hasMoved = false;
      isPanning = false;

      const rect = modalImg.getBoundingClientRect();
      const tapX = touch.clientX - rect.left - rect.width / 2;
      const tapY = touch.clientY - rect.top - rect.height / 2;

      if (now - lastTapTime < 500) {
        clearTimeout(tapTimeout);
        if (scale === 1) {
          scale = 2;
          originX = -tapX * (scale - 1);
          originY = -tapY * (scale - 1);
        } else {
          scale = 1;
          originX = 0;
          originY = 0;
        }
        modalImg.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
        lastTapTime = 0;
      } else {
        lastTapTime = now;
        panStartX = touch.clientX - originX;
        panStartY = touch.clientY - originY;
        
        if (scale > 1) {
          tapTimeout = setTimeout(() => {
            const touchDuration = Date.now() - touchStartTime;
            if (!hasMoved && !isPanning && touchDuration < 300 && scale > 1) {
              scale = 1;
              originX = 0;
              originY = 0;
              modalImg.style.transform = 'translate(0, 0) scale(1)';
            }
          }, 500);
        }
      }
    }, { passive: true });

    modalImg.addEventListener('touchmove', e => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const moveDistX = Math.abs(touch.clientX - initialTouchX);
      const moveDistY = Math.abs(touch.clientY - initialTouchY);
      
      if (moveDistX > 5 || moveDistY > 5) {
        hasMoved = true;
        clearTimeout(tapTimeout);
      }
      
      if (scale > 1 && hasMoved) {
        isPanning = true;
        originX = touch.clientX - panStartX;
        originY = touch.clientY - panStartY;
        modalImg.style.transition = 'none';
        modalImg.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
        e.preventDefault();
        e.stopPropagation();
      }
    }, { passive: false });

    modalImg.addEventListener('touchend', () => {
      const touchDuration = Date.now() - touchStartTime;
      if (touchDuration >= 300 || hasMoved || isPanning) clearTimeout(tapTimeout);
      modalImg.style.transition = 'transform 0.25s ease';
      setTimeout(() => isPanning = false, 100);
    }, { passive: true });

    // PC: マウスドラッグ
    let mouseDown = false, mouseStartX = 0, mouseStartY = 0;
    modalImg.addEventListener('mousedown', e => {
      if (scale <= 1) return;
      mouseDown = true;
      mouseStartX = e.clientX - originX;
      mouseStartY = e.clientY - originY;
      modalImg.style.transition = 'none';
      e.preventDefault();
    });
    
    window.addEventListener('mousemove', e => {
      if (!mouseDown) return;
      originX = e.clientX - mouseStartX;
      originY = e.clientY - mouseStartY;
      modalImg.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
    });
    
    window.addEventListener('mouseup', () => {
      mouseDown = false;
      modalImg.style.transition = 'transform 0.25s ease';
    });

    // PC: ダブルクリック
    modalImg.addEventListener('dblclick', (e) => {
      if (scale === 1) {
        scale = 2;
        const rect = modalImg.getBoundingClientRect();
        const clickX = e.clientX - rect.left - rect.width / 2;
        const clickY = e.clientY - rect.top - rect.height / 2;
        originX = -clickX * (scale - 1);
        originY = -clickY * (scale - 1);
      } else {
        scale = 1;
        originX = 0;
        originY = 0;
      }
      modalImg.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
    });

    closeModal.addEventListener('click', () => {
      scale = 1;
      originX = 0;
      originY = 0;
      modalImg.style.transform = 'translate(0, 0) scale(1)';
      clearTimeout(tapTimeout);
      lastTapTime = 0;
      isPanning = false;
    });
  })();

  // UIイベント
  applyBtn.addEventListener('click', applyFiltersAndRender);
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    tagInput.value = '';
    startDateEl.value = '';
    endDateEl.value = '';
    sortSelect.value = 'newest';
    applyFiltersAndRender();
  });
  
  searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') applyFiltersAndRender();
  });
  
  tagInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') applyFiltersAndRender();
  });
  
  startDateEl.addEventListener('change', applyFiltersAndRender);
  endDateEl.addEventListener('change', applyFiltersAndRender);
  sortSelect.addEventListener('change', applyFiltersAndRender);

  // テーマ切り替え
  themeToggle.addEventListener('click', () => {
    const current = document.body.classList.contains('amoled') ? 'amoled' 
                  : document.body.classList.contains('dark') ? 'dark' 
                  : 'light';
    
    document.body.classList.remove('dark', 'amoled');
    
    let next;
    if (current === 'light') {
      next = 'dark';
      document.body.classList.add('dark');
    } else if (current === 'dark') {
      next = 'amoled';
      document.body.classList.add('amoled');
    } else {
      next = 'light';
    }
    
    localStorage.setItem('xviewer_theme', next);
  });
  
  langSelect.addEventListener('change', () => {
    const v = langSelect.value;
    localStorage.setItem('xviewer_lang', v);
    applyLanguage(v);
  });

  function applyLanguage(v) {
    const dict = {
      ja: { 
        title: '𝕏 いいねビューア', 
        search: '本文・ユーザー名で検索', 
        tag: '#タグ or 単語', 
        apply: '適用', 
        clear: '解除',
        newest: '新しい順',
        oldest: '古い順',
        likes: 'いいね数順',
        openTweet: '投稿を開く',
        noResults: '表示する投稿がありません。',
        noText: '(本文なし)',
        imageCount: '枚',
        startLabel: '開始:',
        endLabel: '終了:',
        cacheSelect: '履歴を選択',
        deleteCache: '現在の履歴を削除'
      },
      en: { 
        title: '𝕏 Likes Viewer', 
        search: 'Search text/user', 
        tag: '#tag or word', 
        apply: 'Apply', 
        clear: 'Clear',
        newest: 'Newest',
        oldest: 'Oldest',
        likes: 'Most Liked',
        openTweet: 'Open Tweet',
        noResults: 'No posts to display.',
        noText: '(No text)',
        imageCount: 'images',
        startLabel: 'Start:',
        endLabel: 'End:',
        cacheSelect: 'Select history',
        deleteCache: 'Delete current history'
      },
      zh: { 
        title: '𝕏 点赞查看', 
        search: '搜索 内容/用户名', 
        tag: '#标签 或 词', 
        apply: '应用', 
        clear: '清除',
        newest: '最新',
        oldest: '最旧',
        likes: '最多赞',
        openTweet: '打开推文',
        noResults: '没有要显示的帖子。',
        noText: '(无文本)',
        imageCount: '张',
        startLabel: '开始:',
        endLabel: '结束:',
        cacheSelect: '选择历史',
        deleteCache: '删除当前历史'
      },
      ko: { 
        title: '𝕏 좋아요 뷰어', 
        search: '텍스트/사용자 검색', 
        tag: '#태그 또는 단어', 
        apply: '적용', 
        clear: '해제',
        newest: '최신순',
        oldest: '오래된순',
        likes: '좋아요순',
        openTweet: '트윗 열기',
        noResults: '표시할 게시물이 없습니다.',
        noText: '(텍스트 없음)',
        imageCount: '개',
        startLabel: '시작:',
        endLabel: '종료:',
        cacheSelect: '기록 선택',
        deleteCache: '현재 기록 삭제'
      }
    };
    
    const u = dict[v] || dict.ja;
    
    document.getElementById('title').textContent = u.title;
    searchInput.placeholder = u.search;
    tagInput.placeholder = u.tag;
    applyBtn.textContent = u.apply;
    clearBtn.textContent = u.clear;
    
    const options = sortSelect.querySelectorAll('option');
    if (options[0]) options[0].textContent = u.newest;
    if (options[1]) options[1].textContent = u.oldest;
    if (options[2]) options[2].textContent = u.likes;
    
    const dateLabels = document.querySelectorAll('.date-range label');
    if (dateLabels[0]) dateLabels[0].childNodes[0].textContent = u.startLabel + ' ';
    if (dateLabels[1]) dateLabels[1].childNodes[0].textContent = u.endLabel + ' ';
    
    const cacheSelect = document.getElementById('cacheSelect');
    if (cacheSelect?.options[0]) cacheSelect.options[0].textContent = u.cacheSelect;
    
    const deleteBtn = document.querySelector('.delete-cache-btn');
    if (deleteBtn) deleteBtn.title = u.deleteCache;
    
    if (viewTweets.length > 0) renderGallery();
    
    window.currentLanguage = u;
  }

  // グローバル公開
  window.applyFiltersAndRender = applyFiltersAndRender;
  window.modalList = [];
  window.modalIndex = 0;
  window.showModalAt = showModalAt;
  
  const originalOpenModalWithMedia = openModalWithMedia;
  openModalWithMedia = function(list) {
    window.modalList = list;
    window.modalIndex = 0;
    originalOpenModalWithMedia(list);
  };

})();

// ヘッダー自動非表示
(() => {
  let lastScroll = 0;
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    if (current > lastScroll && current > 80) {
      header.classList.add('hide-header');
    } else if (current < lastScroll - 10) {
      header.classList.remove('hide-header');
    }
    lastScroll = current;
  });
})();

// PC: ホイールで画像切り替え
(() => {
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modalImg');
  const modalVideo = document.getElementById('modalVideo');

  if (!modal || !modalImg || !modalVideo) return;
  modalVideo.volume = 0.1;

  if (window.matchMedia("(min-width: 769px)").matches) {
    let wheelLock = false;
    
    function handleWheel(e) {
      if (wheelLock || modal.classList.contains('hidden') || !window.modalList || window.modalList.length <= 1) return;
      
      e.preventDefault();
      e.stopPropagation();
      wheelLock = true;
      
      const currentIndex = window.modalIndex || 0;
      if (e.deltaY > 0) window.showModalAt(currentIndex + 1);
      else if (e.deltaY < 0) window.showModalAt(currentIndex - 1);
      
      setTimeout(() => wheelLock = false, 300);
    }
    
    modalImg.addEventListener('wheel', handleWheel, { passive: false });
    modalVideo.addEventListener('wheel', handleWheel, { passive: false });
  }
})();