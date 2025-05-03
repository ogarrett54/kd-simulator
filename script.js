const maxVelocity = 2;

const numOfReceptors = 50;
const receptorsArray = [];

let canvas;
let ctx;

window.onload = function () {
  canvas = document.getElementById("canvas1");
  ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  init(numOfReceptors);
  animate();
};

window.addEventListener("resize", function () {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

class Receptor {
  constructor(x, y, max_v) {
    this.x = x;
    this.y = y;
    this.mass = 1;
    this.radius = 5;
    this.color = "white";
    this.vx = Math.random() * max_v - max_v / 2;
    this.vy = Math.random() * max_v - max_v / 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x > canvas.width) this.x = 0;
    if (this.x < 0) this.x = canvas.width;
    if (this.y > canvas.height) this.y = 0;
    if (this.y < 0) this.y = canvas.height;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }
}

function init(n_receptors) {
  for (let i = 0; i < n_receptors; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    receptorsArray.push(new Receptor(x, y, maxVelocity));
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (r of receptorsArray) {
    r.update();
    r.draw();
  }

  requestAnimationFrame(animate);
}
