const SUPABASE_URL = 'https://dzvtxwjuwbuhqzvibthv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_pOmiFBf2sJfDCx-xL-uBgA_gSz3ZZwA';
const ADMIN_USER_ID = '5f46d5c3-487c-4fcf-91d9-1e8dceccfd5d';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ================================================================
// AVAILABLE NOTE TAGS
// ADD NEW TAGS HERE.
// Keep this list identical to the list in note-logs.js.
// ================================================================
const AVAILABLE_TAGS = [
  'Tech',
  'Global Politics',
  'UK Politics',
  'Theory'
];
// ================================================================

const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const formMessage = document.getElementById('form-message');
const noteForm = document.getElementById('note-form');
const noteId = document.getElementById('note-id');
const noteTitle = document.getElementById('note-title');
const noteDate = document.getElementById('note-date');
const noteLink = document.getElementById('note-link');
const noteContent = document.getElementById('note-content');
const tagOptions = document.getElementById('admin-tag-options');
const adminNotesList = document.getElementById('admin-notes-list');

let editingNote = null;

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return '';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function renderAdminTags(selected = []) {
  tagOptions.innerHTML = '';
  AVAILABLE_TAGS.forEach(tag => {
    const label = document.createElement('label');
    label.className = 'tag-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = tag;
    checkbox.checked = selected.includes(tag);
    const text = document.createElement('span');
    text.textContent = tag;
    label.append(checkbox, text);
    tagOptions.appendChild(label);
  });
}

function selectedAdminTags() {
  return [...tagOptions.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value);
}

function resetForm() {
  editingNote = null;
  noteId.value = '';
  noteTitle.value = '';
  noteDate.value = today();
  noteLink.value = '';
  noteContent.value = '';
  renderAdminTags();
  document.getElementById('form-heading').textContent = 'CREATE NEW NOTE';
  document.getElementById('cancel-edit').hidden = true;
  formMessage.textContent = '';
}

async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session && data.session.user.id === ADMIN_USER_ID) {
    showAdmin();
  } else {
    if (data.session) await supabaseClient.auth.signOut();
    showLogin();
  }
}

function showLogin() {
  loginView.hidden = false;
  adminView.hidden = true;
}

function showAdmin() {
  loginView.hidden = true;
  adminView.hidden = false;
  resetForm();
  loadAdminNotes();
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginMessage.textContent = 'Logging in...';
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById('login-email').value.trim(),
    password: document.getElementById('login-password').value
  });
  if (error) {
    loginMessage.textContent = 'Login failed. Check your details.';
    return;
  }
  const { data } = await supabaseClient.auth.getUser();
  if (!data.user || data.user.id !== ADMIN_USER_ID) {
    await supabaseClient.auth.signOut();
    loginMessage.textContent = 'This account is not authorised for the archive admin.';
    return;
  }
  loginMessage.textContent = '';
  showAdmin();
});

document.getElementById('logout-button').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  showLogin();
});

document.getElementById('save-draft').addEventListener('click', () => saveNote(false));
document.getElementById('publish-note').addEventListener('click', () => saveNote(true));
document.getElementById('cancel-edit').addEventListener('click', resetForm);

async function saveNote(published) {
  formMessage.textContent = 'Saving...';
  const payload = {
    title: noteTitle.value.trim(),
    note_content: noteContent.value,
    note_date: noteDate.value,
    source_url: noteLink.value.trim() || null,
    tags: selectedAdminTags(),
    published,
    updated_at: new Date().toISOString()
  };

  if (!payload.title || !payload.note_content || !payload.note_date) {
    formMessage.textContent = 'Title, date and note are required.';
    return;
  }

  if (payload.source_url) {
    try {
      const url = new URL(payload.source_url);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch (_) {
      formMessage.textContent = 'The optional link must be a valid http(s) URL.';
      return;
    }
  }

  let result;
  if (editingNote) {
    result = await supabaseClient.from('notes').update(payload).eq('id', editingNote.id);
  } else {
    result = await supabaseClient.from('notes').insert(payload);
  }

  if (result.error) {
    console.error(result.error);
    formMessage.textContent = 'Could not save the note.';
    return;
  }

  formMessage.textContent = published ? 'Note published.' : 'Draft saved.';
  resetForm();
  formMessage.textContent = published ? 'Note published.' : 'Draft saved.';
  loadAdminNotes();
}

async function loadAdminNotes() {
  adminNotesList.textContent = 'Loading...';
  const { data, error } = await supabaseClient
    .from('notes')
    .select('*')
    .order('note_date', { ascending: false });

  if (error) {
    adminNotesList.textContent = 'Unable to load notes.';
    return;
  }

  adminNotesList.innerHTML = '';
  if (!data.length) {
    adminNotesList.textContent = 'No notes yet.';
    return;
  }

  data.forEach(note => {
    const row = document.createElement('article');
    row.className = 'admin-note-row';
    const title = document.createElement('div');
    title.className = 'admin-note-row-title';
    title.textContent = note.title;
    const meta = document.createElement('div');
    meta.className = 'admin-note-row-meta';
    meta.textContent = `${formatDate(note.note_date)} · ${note.published ? 'PUBLISHED' : 'DRAFT'} · ${(note.tags || []).join(', ') || 'No tags'}`;
    const actions = document.createElement('div');
    actions.className = 'admin-actions';

    const edit = document.createElement('button');
    edit.className = 'admin-secondary';
    edit.type = 'button';
    edit.textContent = 'EDIT';
    edit.addEventListener('click', () => beginEdit(note));

    const publish = document.createElement('button');
    publish.className = 'admin-button';
    publish.type = 'button';
    publish.textContent = note.published ? 'UNPUBLISH' : 'PUBLISH';
    publish.addEventListener('click', () => togglePublished(note));

    const remove = document.createElement('button');
    remove.className = 'admin-danger';
    remove.type = 'button';
    remove.textContent = 'DELETE';
    remove.addEventListener('click', () => deleteNote(note));

    actions.append(edit, publish, remove);
    row.append(title, meta, actions);
    adminNotesList.appendChild(row);
  });
}

function beginEdit(note) {
  editingNote = note;
  noteId.value = note.id;
  noteTitle.value = note.title;
  noteDate.value = note.note_date;
  noteLink.value = note.source_url || '';
  noteContent.value = note.note_content;
  renderAdminTags(note.tags || []);
  document.getElementById('form-heading').textContent = 'EDIT NOTE';
  document.getElementById('cancel-edit').hidden = false;
  formMessage.textContent = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function togglePublished(note) {
  const { error } = await supabaseClient.from('notes').update({
    published: !note.published,
    updated_at: new Date().toISOString()
  }).eq('id', note.id);
  if (error) alert('Could not change publication status.');
  else loadAdminNotes();
}

async function deleteNote(note) {
  if (!confirm(`Delete “${note.title}”? This cannot be undone.`)) return;
  const { error } = await supabaseClient.from('notes').delete().eq('id', note.id);
  if (error) alert('Could not delete the note.');
  else {
    if (editingNote && editingNote.id === note.id) resetForm();
    loadAdminNotes();
  }
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session && session.user.id === ADMIN_USER_ID) showAdmin();
});

renderAdminTags();
noteDate.value = today();
checkSession();
