import { Room, Client } from "colyseus";
import { GameState } from "../schema/GameState.js";
import { Player } from "../schema/Player.js";

export class MyRoom extends Room {
  maxClients = 4;
  state = new GameState();
  joinCounter = 0;

  // maps used for throttled logging
  private lastMoveLog = new Map<string, number>();
  private debugEnabled = true;   // flip to false to silence all logs

  // helper function assigned in onCreate
  private log!: (...args: any[]) => void;  // non-null assertion: set in constructor

  spawnPoints = [
    { x: -1, y: 0, z: -1 },
    { x: 1, y: 0, z: -1 },
    { x: -3, y: 0, z: 1 },
    { x: 3, y: 0, z: 1 },
  ];

  onCreate() {
    // helper for consistent debug output
    this.log = (...args: any[]) => {
      if (this.debugEnabled) console.log(...args);
    };

    this.log("Room created:", this.roomId);

    // IMPORTANT: smooth network updates
    this.patchRate = 60;              // send 60 updates/sec
    this.setSimulationInterval(() => {  // keep room alive
      // nothing needed here yet, but keeps state ticking
    }, 1000 / 60);

    // ===== MOVEMENT =====
    this.onMessage("move", (client, data) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;

      // NEW: Ignore empty/invalid data
      if (!data || data.x === undefined || data.y === undefined || data.z === undefined || data.rotY === undefined || data.anim === undefined) {
        this.log("[WARN] Ignored invalid/empty move from", client.sessionId, data);
        return;
      }

      const changed =
        Math.abs(p.x - data.x) > 0.001 ||
        Math.abs(p.y - data.y) > 0.001 ||
        Math.abs(p.z - data.z) > 0.001 ||
        Math.abs(p.rotY - data.rotY) > 0.1 ||
        p.anim !== data.anim;

      if (!changed) return;

      this.log("[RECV] move from", client.sessionId, data);

      p.x = data.x;
      p.y = data.y;
      p.z = data.z;
      p.rotY = data.rotY;

      // 🔥 ALWAYS update anim unless jumping/sitting override
      if (!p.jumping && !p.sitting) {
        p.anim = data.anim;
      }
    });


    // ===== JUMP =====
    this.onMessage("jump", (client) => {
      this.log("[RECV] jump from", client.sessionId);

      const p = this.state.players.get(client.sessionId);
      if (!p || p.jumping) {
        this.log("[WARN] jump ignored for", client.sessionId);
        return;
      }

      p.jumping = true;
      p.anim = "jump";

      this.clock.setTimeout(() => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        player.jumping = false;
        player.anim = "idle";
        this.log("[STATE] jump finished for", client.sessionId);
      }, 700);   // slightly longer so clients see it
    });

    // ===== SIT =====
    this.onMessage("sit", (client, sit) => {
      this.log("[RECV] sit from", client.sessionId, sit);
      const p = this.state.players.get(client.sessionId);
      if (!p) {
        this.log("[WARN] sit: player not found", client.sessionId);
        return;
      }

      p.sitting = sit;
      p.anim = sit ? "sit" : "idle";  // NEW: Use "sit" anim to match client
      this.log("[STATE] sitting state updated for", client.sessionId, sit);
    });


    // ===== SKIN =====
    this.onMessage("skin", (client, id) => {
      this.log("[RECV] skin change from", client.sessionId, id);
      const p = this.state.players.get(client.sessionId);
      if (p) {
        p.skin = id;
        this.log("[STATE] skin set for", client.sessionId, id);
      } else {
        this.log("[WARN] skin: player not found", client.sessionId);
      }
    });


    // ===== READY =====
    this.onMessage("ready", (client, value) => {
      this.log("[RECV] ready from", client.sessionId, value);
      const p = this.state.players.get(client.sessionId);
      if (p) {
        p.ready = value;
        this.log("[STATE] ready flag updated for", client.sessionId, value);
      } else {
        this.log("[WARN] ready: player not found", client.sessionId);
      }
    });


    // ===== NAME =====
    this.onMessage("setName", (client, name) => {
      this.log("[RECV] setName from", client.sessionId, name);
      const p = this.state.players.get(client.sessionId);
      if (p) {
        p.name = name || "Player";
        this.log("[STATE] name set for", client.sessionId, p.name);
      } else {
        this.log("[WARN] setName: player not found", client.sessionId);
      }
    });

    // ===== START GAME =====
    this.onMessage("startGame", (client) => {
      this.log("[RECV] startGame from", client.sessionId);

      if (client.sessionId !== this.state.hostSessionId) {
        this.log("[WARN] startGame ignored; not host", client.sessionId);
        return;
      }

      let allReady = true;
      this.state.players.forEach(p => {
        if (!p.ready) allReady = false;
      });

      if (allReady) {
        this.log("[INFO] all players ready, starting countdown");
        this.startCountdown();
      } else {
        this.log("[INFO] startGame received but not all players ready");
      }
    });

    // ===== PING (keep-alive) =====
    this.onMessage("ping", (client) => {
      this.log("[INFO] ping received from", client.sessionId);
    });
  }


  startCountdown() {
    // (helper defined above)

    this.log("[SEND] countdown starting at 3");
    this.state.countdown = 3;

    const timer = this.clock.setInterval(() => {

      this.state.countdown--;
      this.log("[SEND] countdown tick", this.state.countdown);

      if (this.state.countdown <= 0) {
        this.log("[SEND] countdown finished, starting match");
        timer.clear();
        this.startMatch();
      }

    }, 1000);
  }


  startMatch() {

    this.log("[SEND] assigning spawn indices");
    let index = 0;

    this.state.players.forEach(p => {
      p.spawnIndex = index++;
      this.log("  spawnIndex", p.spawnIndex);
    });

    this.state.matchStarted = true;
    this.log("MATCH STARTED");
  }


  onJoin(client: Client) {
    this.log("[EVENT] client joined", client.sessionId);

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

    if (!this.state.hostSessionId) {
      this.state.hostSessionId = client.sessionId;
      this.log("[INFO] assigned new host", client.sessionId);
    }

    this.log("Player joined:", client.sessionId);
  }


  onLeave(client: Client) {
    this.log("[EVENT] client left", client.sessionId);
    this.state.players.delete(client.sessionId);
  }
}