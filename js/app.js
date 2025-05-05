const canvas = document.getElementById('spinner');
const ctx = canvas.getContext('2d');
const sectors = 12;
let hiddenNumbers = [];
let spinning = false;
let arrowAngle = 0;
let lastLandedSector = null;

// Resize canvas responsively
function resizeCanvas() {
  const container = document.getElementById('top');
  const size = Math.min(container.clientWidth, container.clientHeight);
  canvas.width = canvas.height = size;
  drawWheel();
}


window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Drawing the wheel
function drawWheel() {
  const radius = canvas.width / 2;
  const sectorAngle = (2 * Math.PI) / sectors;

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Save context state and move origin to center
  ctx.save();
  ctx.translate(radius, radius);

  // Draw each sector background and border
  for (let i = 0; i < sectors; i++) {
    const startAngle = -Math.PI / 2 + sectorAngle * i;
    const endAngle = startAngle + sectorAngle;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();

    // 12th sector (index 11) is green, others are grey
    ctx.fillStyle = (i === 11) ? 'green' : '#aaa';
    ctx.fill();

    // Draw sector outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = radius * 0.015;
    ctx.stroke();
  }

  // Draw the lines dividing sectors
  for (let i = 0; i < sectors; i++) {
    const angle = -Math.PI / 2 + sectorAngle * i;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
    ctx.strokeStyle = '#000';
    ctx.lineWidth = radius * 0.015;
    ctx.stroke();
  }

  // Draw labels (numbers or "Блиц") inside each sector
  ctx.font = `${radius * 0.1}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < sectors; i++) {
    if (hiddenNumbers.includes(i)) continue; // skip hidden sectors

    const midAngle = -Math.PI / 2 + sectorAngle * i + sectorAngle / 2;
    const x = Math.cos(midAngle) * (radius - radius * 0.18);
    const y = Math.sin(midAngle) * (radius - radius * 0.18);

    if (i === 11) {
      // Write "Блиц" in white on the green sector
      ctx.fillStyle = '#fff';
      ctx.fillText('Блиц', x, y);
    } else {
      // Write the sector number in black
      ctx.fillStyle = '#000';
      ctx.fillText(i + 1, x, y);
    }
  }

  // Draw decorative spikes around the wheel edge
  for (let i = 0; i < sectors; i++) {
    const angle = -Math.PI / 2 + sectorAngle * i;
    const nextAngle = angle + sectorAngle;
    const midAngle = (angle + nextAngle) / 2 - Math.PI / 90;

    const arrowRadius = radius * 0.93;
    const arrowLength = radius * 0.07;
    const arrowWidth = radius * 0.03;

    ctx.save();
    ctx.translate(
      arrowRadius * Math.cos(midAngle),
      arrowRadius * Math.sin(midAngle)
    );
    ctx.rotate(midAngle + Math.PI);

    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.moveTo(-arrowWidth / 2, 0);
    ctx.lineTo(-arrowWidth / 2, -arrowLength * 0.6);
    ctx.lineTo(-arrowWidth, -arrowLength * 0.6);
    ctx.lineTo(0, -arrowLength);
    ctx.lineTo(arrowWidth, -arrowLength * 0.6);
    ctx.lineTo(arrowWidth / 2, -arrowLength * 0.6);
    ctx.lineTo(arrowWidth / 2, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // Restore to default orientation
  ctx.restore();

  // Draw the pointer arrow on top of the wheel
  drawArrow();

  // Draw the central circles
  ctx.save();
  ctx.translate(radius, radius);

  // Outer green circle
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.07, 0, 2 * Math.PI);
  ctx.fillStyle = 'green';
  ctx.fill();

  // Inner red circle
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.035, 0, 2 * Math.PI);
  ctx.fillStyle = 'red';
  ctx.fill();

  ctx.restore();
}


// Drawing the pointer
function drawArrow() {
  const radius = canvas.width / 2;
  ctx.save();
  ctx.translate(radius, radius);
  ctx.rotate(arrowAngle);

  const baseWidth = radius * 0.06;
  const rectLength = radius * 0.8;
  const triangleLength = radius * 0.05;

  ctx.fillStyle = 'red';
  ctx.beginPath();
  ctx.moveTo(-baseWidth / 2, 0);
  ctx.lineTo(-baseWidth / 2, -rectLength);
  ctx.lineTo(baseWidth / 2, -rectLength);
  ctx.lineTo(baseWidth / 2, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-baseWidth / 2, -rectLength);
  ctx.lineTo(0, -rectLength - triangleLength);
  ctx.lineTo(baseWidth / 2, -rectLength);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// Audio
const spinSound = document.getElementById('spinSound');
const gongSound = document.getElementById('gongSound');
const blackboxSound = document.getElementById('blackboxSound');
const fanfareSound = document.getElementById('fanfareSound');
const sound_10_secSound = document.getElementById('sound_10_secSound');
const time_outSound = document.getElementById('time_outSound');
const finishSound = document.getElementById('finishSound');

// Countdown logic
const countdownBtn = document.getElementById('countdownBtn');
let countdown = 60;
let countdownInterval = null;
let isCountingDown = false;

const startSound = sound_10_secSound;
const warningSound = sound_10_secSound;
const endSound = time_outSound;

function resetCountdown() {
  clearInterval(countdownInterval);
  countdown = 60;
  countdownBtn.textContent = "60";
  isCountingDown = false;
}

countdownBtn.addEventListener('click', () => {
  if (isCountingDown) {
    resetCountdown();
    return;
  }

  stopAllSounds();
  startSound.play();
  isCountingDown = true;
  countdownBtn.textContent = countdown;

  countdownInterval = setInterval(() => {
    countdown--;
    countdownBtn.textContent = countdown;

    if (countdown === 10) warningSound.play();
    if (countdown === 0) {
      endSound.play();
      resetCountdown();
    }
  }, 1000);
});

// Spin logic
let pressTimer;
let longPressTriggered = false;

canvas.addEventListener('click', (e) => {
  if (spinning || longPressTriggered) {
    longPressTriggered = false;
    return;
  }

  if (lastLandedSector !== null) {
    let sectorToHide = lastLandedSector;
  
    // If already hidden, search clockwise for the next visible sector
    if (hiddenNumbers.includes(sectorToHide)) {
      for (let i = 1; i < sectors; i++) {
        const candidate = (sectorToHide + i) % sectors;
        if (!hiddenNumbers.includes(candidate)) {
          sectorToHide = candidate;
          break;
        }
      }
    }
  
    // Only hide if it's not already hidden
    if (!hiddenNumbers.includes(sectorToHide)) {
      hiddenNumbers.push(sectorToHide);
    }
  
    lastLandedSector = null;
  }

  spinning = true;
  spinSound.play();

  const sectorAngle = (2 * Math.PI) / sectors;
  const randomSector = Math.floor(Math.random() * sectors);

  const rotations = 18;
  const targetAngle = rotations * 2 * Math.PI + (randomSector * sectorAngle) + sectorAngle / 2 - Math.PI / 2;

  const startAngle = arrowAngle;
  const startTime = performance.now();

  function spin(time) {
    const elapsed = time - startTime;
    const duration = 15000;

    if (elapsed < duration) {
      arrowAngle = easeOut(elapsed, startAngle, targetAngle - startAngle, duration);
      drawWheel();
      requestAnimationFrame(spin);
    } else {
      arrowAngle = targetAngle % (2 * Math.PI);
      let normalizedAngle = arrowAngle % (2 * Math.PI);
      if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
      const landedSector = Math.floor(normalizedAngle / sectorAngle);
      lastLandedSector = landedSector % sectors;
      drawWheel();
      spinning = false;
    }
  }

  requestAnimationFrame(spin);
});

function easeOut(t, b, c, d) {
  t /= d;
  return -c * t * (t - 2) + b;
}

function stopAllSounds() {
  [spinSound, gongSound, blackboxSound, fanfareSound, sound_10_secSound, time_outSound, finishSound, correctSound, wrongSound, pauseSound].forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });
}

function fadeAllSounds() {
  const fadeDuration = 3000; // 3 seconds

  const sounds = [
    spinSound, gongSound, blackboxSound, fanfareSound,
    sound_10_secSound, time_outSound, finishSound,
    correctSound, wrongSound, pauseSound
  ];

  sounds.forEach(audio => {
    if (!audio || audio.paused) return;

    // Ensure volume is at full before fading
    if (audio.volume === 0) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const stepTime = 50; // ms
    const steps = fadeDuration / stepTime;
    const volumeStep = audio.volume / steps;

    const fade = setInterval(() => {
      if (audio.volume > volumeStep) {
        audio.volume -= volumeStep;
      } else {
        clearInterval(fade);
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1.0; // reset volume for next use
      }
    }, stepTime);
  });
}

// Sound buttons
document.getElementById('gong').onclick = () => {
  stopAllSounds();
  gongSound.play();
};

document.getElementById('blackbox').onclick = () => {
  stopAllSounds();
  blackboxSound.play();
};

document.getElementById('fanfare').onclick = () => {
  stopAllSounds();
  fanfareSound.play();
};

document.getElementById('10_sec').onclick = () => {
  stopAllSounds();
  sound_10_secSound.play();
};

document.getElementById('timer').onclick = () => {
  stopAllSounds();
  time_outSound.play();
};

document.getElementById('finish').onclick = () => {
  stopAllSounds();
  finishSound.play();
};

document.getElementById('mute').onclick = () => {
  fadeAllSounds();
};

// Optional new buttons
document.getElementById('correct').onclick = () => {
  stopAllSounds();
  document.getElementById('correctSound').play();
};

document.getElementById('wrong').onclick = () => {
  stopAllSounds();
  document.getElementById('wrongSound').play();
};

document.getElementById('pause').onclick = () => {
  stopAllSounds();
  document.getElementById('pauseSound').play();
};
