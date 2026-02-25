---
name: gdscript
description: GDScript development patterns for Godot 4.x game development. Covers node hierarchy, signals, scene composition, physics, input handling, resource management, autoload singletons, animation, tilemaps, shaders, multiplayer, GDExtension, and performance optimization.
version: 1.0.0
---

# GDScript Development Patterns (Godot 4.x)

Expert guidance for building games and interactive applications with GDScript in Godot 4.x. Covers the scene/node architecture, signals for decoupled communication, physics bodies, input handling, resource management, multiplayer networking, and performance patterns for shipping production-quality games.

## When to Use This Skill

- Building 2D or 3D games with the Godot engine
- Prototyping interactive experiences and simulations
- Creating game tools and editor plugins
- Implementing multiplayer game networking
- Optimizing game performance (draw calls, physics, memory)
- Writing GDExtension bindings for native code

## Core Concepts

### 1. Node Hierarchy and Scene Composition

Godot's architecture is built on a tree of Nodes organized into reusable Scenes.

```gdscript
# Every script extends a node type
extends CharacterBody2D

# Node references -- use @onready for nodes that exist at _ready()
@onready var sprite: Sprite2D = $Sprite2D
@onready var collision: CollisionShape2D = $CollisionShape2D
@onready var animation_player: AnimationPlayer = $AnimationPlayer
@onready var health_bar: ProgressBar = $UI/HealthBar

# Use unique name references (%) for deeply nested nodes
@onready var score_label: Label = %ScoreLabel

# _ready() is called when the node and all children are in the tree
func _ready() -> void:
    health_bar.max_value = max_health
    health_bar.value = current_health

# _process() is called every frame
func _process(delta: float) -> void:
    update_ui()

# _physics_process() is called at fixed intervals (default 60fps)
func _physics_process(delta: float) -> void:
    handle_movement(delta)
    move_and_slide()
```

**Scene composition rules:**

| Rule | Explanation |
|------|-------------|
| One script per scene root | Keep logic in the root; children are structural |
| Scenes are reusable components | A scene is like a prefab: self-contained, instantiatable |
| Prefer composition over inheritance | Combine small scenes into complex ones |
| Use `$NodePath` for child access | Relative paths within the same scene |
| Use `%UniqueName` for deep access | Set "Access as Unique Name" in the editor |

### 2. Signals

Signals are Godot's observer pattern for decoupled communication.

```gdscript
# Defining custom signals
signal health_changed(new_health: int, max_health: int)
signal died
signal damage_taken(amount: int, source: Node)

# Emitting signals
func take_damage(amount: int, source: Node) -> void:
    current_health -= amount
    health_changed.emit(current_health, max_health)
    damage_taken.emit(amount, source)

    if current_health <= 0:
        died.emit()

# Connecting signals in code
func _ready() -> void:
    # Connect to own signals
    health_changed.connect(_on_health_changed)
    died.connect(_on_died)

    # Connect to child signals
    $HitArea.body_entered.connect(_on_hit_area_body_entered)

    # Connect with bind (extra arguments)
    $Button.pressed.connect(_on_button_pressed.bind("special"))

    # One-shot connection (auto-disconnects after first emit)
    died.connect(_on_died_once, CONNECT_ONE_SHOT)

# Signal handlers -- naming convention: _on_<source>_<signal>
func _on_health_changed(new_health: int, _max_health: int) -> void:
    health_bar.value = new_health

func _on_died() -> void:
    queue_free()

func _on_hit_area_body_entered(body: Node2D) -> void:
    if body.is_in_group("enemies"):
        take_damage(10, body)

# Disconnect when needed
func _exit_tree() -> void:
    if health_changed.is_connected(_on_health_changed):
        health_changed.disconnect(_on_health_changed)
```

**Signal guidelines:**

