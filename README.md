# 临床研究管理原型项目

这个项目由下载目录 `outputs 5` 整理而来，是一个无需构建的静态 HTML 交互原型。

## 本地预览

```bash
python3 -m http.server 4173
```

然后打开：

```text
http://localhost:4173/
```

默认入口 `index.html` 进入保留系统侧边栏的全病程视图。点击左侧「临床研究」进入独立的临床研究模块；模块隐藏系统侧边栏，通过顶部「返回全病程」返回。直接打开 `临床试验工作台-Figma.html` 默认显示临床研究工作台。

如果本机装了 npm，也可以用 `npm start`，它执行的是同一条静态服务命令。

## 主要文件

- `临床试验工作台-Figma.html`：默认入口，包含「项目概览」和项目日历「工作台」tab
- `crc-calendar.js`、`crc-calendar.css`、`crc-calendar-integration.js`：可传入数据的日历组件、限定作用域的样式及现有项目适配
- `临床研究工作台1-Figma.html`、`clinical-workbench-one.js`、`clinical-workbench-one.css`：任务与访视工作台，左侧以单行统计卡片和列表处理待办，右侧按今日需到访、超窗待访视、即将访视（7天内）展示访视
- `workbench-visit-overview.js`、`workbench-visit-overview.css`：工作台1访视分组列表与详情抽屉，支持项目/中心/参与者筛选、预约和实际日期调整；任务区与访视区约按 2:1 布局；演示今日固定为 2026-10-29，日期修改保存于浏览器本地
- `clinical-research-shell.js`、`clinical-research-shell.css`：临床研究模块顶部导航、全病程入口和返回行为；嵌入式计划弹框不加载模块外壳
- `日历工作台接入说明.md`：日历数据结构、演示数据归属与接入方式
- `临床试验管理.html`：整合版交互原型页面，保留为原始文件夹内容
- `项目管理-Figma.html`、`project-management.js`、`project-management.css`：与参与者管理平级的项目管理入口，支持项目搜索、中心筛选，以及查看项目参与者、访视、任务模板和工作台
- `项目参与者-Figma.html`：参与者管理，包含「参与者 / 访视视图」，不再嵌套项目列表
- `participant-directory-data.js`：项目管理与参与者管理共用的项目、参与者演示数据
- `participant-visits.js`、`participant-visits.css`：访视列表、日期筛选、预约与实际日期操作
- `clinical-visit-store.js`：日历与访视列表共用的数据转换、日期保存和操作记录
- `项目参与者详情-Figma.html`：参与者详情与访视计划
- `figma-clinical-assets/`：页面图标、截图和演示素材
- `使用与设计说明.md`、`访视任务交互说明.md`：原型说明文档

## 说明

页面数据为本地演示数据。部分操作会写入浏览器本地存储，不依赖后端服务。
