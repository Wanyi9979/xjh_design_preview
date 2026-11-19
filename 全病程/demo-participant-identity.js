(() => {
  const sampleNames = [
    'ZHY', 'HJN', 'JYM', 'FJ', 'HQL', 'XWN', 'SJN', 'ZXR', 'QY', 'YHM', 'SY', 'LQY',
    'CY', 'ZMR', 'SM', 'PJL', 'GW', 'FHY', 'PY', 'LMX', 'WJ', 'MZH', 'ML'
  ];
  const legacyDirectoryIds = {
    SYS0171: 'S101', SCR0204: 'S102', SYS0148: 'S103', SYS0091: 'S104',
    SYS0193: 'S105', SYS0126: 'S106', SYS0109: 'S107'
  };
  const sampleIds = sampleNames.map((name, index) => ({
    name,
    id: 'S' + String(index + 19).padStart(3, '0'),
    legacyId: 'DEMO' + String(index + 1).padStart(3, '0')
  }));
  const aliases = {
    ...legacyDirectoryIds,
    ...Object.fromEntries(sampleIds.map(person => [person.legacyId, person.id]))
  };
  const names = {
    S001:'ZXX', S002:'LXX', S003:'WX', S004:'CXX', S006:'ZXH', S008:'CXM',
    S009:'LX', S010:'SXX', S012:'ZX', S013:'WXX', S014:'QXX', S015:'WXM',
    S016:'LY', S017:'TXX', S018:'QY', S101:'LJX', S102:'WY', S103:'ZQ',
    S104:'CY', S105:'ZHY', S106:'LY', S107:'SY',
    ...Object.fromEntries(sampleIds.map(person => [person.id, person.name]))
  };
  const legacyIds = Object.fromEntries(Object.entries(aliases).map(([oldId, id]) => [id, oldId]));
  const canonicalId = id => aliases[id] || id;
  const name = (id, fallback) => {
    if (fallback && !/[*＊]/.test(fallback)) return fallback;
    return names[canonicalId(id)] || fallback;
  };
  window.demoParticipantIdentity = { canonicalId, name, sampleIds, legacyId: id => legacyIds[id] || id };
})();
