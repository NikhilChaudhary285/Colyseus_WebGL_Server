// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 4.0.13
// 

using Colyseus.Schema;
#if UNITY_5_3_OR_NEWER
using UnityEngine.Scripting;
#endif

public partial class Player : Schema {
#if UNITY_5_3_OR_NEWER
[Preserve]
#endif
public Player() { }
	[Type(0, "number")]
	public float x = default(float);

	[Type(1, "number")]
	public float y = default(float);

	[Type(2, "number")]
	public float z = default(float);

	[Type(3, "number")]
	public float rotY = default(float);

	[Type(4, "boolean")]
	public bool jumping = default(bool);

	[Type(5, "boolean")]
	public bool sitting = default(bool);

	[Type(6, "string")]
	public string anim = default(string);

	[Type(7, "number")]
	public float skin = default(float);

	[Type(8, "boolean")]
	public bool ready = default(bool);

	[Type(9, "string")]
	public string name = default(string);

	[Type(10, "number")]
	public float spawnIndex = default(float);

	[Type(11, "number")]
	public float joinOrder = default(float);
}

