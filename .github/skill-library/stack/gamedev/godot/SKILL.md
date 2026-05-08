---
name: godot
description: "Comprehensive Godot 4.x game development guide covering scene tree architecture, GDScript patterns (signals, exports, @onready), physics systems (CharacterBody2D/3D, RigidBody, Area), input mapping, resource system, autoload singletons, animation, tilemaps, UI system, multiplayer, audio, particles, shaders, GDExtension, export presets, and debugging tools. Use when building games with Godot Engine."
version: 1.0.0
---

# Godot 4.x Game Development

## 1. Scene Tree Architecture

### Node Hierarchy

Every Godot game is a tree of nodes. Scenes are reusable branches of that tree.

```
Game (Node)
  +-- World (Node2D)
  |     +-- Player (CharacterBody2D)
  |     |     +-- Sprite (Sprite2D)
  |     |     +-- Collision (CollisionShape2D)
  |     |     +-- Camera (Camera2D)
  |     +-- Enemies (Node2D)
  |     |     +-- Goblin (CharacterBody2D)
  |     +-- TileMap (TileMapLayer)
  +-- UI (CanvasLayer)
        +-- HUD (Control)
        +-- PauseMenu (Control)
```

### Scene Composition

Scenes are the primary unit of reuse. Each scene is a `.tscn` file.

```gdscript
# Instantiate a scene at runtime
var enemy_scene: PackedScene = preload("res://scenes/enemies/goblin.tscn")

func spawn_enemy(position: Vector2) -> void:
    var enemy: CharacterBody2D = enemy_scene.instantiate()
    enemy.global_position = position
    $Enemies.add_child(enemy)
```

### Scene Ownership Rules

- The root node of a scene owns all its children.
- Nodes added at runtime via `add_child()` are not saved with the scene unless `owner` is set.
- Use `queue_free()` to safely remove nodes (deferred to end of frame).

---

## 2. GDScript Patterns

### Exports and @onready

```gdscript
class_name Player
extends CharacterBody2D

# Exported variables appear in the Inspector
@export var speed: float = 200.0
@export var jump_force: float = -400.0
@export_range(0.0, 1.0, 0.05) var friction: float = 0.1
@export var projectile_scene: PackedScene
@export_enum("Warrior", "Mage", "Rogue") var player_class: int = 0
@export_group("Combat")
@export var max_health: int = 100
@export var attack_damage: int = 10

# @onready resolves node paths when the node enters the tree
@onready var sprite: Sprite2D = $Sprite2D
@onready var anim_player: AnimationPlayer = $AnimationPlayer
@onready var collision: CollisionShape2D = $CollisionShape2D
@onready var ray: RayCast2D = $RayCast2D
```

### Signals

```gdscript
# Define custom signals
signal health_changed(new_health: int, max_health: int)
signal died
signal item_collected(item_name: String)

# Emit signals
func take_damage(amount: int) -> void:
    health -= amount
    health_changed.emit(health, max_health)
    if health <= 0:
        died.emit()

# Connect signals in code
func _ready() -> void:
    # Connect to own signal
    health_changed.connect(_on_health_changed)
    # Connect to child signal
    $HitArea.body_entered.connect(_on_hit_area_body_entered)

func _on_health_changed(new_health: int, _max_health: int) -> void:
    if new_health < 20:
        sprite.modulate = Color.RED

func _on_hit_area_body_entered(body: Node2D) -> void:
    if body.is_in_group("enemies"):
        take_damage(body.attack_damage)
```

### Type Hints and Static Typing

```gdscript
# Always use type hints for clarity and performance
var enemies: Array[CharacterBody2D] = []
var inventory: Dictionary = {}

func calculate_damage(base: int, multiplier: float) -> int:
    return int(base * multiplier)

# Typed arrays
func get_nearby_enemies(radius: float) -> Array[Node2D]:
    var result: Array[Node2D] = []
    for enemy in get_tree().get_nodes_in_group("enemies"):
        if global_position.distance_to(enemy.global_position) < radius:
            result.append(enemy)
    return result
```

