(() => {
  const states = new Map();
  let footer, rerender, state;
  function initialize() {
    footer = document.querySelector('footer.pagination');
    footer.classList.add('directory-pagination');
    footer.setAttribute('aria-label','列表分页');
    footer.addEventListener('click', event => {
      const button = event.target.closest('[data-directory-page]');
      if (!button || button.disabled) return;
      state.page = Number(button.dataset.directoryPage);
      rerender();
      footer.querySelector('[aria-current="page"]')?.focus({preventScroll:true});
    });
    footer.addEventListener('change', event => {
      if (!event.target.matches('[data-directory-page-size]')) return;
      state.size = Number(event.target.value); state.page = 1;
      rerender();
      footer.querySelector('select').focus({preventScroll:true});
    });
  }
  window.directoryPagination = {
    slice(items,key,render,unit='条') {
      if (!footer) initialize();
      if (!states.has(key)) states.set(key,{page:1,size:5,signature:''});
      state = states.get(key); rerender = render;
      const signature = JSON.stringify([...document.querySelectorAll('.filters input,.filters select')].map(input=>input.value));
      if (state.signature !== signature) { state.page = 1; state.signature = signature; }
      const pages = Math.max(1,Math.ceil(items.length / state.size));
      state.page = Math.min(state.page,pages);
      const first = Math.max(1,state.page - 2), last = Math.min(pages,first + 4);
      const pageButton = page => `<button type="button" data-directory-page="${page}" aria-label="第${page}页" ${page===state.page?'aria-current="page"':''}>${page}</button>`;
      let buttons = first>1 ? pageButton(1)+(first>2?'<span>…</span>':'') : '';
      for(let page=first;page<=last;page++) buttons += pageButton(page);
      if(last<pages) buttons += (last<pages-1?'<span>…</span>':'')+pageButton(pages);
      footer.innerHTML = `<span id="count" class="directory-page-total" aria-live="polite">共 ${items.length} ${unit}</span><select data-directory-page-size aria-label="每页条数">${[5,10,20,50].map(size=>`<option value="${size}" ${size===state.size?'selected':''}>${size} 条/页</option>`).join('')}</select><div class="directory-page-buttons"><button type="button" data-directory-page="${state.page-1}" aria-label="上一页" ${state.page===1?'disabled':''}>‹</button>${buttons}<button type="button" data-directory-page="${state.page+1}" aria-label="下一页" ${state.page===pages?'disabled':''}>›</button></div>`;
      return items.slice((state.page-1)*state.size,state.page*state.size);
    }
  };
})();
