const canvas = document.getElementById('spinner');
const ctx = canvas.getContext('2d');
const sectors = 12;
let hiddenNumbers = [];
let spinning = false;
let arrowAngle = 0;

// let initialized = false;

// function initAudio() {
//     if (initialized) return;
//     initialized = true;
  
//     // Play each sound silently to unlock them
//     const audios = [
//       spinSound, gongSound, blackboxSound, fanfareSound,
//       finishSound, time_outSound, sound_10_secSound
//     ];
  
//     audios.forEach(audio => {
//       try {
//         audio.volume = 0; // Mute temporarily
//         audio.play().then(() => {
//           audio.pause();
//           audio.currentTime = 0;
//           audio.volume = 1; // Restore volume
//         });
//       } catch (e) {
//         // Ignore silently
//       }
//     });
//   }

// document.body.addEventListener('touchstart', initAudio);
// document.body.addEventListener('click', initAudio);

// Responsive canvas size
function resizeCanvas() {
  canvas.width = canvas.height = Math.min(window.innerWidth, window.innerHeight) * 0.9;
  drawWheel();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Draw static wheel (numbers and sectors)
function drawWheel() {
    const radius = canvas.width / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // Translate to center
    ctx.save();
    ctx.translate(radius, radius);
  
    // Draw gray circle
    ctx.fillStyle = '#aaa';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.fill();

    // Draw outer black border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = radius * 0.015;
    ctx.beginPath();
    ctx.arc(0, 0, radius - ctx.lineWidth / 2, 0, 2 * Math.PI);
    ctx.stroke();

  
    // Draw sectors, lines, numbers
    for (let i = 0; i < sectors; i++) {
      const angle = (2 * Math.PI / sectors) * i - Math.PI / 2; // sector 12 at top
  
      // Draw sector lines
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
      ctx.stroke();
  
      // Draw numbers
      if (!hiddenNumbers.includes(i)) {
        ctx.fillStyle = '#fff';
        ctx.font = `${radius * 0.1}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          i + 1,
          (radius - radius * 0.18) * Math.cos(angle + Math.PI / sectors),
          (radius - radius * 0.18) * Math.sin(angle + Math.PI / sectors)
        );
      }
    }
  
    // Draw green tangent arrows (классические стрелочки)
    for (let i = 0; i < sectors; i++) {
        const angle = (2 * Math.PI / sectors) * i - Math.PI / 2;
        const nextAngle = angle + (2 * Math.PI / sectors);
        const midAngle = (angle + nextAngle) / 2 - Math.PI / 90;
    
        const arrowRadius = radius * 0.93;
        const arrowLength = radius * 0.07;
        const arrowWidth = radius * 0.03;
    
        ctx.save();
        ctx.translate(
        arrowRadius * Math.cos(midAngle),
        arrowRadius * Math.sin(midAngle)
        );
        ctx.rotate(midAngle + Math.PI); // стрелка вдоль касательной
    
        ctx.fillStyle = 'green';
        ctx.beginPath();
    
        // Старт из центра стрелки (у основания)
        ctx.moveTo(-arrowWidth / 2, 0);                    // нижний левый угол основания
        ctx.lineTo(-arrowWidth / 2, -arrowLength * 0.6);   // левый край стержня
        ctx.lineTo(-arrowWidth, -arrowLength * 0.6);       // у основания наконечника
        ctx.lineTo(0, -arrowLength);                       // кончик стрелки
        ctx.lineTo(arrowWidth, -arrowLength * 0.6);        // правый край наконечника
        ctx.lineTo(arrowWidth / 2, -arrowLength * 0.6);    // правый край стержня
        ctx.lineTo(arrowWidth / 2, 0);                     // нижний правый угол основания
        ctx.closePath();
        ctx.fill();
    
        ctx.restore();
    }
  
  
    ctx.restore();
  
    // Draw rotating arrow
    drawArrow();

    // Draw center concentric circles (on top of everything)
    ctx.save();
    ctx.translate(radius, radius);

    // External green circle
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.07, 0, 2 * Math.PI);
    ctx.fillStyle = 'green';
    ctx.fill();

    // Internal red circle
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.035, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();

    ctx.restore();

  }

// Draw rotating arrow separately
function drawArrow() {
    const radius = canvas.width / 2;
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(arrowAngle);
  
    const baseWidth = radius * 0.06;  // ширина прямоугольной части
    const rectLength = radius * 0.8;  // длина прямоугольной части
    const triangleLength = radius * 0.05; // длина треугольного "носа"
  
    ctx.fillStyle = 'red';
  
    // Прямоугольная часть
    ctx.beginPath();
    ctx.moveTo(-baseWidth / 2, 0);
    ctx.lineTo(-baseWidth / 2, -rectLength);
    ctx.lineTo(baseWidth / 2, -rectLength);
    ctx.lineTo(baseWidth / 2, 0);
    ctx.closePath();
    ctx.fill();
  
    // Треугольник на конце
    ctx.beginPath();
    ctx.moveTo(-baseWidth / 2, -rectLength);
    ctx.lineTo(0, -rectLength - triangleLength);
    ctx.lineTo(baseWidth / 2, -rectLength);
    ctx.closePath();
    ctx.fill();
  
    ctx.restore();
  }
  

// Sound effects
const spinSound = document.getElementById('spinSound');
const gongSound = document.getElementById('gongSound');
const blackboxSound = document.getElementById('blackboxSound');
const fanfareSound = document.getElementById('fanfareSound');
const sound_10_secSound = document.getElementById('sound_10_secSound');
const time_outSound = document.getElementById('time_outSound');
const finishSound = document.getElementById('finishSound');

// Spin arrow logic
canvas.addEventListener('click', (e) => {
    if (spinning || longPressTriggered) {
      longPressTriggered = false;
      return;
    }
    spinning = true;
    spinSound.play();
  
    const sectorAngle = (2 * Math.PI) / sectors;
    const randomSector = Math.floor(Math.random() * sectors);
  
    // Целевой угол: стрелка останавливается четко в центре выбранного сектора
    const rotations = 18; // количество полных оборотов
    const targetAngle =
      rotations * 2 * Math.PI +
      (randomSector * sectorAngle) +
      sectorAngle / 2 -
      Math.PI / 2;
  
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
  
        // Правильный расчет без дополнительного смещения!
        let normalizedAngle = arrowAngle % (2 * Math.PI);
        if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
  
        // Определяем сектор, на который действительно указывает стрелка
        const landedSector = Math.floor(normalizedAngle / sectorAngle);
        const sectorToHide = landedSector % sectors;
  
        hiddenNumbers.push(sectorToHide);
        drawWheel();
        spinning = false;
      }
    }
    requestAnimationFrame(spin);
  });
  
  

// Ease-out function for smooth spinning
function easeOut(t, b, c, d) {
  t /= d;
  return -c * t * (t - 2) + b;
}

// Reset sectors
document.getElementById('reset').onclick = () => {
  hiddenNumbers = [];
  arrowAngle = 0;
  drawWheel();
};

// Long press to toggle sectors correctly
let pressTimer;
let longPressTriggered = false;

canvas.addEventListener('mousedown', (e) => {
  longPressTriggered = false;
  pressTimer = setTimeout(() => {
    const sector = getClickedSector(e);
    if (sector !== null) {
      if (hiddenNumbers.includes(sector)) {
        hiddenNumbers = hiddenNumbers.filter(n => n !== sector);
      } else {
        hiddenNumbers.push(sector);
      }
      drawWheel();
    }
    longPressTriggered = true;
  }, 500);
});

canvas.addEventListener('mouseup', () => clearTimeout(pressTimer));
canvas.addEventListener('mouseleave', () => clearTimeout(pressTimer));

// Calculate clicked sector correctly
function getClickedSector(e) {
  const rect = canvas.getBoundingClientRect();
  const radius = canvas.width / 2;
  const x = e.clientX - rect.left - radius;
  const y = e.clientY - rect.top - radius;
  const distFromCenter = Math.sqrt(x * x + y * y);
  if (distFromCenter > radius) return null;

  let angle = Math.atan2(y, x) + Math.PI / 2;
  angle = (angle + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor(angle / (2 * Math.PI / sectors));
}

function stopAllSounds() {
    [spinSound, gongSound, blackboxSound, fanfareSound, sound_10_secSound, time_outSound, finishSound].forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
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
    stopAllSounds();
};