### Lifecycle Methods

```gdscript
func _init() -> void:
    # Called when object is created (before _ready)
    pass

func _ready() -> void:
    # Called when node enters the scene tree (children are ready)
    pass

func _process(delta: float) -> void:
    # Called every frame (variable timestep)
    pass

func _physics_process(delta: float) -> void:
    # Called every physics tick (fixed timestep, default 60 Hz)
    pass

func _unhandled_input(event: InputEvent) -> void:
    # Called for input not consumed by UI or _input
    pass

func _enter_tree() -> void:
    # Called when node is added to tree (before _ready on first add)
    pass

func _exit_tree() -> void:
    # Called when node is removed from tree
    pass
```

---

## 3. Physics System

### CharacterBody2D (Platformer)

```gdscript
extends CharacterBody2D

@export var speed: float = 300.0
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
    var direction: float = Input.get_axis("move_left", "move_right")
    if direction != 0.0:
        velocity.x = direction * speed
    else:
        velocity.x = move_toward(velocity.x, 0.0, speed * 0.2)

    move_and_slide()
```

### CharacterBody3D (First Person)

```gdscript
extends CharacterBody3D

@export var speed: float = 5.0
@export var jump_velocity: float = 4.5
@export var mouse_sensitivity: float = 0.002

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")

func _ready() -> void:
    Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseMotion:
        rotate_y(-event.relative.x * mouse_sensitivity)
        $Camera3D.rotate_x(-event.relative.y * mouse_sensitivity)
        $Camera3D.rotation.x = clampf($Camera3D.rotation.x, -PI / 2, PI / 2)

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y -= gravity * delta
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_velocity

    var input_dir: Vector2 = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
    var direction: Vector3 = (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
    if direction != Vector3.ZERO:
        velocity.x = direction.x * speed
        velocity.z = direction.z * speed
    else:
        velocity.x = move_toward(velocity.x, 0.0, speed)
        velocity.z = move_toward(velocity.z, 0.0, speed)

    move_and_slide()
```

### RigidBody2D

```gdscript
extends RigidBody2D

@export var explosion_force: float = 500.0

func _ready() -> void:
    # RigidBody properties
    mass = 2.0
    gravity_scale = 1.0
    linear_damp = 0.5
    angular_damp = 1.0
    # Collision layers
    collision_layer = 2   # What layer this body is ON
    collision_mask = 1     # What layers this body DETECTS

func explode(origin: Vector2) -> void:
    var direction: Vector2 = (global_position - origin).normalized()
    apply_impulse(direction * explosion_force)

func _integrate_forces(state: PhysicsDirectBodyState2D) -> void:
    # Low-level physics override (runs in physics step)
    if state.get_contact_count() > 0:
        var contact_body: Node = state.get_contact_collider_object(0)
        if contact_body.is_in_group("lava"):
            queue_free()
```

### Area2D for Detection

```gdscript
extends Area2D

signal player_entered
signal player_exited

func _ready() -> void:
    body_entered.connect(_on_body_entered)
    body_exited.connect(_on_body_exited)
    # Monitoring detects other bodies; monitorable makes it detectable
    monitoring = true
    monitorable = true

func _on_body_entered(body: Node2D) -> void:
    if body.is_in_group("player"):
        player_entered.emit()

func _on_body_exited(body: Node2D) -> void:
    if body.is_in_group("player"):
        player_exited.emit()
```

---

## 4. Input Mapping

### Project Settings Input Map

Define actions in Project > Project Settings > Input Map:

```
# Common input actions
move_left:   A, Left Arrow, Joystick Left
move_right:  D, Right Arrow, Joystick Right
move_up:     W, Up Arrow, Joystick Up
move_down:   S, Down Arrow, Joystick Down
jump:        Space, Joystick Button 0
attack:      Left Click, Joystick Button 2
interact:    E, Joystick Button 1
pause:       Escape, Joystick Start
```

### Input Handling Patterns

