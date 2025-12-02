const API_URL = 'proposal-backend-production.up.railway.app'; // Replace with your deployed backend URL
let sessionId = generateSessionId();
let gameProgress = {
  game1: false,
  game2: false,
  answer: null
};
let mediaRecorder;
let recordedChunks = [];

// Generate unique session ID
function generateSessionId() {
  const stored = localStorage.getItem('romantic_session_id');
  if (stored) return stored;
  
  const newId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('romantic_session_id', newId);
  return newId;
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
  await loadProgress();
  showConsentModal();
});

// Show consent modal
function showConsentModal() {
  const modal = document.getElementById('consentModal');
  const yesBtn = document.getElementById('consentYes');
  const noBtn = document.getElementById('consentNo');
  
  yesBtn.onclick = async () => {
    modal.style.display = 'none';
    await startRecording();
    document.getElementById('mainContainer').style.display = 'block';
    checkProgress();
  };
  
  noBtn.onclick = () => {
    modal.style.display = 'none';
    document.getElementById('mainContainer').style.display = 'block';
    checkProgress();
  };
}

// Start video recording
// Improved video recording
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 1280, height: 720 }, 
      audio: true 
    });
    
    document.getElementById('recordedVideo').srcObject = stream;
    document.getElementById('videoPreview').style.display = 'block';
    
    // Check supported MIME type
    let mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
    
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    recordedChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      // Auto-download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `bachuu_reaction_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log('✅ Video saved to Downloads folder!');
      alert('Recording saved to your Downloads folder!');
    };
    
    mediaRecorder.start(1000); // Record in 1-second chunks
    console.log('🔴 Recording started');
    
    // Auto-save every 10 seconds as backup
    setInterval(() => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        console.log('Recording active...');
      }
    }, 10000);
    
  } catch (error) {
    console.error('Error accessing camera:', error);
    alert('Could not access camera. Website will work without recording.');
  }
}


// Load progress from backend
async function loadProgress() {
  try {
    const response = await fetch(`${API_URL}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    
    const data = await response.json();
    gameProgress.game1 = data.game1_completed === 1;
    gameProgress.game2 = data.game2_completed === 1;
    gameProgress.answer = data.answer;
  } catch (error) {
    console.error('Error loading progress:', error);
  }
}

// Save progress to backend
async function saveProgress() {
  try {
    await fetch(`${API_URL}/api/update-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        game1: gameProgress.game1,
        game2: gameProgress.game2,
        answer: gameProgress.answer
      })
    });
  } catch (error) {
    console.error('Error saving progress:', error);
  }
}

// Check progress and show appropriate screen
function checkProgress() {
  if (gameProgress.answer === 'no') {
    showScreen('heartbreakScreen');
    return;
  }
  
  if (gameProgress.answer === 'yes') {
    showScreen('photo3Screen');
    return;
  }
  
  if (!gameProgress.game1) {
    showScreen('welcomeScreen');
  } else if (!gameProgress.game2) {
    showScreen('game2Screen');
  } else {
    showScreen('proposalScreen');
  }
}

// Screen navigation
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
}

// Start journey
function startJourney() {
  showScreen('game1Screen');
}

// Game 1: Quiz
function answerQuiz(answer) {
  // Any answer is correct - it's about the experience!
  document.getElementById('quizContent').style.display = 'none';
  document.getElementById('game1Result').style.display = 'block';
  
  gameProgress.game1 = true;
  saveProgress();
}

// Show photo
function showPhoto(photoNumber) {
  showScreen(`photo${photoNumber}Screen`);
}

// Show game
function showGame(gameNumber) {
  if (gameNumber === 2) {
    showScreen('game2Screen');
    initMemoryGame();
  }
}

// Game 2: Memory Match
let memoryCards = [];
let flippedCards = [];
let matchedPairs = 0;

function initMemoryGame() {
  const emojis = ['💕', '💖', '💗', '💝', '💞', '💓', '❤️', '💙'];
  const cards = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
  
  const grid = document.getElementById('memoryGrid');
  grid.innerHTML = '';
  memoryCards = [];
  matchedPairs = 0;
  
  cards.forEach((emoji, index) => {
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.dataset.emoji = emoji;
    card.dataset.index = index;
    card.innerHTML = '❓';
    card.onclick = () => flipCard(card);
    grid.appendChild(card);
    memoryCards.push(card);
  });
}

function flipCard(card) {
  if (flippedCards.length === 2 || card.classList.contains('flipped') || card.classList.contains('matched')) {
    return;
  }
  
  card.classList.add('flipped');
  card.innerHTML = card.dataset.emoji;
  flippedCards.push(card);
  
  if (flippedCards.length === 2) {
    setTimeout(checkMatch, 800);
  }
}

function checkMatch() {
  const [card1, card2] = flippedCards;
  
  if (card1.dataset.emoji === card2.dataset.emoji) {
    card1.classList.add('matched');
    card2.classList.add('matched');
    matchedPairs++;
    
    if (matchedPairs === 8) {
      setTimeout(() => {
        document.querySelector('.memory-grid').style.display = 'none';
        document.getElementById('game2Result').style.display = 'block';
        gameProgress.game2 = true;
        saveProgress();
      }, 500);
    }
  } else {
    card1.classList.remove('flipped');
    card2.classList.remove('flipped');
    card1.innerHTML = '❓';
    card2.innerHTML = '❓';
  }
  
  flippedCards = [];
}

// Show proposal
function showProposal() {
  showScreen('proposalScreen');
  makeNoButtonPlayful();
}

// Make "No" button move away
function makeNoButtonPlayful() {
  const noBtn = document.getElementById('noBtn');
  let clickCount = 0;
  
  noBtn.onmouseover = function() {
    if (clickCount < 3) {
      const x = Math.random() * 200 - 100;
      const y = Math.random() * 100 - 50;
      this.style.transform = `translate(${x}px, ${y}px)`;
      clickCount++;
    }
  };
}

// Answer proposal
async function answerProposal(answer) {
  gameProgress.answer = answer;
  await saveProgress();
  
  // Stop recording
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  
  if (answer === 'yes') {
    showScreen('photo3Screen');
    createConfetti();
  } else {
    showScreen('heartbreakScreen');
  }
}

// Create confetti effect
function createConfetti() {
  const container = document.querySelector('.celebration');
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.innerHTML = ['🎉', '✨', '💕', '💖'][Math.floor(Math.random() * 4)];
    confetti.style.position = 'absolute';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.top = '-50px';
    confetti.style.fontSize = '30px';
    confetti.style.animation = `confettiFall ${3 + Math.random() * 2}s linear`;
    confetti.style.animationDelay = Math.random() * 2 + 's';
    container.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 5000);
  }
}