| Guideline | Explanation |
|-----------|-------------|
| Signals go UP the tree | Children emit, parents listen |
| Calls go DOWN the tree | Parents call methods on children |
| Never connect signals in loops without disconnecting | Memory leak / duplicate calls |
| Use typed signal parameters | `signal scored(points: int)` not `signal scored` |

### 3. Exported Variables

```gdscript
extends CharacterBody2D

# Basic exports -- editable in the Inspector
@export var speed: float = 200.0
@export var jump_force: float = -400.0
@export var max_health: int = 100

# Export with range
@export_range(0.0, 1.0, 0.01) var friction: float = 0.5
@export_range(1, 100) var max_enemies: int = 10

# Export enums
enum State { IDLE, RUNNING, JUMPING, FALLING, DEAD }
@export var initial_state: State = State.IDLE

# Export resources
@export var weapon_data: WeaponResource
@export var particle_effect: PackedScene

# Export groups for organization
@export_group("Movement")
@export var walk_speed: float = 150.0
@export var run_speed: float = 300.0
@export var acceleration: float = 1000.0

@export_group("Combat")
@export var attack_damage: int = 10
@export var attack_cooldown: float = 0.5

@export_subgroup("Defense")
@export var armor: int = 5
@export var dodge_chance: float = 0.1

# Export node paths (resolved at runtime)
@export var target_path: NodePath
@onready var target: Node2D = get_node(target_path) if target_path else null

# Export file paths
@export_file("*.tscn") var next_level: String
@export_dir var save_directory: String

# Export flags (bitmask)
@export_flags("Fire", "Water", "Earth", "Wind") var elements: int = 0

# Export color
@export var hit_color: Color = Color.RED
```

### 4. Physics Bodies

```gdscript
# CharacterBody2D -- for player/NPC movement (you control motion)
extends CharacterBody2D

@export var speed: float = 200.0
@export var jump_velocity: float = -400.0
@export var gravity_multiplier: float = 1.0

var gravity: float = ProjectSettings.get_setting("physics/2d/default_gravity")

func _physics_process(delta: float) -> void:
    # Apply gravity
    if not is_on_floor():
        velocity.y += gravity * gravity_multiplier * delta

    # Jump
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_velocity

    # Horizontal movement
    var direction := Input.get_axis("move_left", "move_right")
    if direction:
        velocity.x = direction * speed
    else:
        velocity.x = move_toward(velocity.x, 0, speed)

    move_and_slide()

    # Check collisions after move_and_slide
    for i in get_slide_collision_count():
        var collision := get_slide_collision(i)
        var collider := collision.get_collider()
        if collider.is_in_group("hazards"):
            take_damage(10, collider)


# RigidBody2D -- for physics-driven objects (engine controls motion)
extends RigidBody2D

@export var explosion_force: float = 500.0

func explode(origin: Vector2) -> void:
    var direction := (global_position - origin).normalized()
    apply_impulse(direction * explosion_force)

# Do NOT set position directly on RigidBody -- use forces/impulses


# Area2D -- for detection zones (no physics response)
extends Area2D

signal item_collected(item: Node2D)

func _ready() -> void:
    body_entered.connect(_on_body_entered)

func _on_body_entered(body: Node2D) -> void:
    if body.is_in_group("players"):
        item_collected.emit(self)
        queue_free()


# CharacterBody3D -- 3D character movement
extends CharacterBody3D

@export var speed: float = 5.0
@export var mouse_sensitivity: float = 0.002

func _physics_process(delta: float) -> void:
    var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
    var direction := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()

    if direction:
        velocity.x = direction.x * speed
        velocity.z = direction.z * speed
    else:
        velocity.x = move_toward(velocity.x, 0, speed)
        velocity.z = move_toward(velocity.z, 0, speed)

    if not is_on_floor():
        velocity += get_gravity() * delta

    move_and_slide()
```

### 5. Input Handling