```gdscript
# Polling (in _process or _physics_process)
func _physics_process(_delta: float) -> void:
    var move: Vector2 = Input.get_vector("move_left", "move_right", "move_up", "move_down")
    velocity = move * speed
    move_and_slide()

# Event-based (in _unhandled_input)
func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("interact"):
        interact_with_nearest()
        get_viewport().set_input_as_handled()

    if event.is_action_pressed("pause"):
        toggle_pause()

# Check action strength (analog sticks)
var aim_x: float = Input.get_action_strength("aim_right") - Input.get_action_strength("aim_left")
var aim_y: float = Input.get_action_strength("aim_down") - Input.get_action_strength("aim_up")
var aim: Vector2 = Vector2(aim_x, aim_y)
```

---

## 5. Resource System

### Custom Resources

```gdscript
# weapon_data.gd
class_name WeaponData
extends Resource

@export var name: String = ""
@export var damage: int = 10
@export var attack_speed: float = 1.0
@export var range: float = 50.0
@export var icon: Texture2D
@export var swing_animation: SpriteFrames
@export_multiline var description: String = ""
```

Usage:

```gdscript
# Create .tres files in the editor or load at runtime
@export var weapon: WeaponData

func attack() -> void:
    var damage: int = weapon.damage
    var speed: float = weapon.attack_speed
    apply_damage_in_range(damage, weapon.range)
```

### Preload vs Load

```gdscript
# preload -- resolved at compile time, instant access, increases load time
const EXPLOSION_SCENE: PackedScene = preload("res://effects/explosion.tscn")

# load -- resolved at runtime, may cause hitches if not cached
func load_level(level_name: String) -> PackedScene:
    return load("res://levels/" + level_name + ".tscn") as PackedScene

# ResourceLoader for async loading
func load_level_async(path: String) -> void:
    ResourceLoader.load_threaded_request(path)

func _process(_delta: float) -> void:
    var status: ResourceLoader.ThreadLoadStatus = ResourceLoader.load_threaded_get_status(path)
    if status == ResourceLoader.THREAD_LOAD_LOADED:
        var scene: PackedScene = ResourceLoader.load_threaded_get(path)
        get_tree().change_scene_to_packed(scene)
```

---

## 6. Autoload Singletons

Register in Project > Project Settings > Autoload.

```gdscript
# game_manager.gd (autoload as GameManager)
extends Node

signal game_state_changed(new_state: String)

enum State { MENU, PLAYING, PAUSED, GAME_OVER }

var current_state: State = State.MENU
var score: int = 0
var high_score: int = 0

func change_state(new_state: State) -> void:
    current_state = new_state
    game_state_changed.emit(State.keys()[new_state])

func add_score(points: int) -> void:
    score += points
    if score > high_score:
        high_score = score

func reset() -> void:
    score = 0
    change_state(State.PLAYING)
```

```gdscript
# audio_manager.gd (autoload as AudioManager)
extends Node

var music_bus: int = AudioServer.get_bus_index("Music")
var sfx_bus: int = AudioServer.get_bus_index("SFX")

@onready var music_player: AudioStreamPlayer = $MusicPlayer

func play_music(stream: AudioStream, fade_in: float = 1.0) -> void:
    music_player.stream = stream
    music_player.volume_db = -80.0
    music_player.play()
    var tween: Tween = create_tween()
    tween.tween_property(music_player, "volume_db", 0.0, fade_in)

func play_sfx(stream: AudioStream, position: Vector2 = Vector2.ZERO) -> void:
    var player: AudioStreamPlayer2D = AudioStreamPlayer2D.new()
    player.stream = stream
    player.bus = "SFX"
    player.global_position = position
    add_child(player)
    player.play()
    player.finished.connect(player.queue_free)

func set_music_volume(linear: float) -> void:
    AudioServer.set_bus_volume_db(music_bus, linear_to_db(linear))

func set_sfx_volume(linear: float) -> void:
    AudioServer.set_bus_volume_db(sfx_bus, linear_to_db(linear))
```

