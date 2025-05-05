// TODO:
// Implement "Kd" slider
// Implement temperature slider

// Initial max velocity
const maxVelocity = 5;

// Outside heating properties
const percentOfSystemToPerturb = 0.05;
const heatingFactor = 0.4;

// Receptor properties
const receptorColor = "white";
const receptorSize = 5; // used as radius and mass
const receptorArray = [];

// Ligand properites
const ligandColor = "red";
const ligandSize = 2; // used as radius and mass
const ligandArray = [];

// Data logging
const fractionBoundArray = [];
const smoothingFactor = 10;

let canvas;
let ctx;
let initialKE;
let Etarget;
let chanceToBind;
let nCol;
let nRow;
let grid;
let cellSize;

window.onload = function () {
  canvas = document.getElementById("canvas1");
  ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Grid binning for performance enhancement
  cellSize = receptorSize * 2;
  nCol = Math.round(window.innerWidth / cellSize);
  nRow = Math.round(window.innerHeight / cellSize);

  grid = [];
  for (let row = 0; row < nRow; row++) {
    grid[row] = [];
    for (let col = 0; col < nCol; col++) {
      grid[row][col] = [];
    }
  }

  const receptorInput = document.getElementById("receptor-conc");
  let numOfReceptors = Number(receptorInput.value);
  if (isNaN(numOfReceptors) || numOfReceptors < 0) numOfReceptors = 50; // sensible default

  receptorInput.addEventListener("change", function () {
    const newNumOfReceptors = Number(receptorInput.value);
    if (isNaN(numOfReceptors)) numOfReceptors = 50;
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
        receptorArray.pop();
      }
    }
    numOfReceptors = newNumOfReceptors;
    initialKE = calculateTotalKineticEnergy();
  });

  const ligandInput = document.getElementById("ligand-conc");
  let numOfLigands = Number(ligandInput.value);
  if (isNaN(numOfLigands) || numOfLigands < 0) numOfLigands = 100;

  ligandInput.addEventListener("change", function () {
    const newNumOfLigands = Number(ligandInput.value);
    if (isNaN(numOfLigands)) numOfLigands = 100;
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
        ligandArray.pop();
      }
    }
    numOfLigands = newNumOfLigands;
    initialKE = calculateTotalKineticEnergy();
  });

  const KdInput = document.getElementById("Kd");
  chanceToBind = 1 - Number(KdInput.value) / 1000;

  KdInput.addEventListener("change", function () {
    let kdValue = Number(KdInput.value);
    if (isNaN(kdValue)) kdValue = 100; // or your default
    chanceToBind = 1 - kdValue / 1000;
  });

  init(numOfReceptors, numOfLigands);

  initialKE = calculateTotalKineticEnergy();

  animate();
  setInterval(logFractionBound, 500);
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

    // wall collisions - ChatGPT refined
    // Right wall
    if (this.x + this.size > canvas.width) {
      this.vx *= -1;
      this.x = canvas.width - this.size;
    }
    // Left wall
    if (this.x - this.size < 0) {
      this.vx *= -1;
      this.x = this.size;
    }
    // Bottom wall
    if (this.y + this.size > canvas.height) {
      this.vy *= -1;
      this.y = canvas.height - this.size;
    }
    // Top wall
    if (this.y - this.size < 0) {
      this.vy *= -1;
      this.y = this.size;
    }
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
  updateColor() {
    if (this.inComplex) this.color = "orange";
    if (!this.inComplex) this.color = "red";
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
  for (let row = 0; row < nRow; row++) {
    for (let col = 0; col < nCol; col++) {
      grid[row][col].length = 0;
    }
  }

  for (const r of receptorArray) {
    r.update();
    r.draw();

    const row = Math.min(nRow - 1, Math.max(0, Math.floor(r.y / cellSize)));
    const col = Math.min(nCol - 1, Math.max(0, Math.floor(r.x / cellSize)));

    if (isNaN(row) || isNaN(col)) {
      console.error("NaN row or col", r, r.x, r.y, cellSize, nRow, nCol);
    }
    grid[row][col].push(r);
  }

  for (const l of ligandArray) {
    l.update();
    l.updateColor();
    l.draw();

    const row = Math.min(nRow - 1, Math.max(0, Math.floor(l.y / cellSize)));
    const col = Math.min(nCol - 1, Math.max(0, Math.floor(l.x / cellSize)));
    grid[row][col].push(l);
  }
  handleCollisions();
  if (calculateTotalKineticEnergy() < initialKE) reheatSystem();
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

// ─────────────────────────────────────────────────────────
// Receptor–Ligand (revised by ChatGPT)
// ─────────────────────────────────────────────────────────
function getReceptorLigandCollisions(
  noBindCollisionArray,
  bindCollisionArray,
  chanceToBind
) {
  for (const r of receptorArray) r.inComplex = false;
  for (const l of ligandArray) l.inComplex = false;

  for (const r of receptorArray) {
    const row = Math.min(nRow - 1, Math.max(0, Math.floor(r.y / cellSize)));
    const col = Math.min(nCol - 1, Math.max(0, Math.floor(r.x / cellSize)));

    // scan this cell and the 8 neighbours
    for (let dr = -1; dr <= 1; dr++) {
      const rN = row + dr;
      if (rN < 0 || rN >= nRow) continue;

      for (let dc = -1; dc <= 1; dc++) {
        const cN = col + dc;
        if (cN < 0 || cN >= nCol) continue;

        for (const l of grid[rN][cN]) {
          const distance = Math.hypot(r.x - l.x, r.y - l.y);
          if (distance >= r.size + l.size) continue;

          const bind = Math.random() < chanceToBind;
          if (!bind) {
            noBindCollisionArray.push([r, l]);
          } else if (!r.inComplex && !l.inComplex) {
            bindCollisionArray.push([r, l]);
            r.inComplex = l.inComplex = true;
          }
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────
// Receptor–Receptor (revised by ChatGPT)
// ─────────────────────────────────────────────────────────
function getReceptorReceptorCollisions(collisionArray) {
  for (const r1 of receptorArray) {
    const row = Math.min(nRow - 1, Math.max(0, Math.floor(r1.y / cellSize)));
    const col = Math.min(nCol - 1, Math.max(0, Math.floor(r1.x / cellSize)));

    for (let dr = -1; dr <= 1; dr++) {
      const rN = row + dr;
      if (rN < 0 || rN >= nRow) continue;

      for (let dc = -1; dc <= 1; dc++) {
        const cN = col + dc;
        if (cN < 0 || cN >= nCol) continue;

        for (const r2 of grid[rN][cN]) {
          if (r2 === r1) continue; // skip self
          const distance = Math.hypot(r1.x - r2.x, r1.y - r2.y);
          if (distance < r1.size + r2.size) {
            collisionArray.push([r1, r2]);
          }
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────
// Ligand–Ligand (revised by ChatGPT)
// ─────────────────────────────────────────────────────────
function getLigandLigandCollisions(collisionArray) {
  for (const l1 of ligandArray) {
    const row = Math.min(nRow - 1, Math.max(0, Math.floor(l1.y / cellSize)));
    const col = Math.min(nCol - 1, Math.max(0, Math.floor(l1.x / cellSize)));

    for (let dr = -1; dr <= 1; dr++) {
      const rN = row + dr;
      if (rN < 0 || rN >= nRow) continue;

      for (let dc = -1; dc <= 1; dc++) {
        const cN = col + dc;
        if (cN < 0 || cN >= nCol) continue;

        for (const l2 of grid[rN][cN]) {
          if (l2 === l1) continue;
          const distance = Math.hypot(l1.x - l2.x, l1.y - l2.y);
          if (distance < l1.size + l2.size) {
            collisionArray.push([l1, l2]);
          }
        }
      }
    }
  }
}

//function getReceptorLigandCollisions(
//  noBindCollisionArray,
//  bindCollisionArray,
//  chanceToBind
//) {
//  for (const r of receptorArray) r.inComplex = false;
//  for (const l of ligandArray) l.inComplex = false;
//  for (const r of receptorArray) {
//    const row = Math.min(nRow - 1, Math.max(0, Math.floor(r.y / cellSize)));
//    const col = Math.min(nCol - 1, Math.max(0, Math.floor(r.x / cellSize)));
//    for (const l of grid[row][col]) {
//      const distance = Math.hypot(r.x - l.x, r.y - l.y);
//      const bind = Math.random() < chanceToBind;
//      if (distance < r.size + l.size) {
//        if (!bind) {
//          noBindCollisionArray.push([r, l]);
//        }
//        if (bind && !r.inComplex && !l.inComplex) {
//          bindCollisionArray.push([r, l]);
//          r.inComplex = true;
//          l.inComplex = true;
//        }
//      }
//    }
//  }
//}
//
//function getReceptorReceptorCollisions(collisionArray) {
//  for (const r1 of receptorArray) {
//    const row = Math.min(nRow - 1, Math.max(0, Math.floor(r1.y / cellSize)));
//    const col = Math.min(nCol - 1, Math.max(0, Math.floor(r1.x / cellSize)));
//    for (const r2 of grid[row][col]) {
//      if (r2 !== r1) {
//        const distance = Math.hypot(r1.x - r2.x, r1.y - r2.y);
//        if (distance < r1.size + r2.size) {
//          collisionArray.push([r1, r2]);
//        }
//      }
//    }
//  }
//}
//
//function getLigandLigandCollisions(collisionArray) {
//  for (const l1 of ligandArray) {
//    const row = Math.min(nRow - 1, Math.max(0, Math.floor(l1.y / cellSize)));
//    const col = Math.min(nCol - 1, Math.max(0, Math.floor(l1.x / cellSize)));
//    for (const l2 of grid[row][col]) {
//      if (l2 !== l1) {
//        const distance = Math.hypot(l1.x - l2.x, l1.y - l2.y);
//        if (distance < l1.size + l2.size) {
//          collisionArray.push([l1, l2]);
//        }
//      }
//    }
//  }
//}

// written by ChatGPT
function resolveElasticCollision(obj1, obj2) {
  const dx = obj2.x - obj1.x;
  const dy = obj2.y - obj1.y;

  // Bail out if the centres are coincident – give them a tiny nudge instead
  if (dx === 0 && dy === 0) {
    obj1.x += 0.01; // any tiny value > 0 works
    return; // skip the rest this frame
  }

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

function logFractionBound() {
  let counter = 0;
  for (r of receptorArray) {
    if (r.inComplex) counter++;
  }
  const fBound = counter / receptorArray.length;

  if (fractionBoundArray.length < smoothingFactor) {
    fractionBoundArray.push(fBound);
  } else {
    fractionBoundArray.push(fBound);
    fractionBoundArray.splice(0, 1);
  }

  const avgFBound =
    fractionBoundArray.reduce((sum, val) => sum + val, 0) /
    fractionBoundArray.length;

  const rounded = Math.round(avgFBound * 100) / 100;

  const fBoundLogger = document.getElementById("frac-bound-logger");
  fBoundLogger.textContent = `Fraction bound: ${rounded}`;
}

function calculateTotalKineticEnergy() {
  let totalKineticEnergy = 0;
  for (r of receptorArray) {
    totalKineticEnergy += calculateKineticEnergy(r);
  }
  for (l of ligandArray) {
    totalKineticEnergy += calculateKineticEnergy(l);
  }

  return totalKineticEnergy;
}

function calculateKineticEnergy(mol) {
  return 0.5 * mol.size * (mol.vx ** 2 + mol.vy ** 2);
}

function reheatSystem() {
  const numPerturbedReceptors = Math.round(
    percentOfSystemToPerturb * receptorArray.length
  );
  const selectedReceptorIndices = [];
  for (let i = 0; i < numPerturbedReceptors; i++)
    selectedReceptorIndices.push(
      Math.floor(Math.random() * receptorArray.length)
    );

  const numPerturbedLigands = Math.round(
    percentOfSystemToPerturb * ligandArray.length
  );
  const selectedLigandIndices = [];
  for (let i = 0; i < numPerturbedLigands; i++)
    selectedLigandIndices.push(Math.floor(Math.random() * ligandArray.length));

  for (let i = 0; i < selectedReceptorIndices.length; i++) {
    const r = receptorArray[selectedReceptorIndices[i]];
    //Ecurrent = calculateKineticEnergy(r);
    //scale = Math.sqrt(Etarget/Ecurrent);
    r.vx += heatingFactor * (Math.random() * 2 - 1);
    r.vy += heatingFactor * (Math.random() * 2 - 1);
  }
  for (let i = 0; i < selectedLigandIndices.length; i++) {
    const l = ligandArray[selectedLigandIndices[i]];
    //Ecurrent = calculateKineticEnergy(l);
    //scale = Math.sqrt(Etarget/Ecurrent);
    l.vx += heatingFactor * (Math.random() * 2 - 1);
    l.vy += heatingFactor * (Math.random() * 2 - 1);
  }
}
