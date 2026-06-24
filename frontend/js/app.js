/* ═══════════════════════════════════════════════════════════
   INSTAGRAM CLONE — app.js  v10
   Roles: admin (admin@example.com) — can see User Management
           user  (everyone else)    — cannot
═══════════════════════════════════════════════════════════ */

const API = window.location.origin;

/* ─── Token helpers ─── */
const TOKEN_KEY   = 'ig_access_token';
const REFRESH_KEY = 'ig_refresh_token';

const authGetAccess  = () => localStorage.getItem(TOKEN_KEY);
const authGetRefresh = () => localStorage.getItem(REFRESH_KEY);
function authStore(a, r) {
  localStorage.setItem(TOKEN_KEY, a);
  localStorage.setItem(REFRESH_KEY, r);
}
function authClear() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/* ─── JWT decode (client-side only) ─── */
function jwtDecode(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch { return null; }
}
function authIsExpired(token) {
  const p = jwtDecode(token);
  if (!p || !p.exp) return true;
  return Date.now() / 1000 >= p.exp - 30;
}

/* ─── App State ─── */
const state = {
  currentPage: 'home',
  currentUserId: null,
  isAdmin: false,
  users: [],
  uploadType: 'post',
  pendingImageUrl: null,
  lastSelectedFileType: null,
  profileTab: 'posts',
  currentUsernameId: null,
  currentBioId: null,
  chats: [],
  activeChatId: null,
  selectedShareChats: new Set(),
  currentlySharingItem: null,
};

/* ─── DOM shortcuts ─── */
const $ = id => document.getElementById(id);

