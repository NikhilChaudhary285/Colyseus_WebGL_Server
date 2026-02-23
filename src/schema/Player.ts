import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {

  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") z = 0;
  @type("number") rotY = 0;

  @type("boolean") jumping = false;
  @type("boolean") sitting = false;

  @type("string") anim = "idle";
  @type("number") skin = 0;

  @type("boolean") ready = false;
  @type("string") name = "Player";

  // NEW
  @type("number") spawnIndex = 0;
  @type("number") joinOrder = 0;
}