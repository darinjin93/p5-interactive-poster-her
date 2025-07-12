const density = 'HERJOAQUINPHOENIXAMYADAMSRONEYMARA';
const extendedDensity = 'HERJOAQUINPHOENIXAMYADAMSRONEYMARA' + 
                       'SCARLETTJOHANSSONSPIKEJONSZ' + 
                       'HERJOAQUINPHOENIXSPIKEJONSZ' + 
                       'SCARLETTJOHANSSONHERJOAQUIN';
let wordList = [
  { word: 'HER', priority: 1 },
  { word: 'JOAQUIN', priority: 1 },
  { word: 'PHOENIX', priority: 1 },
  { word: 'AMY', priority: 1 },
  { word: 'ADAMS', priority: 1 },
  { word: 'ROONEY', priority: 1 },
  { word: 'MARA', priority: 1 },
  { word: 'SCARLETT', priority: 1 },
  { word: 'JOHANSSON', priority: 1 },
  { word: 'SPIKE', priority: 1 },
  { word: 'JONZE', priority: 1 }
];
let currentWord = null;
let joaquin;
let europaFont;
let time = 0;
let particles = [];
let mouseActiveSmooth = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseMovementThreshold = 5;
let lastValidMouseX = 0;
let lastValidMouseY = 0;
let mouseLeaveTimer = 0;
let maxMouseLeaveTime = 180; // 3 seconds at 60fps
let scatteredWords = [];
let gridCols, gridRows;

function preload() {
  joaquin = loadImage("joaquin.png");
  europaFont = loadFont('EUROPA.ttf');
}

function createScatteredWords() {
  scatteredWords = [];
  let gridSize = 450;
  gridCols = Math.floor(width / gridSize);
  gridRows = Math.floor(height / gridSize);
  
  // Create a grid to track occupied spaces
  let occupiedGrid = Array(gridCols).fill(null).map(() => Array(gridRows).fill(false));
  
  // Shuffle word list for random placement
  let shuffledWords = [...wordList].sort(() => random() - 0.5);
  
  for (let wordObj of shuffledWords) {
    let word = wordObj.word;
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 50) {
      let isHorizontal = random() > 0.5;
      let startCol = floor(random(gridCols - (isHorizontal ? word.length : 1)));
      let startRow = floor(random(gridRows - (isHorizontal ? 1 : word.length)));
      
      // Check if space is available
      let canPlace = true;
      for (let i = 0; i < word.length; i++) {
        let checkCol = startCol + (isHorizontal ? i : 0);
        let checkRow = startRow + (isHorizontal ? 0 : i);
        
        if (occupiedGrid[checkCol][checkRow]) {
          canPlace = false;
          break;
        }
      }
      
      if (canPlace) {
        // Mark spaces as occupied
        for (let i = 0; i < word.length; i++) {
          let col = startCol + (isHorizontal ? i : 0);
          let row = startRow + (isHorizontal ? 0 : i);
          occupiedGrid[col][row] = true;
        }
        
        // Create scattered word data
        scatteredWords.push({
          word: word,
          startCol: startCol,
          startRow: startRow,
          isHorizontal: isHorizontal,
          opacity: random(0.15, 0.4), // Subtle visibility
          fadePhase: random(TWO_PI),
          fadeSpeed: random(0.008, 0.02)
        });
        
        placed = true;
      }
      attempts++;
    }
  }
}  

function setup() {
  // 27x40 inches at 200 DPI = 5400x8000 pixels
  createCanvas(5400, 8000);
  textFont(europaFont);
  
  // Create scattered words first
  createScatteredWords();
  
  // Optimized grid - fewer particles for better performance
  let gridSize = 450; // Slightly larger grid for less particles
  for (let x = gridSize; x < width; x += gridSize) {
    for (let y = gridSize; y < height; y += gridSize) {
      particles.push({
        homeX: x,
        homeY: y,
        x: x + random(-150, 150),
        y: y + random(-150, 150),
        targetX: x,
        targetY: y,
        letter: extendedDensity.charAt(floor(random(extendedDensity.length))),
        noiseOffsetX: random(1000),
        noiseOffsetY: random(1000),
        driftSpeed: random(0.2, 0.5), // Reduced for smoother movement
        isMagnetic: false,
        isScattered: false, // New property
        scatteredWord: null,
        scatteredIndex: -1,
        targetLetter: '',
        magneticTargetX: 0,
        magneticTargetY: 0,
        assignmentCooldown: 0,
        fadeSpeed: random(0.01, 0.03), // Slower fade for smoothness
        fadePhase: random(TWO_PI),
        shouldFade: random() < 0.1, // Reduced frequency
        velocity: { x: 0, y: 0 },
        magneticVelocity: { x: 0, y: 0 },
        lastAlpha: 180,
        lastSize: 180
      });
    }
  }
  
  // Assign particles to scattered words
  assignScatteredWords();
  
  lastMouseX = mouseX;
  lastMouseY = mouseY;
  lastValidMouseX = width / 2;
  lastValidMouseY = height / 2;
}

