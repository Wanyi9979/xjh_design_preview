(() => {
  const params = new URLSearchParams(location.search);
  if (params.has('planEmbed')) return;

  const careModule = params.get('module') === 'care';
  const pageName = decodeURIComponent(location.pathname.split('/').pop() || '');
  const participantPage = pageName.startsWith('项目参与者');
  const projectPage = pageName.startsWith('项目管理') || pageName.startsWith('访视计划模版');
  const workbenchOnePage = pageName.startsWith('临床研究工作台1');
  document.documentElement.dataset.clinicalModule = careModule ? 'care' : 'research';

  function storedProject() {
    const fromURL = new URLSearchParams(location.search).get('project');
    if (fromURL) return fromURL;
    try { return sessionStorage.getItem('clinical-calendar-project') || ''; } catch { return ''; }
  }

  function withProject(path, query = {}) {
    const project = storedProject();
    return `${path}?${new URLSearchParams({ ...query, ...(project ? { project } : {}) })}`;
  }

  function replaceClinicalEntry() {
    const item = [...document.querySelectorAll('.sidebar .nav-item')].find(element => element.querySelector('img[src$="nav_clinical.svg"]'));
    if (!item) return;
    const link = document.createElement('a');
    link.className = 'nav-item';
    link.href = '临床研究工作台1-Figma.html';
    link.innerHTML = '<img src="figma-clinical-assets/nav_clinical.svg" alt="">临床研究';
    item.replaceWith(link);
  }

  function createHeader() {
    const header = document.createElement('header');
    header.className = 'clinical-module-header';
    header.innerHTML = `
      <a class="clinical-module-brand" data-clinical-route="workbench-one" href="临床研究工作台1-Figma.html">
        <span class="clinical-brand-mark" aria-hidden="true"><img src="figma-clinical-assets/nav_clinical.svg" alt=""></span>
        <strong>临床研究</strong>
      </a>
      <nav class="clinical-module-links" aria-label="临床研究模块导航">
        <a data-clinical-route="workbench-one" href="临床研究工作台1-Figma.html">工作台</a>
        <a data-clinical-route="participants" href="项目参与者-Figma.html">参与者管理</a>
        <a data-clinical-route="projects" href="项目管理-Figma.html">项目管理</a>
        <a data-clinical-route="workbench" href="${withProject('临床试验工作台-Figma.html', { tab: 'workbench' })}">工作台1</a>
      </nav>
      <a class="clinical-module-return" href="${withProject('临床试验工作台-Figma.html', { module: 'care' })}">返回全病程</a>`;
    const currentRoute = projectPage ? 'projects' : participantPage ? 'participants' : workbenchOnePage ? 'workbench-one' : 'workbench';
    header.querySelector(`.clinical-module-links [data-clinical-route="${currentRoute}"]`)?.setAttribute('aria-current', 'page');
    document.body.prepend(header);
    header.addEventListener('click', event => {
      const link = event.target.closest('a');
      const project = storedProject();
      if (!link || !project || ['projects', 'participants', 'workbench-one'].includes(link.dataset.clinicalRoute)) return;
      const url = new URL(link.href);
      url.searchParams.set('project', project);
      link.href = url.href;
    });
  }

  function initialize() {
    replaceClinicalEntry();
    if (careModule) {
      document.title = '全病程';
      return;
    }

    createHeader();
    const calendarPanel = document.getElementById('clinical-calendar-panel');
    const overviewPanel = document.getElementById('clinical-overview-panel');
    if (calendarPanel) {
      calendarPanel.hidden = false;
      if (overviewPanel) overviewPanel.hidden = true;
      document.title = '工作台1 · 临床研究';
    }

    const taskTitles = {
      draft: '待发放访视任务',
      execute: '待执行访视任务',
      overdue: '逾期待执行访视任务',
      processing: '待数据处理',
      follow: '待跟进参与者'
    };
    const taskTitle = taskTitles[document.body.dataset.taskPage];
    if (taskTitle) {
      const heading = document.createElement('h1');
      heading.className = 'clinical-task-heading';
      heading.textContent = taskTitle;
      document.querySelector('main')?.prepend(heading);
      document.title = `${taskTitle} · 临床研究`;
    } else if (participantPage) {
      document.title = '参与者管理 · 临床研究';
    } else if (pageName.startsWith('项目管理')) {
      document.title = '项目管理 · 临床研究';
    } else if (workbenchOnePage) {
      document.title = '工作台 · 临床研究';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