/* ═══════════════════════════════════════════════════════════
   API CLIENT
═══════════════════════════════════════════════════════════ */
async function api(endpoint, opts = {}, _retry = true) {
  const token = authGetAccess();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API}${endpoint}`, { headers, ...opts });
    if (res.status === 204) return null;

    if (res.status === 401 && _retry) {
      const refreshed = await authRefreshTokens();
      if (refreshed) return api(endpoint, opts, false);
      authLogout();
      throw new Error('Session expired — please log in again');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
async function init() {
  const token = authGetAccess();
  if (!token || authIsExpired(token)) {
    const refreshed = await authRefreshTokens();
    if (!refreshed) { authShowScreen(); return; }
  }
  await authBootApp();
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════ */
function switchPage(page) {
  // Guard user management for non-admins
  if (page === 'users' && !state.isAdmin) {
    showToast('Access denied', 'error');
    return;
  }

  state.currentPage = page;

  if (page !== 'chats') {
    stopChatPolling();
  }

  // Update nav active state
  document.querySelectorAll('.nav-item[data-page]').forEach(el => el.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Show page
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const pageEl = $(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  loadPage(page);
}

async function loadPage(page) {
  if (page === 'home') {
    await loadPosts();
    loadUsers();
  } else if (page === 'profile') {
    await loadProfile();
  } else if (page === 'users') {
    if (!state.isAdmin) return;
    await loadUsersPage();
  } else if (page === 'chats') {
    await loadChats();
    if (state.activeChatId) {
      startChatPolling();
    }
  }
}

/* ═══════════════════════════════════════════════════════════*/
async function loadPosts() {
  const container = $('posts-container');
  container.innerHTML = '<div class="loading-spinner" style="margin-top:40px;"></div>';
  try {
    const [posts, reels] = await Promise.all([
      api('/user/posts').catch(() => []),
      api('/user/reels').catch(() => [])
    ]);

    const postsCtx = posts.map(p => ({ ...p, feed_type: 'post', id: p.post_id }));
    const reelsCtx = reels.map(r => ({ ...r, feed_type: 'reel', id: r.reel_id }));
    
    const unified = [...postsCtx, ...reelsCtx];
    unified.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    state.posts = unified;
    renderUnifiedFeed(unified);
  } catch (err) {
    container.innerHTML = emptyState('Could not load feed.', 'Is the backend running?');
  }
}

function renderUnifiedFeed(items) {
  const container = $('posts-container');
  if (!items.length) {
    container.innerHTML = emptyState('No posts or reels yet.', 'Click Create to share your first post!');
    return;
  }
  
  container.innerHTML = items.map(item => {
    const isReel = item.feed_type === 'reel';
    const id = item.id;
    const initial = 'U' + item.user_id;
    const canDelete = (item.user_id === state.currentUserId) || state.isAdmin;
    const prefix = isReel ? 'reel-' : 'post-';
    
    const deleteFunc = isReel ? `deleteReel(${id})` : `deletePost(${id})`;
    const likeFunc = `likePost(${id}, this, '${item.feed_type}')`;
    const saveFunc = isReel ? `saveReel(${id}, this)` : `savePost(${id}, this)`;
    
    const cmtInputId = `ci-${prefix}${id}`;
    const cmtsListId = `cmts-${prefix}${id}`;
    const likesLabelId = `likes-${prefix}${id}`;
    const menuId = `pmenu-${prefix}${id}`;

    let mediaHtml = '';
    if (isReel) {
      mediaHtml = `
      <div class="post-image-wrap" style="position:relative;">
        <video class="post-image" src="${esc(item.video_url)}" autoplay loop muted playsinline controls
               style="background:#000;" onerror="this.parentElement.style.display='none'"></video>
      </div>`;
    } else {
      mediaHtml = `
      <div class="post-image-wrap">
        <img class="post-image" src="${esc(item.image_url)}" alt="Post"
             onerror="this.parentElement.style.display='none'">
      </div>`;
    }

    return `
    <article class="post" id="post-${prefix}${id}">
      <div class="post-header">
        <div class="post-avatar"><span>${initial}</span></div>
        <div class="post-header-info">
          <div class="post-user-name" style="display:flex;align-items:center;gap:6px;">
            User ${item.user_id} 
            <span style="font-size:10px;font-weight:600;padding:2px 6px;border-radius:10px;background:rgba(255,255,255,0.08);color:var(--text-2);text-transform:uppercase;letter-spacing:0.05em;">
              ${isReel ? 'Reel 🎬' : 'Post 📸'}
            </span>
          </div>
          <div class="post-time">${timeAgo(item.created_at)}</div>
        </div>
        ${canDelete ? `
        <div style="position:relative;">
          <button class="post-more-btn" onclick="toggleMenu('${menuId}')">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </button>
          <div class="post-menu" id="${menuId}">
            <button class="post-menu-item danger" onclick="${deleteFunc}">Delete</button>
          </div>
        </div>` : ''}
      </div>

      ${mediaHtml}

      <div class="post-actions">
        <div class="post-actions-left">
          <button class="action-btn" id="like-btn-${prefix}${id}" onclick="${likeFunc}" title="Like">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <button class="action-btn" onclick="$('${cmtInputId}').focus()" title="Comment">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button class="action-btn" onclick="openShareModal('${item.feed_type}', ${id})" title="Share">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <button class="action-btn" onclick="${saveFunc}" title="Save">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>

      <div class="post-meta">
        <div class="post-likes" id="${likesLabelId}">0 likes</div>
        ${item.caption ? `<div class="post-caption"><span class="post-author">user_${item.user_id}</span>${esc(item.caption)}</div>` : ''}
      </div>

      <div class="comments-section">
        <button class="view-comments-btn" onclick="loadComments(${id}, '${item.feed_type}')">View comments</button>
        <div class="comment-list" id="${cmtsListId}"></div>
        <div class="add-comment-row">
          <input id="${cmtInputId}" class="add-comment-input" placeholder="Add a comment…"
                 onkeydown="if(event.key==='Enter'){addComment(${id}, '${item.feed_type}')}">
          <button class="post-btn" onclick="addComment(${id}, '${item.feed_type}')">Post</button>
        </div>
      </div>
    </article>`;
  }).join('');

  items.forEach(item => loadLikeCount(item.id, item.feed_type));

  // Close menus on outside click
  document.removeEventListener('click', closeAllPostMenus);
  document.addEventListener('click', closeAllPostMenus);
}

function closeAllPostMenus(e) {
  if (!e.target.closest('.post-more-btn') && !e.target.closest('.post-menu')) {
    document.querySelectorAll('.post-menu.open').forEach(m => m.classList.remove('open'));
  }
}

function toggleMenu(id) {
  const m = $(id);
  if (!m) return;
  const isOpen = m.classList.contains('open');
  document.querySelectorAll('.post-menu.open').forEach(x => x.classList.remove('open'));
  if (!isOpen) m.classList.add('open');
}

async function loadLikeCount(id, type = 'post') {
  try {
    const endpoint = type === 'post' ? `/user/posts/${id}/likes` : `/user/reels/${id}/likes`;
    const likes = await api(endpoint);
    const prefix = type === 'post' ? 'post-' : 'reel-';
    const el = $(`likes-${prefix}${id}`);
    if (el) el.textContent = `${likes.length} like${likes.length !== 1 ? 's' : ''}`;
  } catch {}
}

async function likePost(id, btn, type = 'post') {
  try {
    const endpoint = type === 'post' ? '/user/post-likes' : '/user/reel-likes';
    const payload = { user_id: state.currentUserId, is_liked: true };
    if (type === 'post') payload.post_id = id;
    else payload.reel_id = id;

    await api(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    btn.classList.add('liked');
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    loadLikeCount(id, type);
  } catch {}
}

async function savePost(postId, btn) {
  try {
    await api('/user/saved-posts', {
      method: 'POST',
      body: JSON.stringify({ user_id: state.currentUserId, post_id: postId }),
    });
    btn.classList.add('liked');
    showToast('Post saved!', 'success');
  } catch { showToast('Already saved or failed', 'error'); }
}

async function saveReel(reelId, btn) {
  try {
    await api('/user/saved-reels', {
      method: 'POST',
      body: JSON.stringify({ user_id: state.currentUserId, reel_id: reelId }),
    });
    btn.classList.add('liked');
    showToast('Reel saved!', 'success');
  } catch { showToast('Already saved or failed', 'error'); }
}

async function deletePost(postId) {
  if (!confirm('Delete this post?')) return;
  try {
    await api(`/user/posts/${postId}`, { method: 'DELETE' });
    showToast('Post deleted', 'success');
    loadPosts();
  } catch {}
}

async function deleteReel(reelId) {
  if (!confirm('Delete this reel?')) return;
  try {
    await api(`/user/reels/${reelId}`, { method: 'DELETE' });
    showToast('Reel deleted', 'success');
    loadPosts();
  } catch {}
}

async function loadComments(id, type = 'post') {
  const prefix = type === 'post' ? 'post-' : 'reel-';
  const el = $(`cmts-${prefix}${id}`);
  if (!el) return;
  try {
    const endpoint = type === 'post' ? `/user/posts/${id}/comments` : `/user/reels/${id}/comments`;
    const comments = await api(endpoint);
    el.innerHTML = comments.map(c => `<div class="comment-item"><b>user_${c.user_id}</b> ${esc(c.text)}</div>`).join('');
  } catch {}
}

async function addComment(id, type = 'post') {
  const prefix = type === 'post' ? 'post-' : 'reel-';
  const input = $(`ci-${prefix}${id}`);
  const text = input.value.trim();
  if (!text) return;
  try {
    const payload = { user_id: state.currentUserId, text };
    if (type === 'post') {
      payload.post_id = id;
      payload.reel_id = null;
    } else {
      payload.post_id = null;
      payload.reel_id = id;
    }
    await api('/user/comments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    input.value = '';
    loadComments(id, type);
  } catch {}
}

/* ═══════════════════════════════════════════════════════════
   SUGGESTIONS
═══════════════════════════════════════════════════════════ */
async function loadUsers() {
  try {
    const users = await api('/user/users');
    state.users = users;
    renderSuggestions(users);
  } catch { $('suggested-users').innerHTML = ''; }
}

function renderSuggestions(users) {
  const el = $('suggested-users');
  if (!el) return;
  const others = users.filter(u => u.user_id !== state.currentUserId).slice(0, 5);
  if (!others.length) { el.innerHTML = '<span style="color:var(--text-3);font-size:13px;">No suggestions</span>'; return; }
  el.innerHTML = others.map(u => `
    <div class="suggestion-row">
      <div class="suggestion-avatar">${u.email.charAt(0).toUpperCase()}</div>
      <div class="suggestion-info">
        <span class="suggestion-name">${esc(u.email.split('@')[0])}</span>
        <span class="suggestion-sub">Suggested for you</span>
      </div>
      <button class="follow-btn" onclick="followUser(${u.user_id}, this)">Follow</button>
    </div>
  `).join('');
}

async function followUser(id, btn) {
  try {
    await api('/user/followers', {
      method: 'POST',
      body: JSON.stringify({ follower_id: state.currentUserId, following_id: id }),
    });
    btn.textContent = 'Following';
    btn.style.color = 'var(--text-3)';
    btn.disabled = true;
  } catch {}
}

/* ═══════════════════════════════════════════════════════════
   CREATE MODAL
═══════════════════════════════════════════════════════════ */
function openCreateModal() {
  resetModal();
  $('create-modal').classList.add('open');
}
function closeCreateModal() {
  $('create-modal').classList.remove('open');
  resetModal();
}
function resetModal() {
  $('modal-step-1').style.display = '';
  $('modal-step-2').style.display = 'none';
  $('modal-back-btn').style.visibility = 'hidden';
  $('modal-share-btn').style.visibility = 'hidden';
  $('modal-title').textContent = 'Create new post';
  $('upload-caption').value = '';
  if ($('upload-url')) $('upload-url').value = '';
  const pane = $('preview-pane');
  if (pane) pane.innerHTML = '';
  state.pendingImageUrl = null;
  state.lastSelectedFileType = null;
  const innerCard = $('create-modal-inner');
  if (innerCard) innerCard.classList.remove('step-2-active');
  hideUrlInput();
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.type-btn[data-type="post"]')?.classList.add('active');
  state.uploadType = 'post';
}

function renderPreview(url) {
  const pane = $('preview-pane');
  if (!pane) return;
  const isVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov') || (state.lastSelectedFileType && state.lastSelectedFileType.startsWith('video/'));
  if (isVideo) {
    pane.innerHTML = `<video id="preview-video" src="${esc(url)}" autoplay loop muted playsinline class="preview-media"></video>`;
  } else {
    pane.innerHTML = `<img id="preview-image" src="${esc(url)}" alt="Preview" class="preview-media">`;
  }
}

function goToStep2(url) {
  state.pendingImageUrl = url;
  renderPreview(url);
  const innerCard = $('create-modal-inner');
  if (innerCard) innerCard.classList.add('step-2-active');
  $('modal-step-1').style.display = 'none';
  $('modal-step-2').style.display = 'flex';
  $('modal-back-btn').style.visibility = 'visible';
  $('modal-share-btn').style.visibility = 'visible';
  $('modal-title').textContent = 'Write caption';
}
function modalGoBack() {
  $('modal-step-1').style.display = '';
  $('modal-step-2').style.display = 'none';
  $('modal-back-btn').style.visibility = 'hidden';
  $('modal-share-btn').style.visibility = 'hidden';
  $('modal-title').textContent = 'Create new post';
  state.pendingImageUrl = null;
  state.lastSelectedFileType = null;
  const innerCard = $('create-modal-inner');
  if (innerCard) innerCard.classList.remove('step-2-active');
}
function showUrlInput() { $('url-input-area').style.display = 'block'; $('upload-url').focus(); }
function hideUrlInput() { if ($('url-input-area')) $('url-input-area').style.display = 'none'; }
function previewUrl() {
  const url = $('upload-url').value.trim();
  if (!url) { showToast('Paste a URL first', 'error'); return; }
  state.lastSelectedFileType = null;
  goToStep2(url);
}

function handleFileSelect(e) { if (e.target.files.length) handleFiles(e.target.files); }
async function handleFiles(fileList) {
  const file = fileList[0];
  if (!file) return;
  state.lastSelectedFileType = file.type;
  const local = URL.createObjectURL(file);
  goToStep2(local);
  showToast('Uploading…');
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await fetch(`${API}/upload`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Upload failed');
    state.pendingImageUrl = data.url;
    renderPreview(data.url);
    URL.revokeObjectURL(local);
    showToast('Uploaded!', 'success');
  } catch (err) { showToast(err.message, 'error'); modalGoBack(); }
}

function setUploadType(type) {
  state.uploadType = type;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.type-btn[data-type="${type}"]`)?.classList.add('active');
}