Access from anywhere:

```gdscript
GameManager.add_score(100)
AudioManager.play_sfx(hit_sound, global_position)
```

---

## 7. Animation

### AnimationPlayer

```gdscript
@onready var anim: AnimationPlayer = $AnimationPlayer

func _ready() -> void:
    anim.animation_finished.connect(_on_animation_finished)

func play_attack() -> void:
    anim.play("attack")

func _on_animation_finished(anim_name: StringName) -> void:
    if anim_name == "attack":
        anim.play("idle")
```

### AnimationTree (State Machine)

```gdscript
@onready var anim_tree: AnimationTree = $AnimationTree
@onready var state_machine: AnimationNodeStateMachinePlayback = anim_tree.get(
    "parameters/playback"
)

func _physics_process(_delta: float) -> void:
    if velocity.length() > 10.0:
        state_machine.travel("run")
    else:
        state_machine.travel("idle")

    # Blend parameter for blend trees
    anim_tree.set("parameters/blend_position", velocity.normalized())

func attack() -> void:
    state_machine.travel("attack")
```

### Tweens (Procedural Animation)

```gdscript
func flash_white() -> void:
    var tween: Tween = create_tween()
    tween.tween_property(sprite, "modulate", Color.WHITE, 0.05)
    tween.tween_property(sprite, "modulate", Color(1, 1, 1, 1), 0.15)

func shake_camera(intensity: float, duration: float) -> void:
    var tween: Tween = create_tween()
    for i in range(10):
        var offset: Vector2 = Vector2(
            randf_range(-intensity, intensity),
            randf_range(-intensity, intensity)
        )
        tween.tween_property(camera, "offset", offset, duration / 10.0)
    tween.tween_property(camera, "offset", Vector2.ZERO, 0.05)

func move_to(target: Vector2, duration: float) -> void:
    var tween: Tween = create_tween()
    tween.set_ease(Tween.EASE_OUT)
    tween.set_trans(Tween.TRANS_CUBIC)
    tween.tween_property(self, "global_position", target, duration)
    await tween.finished
```

---

## 8. TileMaps and Terrain

### TileMapLayer (Godot 4.3+)

```gdscript
@onready var ground: TileMapLayer = $GroundLayer
@onready var walls: TileMapLayer = $WallsLayer

func place_tile(grid_pos: Vector2i) -> void:
    # set_cell(coords, source_id, atlas_coords, alternative_tile)
    ground.set_cell(grid_pos, 0, Vector2i(0, 0))

func remove_tile(grid_pos: Vector2i) -> void:
    ground.erase_cell(grid_pos)

func world_to_grid(world_pos: Vector2) -> Vector2i:
    return ground.local_to_map(ground.to_local(world_pos))

func grid_to_world(grid_pos: Vector2i) -> Vector2:
    return ground.to_global(ground.map_to_local(grid_pos))

func get_tile_at(world_pos: Vector2) -> int:
    var grid_pos: Vector2i = world_to_grid(world_pos)
    return ground.get_cell_source_id(grid_pos)
```

---

## 9. UI System (Control Nodes)

### Common UI Structure

```
UIRoot (CanvasLayer)
  +-- HUD (Control - anchored full rect)
  |     +-- HealthBar (ProgressBar)
  |     +-- ScoreLabel (Label)
  |     +-- Minimap (SubViewportContainer)
  +-- PauseMenu (Control - centered, initially hidden)
  |     +-- Panel (PanelContainer)
  |           +-- VBox (VBoxContainer)
  |                 +-- ResumeButton (Button)
  |                 +-- SettingsButton (Button)
  |                 +-- QuitButton (Button)
  +-- DialogBox (Control)
```

### UI Script Pattern

