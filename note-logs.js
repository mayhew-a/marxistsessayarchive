const SUPABASE_URL = 'https://dzvtxwjuwbuhqzvibthv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_pOmiFBf2sJfDCx-xL-uBgA_gSz3ZZwA';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ================================================================
// AVAILABLE NOTE TAGS
// ADD NEW TAGS HERE.
// A new tag added to this list automatically appears in the
// public filter and in the admin create/edit form.
// ================================================================
const AVAILABLE_TAGS = [
  'Tech',
  'Global Politics',
  'UK Politics',
  'Theory'
];
// ================================================================

let allNotes = [];
let selectedTags = new Set();
let searchTerm = '';
let sortOrder = 'newest';

const notesList = document.getElementById('notes-list');
const noteStatus = document.getElementById('note-status');
const searchInput = document.getElementById('note-search');
const sortSelect = document.getElementById('note-sort');
const tagButton = document.getElementById('tag-filter-button');
const tagMenu = document.getElementById('tag-filter-menu');
const tagOptions = document.getElementById('tag-options');
const modal = document.getElementById('note-modal');

function normalise(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function searchMatches(note, query) {
  const q = normalise(query);
  if (!q) return true;
  const haystack = normalise(`${note.title} ${note.note_content}`);
  const words = q.split(/\s+/).filter(Boolean);
  return words.every(word => haystack.includes(word));
}

function tagMatchCount(note) {
  if (!selectedTags.size) return 0;
  return [...selectedTags].filter(tag => (note.tags || []).includes(tag)).length;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function makeTagElements(tags) {
  const wrapper = document.createElement('div');
  wrapper.className = 'note-tags';
  (tags || []).forEach(tag => {
    const span = document.createElement('span');
    span.className = 'note-tag';
    span.textContent = tag;
    wrapper.appendChild(span);
  });
  return wrapper;
}

function renderTagOptions() {
  tagOptions.innerHTML = '';
  AVAILABLE_TAGS.forEach(tag => {
    const label = document.createElement('label');
    label.className = 'tag-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = tag;
    checkbox.checked = selectedTags.has(tag);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedTags.add(tag);
      else selectedTags.delete(tag);
      renderTagOptions();
      renderNotes();
    });
    const text = document.createElement('span');
    text.textContent = `${tag} (${allNotes.filter(note => (note.tags || []).includes(tag)).length})`;
    label.append(checkbox, text);
    tagOptions.appendChild(label);
  });
  tagButton.textContent = selectedTags.size ? `FILTER BY TAG (${selectedTags.size}) ▼` : 'FILTER BY TAG ▼';
}

function renderNotes() {
  let notes = allNotes.filter(note => searchMatches(note, searchTerm));

  if (selectedTags.size) {
    notes = notes.filter(note => tagMatchCount(note) > 0);
  }

  notes.sort((a, b) => {
    if (selectedTags.size) {
      const relevance = tagMatchCount(b) - tagMatchCount(a);
      if (relevance !== 0) return relevance;
    }
    const dateA = new Date(`${a.note_date}T00:00:00`).getTime();
    const dateB = new Date(`${b.note_date}T00:00:00`).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  notesList.innerHTML = '';
  noteStatus.textContent = notes.length ? `${notes.length} note${notes.length === 1 ? '' : 's'}` : 'No notes found.';

  notes.forEach(note => {
    const article = document.createElement('article');
    article.className = 'note-card';
    article.tabIndex = 0;
    article.setAttribute('role', 'button');

    const header = document.createElement('div');
    header.className = 'note-card-header';
    const titleArea = document.createElement('div');
    titleArea.className = 'note-card-title-area';
    const title = document.createElement('span');
    title.className = 'note-title';
    title.textContent = note.title;
    titleArea.append(title, makeTagElements(note.tags));
    const date = document.createElement('span');
    date.className = 'date';
    date.textContent = formatDate(note.note_date);
    header.append(titleArea, date);

    const excerpt = document.createElement('p');
    excerpt.className = 'note-excerpt';
    excerpt.textContent = note.note_content;

    const expand = document.createElement('button');
    expand.type = 'button';
    expand.className = 'note-expand';
    expand.textContent = '▼ Show full notes';
    expand.addEventListener('click', event => {
      event.stopPropagation();
      openModal(note);
    });

    article.append(header, excerpt, expand);
    article.addEventListener('click', () => openModal(note));
    article.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal(note);
      }
    });
    notesList.appendChild(article);
  });
}

function openModal(note) {
  document.getElementById('modal-title').textContent = note.title;
  document.getElementById('modal-date').textContent = formatDate(note.note_date);
  const tags = document.getElementById('modal-tags');
  tags.replaceChildren(makeTagElements(note.tags));

  const content = document.getElementById('modal-content');
  content.textContent = note.note_content;
  const linkBox = document.getElementById('modal-link');
  linkBox.innerHTML = '';
  if (note.source_url) {
    try {
      const url = new URL(note.source_url);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        const link = document.createElement('a');
        link.href = url.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'OPEN LINK →';
        linkBox.appendChild(link);
      }
    } catch (_) {}
  }
  modal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeModal() {
  modal.hidden = true;
  document.body.classList.remove('modal-open');
}

document.querySelectorAll('[data-close-modal]').forEach(element => element.addEventListener('click', closeModal));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !modal.hidden) closeModal();
});

tagButton.addEventListener('click', () => {
  const opening = tagMenu.hidden;
  tagMenu.hidden = !opening;
  tagButton.setAttribute('aria-expanded', String(opening));
});

document.getElementById('clear-tags').addEventListener('click', () => {
  selectedTags.clear();
  renderTagOptions();
  renderNotes();
});

document.getElementById('select-all-tags').addEventListener('click', () => {
  AVAILABLE_TAGS.forEach(tag => selectedTags.add(tag));
  renderTagOptions();
  renderNotes();
});

searchInput.addEventListener('input', () => {
  searchTerm = searchInput.value;
  renderNotes();
});
sortSelect.addEventListener('change', () => {
  sortOrder = sortSelect.value;
  renderNotes();
});

document.addEventListener('click', event => {
  if (!event.target.closest('.tag-filter-wrap')) {
    tagMenu.hidden = true;
    tagButton.setAttribute('aria-expanded', 'false');
  }
});

async function loadNotes() {
  noteStatus.textContent = 'Loading notes...';
  const { data, error } = await supabaseClient
    .from('notes')
    .select('id,title,note_content,note_date,source_url,tags,published,created_at,updated_at')
    .eq('published', true);

  if (error) {
    console.error(error);
    noteStatus.textContent = 'Unable to load notes right now.';
    return;
  }

  allNotes = data || [];
  renderTagOptions();
  renderNotes();
}

loadNotes();
