// The soundscape: synthesized WebAudio, no audio files.
//
// One job: make Puerto del Sol sound like somewhere — an engine hum that
// follows speed, a two-tone siren when the heat is on, gunshots, crashes,
// UI blips, mission stings, and three invented radio stations that play
// generative pluck melodies. Everything is synthesized at runtime; the
// game ships no audio files and makes no network request.

const STATIONS = [
  {
    name: 'SUNSET 104.2 · Golden Hour FM',
    tracks: ['Palm Static — Coral Ghosts', 'Evening Static — The Palms', 'Amber Sky — Marisol'],
    root: 220, scale: [0, 3, 5, 7, 10], tempo: 0.42, wave: 'triangle',
  },
  {
    name: 'BAYWAVE 98.7 · Coastal Hits',
    tracks: ['Salt Air — The Breakers', 'Boardwalk Lights — Juno', 'Tidepool — Low Sun'],
    root: 196, scale: [0, 2, 4, 7, 9], tempo: 0.34, wave: 'sine',
  },
  {
    name: 'STATIC 88.1 · Night Drive',
    tracks: ['Neon Docks — Vela', 'Cruiser Blues — The Sirens', 'Midnight Ferry — Ozone'],
    root: 174, scale: [0, 3, 5, 6, 10], tempo: 0.5, wave: 'sawtooth',
  },
];

export class Soundscape {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.stationIndex = 0;
    this.trackIndex = 0;
    this.radioTimer = null;
    this.radioStep = 0;
    this.engineNodes = null;
    this.sirenNodes = null;
    this.master = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.6;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.6;
    return this.muted;
  }

  // ---- Engine: a saw + a sub-square through a lowpass, pitched by speed ----
  startEngineLoop() {
    if (!this.ctx || this.engineNodes) return;
    const saw = this.ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.value = 55;
    const sub = this.ctx.createOscillator();
    sub.type = 'square';
    sub.frequency.value = 28;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    saw.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    saw.start();
    sub.start();
    this.engineNodes = { saw, sub, filter, gain };
  }

  setEngine(speedNorm, running) {
    if (!this.engineNodes) return;
    const { saw, sub, filter, gain } = this.engineNodes;
    const target = running ? 0.05 + speedNorm * 0.05 : 0;
    gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    saw.frequency.setTargetAtTime(55 + speedNorm * 110, this.ctx.currentTime, 0.1);
    sub.frequency.setTargetAtTime(28 + speedNorm * 55, this.ctx.currentTime, 0.1);
    filter.frequency.setTargetAtTime(320 + speedNorm * 900, this.ctx.currentTime, 0.1);
  }

  // ---- Siren: a two-tone wail, alternating 700/950 Hz ----
  startSirenLoop() {
    if (!this.ctx || this.sirenNodes) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 700;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 1.4;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 125;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    lfo.start();
    this.sirenNodes = { gain };
  }

  setSiren(on) {
    if (!this.sirenNodes) return;
    this.sirenNodes.gain.gain.setTargetAtTime(on ? 0.035 : 0, this.ctx.currentTime, 0.3);
  }

  noiseBuffer(duration) {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  gunshot() {
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(0.12);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    noise.start(time);
    const thump = this.ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(120, time);
    thump.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    const thumpGain = this.ctx.createGain();
    thumpGain.gain.setValueAtTime(0.4, time);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    thump.connect(thumpGain);
    thumpGain.connect(this.master);
    thump.start(time);
    thump.stop(time + 0.12);
  }

  crash(strength) {
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(0.3);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.min(0.6, 0.2 + strength * 0.02), time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    noise.start(time);
  }

  reload() {
    if (!this.ctx) return;
    this.blip(660, 0.05, 0.1);
    window.setTimeout(() => this.blip(880, 0.06, 0.12), 180);
  }

  blip(frequency = 880, duration = 0.07, volume = 0.12) {
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  missionComplete() {
    if (!this.ctx) return;
    [523, 659, 784, 1046].forEach((freq, i) => {
      window.setTimeout(() => this.blip(freq, 0.22, 0.16), i * 110);
    });
  }

  failSting() {
    if (!this.ctx) return;
    [392, 330, 262].forEach((freq, i) => {
      window.setTimeout(() => this.blip(freq, 0.3, 0.14), i * 160);
    });
  }

  // ---- Radio: generative pluck melodies over a chord root ----
  currentStation() {
    const station = STATIONS[this.stationIndex];
    return { name: station.name, track: station.tracks[this.trackIndex] };
  }

  nextStation() {
    this.stationIndex = (this.stationIndex + 1) % STATIONS.length;
    this.trackIndex = 0;
    this.radioStep = 0;
    return this.currentStation();
  }

  startRadio() {
    if (!this.ctx || this.radioTimer) return;
    this.scheduleRadio();
  }

  stopRadio() {
    if (this.radioTimer) {
      window.clearInterval(this.radioTimer);
      this.radioTimer = null;
    }
  }

  scheduleRadio() {
    const station = STATIONS[this.stationIndex];
    this.radioTimer = window.setInterval(() => {
      if (!this.ctx || this.muted) return;
      const step = this.radioStep;
      this.radioStep += 1;
      // A new track every 64 steps, cycling the station's list.
      if (step > 0 && step % 64 === 0) {
        this.trackIndex = (this.trackIndex + 1) % station.tracks.length;
      }
      const degree = station.scale[step % station.scale.length];
      const octave = step % 16 < 8 ? 1 : 2;
      const freq = station.root * Math.pow(2, degree / 12) * octave;
      this.pluck(freq, this.ctx.currentTime, station.tempo * 1.6, station.wave, 0.09);
      if (step % 8 === 0) {
        this.pluck(station.root / 2, this.ctx.currentTime, station.tempo * 4, 'sine', 0.08);
      }
    }, station.tempo * 1000);
  }

  pluck(freq, time, duration, type, volume) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }
}