```gdscript
extends Control

@onready var health_bar: ProgressBar = $HUD/HealthBar
@onready var score_label: Label = $HUD/ScoreLabel
@onready var pause_menu: Control = $PauseMenu

func _ready() -> void:
    pause_menu.visible = false
    # Connect to autoload signals
    GameManager.game_state_changed.connect(_on_game_state_changed)
    # Connect buttons
    $PauseMenu/Panel/VBox/ResumeButton.pressed.connect(_on_resume)
    $PauseMenu/Panel/VBox/QuitButton.pressed.connect(_on_quit)

func update_health(current: int, maximum: int) -> void:
    health_bar.max_value = maximum
    health_bar.value = current

func update_score(score: int) -> void:
    score_label.text = "Score: %d" % score

func _on_resume() -> void:
    get_tree().paused = false
    pause_menu.visible = false

func _on_quit() -> void:
    get_tree().quit()

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("pause"):
        get_tree().paused = not get_tree().paused
        pause_menu.visible = get_tree().paused
        get_viewport().set_input_as_handled()
```

### Theme System

```gdscript
# Apply themes in code
var theme: Theme = load("res://themes/dark_theme.tres")
control_node.theme = theme

# Override individual properties
button.add_theme_color_override("font_color", Color.YELLOW)
button.add_theme_font_size_override("font_size", 24)
label.add_theme_stylebox_override("normal", custom_stylebox)
```

---

## 10. Multiplayer (High-Level API)

### Server/Client Setup

```gdscript
# network_manager.gd (autoload)
extends Node

const PORT: int = 9999
const MAX_CLIENTS: int = 8

signal player_connected(peer_id: int)
signal player_disconnected(peer_id: int)

var players: Dictionary = {}

func host_game() -> void:
    var peer: ENetMultiplayerPeer = ENetMultiplayerPeer.new()
    peer.create_server(PORT, MAX_CLIENTS)
    multiplayer.multiplayer_peer = peer
    multiplayer.peer_connected.connect(_on_peer_connected)
    multiplayer.peer_disconnected.connect(_on_peer_disconnected)

func join_game(address: String) -> void:
    var peer: ENetMultiplayerPeer = ENetMultiplayerPeer.new()
    peer.create_client(address, PORT)
    multiplayer.multiplayer_peer = peer

func _on_peer_connected(id: int) -> void:
    player_connected.emit(id)

func _on_peer_disconnected(id: int) -> void:
    players.erase(id)
    player_disconnected.emit(id)
```

### RPCs

```gdscript
# Remote Procedure Calls
@rpc("any_peer", "reliable")
func register_player(player_name: String) -> void:
    var sender_id: int = multiplayer.get_remote_sender_id()
    players[sender_id] = {"name": player_name}

@rpc("authority", "unreliable")
func sync_position(pos: Vector2) -> void:
    global_position = pos

# Call RPCs
func _physics_process(_delta: float) -> void:
    if is_multiplayer_authority():
        # Send position to all peers
        sync_position.rpc(global_position)
```

### MultiplayerSpawner and MultiplayerSynchronizer

```gdscript
# Add MultiplayerSpawner as a child of the node that owns spawnable scenes
# Configure spawn path and auto-spawn list in the Inspector

# MultiplayerSynchronizer automatically syncs properties
# Configure in Inspector: which properties to sync, authority, sync interval
```

---

## 11. Shader Language

### Visual Shader vs Written Shader

```glsl
// Simple 2D dissolve shader (res://shaders/dissolve.gdshader)
shader_type canvas_item;

uniform float dissolve_amount : hint_range(0.0, 1.0) = 0.0;
uniform sampler2D noise_texture;
uniform vec4 edge_color : source_color = vec4(1.0, 0.5, 0.0, 1.0);
uniform float edge_width : hint_range(0.0, 0.2) = 0.05;

void fragment() {
    vec4 tex_color = texture(TEXTURE, UV);
    float noise = texture(noise_texture, UV).r;

    if (noise < dissolve_amount) {
        discard;
    }

    if (noise < dissolve_amount + edge_width) {
        COLOR = edge_color;
    } else {
        COLOR = tex_color;
    }
}
```

### Applying Shaders in GDScript

