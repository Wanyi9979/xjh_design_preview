// 方案版本归属于项目；参与者首次绑定后固定沿用，访视独立保存版本快照。
(() => {
  const storageKey = 'journey-v2-visit-protocol-bindings-v1';
  let records; try { records = JSON.parse(localStorage.getItem(storageKey)); } catch {}
  if (!records || !records.people || !records.visits) records = { people: {}, visits: {} };
  const persist = () => { try { localStorage.setItem(storageKey, JSON.stringify(records)); } catch {} };
  const catalog = {};
  ['CT-2026-001','HX-LC-II-06','HX-BC-III-02','HX-GI-III-01'].forEach(project => {
    catalog[project] = [
      { version:'V1.0', cycleDays:14, label:'14天周期', visits:['筛选期','第1周期第1天（C1D1）','第1周期第15天（C1D15）'] },
      { version:'V2.0', cycleDays:21, label:'21天周期', visits:['筛选期','第1周期第1天（C1D1）','第2周期第1天（C2D1）'] }
    ];
  });
  // 仅为现有演示参与者补齐首次归属；不以最新发布版本推断或覆盖归属。
  const v2People = new Set(['CT-2026-001:S003','HX-LC-II-06:S101','HX-BC-III-02:S102','HX-GI-III-01:S103','HX-GI-III-01:S012']);
  function bind(project, id, explicit) {
    id = window.demoParticipantIdentity?.canonicalId(id) || id;
    const key = JSON.stringify([project,id]);
    const legacyKey = JSON.stringify([project, window.demoParticipantIdentity?.legacyId(id) || id]);
    if (!records.people[key]) { records.people[key] = records.people[legacyKey] || explicit || (v2People.has(project+':'+id) ? 'V2.0' : 'V1.0'); persist(); }
    return records.people[key];
  }
  function stamp(visit) {
    const key = JSON.stringify([visit.projectId,visit.id]);
    if (!records.visits[key]) { records.visits[key] = visit.protocolVersion || bind(visit.projectId,visit.participantId); persist(); }
    return { ...visit, protocolVersion:records.visits[key] };
  }
  const list = project => catalog[project] || [];
  const get = (project,version) => list(project).find(item => item.version === version);
  window.visitProtocols = { list, get, bind, stamp };
})();
