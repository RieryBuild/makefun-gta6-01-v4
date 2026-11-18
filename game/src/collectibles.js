// Sunset Postcards: ten hidden collectibles across the city.
//
// One job: reward exploring — a spinning postcard at each landmark, worth
// $200 when Dana walks over it. The minimap shows the ones still out there.
//
// Spots are [id, name, x, z]. Two of them sit on the respawn doors — the
// station door IS the SBPD Steps postcard and the hospital door IS the
// Solmar General Steps postcard — so a BUSTED or WASTED respawn collects
// one; the fine accounting in the game counts that in.

import { POSTCARD_REWARD } from './config.js';

export const POSTCARD_SPOTS = [
  ['beach', 'South Beach', 0, 205],
  ['wheel', 'The Ferris Wheel', 60, 214],
  ['pier', 'Middle Pier End', 250, 0],
  ['tower', 'The Water Tower', 120, -120],
  ['north-park', 'North Park', -120, -72],
  ['east-park', 'East Park', 72, 72],
  ['hospital', 'Solmar General Steps', -72, -134],
  ['hideout', 'The Beach House', 150, 150],
  ['crane', 'The Dock Crane', 196, 96],
  ['station', 'SBPD Steps', -120, 134],
];

function postcardFaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 80);
  gradient.addColorStop(0, '#2e1a4e');
  gradient.addColorStop(0.55, '#b83a6e');
  gradient.addColorStop(1, '#ff7a2d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 80);
  ctx.fillStyle = '#fff2c0';
  ctx.beginPath();
  ctx.arc(96, 52, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e4266';
  ctx.fillRect(0, 58, 128, 22);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 13px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLMAR BAY', 64, 22);
  ctx.font = '700 9px Arial, sans-serif';
  ctx.fillText('Greetings from the sunset coast', 64, 38);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 76);
  return new THREE.CanvasTexture(canvas);
}

export class Collectibles {
  constructor(scene) {
    this.scene = scene;
    this.cards = [];
    this.collectedCount = 0;
    const face = postcardFaceTexture();
    for (const [id, name, x, z] of POSTCARD_SPOTS) {
      const group = new THREE.Group();
      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(1.0, 0.62),
        new THREE.MeshStandardMaterial({
          map: face, side: THREE.DoubleSide, roughness: 0.6,
          emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 0.35,
        }),
      );
      group.add(card);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: face, color: 0xffd9a0, transparent: true, opacity: 0.35,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      glow.scale.set(2.2, 2.2, 1);
      group.add(glow);
      group.position.set(x, 1.6, z);
      scene.add(group);
      this.cards.push({ id, name, x, z, group, taken: false, spin: Math.random() * Math.PI * 2 });
    }
  }

  remaining() {
    return this.cards.filter((card) => !card.taken).map((card) => ({ x: card.x, z: card.z }));
  }

  collectedIds() {
    return this.cards.filter((card) => card.taken).map((card) => card.id);
  }

  restore(ids) {
    const taken = new Set(ids || []);
    for (const card of this.cards) {
      if (taken.has(card.id)) {
        card.taken = true;
        card.group.visible = false;
        this.collectedCount += 1;
      }
    }
  }

  update(dt, context) {
    for (const card of this.cards) {
      if (card.taken) continue;
      card.spin += dt * 1.6;
      card.group.rotation.y = card.spin;
      card.group.position.y = 1.6 + Math.sin(card.spin * 0.8) * 0.15;
      if (Math.hypot(context.playerX - card.x, context.playerZ - card.z) < 2.6) {
        card.taken = true;
        card.group.visible = false;
        this.collectedCount += 1;
        context.onPickup?.(card, POSTCARD_REWARD, this.collectedCount, this.cards.length);
      }
    }
  }
}
