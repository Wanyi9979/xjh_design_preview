(() => {
  const detail = document.getElementById('visit-version-detail');
  if (!detail) return;
  const storageKey = () => `config-center:ai-annotations:${encodeURIComponent(document.getElementById('view-detail').dataset.projectId || 'default')}:${encodeURIComponent(detail.dataset.version || 'default')}`;
  const read = () => { try { const value = JSON.parse(localStorage.getItem(storageKey()) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; } };
  const write = values => { try { localStorage.setItem(storageKey(), JSON.stringify(values)); } catch { /* Keep the current session usable if storage is unavailable. */ } };
  const makeIcon = (key, label) => {
    const trigger = document.createElement('span');
    trigger.className = 'ai-annotation-trigger';
    trigger.setAttribute('role', 'button');
    trigger.tabIndex = 0;
    trigger.dataset.aiKey = key;
    trigger.dataset.aiLabel = label;
    const image = document.createElement('img');
    image.src = 'assets/figma/ai-annotation-hover.svg';
    image.alt = '';
    trigger.append(image);
    return trigger;
  };
  function refresh() {
    const annotations = read();
    detail.querySelectorAll('.ai-annotation-trigger').forEach(trigger => {
      const saved = typeof annotations[trigger.dataset.aiKey] === 'string' && annotations[trigger.dataset.aiKey].trim();
      trigger.classList.toggle('has-annotation', !!saved);
      trigger.querySelector('img').src = saved ? 'assets/figma/ai-annotation-saved.svg' : 'assets/figma/ai-annotation-hover.svg';
      trigger.setAttribute('aria-label', `${saved ? '编辑' : '添加'}${trigger.dataset.aiLabel}的AI识别标注`);
      trigger.title = saved ? '编辑 AI 识别标注' : '添加 AI 识别标注';
    });
  }
  function decorate() {
    detail.querySelectorAll('.visit-list .visit-row').forEach(row => {
      const title = row.querySelector('.visit-copy strong');
      if (title && !title.querySelector('.ai-annotation-trigger')) title.append(makeIcon(`visit:${row.dataset.visit}`, row.dataset.visit));
    });
    const visit = detail.querySelector('.visit-list .visit-row.active')?.dataset.visit || '';
    detail.querySelectorAll('#visit-crf-list .crf-browser-item').forEach(row => {
      const title = row.querySelector('strong');
      if (title && !title.querySelector('.ai-annotation-trigger')) title.append(makeIcon(`form:${visit}:${title.textContent.trim()}`, title.textContent.trim()));
    });
    const form = document.getElementById('crf-config-title')?.textContent.trim() || '';
    detail.querySelectorAll('#crf-config-content .config-field-title').forEach((title, index) => {
      if (!title.querySelector('.ai-annotation-trigger')) title.append(makeIcon(`field:${visit}:${form}:${index}`, title.textContent.trim()));
    });
    refresh();
  }
  const editor = document.createElement('dialog');
  editor.className = 'ai-annotation-dialog';
  editor.setAttribute('aria-labelledby', 'ai-annotation-title');
  editor.innerHTML = '<header><h2 id="ai-annotation-title">添加AI识别标注</h2><button class="ai-close" type="button" aria-label="关闭">×</button></header><div class="ai-body"><label>标注对象</label><div class="ai-object"></div><label for="ai-annotation-content"><span class="ai-required">* </span>标注内容</label><textarea id="ai-annotation-content" placeholder="请输入AI识别标注内容"></textarea><p class="ai-error" hidden>请输入标注内容</p></div><footer><button class="ai-delete" type="button">删除</button><button class="ai-cancel" type="button">取消</button><button class="ai-save" type="button">保存</button></footer>';
  const confirm = document.createElement('dialog');
  confirm.className = 'ai-annotation-dialog';
  confirm.setAttribute('aria-labelledby', 'ai-delete-title');
  confirm.innerHTML = '<header><h2 id="ai-delete-title">确认删除标注？</h2><button class="ai-close" type="button" aria-label="关闭">×</button></header><div class="ai-body"><p class="ai-confirm-copy">删除后，AI 将不再参考该标注内容进行识别。</p></div><footer><button class="ai-cancel" type="button">取消</button><button class="ai-confirm-delete" type="button">删除</button></footer>';
  document.body.append(editor, confirm);
  let activeKey = '';
  const content = editor.querySelector('textarea');
  const error = editor.querySelector('.ai-error');
  function open(trigger) {
    activeKey = trigger.dataset.aiKey;
    const saved = read()[activeKey] || '';
    editor.querySelector('h2').textContent = saved ? '编辑AI识别标注' : '添加AI识别标注';
    editor.querySelector('.ai-object').textContent = trigger.dataset.aiLabel;
    editor.querySelector('.ai-delete').hidden = !saved;
    content.value = saved;
    error.hidden = true;
    editor.showModal();
    content.focus();
  }
  detail.addEventListener('click', event => {
    const trigger = event.target.closest('.ai-annotation-trigger');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    open(trigger);
  }, true);
  detail.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.ai-annotation-trigger')) {
      event.preventDefault();
      event.stopPropagation();
      open(event.target);
    }
  }, true);
  editor.querySelector('.ai-save').addEventListener('click', () => {
    const value = content.value.trim();
    if (!value) { error.hidden = false; content.focus(); return; }
    const values = read();
    values[activeKey] = value;
    write(values);
    editor.close();
    refresh();
  });
  editor.querySelector('.ai-delete').addEventListener('click', () => { editor.close(); confirm.showModal(); });
  confirm.querySelector('.ai-confirm-delete').addEventListener('click', () => {
    const values = read();
    delete values[activeKey];
    write(values);
    confirm.close();
    refresh();
  });
  [editor, confirm].forEach(dialog => {
    dialog.querySelector('.ai-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('.ai-cancel').addEventListener('click', () => dialog.close());
  });
  const observer = new MutationObserver(() => decorate());
  observer.observe(detail, { childList: true, subtree: true });
  document.querySelectorAll('.view-version-detail').forEach(button => button.addEventListener('click', () => queueMicrotask(refresh)));
  decorate();
})();