```gdscript
@onready var sprite: Sprite2D = $Sprite2D

func dissolve(duration: float) -> void:
    var material: ShaderMaterial = sprite.material as ShaderMaterial
    var tween: Tween = create_tween()
    tween.tween_method(
        func(value: float) -> void: material.set_shader_parameter("dissolve_amount", value),
        0.0, 1.0, duration
    )
    await tween.finished
    queue_free()
```

---

## 12. Particle Systems

### GPUParticles2D

```gdscript
@onready var particles: GPUParticles2D = $GPUParticles2D

func emit_burst(count: int) -> void:
    particles.amount = count
    particles.emitting = true
    # One-shot particles auto-stop

# Configure ParticleProcessMaterial in Inspector:
# - Direction, spread, velocity
# - Gravity
# - Scale curve
# - Color gradient
# - Emission shape (point, sphere, box, ring)
```

### CPUParticles2D (Fallback)

```gdscript
# Use CPUParticles2D when GPU particles are not supported
# or when you need direct control over each particle
# Same API but runs on CPU -- suitable for small particle counts
```

---

## 13. GDExtension (Native Performance)

### When to Use GDExtension

- Performance-critical code (pathfinding, procedural generation)
- Integrating C/C++ libraries
- Custom physics or rendering

### Setup with godot-cpp

```
project/
  +-- src/
  |     +-- my_node.h
  |     +-- my_node.cpp
  |     +-- register_types.h
  |     +-- register_types.cpp
  +-- godot-cpp/          (submodule)
  +-- SConstruct
  +-- my_extension.gdextension
```

```ini
; my_extension.gdextension
[configuration]
entry_symbol = "my_extension_init"
compatibility_minimum = 4.2

[libraries]
linux.x86_64 = "res://bin/libmyextension.linux.x86_64.so"
windows.x86_64 = "res://bin/libmyextension.windows.x86_64.dll"
macos.universal = "res://bin/libmyextension.macos.universal.dylib"
```

---

## 14. Export and Deployment

### Export Presets

Configure in Project > Export:

```
# Common export settings
- Application > Name
- Application > Icon
- Binary Format > 64-bit
- Resources > Include filters: *.tscn, *.tres, *.gd
- Resources > Exclude filters: *.import, *.md

# Platform-specific
- Windows: embed PCK, sign executable
- Linux: AppImage or direct binary
- macOS: App bundle, notarization
- Android: keystore, permissions, min SDK
- Web: Thread support, GDExtension not supported
- iOS: provisioning profile, entitlements
```

### Feature Tags

```gdscript
# Check platform at runtime
if OS.has_feature("web"):
    # Disable unsupported features for web export
    pass
elif OS.has_feature("mobile"):
    # Touch-friendly UI
    pass
elif OS.has_feature("pc"):
    # Keyboard/mouse defaults
    pass

# Custom feature tags for debug/release
if OS.has_feature("debug"):
    print("Debug build")
```

---

## 15. Debugging Tools

### Built-in Debugger

```gdscript
# Print debugging
print("Player position: ", global_position)
print_rich("[color=red]Error:[/color] Invalid state")
push_warning("Deprecated function called")
push_error("Critical failure in combat system")

# Breakpoints: click the gutter in the script editor
# Step through code with F10 (step over), F11 (step into)

# Assert for development checks (disabled in release)
assert(health >= 0, "Health cannot be negative")
assert(weapon != null, "Weapon must be assigned")

# Remote scene tree inspector (run game, click "Remote" tab)
# Profiler (Debugger > Profiler) for frame timing
# Network profiler for multiplayer debugging
```

### Draw Debug Shapes

```gdscript
func _draw() -> void:
    # Only works on Node2D/Control
    draw_circle(Vector2.ZERO, detection_radius, Color(1, 0, 0, 0.3))
    draw_line(Vector2.ZERO, velocity, Color.GREEN, 2.0)
    draw_rect(Rect2(-16, -16, 32, 32), Color.BLUE, false, 2.0)

func update_debug() -> void:
    queue_redraw()  # Forces _draw to be called again
```