```gdscript
# Use Input Map actions (Project > Project Settings > Input Map)
# Never hardcode keys -- always use action names

# Polling input in _process or _physics_process
func _physics_process(delta: float) -> void:
    if Input.is_action_pressed("move_right"):
        velocity.x = speed
    if Input.is_action_just_pressed("jump"):
        jump()
    if Input.is_action_just_released("attack"):
        release_attack()

# Event-based input in _unhandled_input (preferred for UI-independent input)
func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("pause"):
        toggle_pause()
        get_viewport().set_input_as_handled()

    if event is InputEventMouseButton:
        if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
            shoot()

    if event is InputEventMouseMotion:
        rotate_camera(event.relative)

# _input for UI-level input (processed before _unhandled_input)
func _input(event: InputEvent) -> void:
    if event.is_action_pressed("ui_cancel"):
        open_menu()

# Input strength for analog sticks
func _physics_process(delta: float) -> void:
    var move_strength := Input.get_action_strength("move_right") - Input.get_action_strength("move_left")
    velocity.x = move_strength * speed

# Input vector for 2D movement
func _physics_process(delta: float) -> void:
    var input_vector := Input.get_vector("move_left", "move_right", "move_up", "move_down")
    velocity = input_vector * speed
    move_and_slide()
```

### 6. Resource Management

```gdscript
# Custom Resource -- data container saved as .tres files
class_name WeaponResource
extends Resource

@export var name: String = ""
@export var damage: int = 10
@export var attack_speed: float = 1.0
@export var range: float = 50.0
@export var icon: Texture2D
@export var projectile_scene: PackedScene

func get_dps() -> float:
    return damage * attack_speed


# Loading resources
var sword: WeaponResource = preload("res://resources/weapons/sword.tres")
var shield: WeaponResource = load("res://resources/weapons/shield.tres")

# Preload vs load:
# preload() -- loads at compile time, use for always-needed resources
# load() -- loads at runtime, use for conditionally-needed resources
# ResourceLoader.load_threaded_request() -- async loading for large resources

# Async resource loading (loading screens)
func load_level_async(path: String) -> void:
    ResourceLoader.load_threaded_request(path)
    # Poll in _process
    while true:
        var status := ResourceLoader.load_threaded_get_status(path)
        match status:
            ResourceLoader.THREAD_LOAD_IN_PROGRESS:
                var progress: Array = []
                ResourceLoader.load_threaded_get_status(path, progress)
                loading_bar.value = progress[0] * 100
                await get_tree().process_frame
            ResourceLoader.THREAD_LOAD_LOADED:
                var scene: PackedScene = ResourceLoader.load_threaded_get(path)
                get_tree().change_scene_to_packed(scene)
                return
            _:
                push_error("Failed to load: " + path)
                return


# Instantiating packed scenes
var enemy_scene: PackedScene = preload("res://scenes/enemies/goblin.tscn")

func spawn_enemy(pos: Vector2) -> void:
    var enemy: CharacterBody2D = enemy_scene.instantiate()
    enemy.global_position = pos
    add_child(enemy)
```

### 7. Autoload Singletons

```gdscript
# Register in Project > Project Settings > Autoload
# Global state managers, audio, scene transitions

# game_manager.gd (autoload as "GameManager")
extends Node

signal score_changed(new_score: int)
signal game_over

var score: int = 0:
    set(value):
        score = value
        score_changed.emit(score)

var high_score: int = 0
var is_paused: bool = false

func add_score(points: int) -> void:
    score += points
    if score > high_score:
        high_score = score

func reset() -> void:
    score = 0

func pause() -> void:
    is_paused = true
    get_tree().paused = true

func unpause() -> void:
    is_paused = false
    get_tree().paused = false


# audio_manager.gd (autoload as "AudioManager")
extends Node

var sfx_players: Array[AudioStreamPlayer] = []
const MAX_SFX_PLAYERS: int = 8

func _ready() -> void:
    for i in MAX_SFX_PLAYERS:
        var player := AudioStreamPlayer.new()
        player.bus = "SFX"
        add_child(player)
        sfx_players.append(player)

func play_sfx(stream: AudioStream, volume_db: float = 0.0) -> void:
    for player in sfx_players:
        if not player.playing:
            player.stream = stream
            player.volume_db = volume_db
            player.play()
            return
    # All players busy -- skip or replace oldest


# Accessing autoloads from any script
func _on_enemy_killed() -> void:
    GameManager.add_score(100)
    AudioManager.play_sfx(kill_sound)
```

