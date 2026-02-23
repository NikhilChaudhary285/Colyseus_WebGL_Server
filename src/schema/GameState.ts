import { Schema, MapSchema, type } from "@colyseus/schema";
import { Player } from "./Player.js";

export class GameState extends Schema {

  @type({ map: Player })
  players = new MapSchema<Player>();

  // GLOBAL MATCH STATE
  @type("boolean") matchStarted = false;
  @type("number") countdown = 0;

  // HOST AUTHORITY
  @type("string") hostSessionId = "";
}