---

## 16. Common Patterns

### State Machine

```gdscript
class_name StateMachine
extends Node

@export var initial_state: State

var current_state: State
var states: Dictionary = {}

func _ready() -> void:
    for child in get_children():
        if child is State:
            states[child.name.to_lower()] = child
            child.state_machine = self
    if initial_state:
        current_state = initial_state
        current_state.enter()

func transition_to(state_name: String) -> void:
    var new_state: State = states.get(state_name.to_lower())
    if new_state == null or new_state == current_state:
        return
    current_state.exit()
    current_state = new_state
    current_state.enter()

func _process(delta: float) -> void:
    current_state.update(delta)

func _physics_process(delta: float) -> void:
    current_state.physics_update(delta)
```

```gdscript
# state.gd (base class)
class_name State
extends Node

var state_machine: StateMachine

func enter() -> void:
    pass

func exit() -> void:
    pass

func update(_delta: float) -> void:
    pass

func physics_update(_delta: float) -> void:
    pass
```

### Object Pooling

```gdscript
class_name ObjectPool
extends Node

@export var scene: PackedScene
@export var pool_size: int = 20

var pool: Array[Node] = []

func _ready() -> void:
    for i in range(pool_size):
        var instance: Node = scene.instantiate()
        instance.set_process(false)
        instance.visible = false
        add_child(instance)
        pool.append(instance)

func get_instance() -> Node:
    for obj in pool:
        if not obj.visible:
            obj.visible = true
            obj.set_process(true)
            return obj
    # Pool exhausted -- expand
    var instance: Node = scene.instantiate()
    add_child(instance)
    pool.append(instance)
    return instance

func return_instance(obj: Node) -> void:
    obj.visible = false
    obj.set_process(false)
```

### Save/Load System

```gdscript
const SAVE_PATH: String = "user://savegame.json"

func save_game() -> void:
    var save_data: Dictionary = {
        "player": {
            "position": {"x": player.global_position.x, "y": player.global_position.y},
            "health": player.health,
            "score": GameManager.score,
        },
        "level": get_tree().current_scene.scene_file_path,
        "timestamp": Time.get_unix_time_from_system(),
    }
    var file: FileAccess = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
    file.store_string(JSON.stringify(save_data, "\t"))

func load_game() -> void:
    if not FileAccess.file_exists(SAVE_PATH):
        return
    var file: FileAccess = FileAccess.open(SAVE_PATH, FileAccess.READ)
    var data: Dictionary = JSON.parse_string(file.get_as_text())
    if data == null:
        push_error("Failed to parse save file")
        return
    player.global_position = Vector2(data.player.position.x, data.player.position.y)
    player.health = data.player.health
    GameManager.score = data.player.score
```

---

## 17. Anti-Patterns

### NEVER

- Put game logic in `_process` that belongs in `_physics_process` (physics must be deterministic)
- Use `get_node()` with hardcoded absolute paths from unrelated scenes (use signals or groups)
- Modify children of a node during `_process` iteration (defer with `call_deferred`)
- Ignore `delta` in movement calculations (framerate-dependent movement)
- Use `load()` in `_process` or `_physics_process` (cache with `preload` or load in `_ready`)
- Create circular signal connections (A signals B signals A)
- Forget `queue_free()` on dynamically spawned nodes (memory leak)
- Use `$NodePath` without `@onready` in variable declarations (node not ready yet)

### ALWAYS

- Use `move_and_slide()` for CharacterBody movement (handles collisions correctly)
- Use `is_on_floor()` after `move_and_slide()` for ground detection
- Free nodes with `queue_free()` instead of `free()` (deferred is safer)
- Use groups for cross-cutting concerns (`"enemies"`, `"interactables"`, `"saveable"`)
- Use typed variables and return types for better editor support and performance
- Organize scenes into logical directories (`scenes/`, `scripts/`, `resources/`, `shaders/`)
- Use `@export` for designer-tunable values instead of hardcoding
- Test on target platforms early (especially web and mobile)