function assignScatteredWords() {
  for (let scatteredWord of scatteredWords) {
    let word = scatteredWord.word;
    let gridSize = 450;
    
    for (let i = 0; i < word.length; i++) {
      let col = scatteredWord.startCol + (scatteredWord.isHorizontal ? i : 0);
      let row = scatteredWord.startRow + (scatteredWord.isHorizontal ? 0 : i);
      
      let targetX = col * gridSize + gridSize;
      let targetY = row * gridSize + gridSize;
      
      // Find closest available particle
      let closestParticle = null;
      let closestDistance = Infinity;
      
      for (let p of particles) {
        if (!p.isScattered) {
          let distance = dist(p.homeX, p.homeY, targetX, targetY);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestParticle = p;
          }
        }
      }
      
      if (closestParticle) {
        closestParticle.isScattered = true;
        closestParticle.scatteredWord = scatteredWord;
        closestParticle.scatteredIndex = i;
        closestParticle.letter = word[i];
        closestParticle.homeX = targetX;
        closestParticle.homeY = targetY;
        closestParticle.x = targetX + random(-100, 100);
        closestParticle.y = targetY + random(-100, 100);
      }
    }
  }
}

function getAvailableLettersNearMouse(mouseActive, effectiveMouseX, effectiveMouseY) {
  if (!mouseActive) return [];
  
  let availableLetters = [];
  let searchRadius = 900; // Increased search radius
  
  for (let p of particles) {
    let distance = dist(effectiveMouseX, effectiveMouseY, p.x, p.y);
    if (distance < searchRadius && p.assignmentCooldown === 0) {
      availableLetters.push(p.letter);
    }
  }
  return availableLetters;
}

function selectBestWord(availableLetters, mouseActive) {
  if (!mouseActive || availableLetters.length === 0) return null;
  
  let letterCounts = {};
  for (let letter of availableLetters) {
    letterCounts[letter] = (letterCounts[letter] || 0) + 1;
  }
  
  let bestWord = null;
  let bestScore = -1;
  
  // Sort words by length (longer words first for better visual impact)
  let sortedWords = [...wordList].sort((a, b) => b.word.length - a.word.length);
  
  for (let wordObj of sortedWords) {
    let word = wordObj.word;
    let canForm = true;
    let wordLetterCounts = {};
    
    for (let letter of word) {
      wordLetterCounts[letter] = (wordLetterCounts[letter] || 0) + 1;
    }
    
    for (let letter in wordLetterCounts) {
      if ((letterCounts[letter] || 0) < wordLetterCounts[letter]) {
        canForm = false;
        break;
      }
    }
    
    if (canForm) {
      // All words have same priority, so prefer longer words
      let score = word.length * 10 + (10 - wordObj.priority);
      if (score > bestScore) {
        bestScore = score;
        bestWord = word;
      }
    }
  }
  
  return bestWord;
}