### 8. Animation

```gdscript
# AnimationPlayer -- keyframe animation for any property
@onready var anim: AnimationPlayer = $AnimationPlayer

func play_attack() -> void:
    anim.play("attack")
    await anim.animation_finished
    anim.play("idle")

# AnimationTree -- state machine for blending animations
@onready var anim_tree: AnimationTree = $AnimationTree
@onready var state_machine: AnimationNodeStateMachinePlayback = anim_tree["parameters/playback"]

func _physics_process(delta: float) -> void:
    # Blend parameter for walk/run blending
    anim_tree["parameters/walk_run/blend_amount"] = velocity.length() / max_speed

    # State machine transitions
    if is_on_floor():
        if velocity.length() > 0:
            state_machine.travel("walk_run")
        else:
            state_machine.travel("idle")
    else:
        if velocity.y < 0:
            state_machine.travel("jump")
        else:
            state_machine.travel("fall")

# Tween -- procedural animation (no AnimationPlayer needed)
func flash_damage() -> void:
    var tween := create_tween()
    tween.tween_property(sprite, "modulate", Color.RED, 0.1)
    tween.tween_property(sprite, "modulate", Color.WHITE, 0.1)

func scale_bounce() -> void:
    var tween := create_tween()
    tween.set_trans(Tween.TRANS_ELASTIC)
    tween.set_ease(Tween.EASE_OUT)
    tween.tween_property(sprite, "scale", Vector2(1.2, 1.2), 0.1)
    tween.tween_property(sprite, "scale", Vector2.ONE, 0.3)

func fade_out_and_free() -> void:
    var tween := create_tween()
    tween.tween_property(self, "modulate:a", 0.0, 0.5)
    tween.tween_callback(queue_free)
```

### 9. Tilemaps

```gdscript
# TileMapLayer (Godot 4.3+) -- replaces TileMap
extends Node2D

@onready var ground_layer: TileMapLayer = $GroundLayer
@onready var walls_layer: TileMapLayer = $WallsLayer
@onready var decoration_layer: TileMapLayer = $DecorationLayer

# Get tile data
func get_tile_at(world_pos: Vector2) -> int:
    var tile_pos := ground_layer.local_to_map(world_pos)
    return ground_layer.get_cell_source_id(tile_pos)

# Set tiles programmatically
func place_wall(tile_pos: Vector2i) -> void:
    walls_layer.set_cell(tile_pos, 0, Vector2i(0, 0))  # source_id, atlas_coords

func remove_wall(tile_pos: Vector2i) -> void:
    walls_layer.erase_cell(tile_pos)

# Custom data layers on tiles (set in TileSet editor)
func is_walkable(world_pos: Vector2) -> bool:
    var tile_pos := ground_layer.local_to_map(world_pos)
    var data := ground_layer.get_cell_tile_data(tile_pos)
    if data:
        return data.get_custom_data("walkable") as bool
    return false
```

### 10. Shaders

```gdscript
# Applying shaders via ShaderMaterial
@onready var sprite: Sprite2D = $Sprite2D

func set_outline(enabled: bool, color: Color = Color.WHITE) -> void:
    var material := sprite.material as ShaderMaterial
    material.set_shader_parameter("outline_enabled", enabled)
    material.set_shader_parameter("outline_color", color)

# Dissolve effect
func dissolve(duration: float) -> void:
    var material := sprite.material as ShaderMaterial
    var tween := create_tween()
    tween.tween_method(
        func(value: float) -> void:
            material.set_shader_parameter("dissolve_amount", value),
        0.0, 1.0, duration
    )
```

