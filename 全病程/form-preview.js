(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const choice = (title, options, required = true) => ({title, options, required});
  const text = (title, required = false, type = 'text') => ({title, required, type});
  const schemas = {
    '基线健康评估表': [text('评估日期',true,'date'),choice('目前总体健康状况',['很好','较好','一般','较差','很差']),choice('目前是否有不适症状',['无','有']),text('不适症状及持续时间'),text('既往疾病及目前用药情况'),text('其他补充说明')],
    '生活质量评估表': [text('评估日期',true,'date'),choice('过去一周日常活动是否受限',['没有','轻度','中度','重度']),choice('过去一周疲乏程度',['没有','轻度','中度','重度']),choice('过去一周睡眠情况',['很好','较好','一般','较差','很差']),choice('目前总体生活质量',['很好','较好','一般','较差','很差']),text('其他感受或补充说明')],
    '每日用药日记表': [text('用药日期',true,'date'),text('药品名称',true),text('本次用药剂量',true),text('用药时间',true,'time'),choice('是否按计划用药',['是','否']),text('漏服、调整用药或不适情况')],
    '常规治疗记录表': [text('治疗日期',true,'date'),text('治疗名称',true),text('治疗方案及剂量',true),choice('治疗是否按计划完成',['是','否']),text('治疗期间不适及处理情况'),text('其他补充说明')],
    '安全性随访问卷': [text('记录日期',true,'date'),choice('本次随访期间是否出现不适或不良事件',['否','是']),text('不适症状或事件描述'),text('症状开始日期',false,'date'),choice('症状对日常生活的影响',['无影响','轻度影响','中度影响','重度影响']),choice('是否因不适就医或调整用药',['否','是']),text('采取的处理措施及目前情况')],
    '用药后呕吐症状采集表': [text('记录日期',true,'date'),choice('用药后是否出现恶心或呕吐',['否','是']),text('呕吐次数'),text('症状持续时间'),choice('是否影响饮食或日常活动',['无影响','轻度影响','中度影响','重度影响']),text('采取的处理措施')]
  };
  let dialog, opener;
  function getDialog() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'clinical-form-preview';
    dialog.setAttribute('aria-labelledby','clinical-form-preview-title');
    dialog.innerHTML = '<header><h2 id="clinical-form-preview-title">表单预览</h2><button type="button" data-form-preview-close aria-label="关闭表单预览">×</button></header><div class="clinical-form-preview-body"></div><footer><button type="button" data-form-preview-close>关闭</button></footer>';
    document.body.append(dialog);
    dialog.addEventListener('click', event => { if (event.target.closest('[data-form-preview-close]') || event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { if (opener?.isConnected) opener.focus({preventScroll:true}); });
    return dialog;
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-form-preview]');
    if (!button) return;
    const name = button.dataset.formPreview;
    const fields = schemas[name] || [text('记录日期',true,'date'),choice('本次是否存在相关症状',['无','有']),text('症状及具体情况'),text('其他补充说明')];
    opener = button;
    const preview = getDialog();
    preview.querySelector('.clinical-form-preview-body').innerHTML = `<div class="clinical-form-preview-heading"><h3>${esc(name)}</h3><p>表单内容预览 · 共 ${fields.length} 项</p></div>${fields.map((field,index) => `<section class="clinical-form-question"><h4>${field.required?'<span class="clinical-form-required">*</span>':''}${index+1}. ${esc(field.title)}</h4>${field.options ? `<div class="clinical-form-options">${field.options.map(option => `<label><input type="radio" disabled name="preview-${index}">${esc(option)}</label>`).join('')}</div>` : field.type === 'date' || field.type === 'time' ? `<input type="${field.type}" disabled aria-label="${esc(field.title)}">` : `<textarea disabled rows="2" aria-label="${esc(field.title)}" placeholder="请填写${esc(field.title)}"></textarea>`}</section>`).join('')}`;
    window.showQuietDialog(preview);
    preview.querySelector('.clinical-form-preview-body').scrollTop = 0;
  });
})();
