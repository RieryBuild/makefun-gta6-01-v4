// The minimap: a round north-up map of Solmar Bay.
//
// One job: show the city at a glance — streets, water, beach and parks on
// a static layer painted once, then the live layer each frame: Dana's
// arrow, the waypoint diamond, police blips, enemy blips and the postcards
// still out there. The canvas is round (the CSS clips it); north is up.

import { CITY_HALF, ROAD_LINES, WATERLINE } from './config.js';

const MAP_HALF = 270; // the map covers -270..270 in both axes

export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = canvas.width;
    this.staticLayer = document.createElement('canvas');
    this.staticLayer.width = this.size;
    this.staticLayer.height = this.size;
    this.paintStaticLayer();
  }

  toMap(x, z) {
    const scale = this.size / (MAP_HALF * 2);
    return {
      x: (x + MAP_HALF) * scale,
      y: (z + MAP_HALF) * scale,
    };
  }

  paintStaticLayer() {
    const ctx = this.staticLayer.getContext('2d');
    const s = this.size;
    // Land base: dark green-grey.
    ctx.fillStyle = '#2a3527';
    ctx.fillRect(0, 0, s, s);
    // Water: east and south of the waterline.
    const east = this.toMap(WATERLINE.eastX, 0);
    const south = this.toMap(0, WATERLINE.southZ);
    ctx.fillStyle = '#1e4266';
    ctx.fillRect(east.x, 0, s - east.x, s);
    ctx.fillRect(0, south.y, s, s - south.y);
    // Beach band.
    const beach = this.toMap(0, 196);
    ctx.fillStyle = '#8a7a52';
    ctx.fillRect(0, beach.y, s, south.y - beach.y);
    // City blocks: slightly lighter squares between the streets.
    ctx.fillStyle = '#36422f';
    for (let bx = -4; bx <= 3; bx += 1) {
      for (let bz = -4; bz <= 3; bz += 1) {
        const a = this.toMap(bx * 48 + 7, bz * 48 + 7);
        const b = this.toMap((bx + 1) * 48 - 7, (bz + 1) * 48 - 7);
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      }
    }
    // Parks.
    ctx.fillStyle = '#4a7a34';
    for (const [px, pz] of [[72, 72], [-120, -72]]) {
      const a = this.toMap(px - 17, pz - 17);
      const b = this.toMap(px + 17, pz + 17);
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }
    // Roads: pale lines on the grid.
    ctx.strokeStyle = '#5a6a58';
    ctx.lineWidth = 3;
    for (const line of ROAD_LINES) {
      const v = this.toMap(line, 0);
      ctx.beginPath();
      ctx.moveTo(v.x, 0);
      ctx.lineTo(v.x, s);
      ctx.stroke();
      const h = this.toMap(0, line);
      ctx.beginPath();
      ctx.moveTo(0, h.y);
      ctx.lineTo(s, h.y);
      ctx.stroke();
    }
    // The docks apron: a grey yard east of the last street.
    const yard = this.toMap(192, -75);
    const yardEnd = this.toMap(250, 75);
    ctx.fillStyle = '#4a4440';
    ctx.fillRect(yard.x, yard.y, yardEnd.x - yard.x, yardEnd.y - yard.y);
    // North marker.
    ctx.fillStyle = '#e8e2d4';
    ctx.font = '900 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', s / 2, 14);
  }

  draw(view) {
    const ctx = this.ctx;
    const s = this.size;
    ctx.clearRect(0, 0, s, s);
    ctx.drawImage(this.staticLayer, 0, 0);
    // Postcards still out there: small amber dots.
    ctx.fillStyle = '#ffd23a';
    for (const card of view.postcards || []) {
      const p = this.toMap(card.x, card.z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Enemies: red dots.
    ctx.fillStyle = '#ff3a30';
    for (const enemy of view.enemies || []) {
      const p = this.toMap(enemy.x, enemy.z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Police: blue dots (the heli is a bigger one).
    for (const blip of view.police || []) {
      const p = this.toMap(blip.x, blip.z);
      ctx.fillStyle = blip.kind === 'heli' ? '#7ae0ff' : '#3a7aff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, blip.kind === 'heli' ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Waypoint: a yellow diamond.
    if (view.waypoint) {
      const p = this.toMap(view.waypoint.x, view.waypoint.z);
      ctx.fillStyle = '#ffd23a';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 6);
      ctx.lineTo(p.x + 5, p.y);
      ctx.lineTo(p.x, p.y + 6);
      ctx.lineTo(p.x - 5, p.y);
      ctx.closePath();
      ctx.fill();
    }
    // Dana: a white arrow, rotated to her heading.
    const me = this.toMap(view.playerX, view.playerZ);
    ctx.save();
    ctx.translate(me.x, me.y);
    ctx.rotate(view.heading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    // Round frame ring.
    ctx.strokeStyle = 'rgba(232,226,212,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  }
}
