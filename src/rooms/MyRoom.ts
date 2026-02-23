import { Room, Client } from "colyseus";
import { GameState } from "../schema/GameState.js";
import { Player } from "../schema/Player.js";

export class MyRoom extends Room {
  maxClients = 4;
  state = new GameState();
  joinCounter = 0;

  // NEW: SPAWN POINTS
  spawnPoints = [
    { x: -1, y: 0, z: -1 },
    { x: 1, y: 0, z: -1 },
    { x: -3, y: 0, z: 1 },
    { x: 3, y: 0, z: 1 },
  ];

  onCreate() {
    this.state = new GameState();
    console.log("Room created:", this.roomId);

    // ===== MOVEMENT =====
    this.onMessage("move", (client, data) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;

      p.x = data.x;
      p.y = data.y;
      p.z = data.z;
      p.rotY = data.rotY;

      if (!p.sitting && !p.jumping)
        p.anim = data.anim ?? "idle";
    });

    // ===== JUMP =====
    this.onMessage("jump", (client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;

      // avoid retrigger while already jumping
      if (p.jumping) return;

      p.jumping = true;

      // use Colyseus clock instead of setTimeout
      this.clock.setTimeout(() => {
        const player = this.state.players.get(client.sessionId);
        if (player) player.jumping = false;
      }, 120);
    });

    // ===== SIT =====
    this.onMessage("sit", (client, sit) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      p.sitting = sit;
    });

    // ===== SKIN =====
    this.onMessage("skin", (client, id) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      p.skin = id;
    });

    // ===== READY =====
    this.onMessage("ready", (client, value) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      p.ready = value;
    });

    // ===== NAME =====
    this.onMessage("setName", (client, name) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      p.name = name || "Player";
    });

    // ===== START GAME REQUEST =====
    this.onMessage("startGame", (client) => {

      if (client.sessionId !== this.state.hostSessionId) return;

      let allReady = true;
      this.state.players.forEach(p => {
        if (!p.ready) allReady = false;
      });

      if (!allReady) return;

      this.startCountdown();
    });
  }

  startCountdown() {

    this.state.countdown = 3;

    const timer = this.clock.setInterval(() => {

      this.state.countdown--;

      if (this.state.countdown <= 0) {
        timer.clear();
        this.startMatch();
      }

    }, 1000);
  }

  startMatch() {

    let index = 0;

    this.state.players.forEach(p => {
      p.spawnIndex = index++;
    });

    this.state.matchStarted = true;
    console.log("MATCH STARTED");
  }

  onJoin(client: Client) {

    const player = new Player();

    // assign join order
    player.joinOrder = this.joinCounter++;

    // assign spawn index safely
    player.spawnIndex = player.joinOrder % this.spawnPoints.length;

    // set initial spawn position
    const spawn = this.spawnPoints[player.spawnIndex];
    player.x = spawn.x;
    player.y = spawn.y;
    player.z = spawn.z;

    player.ready = false;
    player.name = "Player";

    this.state.players.set(client.sessionId, player);

    // FIRST PLAYER = HOST
    if (!this.state.hostSessionId)
      this.state.hostSessionId = client.sessionId;

    console.log("Player joined:", client.sessionId, "Spawn:", player.spawnIndex);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }
}