```glsl
// Simple outline shader (outline.gdshader)
shader_type canvas_item;

uniform bool outline_enabled = false;
uniform vec4 outline_color : source_color = vec4(1.0);
uniform float outline_width : hint_range(0.0, 10.0) = 1.0;

void fragment() {
    vec4 col = texture(TEXTURE, UV);

    if (outline_enabled && col.a < 0.5) {
        float a = 0.0;
        vec2 size = TEXTURE_PIXEL_SIZE * outline_width;
        a += texture(TEXTURE, UV + vec2(-size.x, 0)).a;
        a += texture(TEXTURE, UV + vec2(size.x, 0)).a;
        a += texture(TEXTURE, UV + vec2(0, -size.y)).a;
        a += texture(TEXTURE, UV + vec2(0, size.y)).a;

        if (a > 0.0) {
            col = outline_color;
        }
    }

    COLOR = col;
}
```

### 11. Multiplayer (High-Level API)

```gdscript
# Server setup
extends Node

var peer: ENetMultiplayerPeer

func host_game(port: int = 9999, max_clients: int = 4) -> void:
    peer = ENetMultiplayerPeer.new()
    var error := peer.create_server(port, max_clients)
    if error != OK:
        push_error("Failed to create server: " + str(error))
        return
    multiplayer.multiplayer_peer = peer
    multiplayer.peer_connected.connect(_on_peer_connected)
    multiplayer.peer_disconnected.connect(_on_peer_disconnected)

func join_game(address: String = "localhost", port: int = 9999) -> void:
    peer = ENetMultiplayerPeer.new()
    var error := peer.create_client(address, port)
    if error != OK:
        push_error("Failed to connect: " + str(error))
        return
    multiplayer.multiplayer_peer = peer

func _on_peer_connected(id: int) -> void:
    print("Peer connected: ", id)
    spawn_player(id)

func _on_peer_disconnected(id: int) -> void:
    print("Peer disconnected: ", id)
    remove_player(id)


# RPC (Remote Procedure Calls)
extends CharacterBody2D

# Called on all peers
@rpc("any_peer", "call_local", "reliable")
func take_damage(amount: int) -> void:
    health -= amount
    if health <= 0:
        die()

# Called only on authority (server)
@rpc("any_peer", "call_remote", "reliable")
func request_action(action: String) -> void:
    if not multiplayer.is_server():
        return
    # Validate and process on server
    process_action(action)

# Unreliable for frequent updates (position sync)
@rpc("authority", "call_remote", "unreliable")
func sync_position(pos: Vector2, vel: Vector2) -> void:
    global_position = pos
    velocity = vel

func _physics_process(delta: float) -> void:
    if is_multiplayer_authority():
        # Only the authority (owner) moves this character
        handle_input(delta)
        move_and_slide()
        sync_position.rpc(global_position, velocity)


# MultiplayerSpawner -- automatic scene synchronization
# Add MultiplayerSpawner as child, configure spawn path and scenes in editor
# MultiplayerSynchronizer -- automatic property synchronization
# Add MultiplayerSynchronizer as child, configure synced properties in editor
```

### 12. GDExtension for Native Code

```gdscript
# GDExtension allows writing performance-critical code in C/C++/Rust
# and calling it from GDScript

# Using a GDExtension class (after building the extension)
var pathfinder: NativePathfinder = NativePathfinder.new()

func find_path(from: Vector2, to: Vector2) -> PackedVector2Array:
    return pathfinder.calculate_path(from, to)

# gdextension file (my_extension.gdextension)
# [configuration]
# entry_symbol = "my_extension_init"
# compatibility_minimum = "4.2"
#
# [libraries]
# linux.x86_64 = "res://bin/libmy_extension.so"
# windows.x86_64 = "res://bin/my_extension.dll"
# macos = "res://bin/libmy_extension.dylib"
```

### 13. Performance Patterns