async function submitUpload() {
  const url = state.pendingImageUrl;
  if (!url) { showToast('No media selected', 'error'); return; }
  const caption = $('upload-caption').value.trim();
  const endpoint = state.uploadType === 'post' ? '/user/posts' : '/user/reels';
  const payload = { user_id: state.currentUserId, caption, status: 'active' };
  if (state.uploadType === 'post') payload.image_url = url;
  else payload.video_url = url;
  try {
    await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
    showToast(`${state.uploadType === 'post' ? 'Post' : 'Reel'} shared!`, 'success');
    closeCreateModal();
    loadPosts();
  } catch {}
}

/* ═══════════════════════════════════════════════════════════
   PROFILE PAGE
═══════════════════════════════════════════════════════════ */
async function loadProfile() {
  try {
    const user = await api(`/user/users/${state.currentUserId}`);
    const name = user.email ? user.email.split('@')[0] : `user_${state.currentUserId}`;

    // Full name
    $('profile-name').textContent = user.full_name || name;

    // Avatar letter
    const letter = (user.full_name || name).charAt(0).toUpperCase();
    $('profile-avatar-letter').textContent = letter;
    $('edit-avatar-letter').textContent = letter;

    // Profile pic
    if (user.profile_pic) {
      const wrap = $('profile-avatar');
      wrap.innerHTML = `<img src="${esc(user.profile_pic)}" alt="Profile" onerror="this.remove()">`;
    }

    // Username
    try {
      const unData = await api(`/user/users/${state.currentUserId}/username`);
      $('profile-username').textContent = unData.username;
      $('edit-username-label').textContent = unData.username;
      state.currentUsernameId = unData.user_name_id;
    } catch {
      $('profile-username').textContent = name;
      $('edit-username-label').textContent = name;
      state.currentUsernameId = null;
    }

    // Bio
    try {
      const bioData = await api(`/user/users/${state.currentUserId}/bio`);
      $('profile-bio-text').textContent = bioData.b_txt || 'No bio yet.';
      state.currentBioId = bioData.bio_id;
    } catch {
      $('profile-bio-text').textContent = 'No bio yet.';
      state.currentBioId = null;
    }

    // Followers / Following
    try {
      const [followers, following] = await Promise.all([
        api(`/user/users/${state.currentUserId}/followers`).catch(() => []),
        api(`/user/users/${state.currentUserId}/following`).catch(() => []),
      ]);
      $('profile-followers-count').textContent = followers.length;
      $('profile-following-count').textContent = following.length;
    } catch {}

    await renderProfileGrid();
  } catch {
    $('profile-grid').innerHTML = emptyState('Failed to load profile.', '');
  }
}

