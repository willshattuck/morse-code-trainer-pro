const morseMap = {
    A: '.-',    B: '-...',  C: '-.-.',  D: '-..',   E: '.',
    F: '..-.',  G: '--.',   H: '....',  I: '..',    J: '.---',
    K: '-.-',   L: '.-..',  M: '--',    N: '-.',    O: '---',
    P: '.--.',  Q: '--.-',  R: '.-.',   S: '...',   T: '-',
    U: '..-',   V: '...-',  W: '.--',   X: '-..-',  Y: '-.--',
    Z: '--..'
};

const letters = Object.keys(morseMap);
let running = false; // Default state to NOT play
let wpm = 15; // Default words per minute
let timer = null;
let extraCharSpace = 1000; // Default extra space between characters in ms
let toneFrequency = 600; //Default tone frequency in Hz
let showCharacter = true;
let speakLetter = false;
let speechDelay = 1000;
let selectedVoice = null;

const letterDisplay = document.getElementById('letter-display');
const wpmSlider = document.getElementById('wpm-slider');
const wpmValue = document.getElementById('wpm-value');
const charSpaceSlider = document.getElementById('char-space-slider');
const charSpaceValue = document.getElementById('char-space-value');
const freqSlider = document.getElementById('freq-slider');
const freqValue = document.getElementById('freq-value');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const toggleDisplayBtn = document.getElementById('toggle-display-btn');
const toggleSpeechBtn = document.getElementById('toggle-speech-btn');
const speechDelaySlider = document.getElementById('speech-delay-slider');
const speechDelayValue = document.getElementById('speech-delay-value');
const voiceSelect = document.getElementById('voice-select');

wpmSlider.addEventListener('input', () => {
    wpm = parseInt(wpmSlider.value);
    wpmValue.textContent = wpm;
});

charSpaceSlider.addEventListener('input', () => {
    extraCharSpace = parseInt(charSpaceSlider.value);
    charSpaceValue.textContent = extraCharSpace;
});

freqSlider.addEventListener('input', () => {
    toneFrequency = parseInt(freqSlider.value);
    freqValue.textContent = toneFrequency;
});

toggleDisplayBtn.addEventListener('click', () => {
    showCharacter = !showCharacter;
    toggleDisplayBtn.textContent = showCharacter ? 'Hide Character' : 'Show Character';
    letterDisplay.style.visibility = showCharacter ? 'visible' : 'hidden';
});

toggleSpeechBtn.addEventListener('click', () => {
    speakLetter = !speakLetter;
    toggleSpeechBtn.textContent = speakLetter ? 'Speak Letter: On' : 'Speak Letter: Off';
    toggleSpeechBtn.classList.toggle('active', speakLetter);
});

speechDelaySlider.addEventListener('input', () => {
    speechDelay = parseInt(speechDelaySlider.value);
    speechDelayValue.textContent = speechDelay;
});

// Populate voice dropdown
function populateVoices() {
    const voices = window.speechSynthesis.getVoices();
    voiceSelect.innerHTML = '';
    voices.forEach((voice, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        option.textContent = `${voice.name} (${voice.lang})` + (voice.default ? ' [default]' : '');
        voiceSelect.appendChild(option);
    });
    // Set default
    if (voices.length > 0) {
        selectedVoice = voices[voiceSelect.value] || voices[0];
    }
}

window.speechSynthesis.onvoiceschanged = populateVoices;
populateVoices();

voiceSelect.addEventListener('change', () => {
    const voices = window.speechSynthesis.getVoices();
    selectedVoice = voices[voiceSelect.value] || voices[0];
});

function playMorse(morse, wpm) {
    // Morse timing: dot = 1 unit, dash = 3 units, intra-char = 1 unit, inter-char = 3 units
    // Standard: 1 WPM = 1200ms per word (PARIS = 50 units)
    const unit = 1200 / wpm; // ms per unit
    let ctx = new (window.AudioContext || window.webkitAudioContext)();
    let i = 0;
    function playSymbol(done) {
        if (i >= morse.length) {
            // End of character, add inter-character space (3 units)
            setTimeout(() => {
                ctx.close();
                // Speak letter after Morse code if enabled
                if (speakLetter) {
                    const letter = letterDisplay.textContent;
                    if (letter && window.speechSynthesis) {
                        const utter = new SpeechSynthesisUtterance(letter);
                        utter.rate = 0.8;
                        if (selectedVoice) utter.voice = selectedVoice;
                        utter.onend = () => done();
                        setTimeout(() => {
                            window.speechSynthesis.speak(utter);
                        }, speechDelay);
                        return;
                    }
                }
                done();
            }, 2 * unit); // Already waited 1 unit after last symbol, so add 2 more
            return;
        }
        let duration = morse[i] === '.' ? unit : 3 * unit;
        let osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = toneFrequency;
        osc.connect(ctx.destination);
        osc.start();
        setTimeout(() => {
            osc.stop();
            osc.disconnect();
            i++;
            // Intra-character space (1 unit) after each symbol except last
            setTimeout(() => playSymbol(done), unit);
        }, duration);
    }
    return new Promise(resolve => playSymbol(resolve));
}

function nextLetter() {
    const letter = letters[Math.floor(Math.random() * letters.length)];
    letterDisplay.textContent = letter;
    letterDisplay.style.visibility = showCharacter ? 'visible' : 'hidden';
    return playMorse(morseMap[letter], wpm);
}

function startPractice() {
    if (running) return;
    running = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    async function playAndSchedule() {
        if (!running) return;
        await nextLetter();
        if (running) timer = setTimeout(playAndSchedule, extraCharSpace);
    }
    playAndSchedule();
}

function stopPractice() {
    running = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    clearTimeout(timer);
}

startBtn.addEventListener('click', startPractice);
stopBtn.addEventListener('click', stopPractice);
