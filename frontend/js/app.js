/* ═══════════════════════════════════════════════════════════════════
   INSTAGRAM CLONE — APP LOGIC  (v3)
   ═══════════════════════════════════════════════════════════════════ */

const API = window.location.origin;

const state = {
  currentPage: 'posts',
  currentUserId: 1,
  users: [],
  uploadType: 'post',
  pendingImageUrl: null,  // holds URL (remote or local) for the Create modal
  profileTab: 'posts'     // 'posts' or 'saved'
};

/* ── DOM refs ── */
const $ = id => document.getElementById(id);

const dom = {
  postsContainer:   $('posts-container'),
  reelsContainer:   $('reels-container'),
  suggestedUsers:   $('suggested-users'),
  createModal:      $('create-modal'),
  modalStep1:       $('modal-step-1'),
  modalStep2:       $('modal-step-2'),
  modalTitle:       $('modal-title'),
  modalBackBtn:     $('modal-back-btn'),
  modalShareBtn:    $('modal-share-btn'),
  uploadUrl:        $('upload-url'),
  uploadCaption:    $('upload-caption'),
  previewImage:     $('preview-image'),
  fileInput:        $('file-input'),
  urlInputArea:     $('url-input-area'),
  uploadZone:       $('upload-zone'),
  
  // Profile
  profileUsername:  $('profile-username'),
  profileName:      $('profile-name'),
  profileBioText:   $('profile-bio-text'),
  profilePostsCount:$('profile-posts-count'),
  profileGrid:      $('profile-grid'),
  profileAvatarLtr: $('profile-avatar-letter'),
  
  // Edit Profile
  editModal:        $('edit-profile-modal'),
  editUsernameInput:$('edit-username-input'),
  editBioInput:     $('edit-bio-input'),
  editNameInput:    $('edit-name-input'),
  editProfilePic:   $('edit-profile-pic-input'),
  editAvatarLtr:    $('edit-avatar-letter'),
  editUsernameLabel:$('edit-username-label'),
};

/* ══════════ SVG Icon Library ══════════ */
const icons = {
  heart:    `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  heartFill:`<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  comment:  `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  share:    `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
  more:     `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`,
};

