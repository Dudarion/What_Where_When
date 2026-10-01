'use strict';

// ---------------------------------------------------------------------------
// Sounds
// ---------------------------------------------------------------------------
// Every sound is downloaded and decoded into memory up front and played through
// Web Audio: playback starts within milliseconds of a tap, while an <audio>
// element first has to seek and (re)buffer.
const SOUND_FILES = {
  spin: 'sounds/spin.mp3',
  gong: 'sounds/gong.wav',
  blackbox: 'sounds/box.mp3',
  fanfare: 'sounds/fanfare.mp3',
  finish: 'sounds/pobediteli.mp3',
  timeOut: 'sounds/time_out.mp3',
  tenSec: 'sounds/10_sec.mp3',
  correct: 'sounds/correct.mp3',
  wrong: 'sounds/wrong.mp3',
  pause: 'sounds/pause.mp3',
};
const FADE_SECONDS = 3;

// iOS: keep playing when the ring/silent switch is on, as <audio> elements do
if (navigator.audioSession) navigator.audioSession.type = 'playback';

const audioCtx = window.AudioContext ? new AudioContext() : null;
const sounds = {};
const voices = new Set(); // sounds that are playing right now
let generation = 0;       // bumped on stop/mute to cancel plays still waiting for their file

for (const [name, url] of Object.entries(SOUND_FILES)) {
  sounds[name] = loadSound(url);
}

function loadSound(url) {
  const sound = { buffer: null, element: null, ready: null };
  sound.ready = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      return response.arrayBuffer();
    })
    .then((data) => audioCtx.decodeAudioData(data))
    .then((buffer) => { sound.buffer = buffer; })
    .catch(() => {
      // No Web Audio, or fetch is blocked (page opened as file://): fall back to <audio>
      sound.element = new Audio(url);
      sound.element.preload = 'auto';
    });
  return sound;
}

function playSound(name) {
  const sound = sounds[name];
  if (sound.buffer || sound.element) {
    voices.add(sound.buffer ? bufferVoice(sound.buffer) : elementVoice(sound.element));
    return;
  }
  // Still loading: play as soon as it's ready, unless sounds were stopped or muted since
  const playGeneration = generation;
  sound.ready.then(() => {
    if (playGeneration === generation) playSound(name);
  });
}

function stopAllSounds() {
  generation++;
  voices.forEach((voice) => voice.stop());
}

function fadeAllSounds() {
  generation++;
  voices.forEach((voice) => voice.fadeOut(FADE_SECONDS));
}

function bufferVoice(buffer) {
  const source = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(audioCtx.destination);

  let fading = false;
  const voice = {
    stop() {
      source.onended = null;
      try { source.stop(); } catch { /* already stopped */ }
      finish();
    },
    fadeOut(seconds) {
      if (fading) return;
      fading = true;
      const now = audioCtx.currentTime;
      gain.gain.setValueAtTime(1, now);
      gain.gain.linearRampToValueAtTime(0, now + seconds);
      source.stop(now + seconds);
    },
  };
  function finish() {
    voices.delete(voice);
    source.disconnect();
    gain.disconnect();
  }
  source.onended = finish;
  source.start();
  return voice;
}

// Fallback voice for a plain <audio> element
function elementVoice(element) {
  // One element can't play twice at once: restart it
  voices.forEach((voice) => { if (voice.element === element) voice.stop(); });

  let fadeTimer = null;
  const voice = {
    element,
    stop() {
      clearInterval(fadeTimer);
      element.onended = null;
      element.pause();
      element.currentTime = 0;
      element.volume = 1;
      voices.delete(voice);
    },
    fadeOut(seconds) {
      if (fadeTimer) return;
      const start = performance.now();
      // Timed, so it ends even on iOS, where element.volume is read-only
      fadeTimer = setInterval(() => {
        const volume = 1 - (performance.now() - start) / (seconds * 1000);
        if (volume > 0) element.volume = volume;
        else voice.stop();
      }, 50);
    },
  };
  element.onended = () => voice.stop();
  element.play().catch(() => {});
  return voice;
}

// Browsers keep audio locked until the user interacts with the page. On touch
// screens the unlock happens when the finger is lifted, so the very first tap
// sounds on release; every tap after that sounds immediately on touch.
function onUserGesture() {
  if (audioCtx && audioCtx.state !== 'running') audioCtx.resume().catch(() => {});
  keepScreenOn();
}
for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
  window.addEventListener(type, onUserGesture, true);
}

// ---------------------------------------------------------------------------
// Wheel
// ---------------------------------------------------------------------------
const topArea = document.getElementById('top');
const wheelBox = document.getElementById('wheel');
const canvas = document.getElementById('spinner');
const ctx = canvas.getContext('2d');
const arrow = document.getElementById('arrow');

