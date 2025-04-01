const canvas = document.getElementById('spinner');
const ctx = canvas.getContext('2d');
let size, center, radius;
const segments = 12;
const segAngle = 2 * Math.PI / segments;
const startAngle = -Math.PI / 2;
let states = Array(segments).fill(true);
let currentRotation = 0;  // Начальный угол
let isSpinning = false;
let speed = 0;  // Текущая скорость
let maxSpeed = 0;  // Максимальная скорость
let startTime;  // Время начала анимации

// Audio
const sounds = {
  spin: new Audio('sounds/spin.mp3'),
  gong: new Audio('sounds/gong.mp3'),
  blackbox: new Audio('sounds/blackbox.mp3'),
  fanfare: new Audio('sounds/fanfare.mp3')
};

function resize() {
  size = Math.min(window.innerWidth, window.innerHeight) * 0.9;
  canvas.width = canvas.height = size;
  center = { x: size / 2, y: size / 2 };
  radius = size / 2 - 5;
  draw();
}

window.addEventListener('resize', resize);
resize();

function draw() {
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(center.x, center.y);

  // Рисуем круг с секторами
  for (let i = 0; i < segments; i++) {
    const angle = startAngle + i * segAngle;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, angle, angle + segAngle);
    ctx.closePath();
    ctx.fillStyle = states[i] ? '#2a2a2a' : '#ccc'; // Активный или неактивный сектор
    ctx.strokeStyle = '#000';
    ctx.fill();
    ctx.stroke();
    // Номер сектора
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${radius * 0.15}px sans-serif`;
    const mid = angle + segAngle / 2;
    ctx.fillText(i + 1, Math.cos(mid) * (radius * 0.8), Math.sin(mid) * (radius * 0.8));

  }



    // Рисуем стрелочку
    const arrowWidth = 15;  // Ширина стрелки
    const arrowLength = radius * 0.9;  // Длина стрелки
    ctx.save();
    ctx.rotate(currentRotation); // Поворачиваем стрелочку
  
    // Рисуем прямоугольную стрелку с заострённым концом
    ctx.beginPath();
    ctx.moveTo(0, -arrowWidth / 2); // Левая часть стрелки
    ctx.lineTo(arrowLength - 10, -arrowWidth / 2); // Линия до конца стрелочки
    ctx.lineTo(arrowLength, 0);  // Заострённый конец стрелки (правая сторона)
    ctx.lineTo(arrowLength - 10, arrowWidth / 2); // Линия к предыдущей точке
    ctx.lineTo(0, arrowWidth / 2);  // Возвращаемся на левую сторону стрелки
    ctx.closePath();  // Замкнуть путь
    ctx.fillStyle = 'red';  // Цвет стрелочки
    ctx.fill(); // Заливка стрелочки
    ctx.strokeStyle = 'red';  // Окантовка стрелки
    ctx.lineWidth = 2;  // Ширина линии стрелки
    ctx.stroke(); // Окантовка
  
    ctx.restore();
  
    ctx.restore();
}

function getSegmentAt(x, y) {
    // Переводим координаты клика с учетом текущего угла
    const dx = x - center.x;
    const dy = y - center.y;
  
    if (Math.hypot(dx, dy) > radius) return -1;
  
    // Вычисляем угол относительно центра канваса
    let angle = Math.atan2(dy, dx) - currentRotation;
  
    // Нормализуем угол в диапазон [0, 2π)
    let rel = angle - startAngle;
    rel = (rel % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  
    // Вычисляем сектор
    return Math.floor(rel / segAngle);
  }
  

let pressTimer, pressStart;

// Обработчик долгого нажатия
canvas.addEventListener('pointerdown', e => {
  pressStart = Date.now(); // Засекаем время нажатия
  pressTimer = setTimeout(() => {
    // Это долгий клик (длительность более 600 мс)
    const idx = getSegmentAt(e.offsetX, e.offsetY);
    if (idx >= 0) {
      states[idx] = false;  // Делаем сектор серым
      draw();
    }
    pressTimer = null;
  }, 600);  // Таймер срабатывает через 600 миллисекунд
});

// Обработчик короткого нажатия
canvas.addEventListener('pointerup', e => {
  if (pressTimer) {
    clearTimeout(pressTimer); // Отменяем таймер для долгого нажатия
    spin();  // Если это короткое нажатие, запускаем вращение
  }
});

async function spin() {
  if (isSpinning) return;
  isSpinning = true;

  // Генерируем случайную максимальную скорость (в радианах в секунду)
  maxSpeed = Math.random() * 0.2 + 0.04; // Максимальная скорость стрелочки, rad/sec
  speed = 0;  // Начальная скорость равна 0

  startTime = performance.now(); // Время начала анимации
  sounds.spin.currentTime = 0;
  sounds.spin.play();

  function animate(time) {
    const elapsed = time - startTime;

    // Линейное ускорение в первые 400 миллисекунд
    if (elapsed < 400) {
      speed = maxSpeed * (elapsed / 400);  // Линейное ускорение
    }

    // Плавное замедление на оставшиеся 6000 миллисекунд
    if (elapsed >= 400) {
      const decelerationTime = (elapsed - 400) / 6000; // Оставшиеся 6000 миллисекунд
      speed = maxSpeed * (1 - Math.pow(decelerationTime, 2)); // Плавное замедление
    }

    currentRotation += speed * (time - startTime) / 1000; // Вращаем стрелочку
    draw();

    if (elapsed < 6400) {
      requestAnimationFrame(animate);
    } else {
      // Останавливаемся и вычисляем сектор, на котором остановилась стрелочка
      currentRotation %= 2 * Math.PI;
      const finalAngle = (currentRotation + Math.PI / 2) % (2 * Math.PI); // Приводим угол в диапазон [0, 2π)
      const sectorIndex = Math.floor(finalAngle / segAngle); // Находим сектор
      states[sectorIndex] = false; // Делая его серым (неактивным)
      isSpinning = false;
      draw();
    }
  }

  requestAnimationFrame(animate);
}

document.getElementById('resetBtn').onclick = () => {
  states.fill(true);
  draw();
};

['gong', 'blackbox', 'fanfare'].forEach(id => {
  document.getElementById(id).onclick = () => sounds[id].play();
});
