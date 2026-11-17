(() => {
  "use strict";

  if (window.__DESIGN_NOTES_RUNTIME__) return;
  window.__DESIGN_NOTES_RUNTIME__ = true;

  const exportPayload = window.__DESIGN_NOTES_EXPORT__ || null;
  const entryPayload = window.__DESIGN_NOTES_ENTRY__ || null;
  const script = document.currentScript;
  const offlineEntry = Boolean(entryPayload) && !exportPayload;
  const readOnly = Boolean(exportPayload);
  const apiBase = script?.dataset.apiBase || "/__design_notes__";
  const serviceUrl = script?.dataset.serviceUrl || "http://127.0.0.1:4173";
  const entryPath = script?.dataset.entryPath || "";
  const sourcePath =
    exportPayload?._exportSourcePath ||
    entryPayload?._entrySourcePath ||
    script?.dataset.sourcePath ||
    window.location.pathname ||
    "/";
  const storageKey = `design-notes:${offlineEntry ? window.location.href : entryPath || sourcePath}`;
  const enabledStorageKey = `${storageKey}:enabled`;
  const sourceSnapshotElement = document.getElementById("__design-notes-source-html");
  const runtimeSource = script?.textContent || "";
  const host = document.createElement("div");
  host.id = "__design-notes-host";
  host.style.cssText =
    "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  root.innerHTML = `
    <style>
      :host, * { box-sizing: border-box; }
      .toolbar {
        position: fixed; top: 16px; right: 16px; pointer-events: auto;
        display: flex; align-items: center; gap: 8px; min-height: 38px;
        padding: 4px 8px 4px 4px; border: 1px solid rgba(15,23,42,.12);
        border-radius: 10px; background: rgba(255,255,255,.96);
        color: #0f172a; box-shadow: 0 6px 22px rgba(15,23,42,.16);
        font: 500 13px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        backdrop-filter: blur(10px); transition: padding .16s ease, gap .16s ease;
      }
      .toolbar.collapsed { gap: 0; padding: 4px; }
      .toolbar-content { display: flex; align-items: center; gap: 9px; }
      .toolbar.collapsed .toolbar-content { display: none; }
      .toolbar-toggle {
        display: grid; place-items: center; flex: 0 0 auto; width: 30px; height: 30px;
        padding: 0; border: 0; border-radius: 7px; background: #eff6ff; color: #1d4ed8;
        font: 700 13px/1 system-ui,-apple-system,sans-serif; cursor: pointer;
      }
      .toolbar-toggle:hover { background: #dbeafe; }
      .toolbar-toggle-icon { font-size: 13px; }
      .toolbar:not(.collapsed) .toolbar-toggle-icon { font-size: 20px; font-weight: 500; }
      .switch {
        position: relative; width: 34px; height: 20px; border: 0; padding: 0;
        border-radius: 999px; background: #cbd5e1; cursor: pointer;
        transition: background .16s ease;
      }
      .switch::after {
        content: ""; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
        border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(15,23,42,.3);
        transition: transform .16s ease;
      }
      .switch[aria-checked="true"] { background: #2563eb; }
      .switch[aria-checked="true"]::after { transform: translateX(14px); }
      .add-note, .save-files, .export-note {
        height: 28px; padding: 0 9px; border: 1px solid #bfdbfe; border-radius: 7px;
        background: #eff6ff; color: #1d4ed8; font: 600 12px/1 inherit; cursor: pointer;
      }
      .add-note:hover, .add-note.active { color: #fff; background: #2563eb; border-color: #2563eb; }
      .save-files:hover, .export-note:hover { background: #dbeafe; border-color: #93c5fd; }
      .save-files:disabled, .export-note:disabled { opacity: .55; cursor: wait; }
      .add-note[hidden], .save-files[hidden], .export-note[hidden], .mode-label[hidden] { display: none; }
      .mode-label { color: #64748b; font-size: 12px; }
      .marker {
        position: fixed; pointer-events: auto; display: grid; place-items: center;
        width: 24px; height: 24px; padding: 0; border: 2px solid #fff; border-radius: 50%;
        background: #2563eb; color: #fff; box-shadow: 0 2px 8px rgba(37,99,235,.45);
        font: 700 12px/1 system-ui,-apple-system,sans-serif; cursor: grab;
        transform: translate(-50%,-50%); transition: transform .12s ease, background .12s ease;
      }
      .marker:hover, .marker[aria-expanded="true"] {
        transform: translate(-50%,-50%) scale(1.1); background: #1d4ed8;
      }
      .marker.dragging {
        cursor: grabbing; transition: none; transform: translate(-50%,-50%) scale(1.1);
      }
      .card {
        position: fixed; pointer-events: auto; width: min(360px, calc(100vw - 24px));
        max-height: min(520px, calc(100vh - 24px)); overflow: auto;
        border: 1px solid rgba(15,23,42,.12); border-radius: 12px; background: #fff;
        color: #0f172a; box-shadow: 0 18px 48px rgba(15,23,42,.24);
        font: 14px/1.55 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      .card-head {
        position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 8px;
        padding: 12px 12px 10px; border-bottom: 1px solid #e2e8f0; background: #fff;
      }
      .badge {
        flex: 0 0 auto; display: grid; place-items: center; width: 24px; height: 24px;
        border-radius: 50%; background: #2563eb; color: #fff; font-weight: 700;
      }
      .title {
        min-width: 0; flex: 1; height: 30px; border: 1px solid transparent;
        border-radius: 6px; padding: 4px 7px; color: #0f172a; background: transparent;
        font: 650 15px/1.3 inherit;
      }
      .title:hover, .title:focus { border-color: #cbd5e1; outline: none; background: #f8fafc; }
      .close {
        width: 28px; height: 28px; border: 0; border-radius: 6px; background: transparent;
        color: #64748b; font-size: 20px; cursor: pointer;
      }
      .close:hover { background: #f1f5f9; color: #0f172a; }
      .editor {
        min-height: 112px; padding: 14px; outline: none; overflow-wrap: anywhere;
      }
      .editor:focus { box-shadow: inset 0 0 0 2px rgba(37,99,235,.18); }
      .editor:empty::before { content: "输入设计说明，可直接粘贴图片"; color: #94a3b8; }
      .editor p { margin: 0 0 10px; }
      .editor ul, .editor ol { margin: 8px 0; padding-left: 22px; }
      .editor img { display: block; max-width: 100%; height: auto; margin: 10px 0; border-radius: 6px; }
      .card-foot {
        position: sticky; bottom: 0; display: flex; align-items: center; gap: 8px;
        padding: 10px 12px; border-top: 1px solid #e2e8f0; background: #fff;
      }
      .hint { flex: 1; color: #64748b; font-size: 12px; }
      .save {
        height: 32px; padding: 0 13px; border: 0; border-radius: 7px;
        background: #2563eb; color: #fff; font: 600 13px/1 inherit; cursor: pointer;
      }
      .save:hover { background: #1d4ed8; }
      .save:disabled { opacity: .55; cursor: wait; }
      .delete {
        height: 32px; padding: 0 10px; border: 1px solid #fecdd3; border-radius: 7px;
        background: #fff1f2; color: #be123c; font: 600 13px/1 inherit; cursor: pointer;
      }
      .delete:hover, .delete.confirm { color: #fff; background: #e11d48; border-color: #e11d48; }
      .picker-highlight {
        position: fixed; display: none; pointer-events: none; border: 2px solid #2563eb;
        border-radius: 6px; background: rgba(37,99,235,.08);
        box-shadow: 0 0 0 3px rgba(37,99,235,.14);
      }
      .picker-tip {
        position: fixed; left: 50%; top: 18px; display: none; pointer-events: none;
        transform: translateX(-50%); padding: 9px 13px; border-radius: 8px;
        background: #0f172a; color: #fff; box-shadow: 0 8px 24px rgba(15,23,42,.24);
        font: 600 13px/1.2 system-ui,-apple-system,sans-serif;
      }
      .picker-highlight.active, .picker-tip.active { display: block; }
      .notice {
        position: fixed; right: 16px; top: 64px; max-width: 360px; pointer-events: auto;
        padding: 10px 12px; border-radius: 8px; background: #fff1f2; color: #be123c;
        border: 1px solid #fecdd3; box-shadow: 0 8px 24px rgba(15,23,42,.12);
        font: 13px/1.45 system-ui,-apple-system,sans-serif;
      }
      .notice.success { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
    </style>
    <div class="toolbar collapsed">
      <button class="toolbar-toggle" type="button" aria-expanded="false" aria-label="展开设计说明工具栏" title="展开设计说明工具栏">
        <span class="toolbar-toggle-icon">注</span>
      </button>
      <div class="toolbar-content">
        <span>设计说明</span>
        <span class="mode-label" hidden>分享只读版</span>
        <button class="add-note" type="button" hidden>＋ 新增</button>
        <button class="save-files" type="button" hidden>保存到文件</button>
        <button class="export-note" type="button">导出分享版</button>
        <button class="switch" type="button" role="switch" aria-label="切换设计说明" aria-checked="false"></button>
      </div>
    </div>
    <div class="picker-highlight"></div>
    <div class="picker-tip">点击页面元素添加标注；按 Esc 取消</div>
    <div class="markers"></div>
    <div class="cards"></div>
    <div class="errors"></div>
  `;

  const toolbar = root.querySelector(".toolbar");
  const toolbarToggle = root.querySelector(".toolbar-toggle");
  const toolbarToggleIcon = root.querySelector(".toolbar-toggle-icon");
  const toolbarSwitch = root.querySelector(".switch");
  const addNoteButton = root.querySelector(".add-note");
  const saveFilesButton = root.querySelector(".save-files");
  const exportNoteButton = root.querySelector(".export-note");
  const modeLabel = root.querySelector(".mode-label");
  const pickerHighlight = root.querySelector(".picker-highlight");
  const pickerTip = root.querySelector(".picker-tip");
  const markersRoot = root.querySelector(".markers");
  const cardsRoot = root.querySelector(".cards");
  const errorsRoot = root.querySelector(".errors");
  const markerElements = new Map();
  modeLabel.textContent = "分享只读版";
  let toolbarCollapsed = true;
  let data = exportPayload || entryPayload || { notes: [] };
  let enabled = readOnly || offlineEntry;
  if (!readOnly) {
    try {
      const storedEnabled = localStorage.getItem(enabledStorageKey);
      if (storedEnabled !== null) enabled = storedEnabled === "true";
    } catch {
      enabled = offlineEntry;
    }
  }
  let directoryHandle = null;
  let syncQueued = false;
  let shareSequence = 0;
  try {
    shareSequence = Number.parseInt(localStorage.getItem(`${storageKey}:share-sequence`) || "0", 10) || 0;
  } catch {
    shareSequence = 0;
  }
  let activeNoteId = null;
  let activeLayerKey = "";
  let renderQueued = false;
  let picking = false;

  function showNotice(message, success = false) {
    errorsRoot.textContent = "";
    const element = document.createElement("div");
    element.className = `notice${success ? " success" : ""}`;
    element.textContent = message;
    errorsRoot.appendChild(element);
    window.setTimeout(() => element.remove(), 5000);
  }

  function showError(message) {
    showNotice(message, false);
  }

  function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function cleanProjectData() {
    const snapshot = cloneData(data);
    delete snapshot._entrySourcePath;
    delete snapshot._exportSourcePath;
    return snapshot;
  }

  function renumberNotes(route, layer) {
    if (!Array.isArray(data.notes)) return;
    const indexed = data.notes.map((note, index) => ({ note, index }));
    const target = indexed
      .filter(({ note }) => note && note.route === route && note.layer === layer)
      .sort((a, b) => {
        const numberA = Number(a.note.number || 0);
        const numberB = Number(b.note.number || 0);
        if (numberA !== numberB) return numberA - numberB;
        return a.index - b.index;
      });
    target.forEach(({ note }, index) => {
      note.number = index + 1;
    });
  }

  function renumberAllNotes() {
    if (!Array.isArray(data.notes)) return;
    const seen = new Set();
    data.notes.forEach((note) => {
      if (!note) return;
      const key = `${note.route || ""}\u0000${note.layer || ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      renumberNotes(note.route, note.layer);
    });
  }

  function openOfflineDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      const request = window.indexedDB.open("design-notes-offline", 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("projects")) {
          database.createObjectStore("projects");
        }
        if (!database.objectStoreNames.contains("handles")) {
          database.createObjectStore("handles");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
    });
  }

  let offlineDatabasePromise = null;

  async function offlineStoreGet(storeName, key) {
    offlineDatabasePromise ||= openOfflineDatabase();
    const database = await offlineDatabasePromise;
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB read failed"));
    });
  }

  async function offlineStorePut(storeName, key, value) {
    offlineDatabasePromise ||= openOfflineDatabase();
    const database = await offlineDatabasePromise;
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("IndexedDB write failed"));
    });
  }

  async function loadOfflineState() {
    if (!offlineEntry) return;
    try {
      const stored = await offlineStoreGet("projects", storageKey);
      if (stored && Array.isArray(stored.notes)) data = stored;
      directoryHandle = (await offlineStoreGet("handles", storageKey)) || null;
      return;
    } catch {
      // Fall back to localStorage for browsers that disable IndexedDB on file URLs.
    }
    try {
      const stored = JSON.parse(localStorage.getItem(`${storageKey}:data`) || "null");
      if (stored && Array.isArray(stored.notes)) data = stored;
    } catch {
      // The embedded entry snapshot remains the source of truth.
    }
  }

  async function saveOfflineState() {
    if (!offlineEntry) return;
    const snapshot = cloneData(data);
    try {
      await offlineStorePut("projects", storageKey, snapshot);
    } catch {
      try {
        localStorage.setItem(`${storageKey}:data`, JSON.stringify(snapshot));
      } catch {
        // Large pasted images may exceed localStorage; the user can still save to files.
      }
    }
  }

  function base64ToText(value) {
    const binary = atob(value.replace(/\s+/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new TextDecoder().decode(bytes);
  }

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function scriptJSON(value) {
    return JSON.stringify(value).replace(/<\//gi, "<\\/");
  }

  function injectGeneratedBlock(sourceHtml, block) {
    const lower = sourceHtml.toLowerCase();
    let position = lower.lastIndexOf("</body>");
    if (position < 0) position = lower.lastIndexOf("</html>");
    if (position < 0) return `${sourceHtml}${block}`;
    return `${sourceHtml.slice(0, position)}${block}${sourceHtml.slice(position)}`;
  }

  function entryFilename() {
    const encoded = entryPath.split("/").filter(Boolean).pop();
    if (encoded) return decodeURIComponent(encoded);
    const sourceName = decodeURIComponent(sourcePath.split("/").filter(Boolean).pop() || "index.html");
    return sourceName.replace(/(\.html?)$/i, "-带设计说明$1");
  }

  function decodedRelativePath(value) {
    return decodeURIComponent(String(value || "").split(/[?#]/, 1)[0]).replace(/^\/+/, "");
  }

  function entryRelativePath() {
    return decodedRelativePath(entryPath) || entryFilename();
  }

  function sourceRelativePath() {
    return decodedRelativePath(sourcePath);
  }

  async function directoryAt(rootHandle, parts, create = false) {
    let directory = rootHandle;
    for (const part of parts) {
      directory = await directory.getDirectoryHandle(part, { create });
    }
    return directory;
  }

  async function validateProjectFolder(handle) {
    const parts = sourceRelativePath().split("/").filter(Boolean);
    const filename = parts.pop();
    if (!filename) throw new Error("无法识别原 HTML 文件名");
    try {
      const directory = await directoryAt(handle, parts, false);
      await directory.getFileHandle(filename, { create: false });
    } catch {
      throw new Error(`请选择包含 ${sourceRelativePath()} 的项目根目录`);
    }
  }

  function originalSourceHtml() {
    if (!sourceSnapshotElement?.textContent?.trim()) {
      throw new Error("当前文件缺少原型源码快照，请重新生成带设计说明 HTML");
    }
    return base64ToText(sourceSnapshotElement.textContent.trim());
  }

  function buildOfflineEntryHtml() {
    const snapshot = cleanProjectData();
    snapshot._entrySourcePath = sourcePath;
    const sourceBase64 = sourceSnapshotElement?.textContent?.trim();
    if (!sourceBase64) throw new Error("当前文件缺少原型源码快照，请重新生成带设计说明 HTML");
    const escapedRuntime = runtimeSource.replace(/<\/script/gi, "<\\/script");
    const block = `\n<!-- design-notes editable entry; generated file -->\n` +
      `<script id="__design-notes-source-html" type="application/octet-stream">${sourceBase64}</script>\n` +
      `<script id="__design-notes-entry-data">window.__DESIGN_NOTES_ENTRY__=${scriptJSON(snapshot)};<\/script>\n` +
      `<script data-design-notes-runtime="entry" data-api-base="${escapeAttribute(apiBase)}" ` +
      `data-source-path="${escapeAttribute(sourcePath)}" data-entry-path="${escapeAttribute(entryPath)}" ` +
      `data-service-url="${escapeAttribute(serviceUrl)}">${escapedRuntime}<\/script>\n`;
    return injectGeneratedBlock(originalSourceHtml(), block);
  }

  function buildOfflineShareHtml() {
    const snapshot = cleanProjectData();
    snapshot._exportSourcePath = sourcePath;
    const escapedRuntime = runtimeSource.replace(/<\/script/gi, "<\\/script");
    const block = `\n<!-- design-notes standalone export; generated file -->\n` +
      `<script>window.__DESIGN_NOTES_EXPORT__=${scriptJSON(snapshot)};<\/script>\n` +
      `<script>${escapedRuntime}<\/script>\n`;
    return injectGeneratedBlock(originalSourceHtml(), block);
  }

  function htmlToMarkdown(value) {
    const template = document.createElement("template");
    template.innerHTML = value || "";
    const renderNode = (node, listType = null, listIndex = 1) => {
      if (node.nodeType === 3) return node.textContent || "";
      if (node.nodeType !== 1) return "";
      const tag = node.tagName.toLowerCase();
      const children = Array.from(node.childNodes)
        .map((child) => renderNode(child, listType, listIndex))
        .join("");
      if (tag === "br") return "  \n";
      if (tag === "strong") return `**${children}**`;
      if (tag === "em") return `*${children}*`;
      if (tag === "code") return `\`${children}\``;
      if (tag === "a") return `[${children}](${node.getAttribute("href") || ""})`;
      if (tag === "img") return `![${node.getAttribute("alt") || "图片"}](${node.getAttribute("src") || ""})`;
      if (tag === "p") return `${children}\n\n`;
      if (tag === "ul" || tag === "ol") {
        return `${Array.from(node.children)
          .map((child, index) => renderNode(child, tag, index + 1))
          .join("")}\n`;
      }
      if (tag === "li") return `${listType === "ol" ? `${listIndex}.` : "-"} ${children.trim()}\n`;
      return children;
    };
    return Array.from(template.content.childNodes)
      .map((node) => renderNode(node))
      .join("")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function stringItems(value) {
    return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [];
  }

  function buildMarkdown() {
    const projectName = data.project?.name || "原型";
    const prd = data.prd && typeof data.prd === "object" ? data.prd : {};
    const notes = Array.isArray(data.notes) ? data.notes.filter((note) => note && typeof note === "object") : [];
    const noteById = new Map(notes.filter((note) => typeof note.id === "string").map((note) => [note.id, note]));
    const lines = [`# ${(typeof prd.title === "string" && prd.title.trim()) || `${projectName}产品需求文档`}`, "", "## 1. 产品概述", ""];
    lines.push(
      (typeof prd.summary === "string" && prd.summary.trim()) ||
        "本文档汇总当前原型中已确认的产品功能、页面内容与交互规则，作为产品、设计、研发和测试的共同需求依据。",
      "",
    );
    for (const [heading, items] of [
      ["### 1.1 产品目标", stringItems(prd.goals)],
      ["### 1.2 需求范围", stringItems(prd.scope)],
      ["### 1.3 使用对象", stringItems(prd.users)],
    ]) {
      if (!items.length) continue;
      lines.push(heading, "", ...items.map((item) => `- ${item}`), "");
    }
    const modules = Array.isArray(prd.modules)
      ? prd.modules.filter((module) => module && typeof module.title === "string" && module.title.trim())
      : [];
    if (modules.length) {
      lines.push("## 2. 功能结构", "", "| 模块 | 需求说明 |", "| --- | --- |");
      for (const module of modules) {
        lines.push(`| ${module.title.trim().replace(/\|/g, "\\|")} | ${String(module.summary || "见详细功能需求").trim().replace(/\|/g, "\\|")} |`);
      }
      lines.push("");
    }
    lines.push("## 3. 详细功能需求", "");
    const used = new Set();
    let requirementNumber = 1;
    const appendRequirement = (note) => {
      lines.push(`#### FR-${String(requirementNumber).padStart(3, "0")} ${note.title || "未命名需求"}`, "", htmlToMarkdown(note.bodyHtml) || "（需求说明待补充）", "");
      requirementNumber += 1;
      if (typeof note.id === "string") used.add(note.id);
    };
    if (modules.length) {
      modules.forEach((module, index) => {
        lines.push(`### 3.${index + 1} ${module.title.trim()}`, "");
        if (typeof module.summary === "string" && module.summary.trim()) lines.push(module.summary.trim(), "");
        for (const noteId of Array.isArray(module.noteIds) ? module.noteIds : []) {
          if (noteById.has(noteId)) appendRequirement(noteById.get(noteId));
        }
      });
    } else {
      const groups = new Map();
      const layerTitles = prd.layerTitles && typeof prd.layerTitles === "object" ? prd.layerTitles : {};
      for (const note of notes) {
        const layer = String(note.layer || "页面功能");
        const title = String(layerTitles[layer] || layer);
        if (!groups.has(title)) groups.set(title, []);
        groups.get(title).push(note);
      }
      Array.from(groups.entries()).forEach(([title, groupNotes], index) => {
        lines.push(`### 3.${index + 1} ${title}`, "");
        groupNotes.forEach(appendRequirement);
      });
    }
    const remaining = notes.filter((note) => typeof note.id === "string" && !used.has(note.id));
    if (remaining.length) {
      lines.push("### 3.补充 已确认需求", "");
      remaining.forEach(appendRequirement);
    }
    let section = 4;
    for (const [title, items, checkbox] of [
      ["全局交互与业务规则", stringItems(prd.globalRules), false],
      ["验收标准", stringItems(prd.acceptanceCriteria), true],
      ["待确认事项", stringItems(prd.pending), false],
    ]) {
      if (!items.length) continue;
      lines.push(`## ${section}. ${title}`, "", ...items.map((item) => `${checkbox ? "- [ ]" : "-"} ${item}`), "");
      section += 1;
    }
    return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
  }

  async function writeTextFile(rootHandle, path, content, type) {
    const parts = path.split("/").filter(Boolean);
    const filename = parts.pop();
    let directory = rootHandle;
    for (const part of parts) {
      directory = await directory.getDirectoryHandle(part, { create: true });
    }
    const fileHandle = await directory.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(new Blob([content], { type }));
    await writable.close();
  }

  async function hasWritePermission(handle, request = false) {
    if (!handle) return false;
    const options = { mode: "readwrite" };
    if ((await handle.queryPermission(options)) === "granted") return true;
    return request && (await handle.requestPermission(options)) === "granted";
  }

  async function writeProjectFiles(handle) {
    await validateProjectFolder(handle);
    const markdown = buildMarkdown();
    const annotations = `${JSON.stringify(cleanProjectData(), null, 2)}\n`;
    await writeTextFile(handle, entryRelativePath(), buildOfflineEntryHtml(), "text/html;charset=utf-8");
    await writeTextFile(handle, "DESIGN-NOTES.md", markdown, "text/markdown;charset=utf-8");
    await writeTextFile(handle, ".design-notes/annotations.json", annotations, "application/json;charset=utf-8");
    await writeTextFile(handle, ".design-notes/DESIGN-NOTES.md", markdown, "text/markdown;charset=utf-8");
  }

  function downloadText(filename, content, type) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type }));
    link.download = filename;
    link.style.display = "none";
    document.documentElement.appendChild(link);
    link.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 1000);
  }

  function downloadProjectFiles() {
    downloadText(entryFilename(), buildOfflineEntryHtml(), "text/html;charset=utf-8");
    downloadText("DESIGN-NOTES.md", buildMarkdown(), "text/markdown;charset=utf-8");
    downloadText("annotations.json", `${JSON.stringify(cleanProjectData(), null, 2)}\n`, "application/json;charset=utf-8");
    showNotice("浏览器未提供文件夹写入能力，已下载更新后的 HTML、Markdown 和 JSON。", true);
  }

  async function saveToProjectFolder({ requestPermission = false, quiet = false } = {}) {
    if (!offlineEntry) return false;
    if (!directoryHandle || !(await hasWritePermission(directoryHandle, requestPermission))) {
      return false;
    }
    await writeProjectFiles(directoryHandle);
    if (!quiet) showNotice("已同步带设计说明 HTML、Markdown 和 JSON。", true);
    return true;
  }

  function queueFolderSync() {
    if (!offlineEntry || !directoryHandle || syncQueued) return;
    syncQueued = true;
    window.setTimeout(async () => {
      syncQueued = false;
      try {
        await saveToProjectFolder({ quiet: true });
      } catch (error) {
        showError(`自动同步文件失败：${error.message}`);
      }
    }, 120);
  }

  async function persistOfflineChanges() {
    await saveOfflineState();
    queueFolderSync();
  }

  function isVisible(element) {
    if (!(element instanceof Element)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity || "1") > 0 &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth
    );
  }

  function routeMatches(pattern, pathname) {
    if (typeof pattern !== "string") return false;
    const escaped = pattern
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    return new RegExp(`^${escaped}$`).test(pathname);
  }

  function safeQueryAll(scope, selector) {
    try {
      return Array.from(scope.querySelectorAll(selector));
    } catch {
      return [];
    }
  }

  function deepestVisible(elements) {
    return elements
      .filter(isVisible)
      .map((element, index) => {
        let depth = 0;
        for (let node = element; node; node = node.parentElement) depth += 1;
        const z = Number.parseInt(getComputedStyle(element).zIndex, 10);
        return { element, score: depth * 1000 + (Number.isFinite(z) ? z : 0) + index };
      })
      .sort((a, b) => b.score - a.score)[0]?.element;
  }

  function chooseActiveLayer() {
    const pathname = sourcePath;
    const candidates = data.notes.filter((note) => routeMatches(note.route, pathname));
    const groups = new Map();
    for (const note of candidates) {
      const key = `${note.layerPriority || 0}|${note.layer || "page"}|${note.layerSelector || ""}`;
      if (!groups.has(key)) {
        let layerElement = document.documentElement;
        if (note.layerSelector) {
          layerElement = deepestVisible(safeQueryAll(document, note.layerSelector));
          if (!layerElement) continue;
        }
        groups.set(key, {
          key,
          priority: Number(note.layerPriority || 0),
          element: layerElement,
          notes: [],
        });
      }
      groups.get(key).notes.push(note);
    }
    return Array.from(groups.values()).sort((a, b) => b.priority - a.priority)[0] || null;
  }

  function anchorFor(note, layer) {
    const matches = safeQueryAll(layer.element, note.anchor?.selector || "").filter(isVisible);
    return matches[Number(note.anchor?.occurrence || 0)] || null;
  }

  function markerPoint(rect, placement) {
    const inset = 2;
    switch (placement) {
      case "top-left":
        return [rect.left + inset, rect.top + inset];
      case "bottom-left":
        return [rect.left + inset, rect.bottom - inset];
      case "bottom-right":
        return [rect.right - inset, rect.bottom - inset];
      default:
        return [rect.right - inset, rect.top + inset];
    }
  }

  function updateToolbarCollapse() {
    toolbar.classList.toggle("collapsed", toolbarCollapsed);
    toolbarToggle.setAttribute("aria-expanded", String(!toolbarCollapsed));
    const label = toolbarCollapsed ? "展开设计说明工具栏" : "收起设计说明工具栏";
    toolbarToggleIcon.textContent = toolbarCollapsed ? "注" : "‹";
    toolbarToggle.setAttribute("aria-label", label);
    toolbarToggle.title = label;
  }

  function updateToggle() {
    toolbarSwitch.setAttribute("aria-checked", String(enabled));
    addNoteButton.hidden = readOnly || !enabled;
    saveFilesButton.hidden = !offlineEntry;
    exportNoteButton.hidden = Boolean(exportPayload);
    modeLabel.hidden = !readOnly;
    addNoteButton.classList.toggle("active", picking);
    addNoteButton.textContent = picking ? "取消新增" : "＋ 新增";
  }

  async function persistNote(note, changes = {}) {
    if (offlineEntry) {
      Object.assign(note, {
        title: changes.title ?? note.title,
        bodyHtml: changes.bodyHtml ?? note.bodyHtml,
        anchor: changes.anchor ?? note.anchor,
        updatedAt: changes.updatedAt ?? new Date().toISOString(),
      });
      await persistOfflineChanges();
      return note;
    }
    const response = await fetch(`${apiBase}/api/notes/${encodeURIComponent(note.id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: changes.title ?? note.title,
        bodyHtml: changes.bodyHtml ?? note.bodyHtml,
        anchor: changes.anchor ?? note.anchor,
        updatedAt: changes.updatedAt ?? new Date().toISOString(),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || response.statusText);
    Object.assign(note, result);
    return result;
  }

  function createMarker(note) {
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "marker";
    marker.textContent = String(note.number);
    marker.title = note.title;
    marker.setAttribute("aria-label", `${note.number}. ${note.title}`);
    marker.addEventListener("click", () => {
      if (marker.__suppressClick) return;
      activeNoteId = activeNoteId === note.id ? null : note.id;
      render();
    });
    marker.addEventListener("pointerdown", (event) => {
      if (readOnly || event.button !== 0 || picking) return;
      const startX = event.clientX;
      const startY = event.clientY;
      const startLeft = Number.parseFloat(marker.style.left || "0");
      const startTop = Number.parseFloat(marker.style.top || "0");
      const startOffsetX = Number(note.anchor?.offsetX || 0);
      const startOffsetY = Number(note.anchor?.offsetY || 0);
      let moved = false;
      marker.setPointerCapture?.(event.pointerId);

      const move = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        if (!moved && Math.hypot(deltaX, deltaY) < 4) return;
        moved = true;
        marker.classList.add("dragging");
        marker.style.left = `${Math.round(startLeft + deltaX)}px`;
        marker.style.top = `${Math.round(startTop + deltaY)}px`;
        note.anchor.offsetX = Math.round(startOffsetX + deltaX);
        note.anchor.offsetY = Math.round(startOffsetY + deltaY);
        moveEvent.preventDefault();
      };
      const finish = async () => {
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", finish, true);
        window.removeEventListener("pointercancel", finish, true);
        marker.classList.remove("dragging");
        if (!moved) return;
        marker.__suppressClick = true;
        window.setTimeout(() => {
          marker.__suppressClick = false;
        }, 0);
        try {
          await persistNote(note, { anchor: note.anchor });
        } catch (error) {
          note.anchor.offsetX = startOffsetX;
          note.anchor.offsetY = startOffsetY;
          showError(`标号位置保存失败：${error.message}`);
          render();
        }
      };
      window.addEventListener("pointermove", move, true);
      window.addEventListener("pointerup", finish, true);
      window.addEventListener("pointercancel", finish, true);
    });
    markersRoot.appendChild(marker);
    markerElements.set(note.id, marker);
    return marker;
  }

  function cleanEditableHTML(source) {
    const template = document.createElement("template");
    template.innerHTML = source;
    const allowed = new Set(["P", "BR", "STRONG", "EM", "UL", "OL", "LI", "CODE", "A", "IMG"]);
    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
    const elements = [];
    while (walker.nextNode()) elements.push(walker.currentNode);
    for (const element of elements) {
      if (!allowed.has(element.tagName)) {
        element.replaceWith(...element.childNodes);
        continue;
      }
      for (const attribute of Array.from(element.attributes)) {
        const name = attribute.name.toLowerCase();
        const value = attribute.value;
        const validLink =
          element.tagName === "A" && name === "href" && /^(https?:\/\/|#)/.test(value);
        const validImage =
          element.tagName === "IMG" &&
          ((name === "src" &&
            (value.startsWith(`${apiBase}/assets/`) ||
              /^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(value))) ||
            name === "alt");
        if (!validLink && !validImage) element.removeAttribute(attribute.name);
      }
    }
    return template.innerHTML.trim();
  }

  function insertAtSelection(editor, node) {
    editor.focus();
    const selection = window.getSelection();
    let range;
    if (
      selection &&
      selection.rangeCount &&
      editor.contains(selection.anchorNode)
    ) {
      range = selection.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  async function uploadPastedImages(event, editor, hint) {
    const files = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (!files.length) return;
    event.preventDefault();
    for (const file of files) {
      hint.textContent = "正在保存图片…";
      try {
        if (offlineEntry) {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error("图片读取失败"));
            reader.readAsDataURL(file);
          });
          const image = document.createElement("img");
          image.src = dataUrl;
          image.alt = "粘贴图片";
          insertAtSelection(editor, image);
          hint.textContent = "图片已插入，点击保存同步文件";
          continue;
        }
        const response = await fetch(`${apiBase}/api/assets`, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) throw new Error((await response.json()).error || response.statusText);
        const result = await response.json();
        const image = document.createElement("img");
        image.src = result.url;
        image.alt = "粘贴图片";
        insertAtSelection(editor, image);
        hint.textContent = "图片已插入，点击保存同步文档";
      } catch (error) {
        hint.textContent = "图片保存失败";
        showError(`图片保存失败：${error.message}`);
      }
    }
  }

  function placeCard(card, anchor, note) {
    const marker = markerElements.get(note.id);
    const rect = marker?.getBoundingClientRect() || anchor.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const gap = 14;
    let left = rect.right + gap;
    if (left + cardRect.width > window.innerWidth - 12) {
      left = rect.left - cardRect.width - gap;
    }
    left = Math.max(12, Math.min(left, window.innerWidth - cardRect.width - 12));
    let top = rect.top;
    if (top + cardRect.height > window.innerHeight - 12) {
      top = window.innerHeight - cardRect.height - 12;
    }
    top = Math.max(12, top);
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
  }

  function openCard(note, anchor) {
    cardsRoot.textContent = "";
    const card = document.createElement("section");
    card.className = "card";
    card.dataset.noteId = note.id;
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", `设计说明 ${note.number}`);
    card.innerHTML = `
      <div class="card-head">
        <span class="badge"></span>
        <input class="title" aria-label="说明标题">
        <button class="close" type="button" aria-label="关闭">×</button>
      </div>
      <div class="editor" contenteditable="true" spellcheck="true"></div>
      <div class="card-foot">
        <button class="delete" type="button">删除</button>
        <span class="hint">可编辑正文，也可直接粘贴图片</span>
        <button class="save" type="button">保存</button>
      </div>
    `;
    const badge = card.querySelector(".badge");
    const title = card.querySelector(".title");
    const editor = card.querySelector(".editor");
    const close = card.querySelector(".close");
    const remove = card.querySelector(".delete");
    const save = card.querySelector(".save");
    const hint = card.querySelector(".hint");
    badge.textContent = String(note.number);
    title.value = note.title;
    editor.innerHTML = cleanEditableHTML(note.bodyHtml || "");
    close.addEventListener("click", () => {
      activeNoteId = null;
      render();
    });
    if (readOnly) {
      title.readOnly = true;
      title.tabIndex = -1;
      editor.contentEditable = "false";
      editor.spellcheck = false;
      remove.remove();
      save.remove();
      hint.textContent = "分享只读版";
      cardsRoot.appendChild(card);
      placeCard(card, anchor, note);
      return;
    }
    editor.addEventListener("paste", (event) => uploadPastedImages(event, editor, hint));
    let deleteArmed = false;
    let deleteTimer = 0;
    remove.addEventListener("click", async () => {
      if (!deleteArmed) {
        deleteArmed = true;
        remove.classList.add("confirm");
        remove.textContent = "再次点击删除";
        hint.textContent = "再次点击将永久删除此标注";
        deleteTimer = window.setTimeout(() => {
          deleteArmed = false;
          remove.classList.remove("confirm");
          remove.textContent = "删除";
          hint.textContent = "可编辑正文，也可直接粘贴图片";
        }, 3000);
        return;
      }
      window.clearTimeout(deleteTimer);
      remove.disabled = true;
      try {
        if (offlineEntry) {
          data.notes = data.notes.filter((item) => item.id !== note.id);
          renumberNotes(note.route, note.layer);
          await persistOfflineChanges();
        } else {
          const response = await fetch(`${apiBase}/api/notes/${encodeURIComponent(note.id)}`, {
            method: "DELETE",
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || response.statusText);
          data.notes = data.notes.filter((item) => item.id !== note.id);
          renumberNotes(note.route, note.layer);
        }
        activeNoteId = null;
        render();
      } catch (error) {
        remove.disabled = false;
        showError(`删除失败：${error.message}`);
      }
    });
    save.addEventListener("click", async () => {
      if (!title.value.trim()) {
        showError("说明标题不能为空");
        title.focus();
        return;
      }
      save.disabled = true;
      hint.textContent = offlineEntry ? "正在保存离线修改…" : "正在同步本地文件…";
      try {
        await persistNote(note, {
          title: title.value.trim(),
          bodyHtml: cleanEditableHTML(editor.innerHTML),
        });
        title.value = note.title;
        editor.innerHTML = cleanEditableHTML(note.bodyHtml);
        hint.textContent = offlineEntry
          ? directoryHandle
            ? "已保存，正在自动同步项目文件"
            : "已保存到浏览器；点击“保存到文件”可同步磁盘"
          : "已同步 JSON 与整体 Markdown";
      } catch (error) {
        hint.textContent = "保存失败";
        showError(`保存失败：${error.message}`);
      } finally {
        save.disabled = false;
      }
    });
    cardsRoot.appendChild(card);
    placeCard(card, anchor, note);
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
  }

  function selectorFor(element, scope) {
    if (element.id) {
      const selector = `#${cssEscape(element.id)}`;
      const matches = safeQueryAll(scope, selector);
      if (matches.includes(element)) return { selector, occurrence: matches.indexOf(element) };
    }
    const tag = element.tagName.toLowerCase();
    for (const attribute of [
      "data-testid",
      "data-id",
      "data-key",
      "data-view",
      "data-tab",
      "name",
      "aria-label",
      "placeholder",
    ]) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const selector = `${tag}[${attribute}=${JSON.stringify(value)}]`;
      const matches = safeQueryAll(scope, selector);
      if (matches.includes(element)) return { selector, occurrence: matches.indexOf(element) };
    }
    const classes = Array.from(element.classList)
      .filter((name) => !/^(active|open|selected|disabled|hidden|hover|focus|on)$/.test(name))
      .slice(0, 2);
    const selector = `${tag}${classes.map((name) => `.${cssEscape(name)}`).join("")}`;
    const matches = safeQueryAll(scope, selector);
    return {
      selector: selector || tag,
      occurrence: Math.max(0, matches.indexOf(element)),
    };
  }

  function selectorForLayer(element) {
    if (element.id) return `#${cssEscape(element.id)}`;
    const classes = Array.from(element.classList)
      .filter((name) => !/^(active|open|selected|disabled|hidden|hover|focus|on)$/.test(name))
      .slice(0, 2);
    return `${element.tagName.toLowerCase()}${classes.map((name) => `.${cssEscape(name)}`).join("")}`;
  }

  function layerForNewNote(element) {
    const current = chooseActiveLayer();
    if (current && current.element.contains(element) && current.element !== element) {
      const sample = current.notes[0];
      return {
        route: sample.route,
        layer: sample.layer,
        layerSelector: sample.layerSelector,
        layerPriority: sample.layerPriority,
        element: current.element,
      };
    }
    const modal = element.closest(
      "dialog[open], .modal-backdrop.open, [role=\"dialog\"].open, [role=\"alertdialog\"].open",
    );
    if (modal && modal !== element) {
      return {
        route: sourcePath,
        layer: modal.id || "dialog",
        layerSelector: selectorForLayer(modal),
        layerPriority: 100,
        element: modal,
      };
    }
    const view = element.closest(".view:not([hidden]), [data-page]:not([hidden])");
    if (view && view !== element) {
      return {
        route: sourcePath,
        layer: view.id || "page",
        layerSelector: selectorForLayer(view),
        layerPriority: 10,
        element: view,
      };
    }
    return {
      route: sourcePath,
      layer: "page",
      layerSelector: null,
      layerPriority: 0,
      element: document.documentElement,
    };
  }

  function stopPicking() {
    picking = false;
    pickerHighlight.classList.remove("active");
    pickerTip.classList.remove("active");
    document.documentElement.style.removeProperty("cursor");
    updateToggle();
  }

  function startPicking() {
    if (readOnly || !enabled) return;
    if (picking) {
      stopPicking();
      return;
    }
    picking = true;
    activeNoteId = null;
    cardsRoot.textContent = "";
    pickerTip.classList.add("active");
    document.documentElement.style.setProperty("cursor", "crosshair", "important");
    updateToggle();
  }

  function pickTargetFromEvent(event) {
    const target = event.target;
    if (!(target instanceof Element) || target === host || host.contains(target)) return null;
    if (target === document.documentElement || target === document.body) return null;
    return target;
  }

  function handlePickMove(event) {
    if (!picking) return;
    const target = pickTargetFromEvent(event);
    if (!target) {
      pickerHighlight.classList.remove("active");
      return;
    }
    const rect = target.getBoundingClientRect();
    pickerHighlight.classList.add("active");
    pickerHighlight.style.left = `${Math.round(rect.left)}px`;
    pickerHighlight.style.top = `${Math.round(rect.top)}px`;
    pickerHighlight.style.width = `${Math.round(rect.width)}px`;
    pickerHighlight.style.height = `${Math.round(rect.height)}px`;
  }

  async function handlePickClick(event) {
    if (!picking) return;
    const target = pickTargetFromEvent(event);
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const layer = layerForNewNote(target);
    if (target === layer.element) {
      showError("请选择当前页面或弹层内的具体元素");
      return;
    }
    const anchor = selectorFor(target, layer.element);
    const observedText = (
      target.getAttribute("aria-label") ||
      target.getAttribute("placeholder") ||
      target.textContent ||
      target.tagName
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
    stopPicking();
    try {
      if (offlineEntry) {
        renumberNotes(layer.route, layer.layer);
        const groupNumbers = data.notes
          .filter((item) => item.route === layer.route && item.layer === layer.layer)
          .map((item) => Number(item.number || 0));
        const randomId = window.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 12) || `${Date.now()}`;
        const note = {
          id: `manual-${randomId}`,
          number: Math.max(0, ...groupNumbers) + 1,
          route: layer.route,
          layer: layer.layer,
          layerSelector: layer.layerSelector,
          layerPriority: layer.layerPriority,
          anchor: {
            selector: anchor.selector,
            occurrence: anchor.occurrence,
            placement: "top-right",
            offsetX: 0,
            offsetY: 0,
          },
          title: "新建说明",
          bodyHtml: "<p>请填写该元素的设计说明。</p>",
          evidence: {
            sourceRefs: [],
            facts: [],
            userCreated: true,
            observedText,
          },
          updatedAt: new Date().toISOString(),
        };
        data.notes.push(note);
        await persistOfflineChanges();
        activeNoteId = note.id;
        activeLayerKey = "";
        render();
        return;
      }
      const response = await fetch(`${apiBase}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: layer.route,
          layer: layer.layer,
          layerSelector: layer.layerSelector,
          layerPriority: layer.layerPriority,
          anchor: {
            selector: anchor.selector,
            occurrence: anchor.occurrence,
            placement: "top-right",
          },
          observedText,
          updatedAt: new Date().toISOString(),
        }),
      });
      const note = await response.json();
      if (!response.ok) throw new Error(note.error || response.statusText);
      data.notes.push(note);
      activeNoteId = note.id;
      activeLayerKey = "";
      render();
    } catch (error) {
      showError(`新增标注失败：${error.message}`);
    }
  }

  function render() {
    renderQueued = false;
    renumberAllNotes();
    updateToggle();
    if (!enabled) {
      if (picking) stopPicking();
      activeNoteId = null;
      markerElements.forEach((element) => element.remove());
      markerElements.clear();
      cardsRoot.textContent = "";
      activeLayerKey = "";
      return;
    }

    const layer = chooseActiveLayer();
    if (!layer) {
      markerElements.forEach((element) => element.remove());
      markerElements.clear();
      cardsRoot.textContent = "";
      activeNoteId = null;
      activeLayerKey = "";
      return;
    }
    if (activeLayerKey && activeLayerKey !== layer.key) activeNoteId = null;
    activeLayerKey = layer.key;

    const visibleNotes = [];
    for (const note of layer.notes) {
      const anchor = anchorFor(note, layer);
      if (anchor) visibleNotes.push({ note, anchor });
    }
    const visibleIds = new Set(visibleNotes.map(({ note }) => note.id));
    markerElements.forEach((element, id) => {
      if (!visibleIds.has(id)) {
        element.remove();
        markerElements.delete(id);
      }
    });

    let activePair = null;
    for (const pair of visibleNotes) {
      const { note, anchor } = pair;
      const marker = markerElements.get(note.id) || createMarker(note);
      marker.textContent = String(note.number);
      marker.title = note.title;
      marker.setAttribute("aria-expanded", String(activeNoteId === note.id));
      const [left, top] = markerPoint(
        anchor.getBoundingClientRect(),
        note.anchor?.placement || "top-right",
      );
      marker.style.left = `${Math.round(left + Number(note.anchor?.offsetX || 0))}px`;
      marker.style.top = `${Math.round(top + Number(note.anchor?.offsetY || 0))}px`;
      if (activeNoteId === note.id) activePair = pair;
    }
    if (activePair) {
      const currentCard = cardsRoot.querySelector(".card");
      if (currentCard?.dataset.noteId === activePair.note.id) {
        placeCard(currentCard, activePair.anchor, activePair.note);
      } else {
        openCard(activePair.note, activePair.anchor);
      }
    } else cardsRoot.textContent = "";
  }

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(render);
  }

  toolbarToggle.addEventListener("click", () => {
    toolbarCollapsed = !toolbarCollapsed;
    updateToolbarCollapse();
  });
  toolbarSwitch.addEventListener("click", () => {
    enabled = !enabled;
    if (!enabled && picking) stopPicking();
    if (!readOnly) {
      try {
        localStorage.setItem(enabledStorageKey, String(enabled));
      } catch {
        // Standalone files or strict privacy settings may disable storage.
      }
    }
    render();
  });
  addNoteButton.addEventListener("click", startPicking);
  saveFilesButton.addEventListener("click", async () => {
    saveFilesButton.disabled = true;
    const originalLabel = saveFilesButton.textContent;
    saveFilesButton.textContent = "正在保存…";
    try {
      if (directoryHandle && (await saveToProjectFolder({ requestPermission: true }))) return;
      if (typeof window.showDirectoryPicker !== "function") {
        downloadProjectFiles();
        return;
      }
      directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      if (!(await hasWritePermission(directoryHandle, true))) {
        throw new Error("未获得文件夹写入权限");
      }
      try {
        await offlineStorePut("handles", storageKey, directoryHandle);
      } catch {
        // Some file contexts cannot persist handles; the current session still can.
      }
      await writeProjectFiles(directoryHandle);
      showNotice("文件夹已授权；本次及后续编辑会自动同步项目文件。", true);
    } catch (error) {
      if (error?.name !== "AbortError") {
        if (error?.name === "SecurityError" || error?.name === "NotSupportedError") {
          downloadProjectFiles();
        } else {
          showError(`保存到文件失败：${error.message}`);
        }
      }
    } finally {
      saveFilesButton.disabled = false;
      saveFilesButton.textContent = originalLabel;
    }
  });
  exportNoteButton.addEventListener("click", async () => {
    if (offlineEntry) {
      exportNoteButton.disabled = true;
      const originalLabel = exportNoteButton.textContent;
      exportNoteButton.textContent = "正在导出…";
      try {
        const sourceParts = sourceRelativePath().split("/").filter(Boolean);
        const sourceName = sourceParts.pop() || "index.html";
        const extensionMatch = sourceName.match(/(\.html?)$/i);
        const extension = extensionMatch?.[1] || ".html";
        const stem = extensionMatch ? sourceName.slice(0, -extension.length) : sourceName;
        let sequence = shareSequence;
        if (directoryHandle && (await hasWritePermission(directoryHandle, false))) {
          await validateProjectFolder(directoryHandle);
          const shareDirectory = await directoryAt(directoryHandle, sourceParts, false);
          const pattern = new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-带设计说明-分享版(\\d+)\\.html?$`, "i");
          for await (const [name] of shareDirectory.entries()) {
            const match = name.match(pattern);
            if (match) sequence = Math.max(sequence, Number.parseInt(match[1], 10) || 0);
          }
          sequence += 1;
          const filename = `${stem}-带设计说明-分享版${sequence}${extension}`;
          const sharePath = [...sourceParts, filename].join("/");
          await writeTextFile(directoryHandle, sharePath, buildOfflineShareHtml(), "text/html;charset=utf-8");
          shareSequence = sequence;
          try { localStorage.setItem(`${storageKey}:share-sequence`, String(sequence)); } catch {}
          showNotice(`已导出：${filename}`, true);
        } else {
          sequence += 1;
          const filename = `${stem}-带设计说明-分享版${sequence}${extension}`;
          downloadText(filename, buildOfflineShareHtml(), "text/html;charset=utf-8");
          shareSequence = sequence;
          try { localStorage.setItem(`${storageKey}:share-sequence`, String(sequence)); } catch {}
          showNotice(`已下载：${filename}`, true);
        }
      } catch (error) {
        showError(`导出失败：${error.message}`);
      } finally {
        exportNoteButton.disabled = false;
        exportNoteButton.textContent = originalLabel;
      }
      return;
    }
    exportNoteButton.disabled = true;
    const originalLabel = exportNoteButton.textContent;
    exportNoteButton.textContent = "正在导出…";
    try {
      const response = await fetch(`${apiBase}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePath }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || response.statusText);
      showNotice(`已导出：${result.filename}`, true);
    } catch (error) {
      showError(`导出失败：${error.message}`);
    } finally {
      exportNoteButton.disabled = false;
      exportNoteButton.textContent = originalLabel;
    }
  });
  document.addEventListener("mousemove", handlePickMove, true);
  document.addEventListener("click", handlePickClick, true);
  document.addEventListener(
    "keydown",
    (event) => {
      if (!picking || event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      stopPicking();
    },
    true,
  );
  window.addEventListener("scroll", scheduleRender, true);
  window.addEventListener("resize", scheduleRender);
  window.addEventListener("popstate", scheduleRender);
  new MutationObserver(scheduleRender).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden", "open", "aria-hidden"],
  });
  window.setInterval(scheduleRender, 600);

  updateToolbarCollapse();
  updateToggle();
  if (readOnly) {
    if (!Array.isArray(data.notes)) {
      showError("内嵌设计说明缺少 notes 数组");
    } else {
      render();
    }
  } else if (offlineEntry) {
    if (!Array.isArray(data.notes)) {
      showError("内嵌设计说明缺少 notes 数组");
    } else {
      render();
      loadOfflineState()
        .then(async () => {
          render();
          const canSync = directoryHandle && (await hasWritePermission(directoryHandle, false));
          showNotice(
            canSync
              ? "编辑已就绪，修改会自动同步项目文件。"
              : "编辑已就绪；首次点击“保存到文件”可授权自动同步。",
            true,
          );
        })
        .catch((error) => showError(`离线数据加载失败：${error.message}`));
    }
  } else {
    fetch(`${apiBase}/api/annotations`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || response.statusText);
        if (!Array.isArray(payload.notes)) throw new Error("annotations.json 缺少 notes 数组");
        data = payload;
        render();
      })
      .catch((error) => showError(`设计说明加载失败：${error.message}`));
  }
})();
