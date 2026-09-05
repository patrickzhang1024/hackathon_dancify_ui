document.querySelectorAll('[data-menu]').forEach(button => {
  button.addEventListener('click', () => document.querySelector('.style-popover')?.classList.toggle('show'));
});

function renderPosterLanguage(language) {
  const isChinese = language === 'zh';
  document.documentElement.lang = isChinese ? 'zh-CN' : 'en';
  document.title = isChinese ? 'Dancify · 动态海报' : 'Dancify · Motion Poster';
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const value = element.dataset[isChinese ? 'zh' : 'en'];
    if (value) element.innerHTML = value;
  });
  const play = document.querySelector('.poster-play');
  if (play) {
    const playing = document.body.classList.contains('is-playing');
    play.innerHTML = `<span>${playing ? 'Ⅱ' : '▶'}</span> ${playing ? (isChinese ? '暂停这段舞蹈' : 'PAUSE THE MOVEMENT') : (isChinese ? play.dataset.playZh : play.dataset.playEn)}`;
  }
  const toggle = document.querySelector('[data-lang-toggle]');
  if (toggle) {
    toggle.classList.toggle('is-zh', isChinese);
    toggle.setAttribute('aria-label', isChinese ? 'Switch to English' : '切换到中文');
  }
  localStorage.setItem('dancify-language', language);
}

const languageToggle = document.querySelector('[data-lang-toggle]');
if (languageToggle) {
  languageToggle.addEventListener('click', () => {
    const next = document.documentElement.lang === 'zh-CN' ? 'en' : 'zh';
    renderPosterLanguage(next);
  });
  renderPosterLanguage(localStorage.getItem('dancify-language') || 'en');
}

document.querySelectorAll('[data-play]').forEach(button => {
  button.addEventListener('click', () => {
    const playing = document.body.classList.toggle('is-playing');
    if (button.classList.contains('poster-play')) {
      const isChinese = document.documentElement.lang === 'zh-CN';
      button.innerHTML = playing ? `<span>Ⅱ</span> ${isChinese ? '暂停这段舞蹈' : 'PAUSE THE MOVEMENT'}` : `<span>▶</span> ${isChinese ? button.dataset.playZh : button.dataset.playEn}`;
    }
    else if (button.classList.contains('kit-play')) button.textContent = playing ? 'PAUSE' : 'PLAY';
    else button.textContent = playing ? 'Ⅱ' : '▶';
  });
});

document.querySelectorAll('[data-restart]').forEach(button => button.addEventListener('click', () => {
  document.body.classList.remove('is-playing');
  document.querySelectorAll('[data-play]').forEach(play => {
    if (play.classList.contains('poster-play')) {
      const isChinese = document.documentElement.lang === 'zh-CN';
      play.innerHTML = `<span>▶</span> ${isChinese ? play.dataset.playZh : play.dataset.playEn}`;
    } else play.textContent = play.classList.contains('kit-play') ? 'PLAY' : '▶';
  });
}));

document.querySelectorAll('.move-panel button, .recipe-options button, .poster-moves article').forEach(item => item.addEventListener('click', () => {
  [...item.parentElement.children].forEach(sibling => sibling.classList.remove('active', 'selected'));
  item.classList.add(item.tagName === 'ARTICLE' ? 'selected' : 'active');
}));