/* ══════════ API Client ══════════ */
async function api(endpoint, opts = {}) {
  try {
    const res = await fetch(`${API}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

/* ══════════ Init ══════════ */
async function init() {
  await loadUsers();
  loadPage(state.currentPage);

  // Close modal on overlay click
  dom.createModal.addEventListener('click', e => {
    if (e.target === dom.createModal) closeCreateModal();
  });

  // Drag & drop on upload zone
  const zone = dom.uploadZone;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--blue)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.style.borderColor = '';
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });
}

/* ══════════ Navigation ══════════ */
function switchPage(page) {
  state.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const a = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (a) a.classList.add('active');
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  $(`page-${page}`).classList.add('active');
  loadPage(page);
}

async function loadPage(page) {
  if (page === 'posts') {
    dom.postsContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
      const posts = await api('/user/posts');
      renderPosts(posts);
    } catch {
      dom.postsContainer.innerHTML = emptyState('Could not load posts. Is the backend running?');
    }
  } else if (page === 'reels') {
    dom.reelsContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
      const reels = await api('/user/reels');
      renderReels(reels);
    } catch {
      dom.reelsContainer.innerHTML = emptyState('Could not load reels.');
    }
  } else if (page === 'profile') {
    dom.profileGrid.innerHTML = '<div class="loading-spinner"></div>';
    await loadProfile();
  }
}

/* ══════════ User Management ══════════ */
async function loadUsers() {
  const users = await api('/user/users').catch(() => []);
  state.users = users;
  renderSuggestedUsers(users);
}

function renderSuggestedUsers(users) {
  const others = users.filter(u => u.user_id !== state.currentUserId).slice(0, 5);
  if (!others.length) {
    dom.suggestedUsers.innerHTML = '<span class="subtext">No suggestions</span>';
    return;
  }
  dom.suggestedUsers.innerHTML = others.map(u => `
    <div class="suggestion-row">
      <div class="avatar-circle small"><span>${u.email.charAt(0).toUpperCase()}</span></div>
      <div class="suggestion-info">
        <span class="username-text">${esc(u.email.split('@')[0])}</span>
        <span class="subtext">Suggested for you</span>
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
    btn.style.color = 'var(--text-2)';
    btn.disabled = true;
  } catch {}
}

/* ══════════ Post Rendering ══════════ */
function renderPosts(posts) {
  if (!posts.length) {
    dom.postsContainer.innerHTML = emptyState('No posts yet. Click Create to share your first photo!');
    return;
  }
  dom.postsContainer.innerHTML = posts.map(p => `
    <article class="post">
      <header class="post-header">
        <div class="post-user-info">
          <div class="avatar-circle small"><span>${('U' + p.user_id)}</span></div>
          <span class="time-text">${timeAgo(p.created_at)}</span>
        </div>
        <div style="position:relative;">
          <button class="more-btn" onclick="toggleMenu('post-menu-${p.post_id}')">${icons.more}</button>
          ${p.user_id === state.currentUserId ? `
            <div id="post-menu-${p.post_id}" style="display:none; position:absolute; right:0; top:30px; background:var(--bg-card); border:1px solid var(--border); border-radius:8px; z-index:10; padding:4px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
              <button onclick="deletePost(${p.post_id})" style="color:var(--red); border:none; background:none; padding:8px 16px; cursor:pointer; width:100%; text-align:left; font-weight:bold;">Delete</button>
            </div>
          ` : ''}
        </div>
      </header>

      <img class="post-image" src="${p.image_url}" alt="Post image"
           onerror="this.style.display='none'">

      <div class="post-actions-row">
        <div class="actions-left">
          <button class="action-btn" onclick="likePost(${p.post_id}, this)" title="Like">${icons.heart}</button>
          <button class="action-btn" onclick="$('comment-${p.post_id}').focus()" title="Comment">${icons.comment}</button>
          <button class="action-btn" title="Share">${icons.share}</button>
        </div>
        <button class="action-btn" onclick="savePost(${p.post_id}, this)" title="Save">${icons.bookmark}</button>
      </div>

      <div class="likes-count" id="likes-count-${p.post_id}">0 likes</div>

      <div class="caption-text">
        ${esc(p.caption || '')}
      </div>

      <button class="view-comments-btn" onclick="loadComments(${p.post_id})">View comments</button>
      <div class="comments-list" id="comments-${p.post_id}"></div>

      <div class="add-comment-row">
        <input id="comment-${p.post_id}" placeholder="Add a comment…"
               onkeydown="if(event.key==='Enter'){addComment(${p.post_id})}">
        <button class="post-btn" onclick="addComment(${p.post_id})">Post</button>
      </div>
    </article>
  `).join('');

  // Load like counts
  posts.forEach(p => loadLikeCount(p.post_id));
}

async function loadLikeCount(postId) {
  try {
    const likes = await api(`/user/posts/${postId}/likes`);
    const el = $(`likes-count-${postId}`);
    if (el) el.textContent = `${likes.length} like${likes.length !== 1 ? 's' : ''}`;
  } catch {}
}

async function likePost(postId, btn) {
  try {
    await api('/user/post-likes', {
      method: 'POST',
      body: JSON.stringify({ post_id: postId, user_id: state.currentUserId, is_liked: true }),
    });
    btn.classList.add('liked');
    btn.innerHTML = icons.heartFill;
    loadLikeCount(postId);
  } catch {}
}

/* ══════════ Comments ══════════ */
async function loadComments(postId) {
  const el = $(`comments-${postId}`);
  if (!el) return;
  try {
    const comments = await api(`/user/posts/${postId}/comments`);
    el.innerHTML = comments.map(c => `
      <div class="comment-row">
        ${esc(c.text)}
      </div>
    `).join('');
  } catch {}
}

async function addComment(postId) {
  const input = $(`comment-${postId}`);
  const text = input.value.trim();
  if (!text) return;
  try {
    await api('/user/comments', {
      method: 'POST',
      body: JSON.stringify({ user_id: state.currentUserId, post_id: postId, reel_id: null, text }),
    });
    input.value = '';
    loadComments(postId);
  } catch {}
}

/* ══════════ Reels ══════════ */
function renderReels(reels) {
  if (!reels.length) {
    dom.reelsContainer.innerHTML = emptyState('No reels yet.');
    return;
  }
  dom.reelsContainer.innerHTML = reels.map(r => `
    <div class="reel-card">
      <img class="reel-media" src="${r.video_url}" alt="Reel"
           onerror="this.style.opacity='0.3'">
      <div class="reel-overlay">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="avatar-circle small"><span>U${r.user_id}</span></div>
          </div>
          <div style="position:relative;">
            <button class="more-btn" style="color:#fff;" onclick="toggleMenu('reel-menu-${r.reel_id}')">${icons.more}</button>
            ${r.user_id === state.currentUserId ? `
              <div id="reel-menu-${r.reel_id}" style="display:none; position:absolute; right:0; top:30px; background:var(--bg-card); border:1px solid var(--border); border-radius:8px; z-index:10; padding:4px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                <button onclick="deleteReel(${r.reel_id})" style="color:var(--red); border:none; background:none; padding:8px 16px; cursor:pointer; width:100%; text-align:left; font-weight:bold;">Delete</button>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="caption-text" style="color:#fff">${esc(r.caption || '')}</div>
      </div>
      <div class="reel-side-actions">
        <button class="reel-action-btn" onclick="likeReel(${r.reel_id}, this)">
          ${icons.heart}
          <span>Like</span>
        </button>
        <button class="reel-action-btn">
          ${icons.comment}
          <span>Comment</span>
        </button>
        <button class="reel-action-btn">
          ${icons.share}
          <span>Share</span>
        </button>
        <button class="reel-action-btn" onclick="saveReel(${r.reel_id}, this)">
          ${icons.bookmark}
          <span>Save</span>
        </button>
      </div>
    </div>
  `).join('');
}

async function likeReel(reelId, btn) {
  try {
    await api('/user/reel-likes', {
      method: 'POST',
      body: JSON.stringify({ reel_id: reelId, user_id: state.currentUserId, is_liked: true }),
    });
    btn.classList.add('liked');
    btn.querySelector('span').textContent = 'Liked';
  } catch {}
}

/* ══════════ CREATE MODAL ══════════ */
function openCreateModal() {
  resetModal();
  dom.createModal.classList.add('open');
}
function closeCreateModal() {
  dom.createModal.classList.remove('open');
  resetModal();
}
function resetModal() {
  dom.modalStep1.style.display = '';
  dom.modalStep2.style.display = 'none';
  dom.modalBackBtn.style.visibility = 'hidden';
  dom.modalShareBtn.style.visibility = 'hidden';
  dom.modalTitle.textContent = 'Create new post';
  dom.uploadCaption.value = '';
  dom.uploadUrl && (dom.uploadUrl.value = '');
  dom.previewImage.src = '';
  state.pendingImageUrl = null;
  hideUrlInput();
  // Reset type buttons
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.type-btn[data-type="post"]')?.classList.add('active');
  state.uploadType = 'post';
}

/* Step 1 → Step 2 transition */
function goToStep2(url) {
  state.pendingImageUrl = url;
  dom.previewImage.src = url;
  dom.modalStep1.style.display = 'none';
  dom.modalStep2.style.display = 'flex';
  dom.modalBackBtn.style.visibility = 'visible';
  dom.modalShareBtn.style.visibility = 'visible';
  dom.modalTitle.textContent = 'Write caption';
}
function modalGoBack() {
  dom.modalStep1.style.display = '';
  dom.modalStep2.style.display = 'none';
  dom.modalBackBtn.style.visibility = 'hidden';
  dom.modalShareBtn.style.visibility = 'hidden';
  dom.modalTitle.textContent = 'Create new post';
  state.pendingImageUrl = null;
}

/* File upload path */
function handleFileSelect(e) {
  if (e.target.files.length) handleFiles(e.target.files);
}
async function handleFiles(fileList) {
  const file = fileList[0];
  if (!file) return;

  // Show a quick local preview immediately
  const localPreview = URL.createObjectURL(file);
  goToStep2(localPreview);

  // Upload to backend
  showToast('Uploading…');
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await fetch(`${API}/upload`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Upload failed');
    state.pendingImageUrl = data.url;          // server URL
    dom.previewImage.src = data.url;           // switch preview to server URL
    URL.revokeObjectURL(localPreview);
    showToast('Uploaded!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
    modalGoBack();
  }
}

/* URL paste path */
function showUrlInput() {
  dom.urlInputArea.style.display = 'flex';
  dom.uploadUrl.focus();
}
function hideUrlInput() {
  if (dom.urlInputArea) dom.urlInputArea.style.display = 'none';
}
function previewUrl() {
  const url = dom.uploadUrl.value.trim();
  if (!url) { showToast('Paste a URL first', 'error'); return; }
  goToStep2(url);
}

/* Post / Reel type switch */
function setUploadType(type) {
  state.uploadType = type;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.type-btn[data-type="${type}"]`)?.classList.add('active');
}

/* ══════════ FINAL SUBMIT ══════════ */
async function submitUpload() {
  const url = state.pendingImageUrl;
  if (!url) { showToast('No media selected', 'error'); return; }

  const caption = dom.uploadCaption.value.trim();
  const endpoint = state.uploadType === 'post' ? '/user/posts' : '/user/reels';
  const payload = { user_id: state.currentUserId, caption, status: 'active' };

  if (state.uploadType === 'post') payload.image_url = url;
  else payload.video_url = url;

  try {
    await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
    showToast(`${state.uploadType === 'post' ? 'Post' : 'Reel'} shared!`, 'success');
    closeCreateModal();
    loadPage(state.uploadType === 'post' ? 'posts' : 'reels');
  } catch {}
}

/* ══════════ PROFILE PAGE ══════════ */
async function loadProfile() {
  try {
    // 1. Fetch user email
    const user = await api(`/user/users/${state.currentUserId}`);
    const name = user.email ? user.email.split('@')[0] : `user_${state.currentUserId}`;
    dom.profileName.textContent = user.full_name || name;
    
    // 2. Fetch username (if exists)
    try {
      const unData = await api(`/user/users/${state.currentUserId}/username`);
      dom.profileUsername.textContent = unData.username_text;
    } catch {
      dom.profileUsername.textContent = name;
    }

    // 3. Fetch bio (if exists)
    try {
      const bioData = await api(`/user/users/${state.currentUserId}/bio`);
      dom.profileBioText.textContent = bioData.bio_text;
    } catch {
      dom.profileBioText.textContent = "No bio yet.";
    }

    // 4. Render Grid based on selected tab
    await renderProfileGrid();

  } catch (err) {
    dom.profileGrid.innerHTML = emptyState('Failed to load profile.');
  }
}

async function renderProfileGrid() {
  dom.profileGrid.innerHTML = '<div class="loading-spinner"></div>';
  try {
    if (state.profileTab === 'posts') {
      const allPosts = await api('/user/posts');
      const myPosts = allPosts.filter(p => p.user_id === state.currentUserId);
      
      // Update post count
      dom.profilePostsCount.textContent = myPosts.length;
      
      if (myPosts.length === 0) {
        dom.profileGrid.innerHTML = emptyState('No posts yet.');
        dom.profileGrid.style.display = 'block';
      } else {
        dom.profileGrid.style.display = 'grid';
        dom.profileGrid.innerHTML = myPosts.map(p => `
          <div class="grid-item">
            <img src="${p.image_url}" alt="Post">
            <div class="grid-overlay">
              <div class="grid-stat">${icons.heartFill} <span id="grid-like-${p.post_id}">0</span></div>
              <div class="grid-stat">${icons.commentFill || icons.comment} <span>0</span></div>
            </div>
          </div>
        `).join('');
        
        myPosts.forEach(async p => {
          try {
            const likes = await api(`/user/posts/${p.post_id}/likes`);
            const el = $(`grid-like-${p.post_id}`);
            if (el) el.textContent = likes.length;
          } catch {}
        });
      }
    } else if (state.profileTab === 'saved') {
      // Load saved posts and reels
      const savedPosts = await api(`/user/users/${state.currentUserId}/saved-posts`).catch(()=>[]);
      const savedReels = await api(`/user/users/${state.currentUserId}/saved-reels`).catch(()=>[]);
      
      if (savedPosts.length === 0 && savedReels.length === 0) {
        dom.profileGrid.innerHTML = emptyState('No saved items yet.');
        dom.profileGrid.style.display = 'block';
      } else {
        dom.profileGrid.style.display = 'grid';
        let html = '';
        
        // Render saved posts
        for (const sp of savedPosts) {
          const post = await api(`/user/posts/${sp.post_id}`).catch(()=>null);
          if (post) {
            html += `
              <div class="grid-item">
                <img src="${post.image_url}" alt="Saved Post">
                <div class="grid-overlay">
                  <div class="grid-stat">POST</div>
                </div>
              </div>
            `;
          }
        }
        
        // Render saved reels
        for (const sr of savedReels) {
          const reel = await api(`/user/reels/${sr.reel_id}`).catch(()=>null);
          if (reel) {
            html += `
              <div class="grid-item">
                <img src="${reel.video_url}" alt="Saved Reel">
                <div class="grid-overlay">
                  <div class="grid-stat">REEL</div>
                </div>
              </div>
            `;
          }
        }
        
        dom.profileGrid.innerHTML = html;
      }
    }
  } catch (err) {
    dom.profileGrid.innerHTML = emptyState('Failed to load grid.');
  }
}

function switchProfileTab(tab) {
  state.profileTab = tab;
  $('tab-posts').classList.remove('active');
  $('tab-saved').classList.remove('active');
  $(`tab-${tab}`).classList.add('active');
  renderProfileGrid();
}

/* ══════════ EDIT PROFILE MODAL ══════════ */
function openEditProfileModal() {
  dom.editUsernameInput.value = dom.profileUsername.textContent !== dom.profileName.textContent ? dom.profileUsername.textContent : '';
  dom.editBioInput.value = dom.profileBioText.textContent === "No bio yet." ? '' : dom.profileBioText.textContent;
  dom.editNameInput.value = dom.profileName.textContent;
  dom.editProfilePic.value = '';
  dom.editAvatarLtr.textContent = `U${state.currentUserId}`;
  dom.editUsernameLabel.textContent = dom.profileUsername.textContent;
  dom.editModal.classList.add('open');
}

function closeEditProfileModal() {
  dom.editModal.classList.remove('open');
}

async function submitProfileEdits() {
  const username = dom.editUsernameInput.value.trim();
  const bio = dom.editBioInput.value.trim();
  
  showToast('Saving profile...');
  
  try {
    // Save username
    if (username) {
      try {
        await api('/user/usernames', { method: 'POST', body: JSON.stringify({ user_id: state.currentUserId, username_text: username, status: 'active' }) });
      } catch (e) {
        // Might exist, try PUT
        const list = await api('/user/usernames');
        const existing = list.find(u => u.user_id === state.currentUserId);
        if (existing) {
          await api(`/user/usernames/${existing.username_id}`, { method: 'PUT', body: JSON.stringify({ user_id: state.currentUserId, username_text: username, status: 'active' }) });
        }
      }
    }

    // Save bio
    if (bio) {
      try {
        await api('/user/bios', { method: 'POST', body: JSON.stringify({ user_id: state.currentUserId, bio_text: bio, status: 'active' }) });
      } catch (e) {
        // Might exist, try PUT
        const list = await api('/user/bios');
        const existing = list.find(b => b.user_id === state.currentUserId);
        if (existing) {
          await api(`/user/bios/${existing.bio_id}`, { method: 'PUT', body: JSON.stringify({ user_id: state.currentUserId, bio_text: bio, status: 'active' }) });
        }
      }
    }

    // Save Name and Profile Pic
    const nameStr = dom.editNameInput.value.trim();
    const picStr = dom.editProfilePic.value.trim();
    const userPayload = {};
    if (nameStr) userPayload.full_name = nameStr;
    if (picStr) userPayload.profile_pic = picStr;
    if (Object.keys(userPayload).length > 0) {
      await api(`/user/users/${state.currentUserId}`, {
        method: 'PUT', body: JSON.stringify(userPayload)
      });
    }

    showToast('Profile updated!', 'success');
    closeEditProfileModal();
    loadPage('profile');
  } catch (err) {
    showToast('Failed to save profile', 'error');
  }
}

/* ══════════ DELETE & TOGGLE ACTIONS ══════════ */
async function deletePost(postId) {
  if (!confirm('Delete this post?')) return;
  try {
    await api(`/user/posts/${postId}`, { method: 'DELETE' });
    showToast('Post deleted', 'success');
    loadPage(state.currentPage);
  } catch {}
}

async function deleteReel(reelId) {
  if (!confirm('Delete this reel?')) return;
  try {
    await api(`/user/reels/${reelId}`, { method: 'DELETE' });
    showToast('Reel deleted', 'success');
    loadPage(state.currentPage);
  } catch {}
}

function toggleMenu(menuId) {
  const m = $(menuId);
  if (m) m.style.display = m.style.display === 'none' ? 'block' : 'none';
}

/* ══════════ SAVE ACTIONS ══════════ */
async function savePost(postId, btn) {
  try {
    await api('/user/saved-posts', {
      method: 'POST',
      body: JSON.stringify({ user_id: state.currentUserId, post_id: postId, status: 'active' })
    });
    btn.classList.add('liked'); // Reuse the pop animation
    btn.style.color = 'var(--text)';
    showToast('Post saved!');
  } catch {
    showToast('Already saved or failed', 'error');
  }
}

async function saveReel(reelId, btn) {
  try {
    await api('/user/saved-reels', {
      method: 'POST',
      body: JSON.stringify({ user_id: state.currentUserId, reel_id: reelId, status: 'active' })
    });
    btn.classList.add('liked');
    btn.querySelector('span').textContent = 'Saved';
    showToast('Reel saved!');
  } catch {
    showToast('Already saved or failed', 'error');
  }
}

/* ══════════ Utilities ══════════ */
function showToast(msg, type = 'info') {
  const c = $('toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
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

function emptyState(msg) {
  return `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" fill="none" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <h3>Nothing here yet</h3>
      <p>${msg}</p>
    </div>
  `;
}

/* ══════════ Boot ══════════ */
init();