async function renderProfileGrid() {
  const grid = $('profile-grid');
  grid.innerHTML = '<div class="loading-spinner" style="margin:40px auto;"></div>';

  try {
    if (state.profileTab === 'posts') {
      const allPosts = await api('/user/posts');
      const mine = allPosts.filter(p => p.user_id === state.currentUserId);
      $('profile-posts-count').textContent = mine.length;

      if (!mine.length) {
        grid.innerHTML = emptyState('No posts yet.', 'Share your first photo!');
        grid.style.cssText = 'display:block;';
        return;
      }
      grid.style.cssText = '';
      grid.innerHTML = mine.map(p => `
        <div class="grid-item">
          <img src="${esc(p.image_url)}" alt="Post" onerror="this.style.opacity='.1'">
          <div class="grid-overlay">
            <div class="grid-stat">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span id="gl-${p.post_id}">0</span>
            </div>
          </div>
        </div>
      `).join('');

      mine.forEach(async p => {
        try {
          const likes = await api(`/user/posts/${p.post_id}/likes`);
          const el = $(`gl-${p.post_id}`);
          if (el) el.textContent = likes.length;
        } catch {}
      });

    } else if (state.profileTab === 'saved') {
      const [savedPosts, savedReels] = await Promise.all([
        api(`/user/users/${state.currentUserId}/saved-posts`).catch(() => []),
        api(`/user/users/${state.currentUserId}/saved-reels`).catch(() => []),
      ]);

      if (!savedPosts.length && !savedReels.length) {
        grid.innerHTML = emptyState('No saved items.', 'Save posts and reels to see them here.');
        grid.style.cssText = 'display:block;';
        return;
      }
      grid.style.cssText = '';
      let html = '';
      for (const sp of savedPosts) {
        const p = await api(`/user/posts/${sp.post_id}`).catch(() => null);
        if (p) html += `<div class="grid-item"><img src="${esc(p.image_url)}" alt="Saved"><div class="grid-overlay"><div class="grid-stat" style="font-size:11px;">POST</div></div></div>`;
      }
      for (const sr of savedReels) {
        const r = await api(`/user/reels/${sr.reel_id}`).catch(() => null);
        if (r) html += `<div class="grid-item"><img src="${esc(r.video_url)}" alt="Saved Reel" onerror="this.style.opacity='.2'"><div class="grid-overlay"><div class="grid-stat" style="font-size:11px;">REEL</div></div></div>`;
      }
      grid.innerHTML = html;
    }
  } catch {
    grid.innerHTML = emptyState('Failed to load.', '');
  }
}

function switchProfileTab(tab) {
  state.profileTab = tab;
  $('tab-posts').classList.toggle('active', tab === 'posts');
  $('tab-saved').classList.toggle('active', tab === 'saved');
  renderProfileGrid();
}

/* ─── Edit Profile Modal ─── */
function openEditProfileModal() {
  $('edit-username-input').value = $('profile-username').textContent !== $('profile-name').textContent
    ? $('profile-username').textContent : '';
  $('edit-bio-input').value = $('profile-bio-text').textContent === 'No bio yet.' ? '' : $('profile-bio-text').textContent;
  $('edit-name-input').value = $('profile-name').textContent;
  $('edit-profile-pic-input').value = '';
  $('edit-profile-modal').classList.add('open');
}
function closeEditProfileModal() { $('edit-profile-modal').classList.remove('open'); }

