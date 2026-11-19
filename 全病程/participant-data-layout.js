/* Keep the entry fields scrollable and their actions outside the scroll area. */
(() => {
 const workspace = document.querySelector('#data-entry-workspace');
 const form = workspace?.querySelector('.data-form-panel');
 if (!form) return;
 const fields = document.createElement('div');
 fields.className = 'profile-data-fields';
 const rows = [...form.querySelectorAll(':scope > .data-form-row')];
 rows[0]?.before(fields);
 fields.append(...rows);
 const context = document.createElement('p');
 context.className = 'profile-data-context';
 form.querySelector('.data-form-head').after(context);
 const updateContext = () => {
  const selected = workspace.querySelector('.data-crf-card[aria-selected=true]');
  const head = selected?.closest('.data-cycle-group')?.querySelector('.data-cycle-head');
  context.textContent = head?.textContent.replace(/\d+\/\d+\s*$/, '').trim() || '选择左侧访视与 CRF，录入对应研究数据';
 };
 window.addEventListener('journey-v2-clinical-crf-select', updateContext);
 updateContext();
})();
