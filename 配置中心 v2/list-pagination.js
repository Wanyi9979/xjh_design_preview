(() => {
  const lists = [
    {body: '#vt-version-body', footer: '#vt-version-panel .vt-pagination', unit: '个版本'},
    {body: '#vt-task-body', footer: '#vt-task-panel .vt-pagination', unit: '个任务'},
    {body: '#vt-question-body', footer: '#vt-question-total', unit: '个表单'},
    {body: '#visit-group-body', footer: '#visit-group-panel .visit-group-pagination', unit: '个分组'},
    {body: '#ds-mapping-body', footer: '#ds-mapping-total', unit: '条映射'},
    {body: '#center-link-body', footer: '#tab-centers .center-pagination', unit: '个中心'},
    {body: '#account-mapping-body', footer: '#tab-accounts .pagination', unit: '个映射'},
    {body: '#view-accounts tbody', footer: '#view-accounts .pagination', unit: '条'}
  ];

  lists.forEach(({body: bodySelector, footer: footerSelector, unit}) => {
    const body = document.querySelector(bodySelector);
    const footer = document.querySelector(footerSelector);
    if (!body || !footer) return;
    let page = 1;
    let pageSize = 10;

    function ensureControls() {
      footer.classList.add('list-pagination');
      let total = footer.querySelector(':scope > .list-pagination-total');
      if (!total) {
        total = footer.querySelector(':scope > span');
        if (!total) {
          footer.replaceChildren();
          total = document.createElement('span');
          footer.append(total);
        }
        total.classList.add('list-pagination-total');
      }
      let controls = footer.querySelector(':scope > .list-pagination-controls');
      if (!controls) {
        footer.querySelectorAll(':scope > .pages').forEach(node => node.remove());
        controls = document.createElement('div');
        controls.className = 'pages list-pagination-controls';
        controls.innerHTML = '<select aria-label="每页条数"><option value="10">10 条/页</option><option value="20">20 条/页</option><option value="50">50 条/页</option></select><button class="page list-page-prev" type="button" aria-label="上一页">‹</button><button class="page active list-page-current" type="button" aria-current="page">1</button><button class="page list-page-next" type="button" aria-label="下一页">›</button>';
        controls.querySelector('select').value = String(pageSize);
        controls.querySelector('select').addEventListener('change', event => {
          pageSize = Number(event.target.value);
          page = 1;
          update();
        });
        controls.querySelector('.list-page-prev').addEventListener('click', () => { page -= 1; update(); });
        controls.querySelector('.list-page-next').addEventListener('click', () => { page += 1; update(); });
        footer.append(controls);
      }
      return {total, controls};
    }

    function update(reset = false) {
      if (reset) page = 1;
      const rows = [...body.children].filter(node => node.matches('tr, .ds-crf-item'));
      const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
      page = Math.max(1, Math.min(page, pageCount));
      rows.forEach((row, index) => {
        row.dataset.listPageHidden = String(index < (page - 1) * pageSize || index >= page * pageSize);
      });
      const {total, controls} = ensureControls();
      total.textContent = `共 ${rows.length} ${unit}`;
      controls.querySelector('.list-page-current').textContent = String(page);
      controls.querySelector('.list-page-prev').disabled = page === 1;
      controls.querySelector('.list-page-next').disabled = page === pageCount;
    }

    new MutationObserver(() => update(true)).observe(body, {childList: true});
    update();
  });
})();