```gdscript
# Object pooling -- reuse objects instead of creating/destroying
class_name ObjectPool
extends Node

var pool: Array[Node] = []
var scene: PackedScene

func _init(packed_scene: PackedScene, initial_size: int = 20) -> void:
    scene = packed_scene
    for i in initial_size:
        var obj := scene.instantiate()
        obj.set_process(false)
        obj.visible = false
        pool.append(obj)
        add_child(obj)

func get_object() -> Node:
    for obj in pool:
        if not obj.visible:
            obj.visible = true
            obj.set_process(true)
            return obj
    # Pool exhausted -- grow it
    var obj := scene.instantiate()
    pool.append(obj)
    add_child(obj)
    return obj

func return_object(obj: Node) -> void:
    obj.visible = false
    obj.set_process(false)


# Use call_deferred for non-urgent operations
func _on_enemy_died(enemy: Node) -> void:
    enemy.call_deferred("queue_free")  # Defers to end of frame

# Spatial partitioning with groups
func get_nearby_enemies(pos: Vector2, radius: float) -> Array[Node]:
    var nearby: Array[Node] = []
    for enemy in get_tree().get_nodes_in_group("enemies"):
        if enemy.global_position.distance_to(pos) <= radius:
            nearby.append(enemy)
    return nearby

# For large numbers, use Area2D as detection zone instead of distance checks

# Reduce draw calls
# - Use texture atlases (combine sprites into one texture)
# - Minimize CanvasItem material changes
# - Use visibility notifiers to disable off-screen processing

# Processing optimization
func _ready() -> void:
    # Disable processing when not needed
    set_process(false)
    set_physics_process(false)

func activate() -> void:
    set_process(true)
    set_physics_process(true)

# Use VisibleOnScreenNotifier2D to auto-disable off-screen nodes
@onready var notifier: VisibleOnScreenNotifier2D = $VisibleOnScreenNotifier2D

func _ready() -> void:
    notifier.screen_entered.connect(func(): set_physics_process(true))
    notifier.screen_exited.connect(func(): set_physics_process(false))
```

## Anti-Patterns

| Anti-Pattern | Why It Is Bad | Do This Instead |
|-------------|--------------|----------------|
| `get_node()` with long absolute paths | Breaks when tree changes | Use `$RelativePath` or `%UniqueName` |
| Connecting signals in `_process()` | Duplicate connections every frame | Connect in `_ready()` |
| Using `find_child()` frequently | O(n) tree traversal each call | Cache node references with `@onready` |
| Hardcoding input keys | Cannot be remapped | Use Input Map action names |
| `queue_free()` in physics callbacks | Can cause crashes | Use `call_deferred("queue_free")` |
| Giant autoload scripts | God object, hard to test | Split into focused autoloads |
| Polling in `_process` for rare events | Wastes CPU | Use signals or timers |
| Raw strings for scene paths | Typo-prone, no refactor support | Use `preload()` with const |

## Project Structure

```
project/
  scenes/
    player/
      player.tscn
      player.gd
    enemies/
      goblin.tscn
      goblin.gd
    ui/
      hud.tscn
      main_menu.tscn
    levels/
      level_01.tscn
  scripts/
    autoload/
      game_manager.gd
      audio_manager.gd
      scene_manager.gd
  resources/
    weapons/
      sword.tres
    materials/
    themes/
  assets/
    sprites/
    audio/
      music/
      sfx/
    fonts/
  addons/
  shaders/
  project.godot
  export_presets.cfg
```

## Resources

- **Godot 4 Docs**: https://docs.godotengine.org/en/stable/
- **GDScript Reference**: https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/
- **GDQuest**: https://www.gdquest.com/
- **Godot Shaders**: https://godotshaders.com/
- **Godot Asset Library**: https://godotengine.org/asset-library/
- **Godot Multiplayer Docs**: https://docs.godotengine.org/en/stable/tutorials/networking/
- **GDExtension Docs**: https://docs.godotengine.org/en/stable/tutorials/scripting/gdextension/