const SECTORS = 12;
const SECTOR_ANGLE = (2 * Math.PI) / SECTORS;
const BLITZ_SECTOR = 11;
const SPIN_TURNS = 18;
const SPIN_DURATION = 15000; // ms, the length of spin.mp3
const SPIN_EASING = 'cubic-bezier(0.333, 0.667, 0.667, 1)'; // quadratic ease-out: fast start, smooth stop

const playedSectors = new Set();
let spinning = false;
let lastLandedSector = null;
let canvasPixels = 0;

// Resize the wheel responsively, with the canvas at full device resolution so it stays sharp
function resizeWheel() {
  const size = Math.floor(Math.min(topArea.clientWidth, topArea.clientHeight));
  if (size <= 0) return;
  const pixels = Math.round(size * (window.devicePixelRatio || 1));
  wheelBox.style.width = wheelBox.style.height = `${size}px`;
  if (pixels === canvasPixels) return;
  canvasPixels = pixels;
  canvas.width = canvas.height = pixels;
  drawWheel();
}
if (window.ResizeObserver) {
  new ResizeObserver(resizeWheel).observe(topArea);
} else {
  window.addEventListener('resize', resizeWheel);
  resizeWheel();
}

// Sectors, labels and rim decorations. Redrawn only on resize or when a sector
// is played; the pointer is a separate SVG layer on top (see spin()).
function drawWheel() {
  const radius = canvas.width / 2;
  const lineWidth = radius * 0.015;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(radius, radius);

  // Sector backgrounds and borders; the 12th sector (index 11) is green, others are grey.
  // Inset by half a line so the outer border isn't clipped by the canvas edge.
  ctx.strokeStyle = '#000';
  ctx.lineWidth = lineWidth;
  for (let i = 0; i < SECTORS; i++) {
    const startAngle = -Math.PI / 2 + SECTOR_ANGLE * i;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - lineWidth / 2, startAngle, startAngle + SECTOR_ANGLE);
    ctx.closePath();
    ctx.fillStyle = i === BLITZ_SECTOR ? 'green' : '#aaa';
    ctx.fill();
    ctx.stroke();
  }

  // Labels: the sector number in black, the blitz label in white; played sectors stay blank
  ctx.font = `${radius * 0.1}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < SECTORS; i++) {
    if (playedSectors.has(i)) continue;
    const midAngle = -Math.PI / 2 + SECTOR_ANGLE * (i + 0.5);
    const x = Math.cos(midAngle) * radius * 0.82;
    const y = Math.sin(midAngle) * radius * 0.82;
    ctx.fillStyle = i === BLITZ_SECTOR ? '#fff' : '#000';
    ctx.fillText(i === BLITZ_SECTOR ? 'Блиц' : String(i + 1), x, y);
  }

  // Decorative spikes around the wheel edge
  const spikeLength = radius * 0.07;
  const spikeWidth = radius * 0.03;
  ctx.fillStyle = 'green';
  for (let i = 0; i < SECTORS; i++) {
    const midAngle = -Math.PI / 2 + SECTOR_ANGLE * (i + 0.5) - Math.PI / 90;
    ctx.save();
    ctx.translate(radius * 0.93 * Math.cos(midAngle), radius * 0.93 * Math.sin(midAngle));
    ctx.rotate(midAngle + Math.PI);
    ctx.beginPath();
    ctx.moveTo(-spikeWidth / 2, 0);
    ctx.lineTo(-spikeWidth / 2, -spikeLength * 0.6);
    ctx.lineTo(-spikeWidth, -spikeLength * 0.6);
    ctx.lineTo(0, -spikeLength);
    ctx.lineTo(spikeWidth, -spikeLength * 0.6);
    ctx.lineTo(spikeWidth / 2, -spikeLength * 0.6);
    ctx.lineTo(spikeWidth / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

// The pointer turns with a CSS transition, which the browser runs on the GPU
// (compositor thread): no JavaScript runs per frame, so nothing else happening
// on the page can make the pointer stutter.
function spin() {
  if (spinning) return;
  markPlayedSector();
  spinning = true;
  playSound('spin');

  const targetSector = Math.floor(Math.random() * SECTORS);
  const endDegrees = SPIN_TURNS * 360 + (targetSector + 0.5) * (360 / SECTORS);
  arrow.style.transition = `transform ${SPIN_DURATION}ms ${SPIN_EASING}`;
  arrow.style.transform = `rotate(${endDegrees}deg)`;

  setTimeout(() => {
    // The same position within one turn, so the next spin makes as many turns again
    arrow.style.transition = 'none';
    arrow.style.transform = `rotate(${endDegrees % 360}deg)`;
    getComputedStyle(arrow).transform; // apply it now: the next spin must start from here
    lastLandedSector = targetSector;
    spinning = false;
  }, SPIN_DURATION);
}

// Before the next spin, the sector the arrow stopped at becomes played.
// If it was played already, the next unplayed sector clockwise is taken instead.
function markPlayedSector() {
  if (lastLandedSector === null) return;
  for (let i = 0; i < SECTORS; i++) {
    const sector = (lastLandedSector + i) % SECTORS;
    if (!playedSectors.has(sector)) {
      playedSectors.add(sector);
      break;
    }
  }
  lastLandedSector = null;
  drawWheel();
}

onPress(canvas, spin);

// ---------------------------------------------------------------------------
// Countdown
// ---------------------------------------------------------------------------
const COUNTDOWN_SECONDS = 60;
const WARNING_SECONDS = 10;
const countdownLabel = document.querySelector('#countdownBtn > span');
let countdownStart = 0;
let countdownTimer = null;
let shownSeconds = COUNTDOWN_SECONDS;

function toggleCountdown() {
  if (countdownTimer !== null) {
    resetCountdown();
    return;
  }
  stopAllSounds();
  playSound('tenSec');
  countdownStart = performance.now();
  shownSeconds = COUNTDOWN_SECONDS;
  tick();
}

// Seconds are derived from the start time instead of counting timer ticks,
// so the minute stays exact even when the browser delays timers
function tick() {
  const elapsed = performance.now() - countdownStart;
  const left = COUNTDOWN_SECONDS - Math.floor(elapsed / 1000);
  if (left <= 0) {
    playSound('timeOut');
    resetCountdown();
    return;
  }
  if (left !== shownSeconds) {
    shownSeconds = left;
    countdownLabel.textContent = left;
    if (left === WARNING_SECONDS) playSound('tenSec');
  }
  countdownTimer = setTimeout(tick, 1000 - (elapsed % 1000));
}

function resetCountdown() {
  clearTimeout(countdownTimer);
  countdownTimer = null;
  countdownLabel.textContent = COUNTDOWN_SECONDS;
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
const ACTIONS = {
  countdown: toggleCountdown,
  mute: fadeAllSounds,
};

for (const button of document.querySelectorAll('.btn')) {
  onPress(button, () => {
    const { sound, action } = button.dataset;
    if (sound) {
      stopAllSounds();
      playSound(sound);
    } else {
      ACTIONS[action]();
    }
    pulse(button);
  });
}

// Reacts the moment a finger or mouse button goes down, without waiting for release.
// Keyboard presses (Enter/Space, a click with detail 0) and browsers without
// pointer events (iOS 12) come as a click instead.
function onPress(element, handler) {
  element.addEventListener('pointerdown', (event) => {
    if (event.button === 0) handler();
  });
  element.addEventListener('click', (event) => {
    if (event.detail === 0 || !window.PointerEvent) handler();
  });
}

// Briefly enlarge the pressed element
function pulse(element, scale = 1.15) {
  if (!element.animate) return;
  element.animate(
    [
      { transform: 'scale(1)' },
      { transform: `scale(${scale})`, offset: 0.3 },
      { transform: 'scale(1)' },
    ],
    { duration: 250, easing: 'ease-out' }
  );
}

// iOS Safari ignores user-scalable=no: block pinch zoom explicitly
document.addEventListener('gesturestart', (event) => event.preventDefault());

// ---------------------------------------------------------------------------
// Score
// ---------------------------------------------------------------------------
// The upper half of a digit adds a point, the lower half takes one away.
// The score stays within 0–9 and never wraps around.
const MAX_SCORE = 9;

for (const button of document.querySelectorAll('.score-btn')) {
  const value = button.parentElement.querySelector('.score-value');
  onPress(button, () => {
    const score = Number(value.textContent) + Number(button.dataset.step);
    value.textContent = Math.min(Math.max(score, 0), MAX_SCORE);
    pulse(button.firstElementChild, 1.5);
  });
}

// ---------------------------------------------------------------------------
// Screen wake lock
// ---------------------------------------------------------------------------
// Keep the screen on: a phone that locks itself during the minute of discussion
// suspends the page, and the countdown with its signals stops with it
let wakeLockRequest = null;

function keepScreenOn() {
  if (!navigator.wakeLock || wakeLockRequest || document.visibilityState !== 'visible') return;
  wakeLockRequest = navigator.wakeLock.request('screen');
  wakeLockRequest
    .then((lock) => lock.addEventListener('release', () => { wakeLockRequest = null; }))
    .catch(() => { wakeLockRequest = null; });
}
document.addEventListener('visibilitychange', keepScreenOn);
