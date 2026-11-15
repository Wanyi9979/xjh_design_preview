(() => {
  const { participants, projectCatalog } = window.clinicalParticipantDirectory.create();
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const search = document.getElementById('project-search');
  const rows = document.getElementById('project-rows');
  const params = new URLSearchParams(location.search);
  const people = participants.filter((person, index, list) => list.findIndex(p => p.study === person.study && p.id === person.id) === index);
  search.value = params.get('q') || '';
  function render() {
    const query = search.value.trim().toLowerCase();
    const visible = Object.entries(projectCatalog).map(([id, name]) => {
      const members = people.filter(p => p.study === id);
      return { id, name, members };
    }).filter(project => !query || `${project.id} ${project.name}`.toLowerCase().includes(query));
    rows.innerHTML = visible.length ? visible.map(({ id, name, members }) => {
      const route = (path, extra = {}) => escape(`${path}?${new URLSearchParams({ project: id, ...extra })}`);
      return `<tr><td>${escape(id)}</td><td>${escape(name)}</td><td>${members.length}</td><td>${members.filter(p => p.status === '已入组').length}</td><td>${members.filter(p => p.status === '筛选中').length}</td><td><div class="project-actions"><a href="${route('项目参与者-Figma.html', { view: 'participants' })}">查看参与者</a><a href="${route('项目参与者-Figma.html', { view: 'visits' })}">查看访视</a><a href="${route('访视计划模版-Figma.html')}">任务模板</a></div></td></tr>`;
    }).join('') : '<tr><td class="project-empty" colspan="6">暂无匹配项目</td></tr>';
    document.getElementById('project-count').textContent = `共 ${visible.length} 个项目`;
    const url = new URL(location.href);
    ['hospital', 'q'].forEach(key => url.searchParams.delete(key));
    if (search.value.trim()) url.searchParams.set('q', search.value.trim());
    history.replaceState(null, '', url);
  }
  search.addEventListener('input', render);
  document.getElementById('project-reset').addEventListener('click', () => { search.value = ''; render(); });
  window.addEventListener('popstate', () => {
    const p = new URLSearchParams(location.search);
    search.value = p.get('q') || '';
    render();
  });
  render();
})();