async function submitProfileEdits() {
  const username = $('edit-username-input').value.trim();
  const bio      = $('edit-bio-input').value.trim();
  const nameStr  = $('edit-name-input').value.trim();
  const picStr   = $('edit-profile-pic-input').value.trim();
  showToast('Saving…');
  try {
    if (username) {
      if (state.currentUsernameId) {
        await api(`/user/usernames/${state.currentUsernameId}`, { method: 'PUT', body: JSON.stringify({ username }) });
      } else {
        await api('/user/usernames', { method: 'POST', body: JSON.stringify({ user_id: state.currentUserId, username }) });
      }
    }
    if (bio) {
      if (state.currentBioId) {
        await api(`/user/bios/${state.currentBioId}`, { method: 'PUT', body: JSON.stringify({ b_txt: bio }) });
      } else {
        await api('/user/bios', { method: 'POST', body: JSON.stringify({ user_id: state.currentUserId, b_txt: bio }) });
      }
    }
    const payload = {};
    if (nameStr) payload.full_name = nameStr;
    if (picStr)  payload.profile_pic = picStr;
    if (Object.keys(payload).length > 0) {
      await api(`/user/users/${state.currentUserId}`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    showToast('Profile updated!', 'success');
    closeEditProfileModal();
    loadProfile();
  } catch { showToast('Failed to save', 'error'); }
}

/* ═══════════════════════════════════════════════════════════
   USER MANAGEMENT (admin only)
═══════════════════════════════════════════════════════════ */
const um = { users: [], editingUserId: null, pendingDeleteId: null };

async function loadUsersPage() {
  if (!state.isAdmin) {
    $('um-table-body').innerHTML = '<tr><td colspan="6" class="um-table-empty">⛔ Access denied — admins only.</td></tr>';
    return;
  }
  $('um-table-body').innerHTML = '<tr><td colspan="6" class="um-table-loading"><div class="loading-spinner"></div></td></tr>';
  try {
    const users = await api('/user/users').catch(() => []);
    um.users = users;
    if ($('um-count-label')) $('um-count-label').textContent = `${users.length} user${users.length !== 1 ? 's' : ''}`;
    umRenderTable(users);
  } catch {
    $('um-table-body').innerHTML = '<tr><td colspan="6" class="um-table-empty">Failed to load users.</td></tr>';
  }
}

function umRenderTable(users) {
  const tbody = $('um-table-body');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="um-table-empty">No users found.</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => {
    const name    = u.full_name || u.email.split('@')[0];
    const initial = name.charAt(0).toUpperCase();
    const statusKey   = (u.status || 'inactive').toLowerCase();
    const statusLabel = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
    const joined  = u.created_at ? new Date(u.created_at).toLocaleDateString() : '—';
    const avatarHtml = u.profile_pic
      ? `<div class="um-avatar"><img src="${esc(u.profile_pic)}" alt="Avatar" onerror="this.remove()"></div>`
      : `<div class="um-avatar">${initial}</div>`;

    return `<tr>
      <td>
        <div class="um-user-cell">
          ${avatarHtml}
          <div>
            <div class="um-name">${esc(name)}</div>
          </div>
        </div>
      </td>
      <td>${esc(u.email)}</td>
      <td>${u.phone ? esc(u.phone) : '<span style="color:var(--text-3)">—</span>'}</td>
      <td><span class="status-badge status-${statusKey}">${statusLabel}</span></td>
      <td>${joined}</td>
      <td>
        <div class="um-actions">
          <button class="um-btn um-btn-edit" onclick="umOpenEditModal(${u.user_id})">Edit</button>
          <button class="um-btn um-btn-delete" onclick="umOpenDeleteConfirm(${u.user_id}, '${esc(u.email)}')">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function umHandleSearch(q) {
  const filtered = um.users.filter(u => {
    const s = q.toLowerCase();
    return (u.email || '').toLowerCase().includes(s) || (u.full_name || '').toLowerCase().includes(s);
  });
  umRenderTable(filtered);
}

function umHandleStatusFilter(status) {
  const filtered = status === 'all' ? um.users : um.users.filter(u => (u.status || '').toLowerCase() === status);
  umRenderTable(filtered);
}

function umOpenEditModal(userId) {
  const u = um.users.find(x => x.user_id === userId);
  if (!u) return;
  um.editingUserId = userId;
  $('um-form-title').textContent = 'Edit User';
  $('um-f-name').value    = u.full_name || '';
  $('um-f-email').value   = u.email || '';
  $('um-f-phone').value   = u.phone || '';
  $('um-f-status').value  = u.status || 'active';
  $('um-f-password').value = '';
  $('um-f-pic').value     = u.profile_pic || '';
  $('um-form-modal').classList.add('open');
}

function umCloseFormModal() { $('um-form-modal').classList.remove('open'); um.editingUserId = null; }

async function umSubmitForm() {
  if (!um.editingUserId) return;
  const payload = {};
  const name   = $('um-f-name').value.trim();
  const email  = $('um-f-email').value.trim();
  const phone  = $('um-f-phone').value.trim();
  const status = $('um-f-status').value;
  const pw     = $('um-f-password').value;
  const pic    = $('um-f-pic').value.trim();

  if (name)   payload.full_name    = name;
  if (email)  payload.email        = email;
  if (phone)  payload.phone        = phone;
  if (status) payload.status       = status;
  if (pw)     payload.password     = pw;
  if (pic)    payload.profile_pic  = pic;

  try {
    await api(`/user/users/${um.editingUserId}`, { method: 'PUT', body: JSON.stringify(payload) });
    showToast('User updated!', 'success');
    umCloseFormModal();
    loadUsersPage();
  } catch { showToast('Failed to update user', 'error'); }
}

function umOpenDeleteConfirm(userId, email) {
  um.pendingDeleteId = userId;
  $('um-confirm-desc').textContent = `Are you sure you want to delete "${email}"? This cannot be undone.`;
  $('um-confirm-modal').classList.add('open');
}
function umCloseConfirmModal() { $('um-confirm-modal').classList.remove('open'); um.pendingDeleteId = null; }

async function umConfirmDelete() {
  if (!um.pendingDeleteId) return;
  try {
    await api(`/user/users/${um.pendingDeleteId}`, { method: 'DELETE' });
    showToast('User deleted', 'success');
    umCloseConfirmModal();
    loadUsersPage();
  } catch { showToast('Failed to delete user', 'error'); }
}

/* ═══════════════════════════════════════════════════════════
   AUTH — Login / Register / Logout / Refresh
═══════════════════════════════════════════════════════════ */
function authShowScreen() {
  document.body.classList.add('auth-mode');
  document.body.classList.remove('app-ready');
  const scr = $('auth-screen');
  if (scr) scr.classList.remove('hidden');
}
function authHideScreen() {
  document.body.classList.remove('auth-mode');
  const scr = $('auth-screen');
  if (scr) scr.classList.add('hidden');
  setTimeout(() => document.body.classList.add('app-ready'), 50);
}

function authSwitchTab(tab) {
  $('tab-login').classList.toggle('active', tab === 'login');
  $('tab-register').classList.toggle('active', tab === 'register');
  $('auth-login-form').style.display    = tab === 'login'    ? 'flex' : 'none';
  $('auth-register-form').style.display = tab === 'register' ? 'flex' : 'none';
  $('auth-login-error').textContent    = '';
  $('auth-register-error').textContent = '';
}

async function authLogin(e) {
  e.preventDefault();
  const btn = $('auth-login-btn');
  btn.textContent = 'Logging in…'; btn.disabled = true;
  const email    = $('auth-email').value.trim();
  const password = $('auth-password').value;
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    authStore(data.access_token, data.refresh_token);
    await authBootApp();
  } catch (err) {
    $('auth-login-error').textContent = err.message;
  } finally { btn.textContent = 'Log In'; btn.disabled = false; }
}

async function authRegister(e) {
  e.preventDefault();
  const btn = $('auth-register-btn');
  btn.textContent = 'Creating…'; btn.disabled = true;
  const full_name = $('auth-reg-name').value.trim();
  const email     = $('auth-reg-email').value.trim();
  const password  = $('auth-reg-password').value;
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed');
    authStore(data.access_token, data.refresh_token);
    await authBootApp();
  } catch (err) {
    $('auth-register-error').textContent = err.message;
  } finally { btn.textContent = 'Create Account'; btn.disabled = false; }
}

async function authRefreshTokens() {
  const refresh = authGetRefresh();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    authStore(data.access_token, data.refresh_token);
    return true;
  } catch { return false; }
}

function authLogout() {
  authClear();
  state.currentUserId = null;
  state.isAdmin = false;
  authShowScreen();
}

async function authBootApp() {
  const token = authGetAccess();
  const payload = jwtDecode(token);
  if (!payload) { authLogout(); return; }
  state.currentUserId = parseInt(payload.sub);

  authHideScreen();

  // Wire modal backdrops
  $('create-modal').addEventListener('click', e => { if (e.target === $('create-modal')) closeCreateModal(); });
  $('edit-profile-modal').addEventListener('click', e => { if (e.target === $('edit-profile-modal')) closeEditProfileModal(); });
  $('um-form-modal').addEventListener('click', e => { if (e.target === $('um-form-modal')) umCloseFormModal(); });
  $('um-confirm-modal').addEventListener('click', e => { if (e.target === $('um-confirm-modal')) umCloseConfirmModal(); });

  // Wire drag-drop
  const zone = $('upload-zone');
  if (zone) {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => { zone.classList.remove('dragover'); });
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });
  }

  // Check role
  try {
    const rList = await api(`/core/users/${state.currentUserId}/roles`);
    const isAdmin = rList.some(r => r.role_name === 'admin');
    state.isAdmin = isAdmin;

    const usersNav = $('nav-users');
    if (usersNav) usersNav.style.display = isAdmin ? 'flex' : 'none';

    if (state.currentPage === 'users' && !isAdmin) state.currentPage = 'home';
  } catch {
    const usersNav = $('nav-users');
    if (usersNav) usersNav.style.display = 'none';
    state.isAdmin = false;
    if (state.currentPage === 'users') state.currentPage = 'home';
  }

  // Set caption avatar
  const captionAvatar = $('caption-avatar');
  if (captionAvatar) captionAvatar.textContent = 'U' + state.currentUserId;

  switchPage(state.currentPage);
}

/* ═══════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════ */
function showToast(msg, type = 'info') {
  const c = $('toast-container');
  const t = document.createElement('div');
  t.className = `toast${type !== 'info' ? ' toast-' + type : ''}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

function esc(text) {
  if (!text) return '';
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return Math.floor(diff / 86400) + 'd';
}

function emptyState(title, sub) {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" fill="none" stroke-width="1.2">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
    <h3>${title}</h3>
    ${sub ? `<p>${sub}</p>` : ''}
  </div>`;
}

/* ═══════════════════════════════════════════════════════════
   CHATS & SHARING LOGIC
   ═══════════════════════════════════════════════════════════ */
let chatPollInterval = null;

async function loadChats() {
  try {
    const chats = await api('/chats');
    state.chats = chats;
    renderChatsSidebar();
  } catch (err) {
    console.error("Failed to load chats:", err);
  }
}

function renderChatsSidebar(filter = '') {
  const container = $('chats-list-container');
  if (!container) return;
  container.innerHTML = '';
  
  const filteredChats = state.chats.filter(chat => 
    (chat.name || '').toLowerCase().includes(filter.toLowerCase())
  );
  
  if (filteredChats.length === 0) {
    container.innerHTML = '<p class="loading-state">No conversations</p>';
    return;
  }
  
  filteredChats.forEach(chat => {
    const activeClass = state.activeChatId === chat.id ? 'active' : '';
    const item = document.createElement('div');
    item.className = `chat-item ${activeClass}`;
    item.onclick = () => selectChat(chat.id);
    
    // Group status / icon
    const avatar = chat.avatar_url || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100';
    const groupBadge = chat.is_group ? `<span class="group-badge">👥</span>` : '';
    
    item.innerHTML = `
      <div class="chat-avatar-wrapper">
        <img src="${esc(avatar)}" class="chat-avatar" alt="${esc(chat.name)}">
        ${groupBadge}
      </div>
      <div class="chat-info">
        <div class="chat-name-row">
          <span class="chat-name">${esc(chat.name)}</span>
          <span class="chat-time">Just now</span>
        </div>
        <div class="chat-preview">Click to view conversation</div>
      </div>
    `;
    
    container.appendChild(item);
  });
}

function filterChatsSidebar() {
  const val = $('chats-search-input').value;
  renderChatsSidebar(val);
}

function selectChat(chatId) {
  state.activeChatId = chatId;
  
  // Toggle active state in sidebar UI
  const items = document.querySelectorAll('.chat-item');
  items.forEach(el => el.classList.remove('active'));
  
  // Find active chat object
  const chat = state.chats.find(c => c.id === chatId);
  if (!chat) return;
  
  // Update header info
  const headerAvatarLetterWrap = $('chat-header-avatar-letter-wrap');
  const headerAvatarLetter = $('chat-header-avatar-letter');
  const headerAvatar = $('chat-header-avatar');
  
  if (chat.avatar_url) {
    headerAvatar.src = chat.avatar_url;
    headerAvatar.style.display = 'block';
    headerAvatarLetterWrap.style.display = 'none';
  } else {
    headerAvatar.style.display = 'none';
    headerAvatarLetterWrap.style.display = 'flex';
    headerAvatarLetter.textContent = (chat.name || 'C').charAt(0).toUpperCase();
  }
  
  $('chat-header-name').innerText = chat.name || "Conversation";
  $('chat-header-status').innerText = chat.is_group ? `${chat.members.length} members` : 'Active now';
  
  // Toggle view states
  $('no-chat-state').style.display = 'none';
  $('chat-active-state').style.display = 'flex';
  
  // Redraw sidebar to show highlight
  renderChatsSidebar($('chats-search-input').value);
  
  // Load messages
  loadMessages(chatId);
  
  // Start periodic polling for new messages in this chat
  startChatPolling();
}

async function loadMessages(chatId) {
  if (state.activeChatId !== chatId) return;
  
  try {
    const messages = await api(`/chats/${chatId}/messages`);
    renderMessages(messages);
  } catch (err) {
    console.error("Failed to load messages:", err);
  }
}

function renderMessages(messages) {
  const container = $('chat-messages-container');
  if (!container) return;
  const wasAtBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 50;
  
  container.innerHTML = '';
  
  if (messages.length === 0) {
    container.innerHTML = '<div style="margin: auto; color: var(--text-3); font-size: 13px;">No messages yet. Say hello!</div>';
    return;
  }
  
  messages.forEach(msg => {
    const isSent = msg.sender_id === state.currentUserId;
    const bubbleClass = isSent ? 'sent' : 'received';
    
    const el = document.createElement('div');
    el.className = `message-bubble ${bubbleClass}`;
    
    let messageBody = `<div class="message-content">${esc(msg.content || '')}</div>`;
    
    // If it's a shared post/reel attachment
    if (msg.shared_post_id && msg.shared_post) {
      const post = msg.shared_post;
      const isReel = post.type === 'reel';
      const creatorName = post.creator ? (post.creator.full_name || post.creator.email.split('@')[0]) : `user_${post.user_id}`;
      const creatorAvatar = post.creator && post.creator.profile_pic ? post.creator.profile_pic : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
      const mediaUrl = isReel ? (post.thumbnail_url || post.image_url) : post.image_url;
      
      messageBody = `
        <div class="message-content" style="padding: 6px;">
          <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px; padding: 2px 8px;">
            Shared a ${isReel ? 'Reel' : 'Post'}
          </div>
          <div class="shared-content-attachment" onclick="viewSharedItem(${post.post_id}, '${post.type}')">
            <div class="attachment-preview">
              <img src="${esc(mediaUrl)}" class="attachment-img" alt="attachment">
              <span class="attachment-badge ${isReel ? 'badge-reel' : ''}">${esc(post.type)}</span>
            </div>
            <div class="attachment-info">
              <div class="attachment-creator">
                <img src="${esc(creatorAvatar)}" class="attachment-avatar" alt="avatar">
                <span class="attachment-username">@${esc(creatorName)}</span>
              </div>
              <div class="attachment-caption">${esc(post.caption || '')}</div>
            </div>
            <div class="attachment-view-action">
              View Attachment
            </div>
          </div>
        </div>
      `;
    }
    
    const senderName = msg.sender ? (msg.sender.full_name || msg.sender.email.split('@')[0]) : `User ${msg.sender_id}`;
    el.innerHTML = `
      <span class="message-sender">${esc(senderName)}</span>
      ${messageBody}
      <span class="message-time">${formatTime(msg.created_at)}</span>
    `;
    
    container.appendChild(el);
  });
  
  // Auto-scroll to bottom on first load or if user was already at the bottom
  if (wasAtBottom || container.children.length <= messages.length + 1) {
    container.scrollTop = container.scrollHeight;
  }
}

async function sendMessage() {
  const input = $('chat-message-input');
  const content = input.value.trim();
  if (!content || !state.activeChatId) return;
  
  input.value = '';
  
  try {
    await api(`/chats/${state.activeChatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: content })
    });
    
    // Reload messages immediately
    await loadMessages(state.activeChatId);
  } catch (err) {
    console.error("Failed to send message:", err);
    showToast('Failed to send message', 'error');
  }
}

