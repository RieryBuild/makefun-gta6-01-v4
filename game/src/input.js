// Keyboard + mouse + pointer lock.
//
// One job: turn raw DOM events into the questions the game asks each frame
// ("is W held?", "was E just pressed?", "how far did the mouse move?"), and
// own the pointer lock that makes mouse-look work.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressed = new Set(); // keys pressed since the last frame's read
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.fireDown = false; // left button — shoot
    this.aimDown = false; // right button — aim
    this.locked = false;
    this.enabled = false;
    this.onUnlock = null;

    window.addEventListener('keydown', (event) => {
      if (!this.enabled) return;
      if (event.code === 'Space') event.preventDefault();
      if (!event.repeat) this.justPressed.add(event.code);
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => this.clear());
    canvas.addEventListener('mousedown', (event) => {
      if (!this.enabled) return;
      if (event.button === 0) this.fireDown = true;
      if (event.button === 2) this.aimDown = true;
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.fireDown = false;
      if (event.button === 2) this.aimDown = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    document.addEventListener('mousemove', (event) => {
      if (!this.locked) return;
      this.mouseDX += event.movementX || 0;
      this.mouseDY += event.movementY || 0;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked && this.enabled) this.onUnlock?.();
    });
  }

  held(code) { return this.keys.has(code); }

  // True once per physical press; the game consumes it the frame it acts.
  tapped(code) {
    if (!this.justPressed.has(code)) return false;
    this.justPressed.delete(code);
    return true;
  }

  takeMouse() {
    const out = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return out;
  }

  requestLock() {
    if (this.locked) return;
    const promise = this.canvas.requestPointerLock();
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  }

  releaseLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  clear() {
    this.keys.clear();
    this.justPressed.clear();
    this.fireDown = false;
    this.aimDown = false;
    this.mouseDX = 0;
    this.mouseDY = 0;
  }
}
