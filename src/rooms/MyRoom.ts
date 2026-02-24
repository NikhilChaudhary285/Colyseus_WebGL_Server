import { Room, Client } from "colyseus";
import { GameState } from "../schema/GameState.js";
import { Player } from "../schema/Player.js";

export class MyRoom extends Room {
  maxClients = 4;
  state = new GameState();
  joinCounter = 0;

  spawnPoints = [
    { x: -1, y: 0, z: -1 },
    { x: 1, y: 0, z: -1 },
    { x: -3, y: 0, z: 1 },
    { x: 3, y: 0, z: 1 },
  ];

  onCreate() {

    console.log("Room created:", this.roomId);

    // 🔥 IMPORTANT: smooth network updates
    this.patchRate = 20;              // send 60 updates/sec
    this.setSimulationInterval(() => {  // keep room alive
      // nothing needed here yet, but keeps state ticking
    }, 1000 / 60);


    // ===== MOVEMENT =====
    this.onMessage("move", (client, data) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;

      p.x = data.x;
      p.y = data.y;
      p.z = data.z;
      p.rotY = data.rotY;

      // Only change walk/idle if NOT in special state
      if (!p.jumping && !p.sitting) {
        p.anim = data.anim === "walk" ? "walk" : "idle";
      }
    });


    // ===== JUMP =====
    this.onMessage("jump", (client) => {

      const p = this.state.players.get(client.sessionId);
      if (!p || p.jumping) return;

      p.jumping = true;
      p.anim = "jump";

      this.clock.setTimeout(() => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        player.jumping = false;
        player.anim = "idle";
      }, 700);   // slightly longer so clients see it
    });

    // ===== SIT =====
    this.onMessage("sit", (client, sit) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;

      p.sitting = sit;
      if (sit) p.anim = "idle";
    });


    // ===== SKIN =====
    this.onMessage("skin", (client, id) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.skin = id;
    });


    // ===== READY =====
    this.onMessage("ready", (client, value) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.ready = value;
    });


    // ===== NAME =====
    this.onMessage("setName", (client, name) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.name = name || "Player";
    });


    // ===== START GAME =====
    this.onMessage("startGame", (client) => {

      if (client.sessionId !== this.state.hostSessionId) return;

      let allReady = true;
      this.state.players.forEach(p => {
        if (!p.ready) allReady = false;
      });

      if (allReady) this.startCountdown();
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

    player.joinOrder = this.joinCounter++;
    player.spawnIndex = player.joinOrder % this.spawnPoints.length;

    const spawn = this.spawnPoints[player.spawnIndex];
    player.x = spawn.x;
    player.y = spawn.y;
    player.z = spawn.z;

    player.ready = false;
    player.name = "Player";

    this.state.players.set(client.sessionId, player);

    if (!this.state.hostSessionId)
      this.state.hostSessionId = client.sessionId;

    console.log("Player joined:", client.sessionId);
  }


  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }
}