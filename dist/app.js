(() => {
  'use strict';

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const store = {
    get(key, fallback = null) {
      try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage can be disabled */ }
    },
    remove(key) { try { localStorage.removeItem(key); } catch { /* no-op */ } }
  };

  const pageIds = qsa('.page').map(page => page.id.replace('page-', ''));
  const navItems = qsa('.nav-item');
  const sidebar = qs('#sidebar');
  const completedKey = 'lr-lab-completed';
  let completed = new Set(store.get(completedKey, []));

  function toast(message) {
    const el = qs('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function updateProgress() {
    const learningPages = pageIds.filter(id => id !== 'home');
    const count = learningPages.filter(id => completed.has(id)).length;
    qs('#progress-count').textContent = `${count}/${learningPages.length}`;
    qs('#progress-bar').style.width = `${(count / learningPages.length) * 100}%`;
    navItems.forEach(item => item.classList.toggle('completed', completed.has(item.dataset.page)));
  }

  function showPage(id, { updateHash = true, mark = true } = {}) {
    if (!pageIds.includes(id)) id = 'home';
    qsa('.page').forEach(page => page.classList.toggle('active', page.id === `page-${id}`));
    navItems.forEach(item => {
      const active = item.dataset.page === id;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
    });
    if (mark && id !== 'home') {
      completed.add(id);
      store.set(completedKey, [...completed]);
      updateProgress();
    }
    if (updateHash && location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
    document.title = `${qs(`#page-${id}`).dataset.title} · Literature Review Lab`;
    sidebar.classList.remove('open');
    qs('#mobile-nav-toggle').setAttribute('aria-expanded', 'false');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => qs('#main-content').focus({ preventScroll: true }), 80);
  }

  navItems.forEach(item => item.addEventListener('click', () => showPage(item.dataset.page)));
  qsa('[data-go]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.go)));
  qsa('[data-link]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); showPage(link.dataset.link);
  }));
  window.addEventListener('popstate', () => showPage(location.hash.slice(1) || 'home', { updateHash: false, mark: false }));

  qs('#mobile-nav-toggle').addEventListener('click', event => {
    const open = sidebar.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });
  qs('#print-page').addEventListener('click', () => window.print());
  qs('#reset-progress').addEventListener('click', () => {
    if (!confirm('Reset module progress and all locally saved worksheet responses?')) return;
    completed = new Set();
    Object.keys(localStorage).filter(key => key.startsWith('lr-lab-')).forEach(key => localStorage.removeItem(key));
    qsa('[data-save]').forEach(field => { field.value = ''; });
    qsa('[data-save-check]').forEach(field => { field.checked = false; });
    updateProgress();
    toast('Progress and worksheet notes reset');
  });

  // Persistent worksheet fields.
  qsa('[data-save]').forEach(field => {
    const key = `lr-lab-field-${field.dataset.save}`;
    field.value = store.get(key, field.value || '');
    field.addEventListener('input', () => store.set(key, field.value));
  });
  qsa('[data-save-check]').forEach(field => {
    const key = `lr-lab-check-${field.dataset.saveCheck}`;
    field.checked = store.get(key, false);
    field.addEventListener('change', () => store.set(key, field.checked));
  });

  // Clipboard buttons.
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const temp = document.createElement('textarea');
      temp.value = text; document.body.appendChild(temp); temp.select(); document.execCommand('copy'); temp.remove();
    }
  }
  qsa('[data-copy-target]').forEach(button => button.addEventListener('click', async () => {
    const target = qs(`#${button.dataset.copyTarget}`);
    await copyText(target.innerText || target.textContent || target.value);
    toast('Copied to clipboard');
  }));

  // Google Scholar query builder.
  function buildConceptBlock(value) {
    const terms = value.split('|').map(v => v.trim()).filter(Boolean);
    if (!terms.length) return '';
    return terms.length === 1 ? terms[0] : `(${terms.join(' OR ')})`;
  }
  function updateQuery() {
    const blocks = ['concept-a', 'concept-b', 'concept-c'].map(id => buildConceptBlock(qs(`#${id}`).value)).filter(Boolean);
    const exclusions = qs('#concept-x').value.split(/\s+/).map(v => v.trim()).filter(Boolean).map(v => `-${v}`);
    qs('#scholar-query').textContent = [...blocks, ...exclusions].join(' ');
  }
  ['concept-a', 'concept-b', 'concept-c', 'concept-x'].forEach(id => qs(`#${id}`).addEventListener('input', updateQuery));
  updateQuery();

  // Prompt studio.
  const promptTemplates = {
    search: topic => `ROLE: Act as a research librarian with economics-domain knowledge.\n\nTASK: Convert the research topic “${topic}” into a transparent search plan.\n\nOUTPUT:\n1. Define 3–5 concept blocks and explain their boundaries.\n2. List synonyms, spelling variants, institutional terms, and relevant JEL codes for each block.\n3. Draft separate, platform-appropriate strings for Google Scholar and a structured bibliographic database.\n4. Propose inclusion/exclusion criteria and 3 sentinel-paper tests.\n5. Suggest backward/forward citation-chaining and Malaysian repository searches.\n6. Create a search-log template.\n\nRULES: Do not invent citations. Label all suggested terms as hypotheses to test. Explain any search limitation or trade-off.`,
    matrix: topic => `Using ${qs('#prompt-boundary').value.toLowerCase()}, construct an evidence matrix for “${topic}”. Use one row per study and columns for full citation, theory/mechanism, context, data/sample/period, variables, identification/method, finding with direction and uncertainty, limitation, theme, and page/section locator. Write “not reported” rather than infer missing facts. Distinguish association, causal evidence, simulation, and theory. End with a list of cells requiring manual verification.`,
    synthesis: topic => `Using ${qs('#prompt-boundary').value.toLowerCase()}, help draft a critical synthesis on “${topic}”. First group evidence by mechanism and design. Then identify convergence, contradiction, boundary conditions, and incomparable results. Explain whether differences arise from data, sample, period, measurement, context, model, or identification. Produce a CECIB outline: claim, comparative evidence, comparison, interpretation, bridge. Do not invent citations, facts, quotations, or page numbers.`,
    gap: topic => `Audit the proposed literature gap for “${topic}”. Use only verified evidence supplied by me. Test whether the gap is evidential, theoretical, methodological, contextual, temporal, integrative, or implementation-related. For each candidate gap, state: established pattern; exact boundary or unresolved tension; consequence; evidence that could refute the claim; and a research design capable of addressing it. Reject gaps based only on “few studies” or “not studied in this country”.`,
    critique: topic => `Act as a sceptical economics thesis examiner. Critique my literature-review argument on “${topic}”. Identify unsupported causal language, omitted rival mechanisms, evidence–claim mismatch, citation overreach, incomparable studies, selection bias in the review, weak Malaysian transferability, and gaps the proposed design cannot fill. For every criticism, request the exact evidence needed to resolve it. Do not rewrite until the argument passes the audit.`
  };
  function updatePrompt() {
    const task = qs('#prompt-task').value;
    qs('#generated-prompt').textContent = promptTemplates[task](qs('#prompt-topic').value.trim() || '[TOPIC]');
  }
  ['prompt-task', 'prompt-topic', 'prompt-boundary'].forEach(id => qs(`#${id}`).addEventListener('input', updatePrompt));
  updatePrompt();

  // Framework selector.
  function updateFramework() {
    const task = qs('#fw-task').value;
    const style = qs('#fw-style').value;
    const messages = {
      test: '<strong>Use a theoretical framework.</strong> Show the parent theory, assumptions, mechanism, derived propositions, and operational tests. Add only variables required by the theory or identification strategy.',
      integrate: '<strong>Use an integrated conceptual framework grounded in named theories.</strong> This is the best general-purpose single framework: it shows constructs and relationships while preserving their theoretical sources.',
      interpret: '<strong>Use an analytical framework.</strong> Define the dimensions or mechanisms used to code and interpret evidence; show how theory informs the categories and how cases will be compared.',
      align: '<strong>Use a research framework.</strong> Connect issue → research questions/objectives → data/instruments → analysis → outputs → contribution. Include a theory-grounded conceptual core so it is more than a project flowchart.'
    };
    let note = style === 'mixed' ? ' For mixed methods, show where qualitative evidence explains mechanisms or heterogeneity in quantitative results.' : style === 'qual' ? ' For qualitative work, avoid forcing variables into causal arrows; use concepts, processes, cases, and analytic dimensions.' : ' For quantitative work, distinguish causal pathways, moderators, mediators, controls, and measurement explicitly.';
    qs('#fw-recommendation').innerHTML = messages[task] + note;
  }
  ['fw-task', 'fw-style'].forEach(id => qs(`#${id}`).addEventListener('change', updateFramework));
  updateFramework();

  // Gap and journal checks.
  qsa('.gap-check').forEach(check => check.addEventListener('change', () => {
    const score = qsa('.gap-check:checked').length;
    qs('#gap-score').textContent = `${score}/5`;
    qs('#gap-score').style.borderColor = score === 5 ? 'var(--green)' : 'var(--teal)';
  }));
  qsa('#journal-checker input[type="checkbox"]').forEach(check => check.addEventListener('change', () => {
    const checks = qsa('#journal-checker input[type="checkbox"]:checked');
    const score = checks.reduce((sum, item) => sum + Number(item.dataset.weight), 0);
    const critical = checks.some(item => Number(item.dataset.weight) === -2);
    const result = qs('#journal-result');
    if (critical || score < 0) result.textContent = 'Stop & investigate';
    else if (score >= 4) result.textContent = 'Promising—verify article';
    else if (checks.length) result.textContent = 'Insufficient evidence';
    else result.textContent = 'Not assessed';
  }));

  // Editable evidence matrix.
  const matrixBody = qs('#evidence-matrix tbody');
  function saveMatrix() {
    const rows = qsa('tr.editable-row', matrixBody).map(row => qsa('td', row).map(cell => cell.innerText.trim()));
    store.set('lr-lab-matrix', rows);
  }
  function addMatrixRow(values = ['', '', '', '', '', '']) {
    const row = document.createElement('tr');
    row.className = 'editable-row';
    values.forEach(value => {
      const cell = document.createElement('td');
      cell.contentEditable = 'true';
      cell.textContent = value;
      cell.addEventListener('input', saveMatrix);
      row.appendChild(cell);
    });
    matrixBody.appendChild(row);
  }
  store.get('lr-lab-matrix', []).forEach(addMatrixRow);
  qs('#add-matrix-row').addEventListener('click', () => { addMatrixRow(); saveMatrix(); qsa('tr.editable-row td', matrixBody).at(-6)?.focus(); });
  qs('#clear-matrix').addEventListener('click', () => {
    if (!confirm('Remove all editable matrix rows? The two illustrative rows will remain.')) return;
    qsa('tr.editable-row', matrixBody).forEach(row => row.remove()); saveMatrix();
  });

  function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
  function csvEscape(value) { return `"${String(value).replace(/"/g, '""')}"`; }
  qs('#download-matrix').addEventListener('click', () => {
    const rows = qsa('#evidence-matrix tr').map(row => qsa('th,td', row).map(cell => csvEscape(cell.innerText.trim())).join(','));
    downloadFile('literature-review-evidence-matrix.csv', '\ufeff' + rows.join('\r\n'), 'text/csv;charset=utf-8');
    toast('Evidence matrix downloaded');
  });

  // Export saved worksheet portfolio.
  qs('#export-workbook').addEventListener('click', () => {
    const sections = ['# Literature Review Lab — Learning Log', '', `Exported: ${new Date().toLocaleString()}`, '', '## Module progress', '', [...completed].sort().map(id => `- ${qs(`[data-page="${id}"]`)?.textContent.trim() || id}`).join('\n') || '- No modules marked yet', ''];
    qsa('[data-save]').forEach(field => {
      const label = field.closest('label')?.childNodes[0]?.textContent.trim() || field.getAttribute('aria-label') || field.dataset.save;
      sections.push(`## ${label}`, '', field.value.trim() || '_No response recorded._', '');
    });
    sections.push('## Submission readiness', '');
    qsa('[data-save-check]').forEach(field => {
      const text = field.closest('label').textContent.trim();
      sections.push(`- [${field.checked ? 'x' : ' '}] ${text}`);
    });
    downloadFile('literature-review-learning-log.md', sections.join('\n'));
    toast('Learning log downloaded');
  });

  // Search overlay.
  const searchDialog = qs('#search-dialog');
  const searchInput = qs('#site-search');
  function openSearch() {
    searchDialog.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => searchInput.focus(), 20);
  }
  function closeSearch() {
    searchDialog.hidden = true;
    document.body.style.overflow = '';
    qs('#search-toggle').focus();
  }
  qs('#search-toggle').addEventListener('click', openSearch);
  qs('#search-close').addEventListener('click', closeSearch);
  searchDialog.addEventListener('click', event => { if (event.target === searchDialog) closeSearch(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !searchDialog.hidden) closeSearch();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
  });
  const searchIndex = qsa('.page').map(page => ({
    id: page.id.replace('page-', ''),
    title: page.dataset.title,
    text: page.textContent.replace(/\s+/g, ' ').trim()
  }));
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    const results = qs('#search-results');
    if (query.length < 2) { results.innerHTML = '<p>Type at least two characters.</p>'; return; }
    const matches = searchIndex.filter(item => item.text.toLowerCase().includes(query)).slice(0, 10);
    results.innerHTML = matches.length ? matches.map(item => {
      const lower = item.text.toLowerCase();
      const pos = lower.indexOf(query);
      const excerpt = item.text.slice(Math.max(0, pos - 55), Math.min(item.text.length, pos + query.length + 120));
      return `<button class="search-result" data-result="${item.id}"><strong>${item.title}</strong><span>…${excerpt}…</span></button>`;
    }).join('') : '<p>No matching module. Try a broader term.</p>';
    qsa('[data-result]', results).forEach(button => button.addEventListener('click', () => { closeSearch(); showPage(button.dataset.result); }));
  });

  // Initial state.
  updateProgress();
  showPage(location.hash.slice(1) || 'home', { updateHash: false, mark: false });
})();
