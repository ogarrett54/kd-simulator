// TODO:
// Implement "Kd" slider
// Implement fraction bound logging

const maxVelocity = 2;
const chanceToBind = 0.1;

const receptorColor = "white";
const receptorSize = 5; // used as radius and mass
const receptorArray = [];

const ligandColor = "red";
const ligandSize = 2; // used as radius and mass
const ligandArray = [];

let canvas;
let ctx;

window.onload = function () {
  canvas = document.getElementById("canvas1");
  ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const receptorInput = document.getElementById("receptor-conc");
  let numOfReceptors = Number(receptorInput.value);

  receptorInput.addEventListener("change", function () {
    const newNumOfReceptors = receptorInput.value;
    const dR = newNumOfReceptors - numOfReceptors;
    if (dR > 0) {
      for (let i = 0; i < dR; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        receptorArray.push(
          new Receptor(x, y, maxVelocity, receptorColor, receptorSize)
        );
      }
    }

    if (dR < 0) {
      for (let i = 0; i < -dR; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        receptorArray.pop();
      }
    }
    numOfReceptors = newNumOfReceptors;
  });

  const ligandInput = document.getElementById("ligand-conc");
  let numOfLigands = Number(ligandInput.value);

  ligandInput.addEventListener("change", function () {
    const newNumOfLigands = ligandInput.value;
    const dL = newNumOfLigands - numOfLigands;
    if (dL > 0) {
      for (let i = 0; i < dL; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ligandArray.push(
          new Ligand(x, y, maxVelocity, ligandColor, ligandSize)
        );
      }
    }

    if (dL < 0) {
      for (let i = 0; i < -dL; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ligandArray.pop();
      }
    }
    numOfLigands = newNumOfLigands;
  });

  init(numOfReceptors, numOfLigands);
  animate();
};

window.addEventListener("resize", function () {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

class Molecule {
  constructor(x, y, max_v) {
    this.x = x;
    this.y = y;
    this.size = 5; // default, will be changed
    this.color = "white"; // default, will be changed
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
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }
}

class Receptor extends Molecule {
  constructor(x, y, max_v, color, size) {
    super(x, y, max_v);
    this.color = color;
    this.size = size;
    this.inComplex = false;
  }
}

class Ligand extends Molecule {
  constructor(x, y, max_v, color, size) {
    super(x, y, max_v);
    this.color = color;
    this.size = size;
    this.inComplex = false;
  }
}

function init(n_receptors, n_ligands) {
  for (let i = 0; i < n_receptors; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    receptorArray.push(
      new Receptor(x, y, maxVelocity, receptorColor, receptorSize)
    );
  }

  for (let i = 0; i < n_ligands; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ligandArray.push(new Ligand(x, y, maxVelocity, ligandColor, ligandSize));
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (r of receptorArray) {
    r.update();
    r.draw();
  }

  for (l of ligandArray) {
    l.update();
    l.draw();
  }
  handleCollisions();
  requestAnimationFrame(animate);
}

function handleCollisions() {
  const noBindCollisions = [];
  const bindCollisions = [];
  getReceptorLigandCollisions(noBindCollisions, bindCollisions, chanceToBind);
  getReceptorReceptorCollisions(noBindCollisions);
  getLigandLigandCollisions(noBindCollisions);

  for (c of noBindCollisions) {
    resolveElasticCollision(c[0], c[1]);
  }

  for (c of bindCollisions) {
    resolveInelasticCollision(c[0], c[1]);
  }
}

function getReceptorLigandCollisions(
  noBindCollisionArray,
  bindCollisionArray,
  chanceToBind
) {
  for (r of receptorArray) {
    for (l of ligandArray) {
      const distance = Math.hypot(r.x - l.x, r.y - l.y);
      const bind = Math.random() < chanceToBind;
      if (distance < r.size + l.size) {
        if (!bind) {
          noBindCollisionArray.push([r, l]);
          r.inComplex = false;
          l.inComplex = false;
        }
        if (bind && !r.inComplex && !l.inComplex) {
          bindCollisionArray.push([r, l]);
          r.inComplex = true;
          l.inComplex = true;
        }
      }
    }
  }
}

function getReceptorReceptorCollisions(collisionArray) {
  for (let i = 0; i < receptorArray.length; i++) {
    for (let j = i + 1; j < receptorArray.length; j++) {
      let r1 = receptorArray[i];
      let r2 = receptorArray[j];
      const distance = Math.hypot(r1.x - r2.x, r1.y - r2.y);
      if (distance < r1.size + r2.size) {
        collisionArray.push([r1, r2]);
      }
    }
  }
}

function getLigandLigandCollisions(collisionArray) {
  for (let i = 0; i < ligandArray.length; i++) {
    for (let j = i + 1; j < ligandArray.length; j++) {
      let l1 = ligandArray[i];
      let l2 = ligandArray[j];
      const distance = Math.hypot(l1.x - l2.x, l1.y - l2.y);
      if (distance < l1.size + l2.size) {
        collisionArray.push([l1, l2]);
      }
    }
  }
}

// written by ChatGPT
function resolveElasticCollision(obj1, obj2) {
  const dx = obj2.x - obj1.x;
  const dy = obj2.y - obj1.y;

  // Normalize the collision vector
  const distance = Math.hypot(dx, dy);
  const nx = dx / distance;
  const ny = dy / distance;

  // Tangent vector (perpendicular to normal)
  const tx = -ny;
  const ty = nx;

  // Dot product tangential component
  const dpTan1 = obj1.vx * tx + obj1.vy * ty;
  const dpTan2 = obj2.vx * tx + obj2.vy * ty;

  // Dot product normal component
  const dpNorm1 = obj1.vx * nx + obj1.vy * ny;
  const dpNorm2 = obj2.vx * nx + obj2.vy * ny;

  // 1D elastic collision equations for normal component
  const m1 = obj1.size;
  const m2 = obj2.size;

  const newNorm1 = (dpNorm1 * (m1 - m2) + 2 * m2 * dpNorm2) / (m1 + m2);
  const newNorm2 = (dpNorm2 * (m2 - m1) + 2 * m1 * dpNorm1) / (m1 + m2);

  // Final velocity vectors = tangential + new normal
  obj1.vx = tx * dpTan1 + nx * newNorm1;
  obj1.vy = ty * dpTan1 + ny * newNorm1;
  obj2.vx = tx * dpTan2 + nx * newNorm2;
  obj2.vy = ty * dpTan2 + ny * newNorm2;

  // Push objects apart to resolve overlap
  const overlap = obj1.size + obj2.size - distance;
  if (overlap > 0 && isFinite(overlap)) {
    const correctionRatio = 0.5; // Split correction between both objects
    const correctionX = nx * overlap * correctionRatio;
    const correctionY = ny * overlap * correctionRatio;

    obj1.x -= correctionX;
    obj1.y -= correctionY;
    obj2.x += correctionX;
    obj2.y += correctionY;
  }
}

// written by ChatGPT
function resolveInelasticCollision(obj1, obj2) {
  const m1 = obj1.size;
  const m2 = obj2.size;

  const totalMass = m1 + m2;

  const vx = (obj1.vx * m1 + obj2.vx * m2) / totalMass;
  const vy = (obj1.vy * m1 + obj2.vy * m2) / totalMass;

  // They now share the same velocity
  obj1.vx = obj2.vx = vx;
  obj1.vy = obj2.vy = vy;
}