function draw() {
  background(0);
  
  if (joaquin) {
    image(joaquin, 0, 0, width, height);
    
    time += 0.003; // Slower time progression for smoother animation
    
    // Enhanced mouse activity detection with edge lingering
    let mouseMovement = dist(mouseX, mouseY, lastMouseX, lastMouseY);
    let mouseInBounds = (mouseX > 400 && mouseY > 400 && mouseX < width - 400 && mouseY < height - 400);
    
    // Track valid mouse positions and implement lingering
    if (mouseInBounds) {
      lastValidMouseX = mouseX;
      lastValidMouseY = mouseY;
      mouseLeaveTimer = 0;
    } else {
      mouseLeaveTimer++;
    }
    
    // Keep mouse active for a period after leaving bounds
    let mouseStillActive = mouseInBounds || mouseLeaveTimer < maxMouseLeaveTime;
    
    if (mouseStillActive && (mouseMovement > mouseMovementThreshold || mouseLeaveTimer > 0)) {
      mouseActiveSmooth = lerp(mouseActiveSmooth, 1, 0.1);
    } else {
      mouseActiveSmooth = lerp(mouseActiveSmooth, 0, 0.02); // Slower fade out
    }
    
    let mouseActive = mouseActiveSmooth > 0.3;
    
    // Use last valid mouse position for calculations when mouse is outside bounds
    let effectiveMouseX = mouseInBounds ? mouseX : lastValidMouseX;
    let effectiveMouseY = mouseInBounds ? mouseY : lastValidMouseY;
    
    // Update mouse position tracking
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    
    let availableLetters = getAvailableLettersNearMouse(mouseActive, effectiveMouseX, effectiveMouseY);
    currentWord = selectBestWord(availableLetters, mouseActive);
    
    // Word formation positions with smoother spacing
    let wordPositions = [];
    if (currentWord && mouseActive) {
      let letterSpacing = map(currentWord.length, 3, 9, 350, 250);
      let startX = effectiveMouseX - (currentWord.length * letterSpacing) / 2;
      
      for (let i = 0; i < currentWord.length; i++) {
        wordPositions.push({
          x: startX + i * letterSpacing,
          y: effectiveMouseY - 200,
          letter: currentWord[i]
        });
      }
    }
    
    // Cooldown management
    for (let p of particles) {
      if (p.assignmentCooldown > 0) {
        p.assignmentCooldown--;
      }
    }
    
    // Improved particle assignment algorithm
    let wordLettersFound = {};
    
    if (mouseActive && wordPositions.length > 0) {
      for (let i = 0; i < wordPositions.length; i++) {
        let wordPos = wordPositions[i];
        let candidates = [];
        
        // Find all possible candidates
        for (let p of particles) {
          let canAssign = (p.isMagnetic && p.targetLetter === wordPos.letter) || 
                         (!p.isMagnetic && p.assignmentCooldown === 0);
          
          let alreadyAssigned = false;
          for (let key in wordLettersFound) {
            if (wordLettersFound[key] === p) {
              alreadyAssigned = true;
              break;
            }
          }
          
          if (canAssign && !alreadyAssigned && p.letter === wordPos.letter) {
            let distance = dist(p.x, p.y, wordPos.x, wordPos.y);
            if (distance < 800) {
              candidates.push({ particle: p, distance: distance });
            }
          }
        }
        
        // Select the closest candidate
        if (candidates.length > 0) {
          candidates.sort((a, b) => a.distance - b.distance);
          wordLettersFound[i] = candidates[0].particle;
        }
      }
    }
    
    // Reset unassigned particles smoothly
    for (let p of particles) {
      let isStillAssigned = false;
      for (let key in wordLettersFound) {
        if (wordLettersFound[key] === p) {
          isStillAssigned = true;
          break;
        }
      }
      
      if (!isStillAssigned && p.isMagnetic) {
        p.isMagnetic = false;
        p.assignmentCooldown = 45; // Longer cooldown for stability
      }
    }
    
    // Assign magnetic properties with smooth transitions
    if (mouseActive && wordPositions.length > 0) {
      for (let i = 0; i < wordPositions.length; i++) {
        let assignedParticle = wordLettersFound[i];
        let wordPos = wordPositions[i];
        if (assignedParticle) {
          assignedParticle.isMagnetic = true;
          assignedParticle.magneticTargetX = wordPos.x;
          assignedParticle.magneticTargetY = wordPos.y;
          assignedParticle.targetLetter = wordPos.letter;
        }
      }
    }
    
    // Update and draw particles with improved smoothness
    for (let p of particles) {
      // Smooth organic movement
      let noiseX = noise(p.noiseOffsetX + time * p.driftSpeed) * 2 - 1;
      let noiseY = noise(p.noiseOffsetY + time * p.driftSpeed) * 2 - 1;
      
      let driftX = sin(time * p.driftSpeed * 1.5 + p.noiseOffsetX) * 80;
      let driftY = cos(time * p.driftSpeed * 1.2 + p.noiseOffsetY) * 70;
      
      if (p.isMagnetic) {
        // Smooth magnetic attraction with physics-based movement
        let distance = dist(p.x, p.y, p.magneticTargetX, p.magneticTargetY);
        let pullStrength = map(distance, 0, 400, 0.08, 0.25);
        
        let pullX = (p.magneticTargetX - p.x) * pullStrength;
        let pullY = (p.magneticTargetY - p.y) * pullStrength;
        
        // Add velocity for smoother movement
        p.magneticVelocity.x = lerp(p.magneticVelocity.x, pullX, 0.3);
        p.magneticVelocity.y = lerp(p.magneticVelocity.y, pullY, 0.3);
        
        p.x += p.magneticVelocity.x;
        p.y += p.magneticVelocity.y;
        
        // Smooth letter transformation
        if (p.letter !== p.targetLetter && frameCount % 30 === 0) {
          p.letter = p.targetLetter;
        }
      } else {
        // Determine target position based on scattered word or home position
        let targetX, targetY;
        
        if (p.isScattered && !mouseActive) {
          // Use scattered word position when mouse is not active
          targetX = p.homeX + driftX * 0.3 + noiseX * 20; // Reduced drift for scattered words
          targetY = p.homeY + driftY * 0.3 + noiseY * 20;
        } else {
          // Use normal home position with full drift
          targetX = p.homeX + driftX + noiseX * 60;
          targetY = p.homeY + driftY + noiseY * 60;
        }
        
        p.velocity.x = lerp(p.velocity.x, (targetX - p.x) * 0.1, 0.1);
        p.velocity.y = lerp(p.velocity.y, (targetY - p.y) * 0.1, 0.1);
        
        p.x += p.velocity.x;
        p.y += p.velocity.y;
        
        // Reset magnetic velocity when not magnetic
        p.magneticVelocity.x *= 0.9;
        p.magneticVelocity.y *= 0.9;
      }
      
      // Smooth mouse repulsion using effective mouse position
      if (!p.isMagnetic && mouseActive) {
        let mouseDist = dist(effectiveMouseX, effectiveMouseY, p.x, p.y);
        if (mouseDist < 400) {
          let repelStrength = map(mouseDist, 0, 400, 8, 0);
          let angle = atan2(p.y - effectiveMouseY, p.x - effectiveMouseX);
          p.x += cos(angle) * repelStrength * 0.5; // Reduced for smoothness
          p.y += sin(angle) * repelStrength * 0.5;
        }
      }
      
      // Smooth size transitions with scattered word effects
      let breathingSize = 180 + sin(time * 2 + p.noiseOffsetX) * 15;
      let targetSize = breathingSize;
      
      if (p.isMagnetic) {
        targetSize *= 1.2;
      } else if (p.isScattered && !mouseActive) {
        // Scattered words have subtle size variation and breathing
        let scatteredBreathing = sin(time * 0.5 + p.fadePhase) * 8;
        targetSize = breathingSize * 0.9 + scatteredBreathing;
      }
      
      p.lastSize = lerp(p.lastSize, targetSize, 0.1);
      
      // Smooth opacity transitions with scattered word effects
      let baseAlpha = 180 + sin(time * 1.5 + p.noiseOffsetY) * 25;
      let targetAlpha;
      
      if (p.isMagnetic) {
        targetAlpha = 255;
      } else if (p.isScattered && !mouseActive) {
        // Scattered words have subtle, steady visibility
        let scatteredFade = sin(time * p.scatteredWord.fadeSpeed + p.fadePhase);
        targetAlpha = p.scatteredWord.opacity * 255 + scatteredFade * 30;
      } else {
        if (p.shouldFade) {
          let fadeAmount = sin(time * p.fadeSpeed + p.fadePhase);
          baseAlpha *= (0.4 + 0.6 * abs(fadeAmount));
        }
        targetAlpha = baseAlpha;
      }
      
      p.lastAlpha = lerp(p.lastAlpha, targetAlpha, 0.15);
      
      // Draw the letter with anti-aliasing
      fill(255, p.lastAlpha);
      noStroke();
      textSize(p.lastSize);
      textAlign(CENTER, CENTER);
      text(p.letter, p.x, p.y);
      
      // More frequent and varied letter changes for better randomization
      // Don't change letters for scattered words to maintain word integrity
      if (frameCount % 240 === 0 && random() < 0.15 && !p.isMagnetic && !p.isScattered) {
        // Use weighted random selection for more variety
        let letterPool = [
          ...extendedDensity.split(''),
          ...['H', 'E', 'R', 'J', 'O', 'A', 'Q', 'U', 'I', 'N'], // Extra priority letters
          ...['S', 'C', 'A', 'R', 'L', 'E', 'T', 'T'],
          ...['S', 'P', 'I', 'K', 'E', 'J', 'O', 'N', 'Z', 'E']
        ];
        p.letter = letterPool[floor(random(letterPool.length))];
      }
    }
  }
}