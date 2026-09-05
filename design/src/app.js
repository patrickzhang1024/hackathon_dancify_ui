const state = { file: null, playing: false, progress: 37, timer: null };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const toast = (message) => { const el = $('.toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); };

function showView(name) {
  $$('.view').forEach(view => view.classList.toggle('active', view.dataset.view === name));
  $$('.nav button').forEach(button => button.classList.toggle('active', button.dataset.target === name));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setFile(file) {
  if (!file) return;
  if (!file.type.startsWith('audio/')) { toast('请选择音频文件'); return; }
  state.file = file;
  $('.file-ready').classList.add('visible');
  $('.file-name').textContent = file.name;
  $('.file-size').textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB · 已准备分析`;
  $('.start-analysis').disabled = false;
  toast('音乐已载入，可以开始分析');
}

function runAnalysis() {
  if (!state.file) { toast('请先上传一首音乐'); return; }
  const overlay = $('.progress-overlay');
  const progress = $('.progress-track i');
  const label = $('.progress-step');
  overlay.classList.add('show');
  const steps = ['正在解码音频…', '正在识别节奏与 BPM…', '正在分析情绪和音色…', '正在寻找音乐段落…', '报告已准备完成'];
  let index = 0;
  const tick = () => {
    progress.style.width = `${Math.min(100, (index + 1) * 20)}%`;
    label.textContent = steps[index];
    if (index < steps.length - 1) { index += 1; setTimeout(tick, 560); } else { setTimeout(() => { overlay.classList.remove('show'); showView('report'); toast('分析完成：你的音乐画像已生成'); }, 650); }
  };
  tick();
}

function togglePlayback() {
  state.playing = !state.playing;
  $('.play').textContent = state.playing ? 'Ⅱ' : '▶';
  $('.live').textContent = state.playing ? '● LIVE / SYNCED' : '● READY / PAUSED';
  $('.dancer').style.animationPlayState = state.playing ? 'running' : 'paused';
  if (state.playing) {
    state.timer = setInterval(() => { state.progress = state.progress >= 98 ? 0 : state.progress + .45; $('.transport-bar i').style.width = `${state.progress}%`; $('.current-time').textContent = `0${Math.floor(state.progress / 10)}:${String(Math.floor((state.progress % 10) * 6)).padStart(2, '0')}`; }, 100);
  } else clearInterval(state.timer);
}

function bind() {
  $$('.nav button').forEach(button => button.addEventListener('click', () => showView(button.dataset.target)));
  $('#file-input').addEventListener('change', event => setFile(event.target.files[0]));
  $('.start-analysis').addEventListener('click', runAnalysis);
  $('.upload-btn').addEventListener('click', () => $('#file-input').click());
  $('.dropzone').addEventListener('dragover', event => { event.preventDefault(); $('.dropzone').classList.add('dragging'); });
  $('.dropzone').addEventListener('dragleave', () => $('.dropzone').classList.remove('dragging'));
  $('.dropzone').addEventListener('drop', event => { event.preventDefault(); $('.dropzone').classList.remove('dragging'); setFile(event.dataTransfer.files[0]); });
  $('.generate-btn').addEventListener('click', () => { showView('directions'); toast('已根据音乐画像生成 3 个方向'); });
  $('.to-player').addEventListener('click', () => showView('player'));
  $('.play').addEventListener('click', togglePlayback);
  $('.restart').addEventListener('click', () => { state.progress = 0; $('.transport-bar i').style.width = '0%'; toast('已回到开头'); });
  $('.transport-bar').addEventListener('click', event => { const rect = event.currentTarget.getBoundingClientRect(); state.progress = ((event.clientX - rect.left) / rect.width) * 100; $('.transport-bar i').style.width = `${state.progress}%`; });
  $$('.direction').forEach(card => card.addEventListener('click', () => { $$('.direction').forEach(item => item.classList.remove('selected')); card.classList.add('selected'); }));
  $$('.version-btn').forEach(button => button.addEventListener('click', () => { $$('.version-btn').forEach(item => item.classList.remove('active')); button.classList.add('active'); $('.action-title').textContent = button.dataset.name; toast(`${button.dataset.name} 已载入`); }));
  $$('.segment').forEach(button => button.addEventListener('click', () => { $$('.segment').forEach(item => item.classList.remove('active')); button.classList.add('active'); $('.current-section').textContent = button.dataset.section; }));
  $('.close-progress').addEventListener('click', () => $('.progress-overlay').classList.remove('show'));
}

bind();
