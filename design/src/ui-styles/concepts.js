document.querySelectorAll('[data-menu]').forEach(button => {
  button.addEventListener('click', () => document.querySelector('.style-popover')?.classList.toggle('show'));
});

document.querySelectorAll('[data-play]').forEach(button => {
  button.addEventListener('click', () => {
    const playing = document.body.classList.toggle('is-playing');
    if (button.classList.contains('poster-play')) button.innerHTML = playing ? '<span>Ⅱ</span> PAUSE THE MOVEMENT' : '<span>▶</span> PLAY THE MOVEMENT';
    else if (button.classList.contains('kit-play')) button.textContent = playing ? 'PAUSE' : 'PLAY';
    else button.textContent = playing ? 'Ⅱ' : '▶';
  });
});

document.querySelectorAll('[data-restart]').forEach(button => button.addEventListener('click', () => {
  document.body.classList.remove('is-playing');
  document.querySelectorAll('[data-play]').forEach(play => play.textContent = play.classList.contains('kit-play') ? 'PLAY' : '▶');
}));

document.querySelectorAll('.move-panel button, .recipe-options button, .poster-moves article').forEach(item => item.addEventListener('click', () => {
  [...item.parentElement.children].forEach(sibling => sibling.classList.remove('active', 'selected'));
  item.classList.add(item.tagName === 'ARTICLE' ? 'selected' : 'active');
}));