function handleChatInputKeyDown(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
}

// View shared post/reel from chat back to feed
function viewSharedItem(postId, type = 'post') {
  // Go to home feed tab
  switchPage('home');
  
  // Find target post element in page-home or posts-container
  const el = document.getElementById(`post-${type}-${postId}`);
  if (el) {
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Apply quick pulse highlight effect
      el.style.boxShadow = '0 0 25px var(--accent)';
      el.style.transform = 'scale(1.02)';
      el.style.transition = 'all 0.4s ease';
      
      setTimeout(() => {
        el.style.boxShadow = '';
        el.style.transform = '';
      }, 1500);
      
      // If it's a video, try to play it
      const video = el.querySelector('video');
      if (video) {
        video.play().catch(() => {});
      }
    }, 100);
  } else {
    showToast('Item not found in current feed', 'error');
  }
}

// --- Polling Helpers ---
function startChatPolling() {
  stopChatPolling();
  chatPollInterval = setInterval(() => {
    if (state.activeChatId && state.currentPage === 'chats') {
      loadMessages(state.activeChatId);
    }
  }, 3000);
}

function stopChatPolling() {
  if (chatPollInterval) {
    clearInterval(chatPollInterval);
    chatPollInterval = null;
  }
}

function formatTime(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

// --- Share Modal Bottom Sheet ---
function openShareModal(type, id) {
  if (!state.posts) return;
  const item = state.posts.find(p => p.id === id && p.feed_type === type);
  if (!item) return;
  
  state.currentlySharingItem = {
    type: type,
    id: id,
    caption: item.caption,
    media_url: type === 'reel' ? (item.video_url || item.image_url) : item.image_url
  };
  
  // Render preview inside modal
  const previewContainer = $('share-preview-card');
  if (previewContainer) {
    previewContainer.innerHTML = `
      <img src="${esc(state.currentlySharingItem.media_url)}" class="preview-thumb" alt="thumbnail" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'">
      <div class="preview-details">
        <div class="preview-type">${esc(type)}</div>
        <div class="preview-caption">${esc(state.currentlySharingItem.caption || '')}</div>
      </div>
    `;
  }
  
  // Clear selections and input
  state.selectedShareChats.clear();
  $('share-search-input').value = '';
  $('send-share-btn').disabled = true;
  $('send-share-btn').querySelector('span').innerText = 'Send';
  
  // Load chats and display
  loadChats().then(() => {
    renderShareChatsList();
  });
  
  // Open Modal
  const overlay = $('share-modal-overlay');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden'; // Lock background scroll
}

function closeShareModal() {
  const overlay = $('share-modal-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = ''; // Unlock scroll
  state.currentlySharingItem = null;
}

function renderShareChatsList(filter = '') {
  const container = $('share-chats-list');
  if (!container) return;
  container.innerHTML = '';
  
  const filteredChats = state.chats.filter(chat => 
    (chat.name || '').toLowerCase().includes(filter.toLowerCase())
  );
  
  if (filteredChats.length === 0) {
    container.innerHTML = '<p class="loading-state">No matching chats found</p>';
    return;
  }
  
  filteredChats.forEach(chat => {
    const row = document.createElement('div');
    row.className = `share-chat-row ${state.selectedShareChats.has(chat.id) ? 'selected' : ''}`;
    row.onclick = () => toggleShareChatSelection(chat.id, row);
    
    const avatar = chat.avatar_url || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100';
    
    row.innerHTML = `
      <div class="share-chat-info">
        <img src="${esc(avatar)}" class="share-chat-avatar" alt="${esc(chat.name)}">
        <div>
          <div class="share-chat-name">${esc(chat.name)}</div>
          <div class="share-chat-sub">${chat.is_group ? `${chat.members.length} members` : 'Direct Message'}</div>
        </div>
      </div>
      <div class="share-checkbox">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    `;
    
    container.appendChild(row);
  });
}

function toggleShareChatSelection(chatId, rowElement) {
  if (state.selectedShareChats.has(chatId)) {
    state.selectedShareChats.delete(chatId);
    rowElement.classList.remove('selected');
  } else {
    state.selectedShareChats.add(chatId);
    rowElement.classList.add('selected');
  }
  
  // Update footer button
  const btn = $('send-share-btn');
  const span = btn.querySelector('span');
  
  if (state.selectedShareChats.size > 0) {
    btn.disabled = false;
    if (state.selectedShareChats.size === 1) {
      const selectedChat = state.chats.find(c => c.id === Array.from(state.selectedShareChats)[0]);
      span.innerText = `Send to ${selectedChat ? selectedChat.name : '1 chat'}`;
    } else {
      span.innerText = `Send to ${state.selectedShareChats.size} chats`;
    }
  } else {
    btn.disabled = true;
    span.innerText = 'Send';
  }
}

function filterShareChats() {
  const val = $('share-search-input').value;
  renderShareChatsList(val);
}

async function submitShare() {
  if (state.selectedShareChats.size === 0 || !state.currentlySharingItem) return;
  
  const btn = $('send-share-btn');
  const span = btn.querySelector('span');
  const originalText = span.innerText;
  
  btn.disabled = true;
  span.innerHTML = `<div class="spinner" style="width:16px; height:16px; display:inline-block; border-width:2px; vertical-align:middle; margin-right:6px;"></div> Sharing...`;
  
  try {
    await api('/chats/share', {
      method: 'POST',
      body: JSON.stringify({
        content_type: state.currentlySharingItem.type,
        content_id: state.currentlySharingItem.id,
        chat_ids: Array.from(state.selectedShareChats)
      })
    });
    
    showToast(`Successfully shared ${state.currentlySharingItem.type}!`, 'success');
    closeShareModal();
    
    // Refresh chats and messages
    await loadChats();
    if (state.activeChatId && state.selectedShareChats.has(state.activeChatId)) {
      loadMessages(state.activeChatId);
    }
  } catch (err) {
    console.error("Failed to share item:", err);
    showToast('Error sharing post', 'error');
    btn.disabled = false;
    span.innerText = originalText;
  }
}

/* ─── Kick off ─── */
document.addEventListener('DOMContentLoaded', init);
