---
name: unity
description: "Comprehensive Unity game development guide (2022+) covering ECS vs MonoBehaviour patterns, component architecture, ScriptableObjects, new Input System, Addressables, Cinemachine, Timeline, UI Toolkit vs UGUI, physics, animation, async patterns, object pooling, NavMesh, rendering pipelines (URP/HDRP), multiplayer (Netcode for GameObjects), testing, and DOTS/Burst for performance. Use when building games with Unity."
version: 1.0.0
---

# Unity Game Development (2022+)

## 1. Component Architecture

### MonoBehaviour Lifecycle

```csharp
using UnityEngine;

public class Player : MonoBehaviour
{
    // Called once when the script instance is loaded
    private void Awake()
    {
        // Initialize references (runs before Start, even if disabled)
        _rigidbody = GetComponent<Rigidbody>();
        _animator = GetComponent<Animator>();
    }

    // Called once before the first frame (only if enabled)
    private void Start()
    {
        // Initialize state that depends on other objects being ready
        _health = _stats.MaxHealth;
    }

    // Called every frame (variable timestep)
    private void Update()
    {
        // Input, UI updates, non-physics logic
        HandleInput();
        UpdateAnimations();
    }

    // Called at fixed intervals (physics timestep, default 0.02s)
    private void FixedUpdate()
    {
        // Physics movement, forces, raycasts
        MoveCharacter();
    }

    // Called after all Update functions
    private void LateUpdate()
    {
        // Camera follow, UI updates that depend on movement
        UpdateCameraFollow();
    }

    private void OnEnable()  { /* Subscribe to events */ }
    private void OnDisable() { /* Unsubscribe from events */ }
    private void OnDestroy() { /* Final cleanup */ }
}
```

### Component Communication

```csharp
// PREFERRED: Events and interfaces over direct references
public interface IDamageable
{
    void TakeDamage(float amount, DamageType type);
    float CurrentHealth { get; }
}

public class Health : MonoBehaviour, IDamageable
{
    [SerializeField] private float _maxHealth = 100f;

    public float CurrentHealth { get; private set; }

    // C# events for decoupled communication
    public event System.Action<float, float> OnHealthChanged;
    public event System.Action OnDeath;

    private void Awake()
    {
        CurrentHealth = _maxHealth;
    }

    public void TakeDamage(float amount, DamageType type)
    {
        CurrentHealth = Mathf.Max(0f, CurrentHealth - amount);
        OnHealthChanged?.Invoke(CurrentHealth, _maxHealth);

        if (CurrentHealth <= 0f)
        {
            OnDeath?.Invoke();
        }
    }
}

// Usage: query interfaces instead of concrete types
public class Projectile : MonoBehaviour
{
    [SerializeField] private float _damage = 25f;

    private void OnTriggerEnter(Collider other)
    {
        if (other.TryGetComponent<IDamageable>(out var damageable))
        {
            damageable.TakeDamage(_damage, DamageType.Projectile);
            Destroy(gameObject);
        }
    }
}
```

### Serialization Patterns

```csharp
public class EnemySpawner : MonoBehaviour
{
    // Visible in Inspector, private in code
    [SerializeField] private GameObject _enemyPrefab;
    [SerializeField] private Transform[] _spawnPoints;
    [SerializeField] private float _spawnInterval = 2f;
    [SerializeField, Range(1, 50)] private int _maxEnemies = 10;

    // Headers and tooltips for Inspector organization
    [Header("Difficulty")]
    [Tooltip("Multiplier applied to enemy health per wave")]
    [SerializeField] private float _healthMultiplier = 1.1f;

    [Space(10)]
    [SerializeField] private bool _enableBossWaves = true;

    // Hide public fields from Inspector
    [HideInInspector] public int CurrentWave;
}
```

---

## 2. ScriptableObjects for Data

### Data Containers

```csharp
[CreateAssetMenu(fileName = "New Weapon", menuName = "Game/Weapon Data")]
public class WeaponData : ScriptableObject
{
    [Header("Identity")]
    public string WeaponName;
    public Sprite Icon;
    [TextArea(3, 5)] public string Description;

    [Header("Stats")]
    public float Damage = 10f;
    public float AttackSpeed = 1f;
    public float Range = 2f;
    public DamageType Type = DamageType.Physical;

    [Header("Visual")]
    public GameObject ModelPrefab;
    public AudioClip AttackSound;
    public ParticleSystem HitEffect;
}
```

### Event Channels (Decoupled Communication)

```csharp
// ScriptableObject as event channel -- no direct references needed
[CreateAssetMenu(menuName = "Events/Void Event")]
public class VoidEventChannel : ScriptableObject
{
    private readonly HashSet<System.Action> _listeners = new();

    public void Register(System.Action listener) => _listeners.Add(listener);
    public void Unregister(System.Action listener) => _listeners.Remove(listener);

    public void Raise()
    {
        foreach (var listener in _listeners)
        {
            listener?.Invoke();
        }
    }
}

[CreateAssetMenu(menuName = "Events/Int Event")]
public class IntEventChannel : ScriptableObject
{
    private readonly HashSet<System.Action<int>> _listeners = new();

    public void Register(System.Action<int> listener) => _listeners.Add(listener);
    public void Unregister(System.Action<int> listener) => _listeners.Remove(listener);

    public void Raise(int value)
    {
        foreach (var listener in _listeners)
        {
            listener?.Invoke(value);
        }
    }
}

// Usage
public class ScoreManager : MonoBehaviour
{
    [SerializeField] private IntEventChannel _onScoreChanged;
    private int _score;

    public void AddScore(int points)
    {
        _score += points;
        _onScoreChanged.Raise(_score);
    }
}

public class ScoreUI : MonoBehaviour
{
    [SerializeField] private IntEventChannel _onScoreChanged;
    [SerializeField] private TMPro.TMP_Text _scoreText;

    private void OnEnable() => _onScoreChanged.Register(UpdateScore);
    private void OnDisable() => _onScoreChanged.Unregister(UpdateScore);

    private void UpdateScore(int score)
    {
        _scoreText.text = $"Score: {score}";
    }
}
```

---

## 3. New Input System

### Input Actions Setup

```csharp
// PlayerInput component reads from InputActionAsset (.inputactions file)
// Configure in the Input Actions editor:
//   Action Map: "Player"
//     Move:    Vector2 (WASD, Left Stick)
//     Jump:    Button  (Space, South Button)
//     Attack:  Button  (Left Click, West Button)
//     Look:    Vector2 (Mouse Delta, Right Stick)

// Generated C# class from .inputactions file
using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerController : MonoBehaviour
{
    [SerializeField] private float _speed = 5f;
    [SerializeField] private float _jumpForce = 10f;

    private PlayerInputActions _input;
    private Rigidbody _rb;
    private Vector2 _moveInput;

    private void Awake()
    {
        _input = new PlayerInputActions();
        _rb = GetComponent<Rigidbody>();
    }

    private void OnEnable()
    {
        _input.Player.Enable();
        _input.Player.Jump.performed += OnJump;
        _input.Player.Attack.performed += OnAttack;
    }

    private void OnDisable()
    {
        _input.Player.Jump.performed -= OnJump;
        _input.Player.Attack.performed -= OnAttack;
        _input.Player.Disable();
    }

    private void Update()
    {
        _moveInput = _input.Player.Move.ReadValue<Vector2>();
    }

    private void FixedUpdate()
    {
        Vector3 move = new Vector3(_moveInput.x, 0f, _moveInput.y) * _speed;
        _rb.MovePosition(_rb.position + move * Time.fixedDeltaTime);
    }

    private void OnJump(InputAction.CallbackContext ctx)
    {
        if (IsGrounded())
        {
            _rb.AddForce(Vector3.up * _jumpForce, ForceMode.Impulse);
        }
    }

    private void OnAttack(InputAction.CallbackContext ctx)
    {
        // Trigger attack animation and damage
    }

    private bool IsGrounded()
    {
        return Physics.Raycast(transform.position, Vector3.down, 1.1f);
    }
}
```

---

## 4. Addressables (Asset Management)

```csharp
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;

public class LevelLoader : MonoBehaviour
{
    [SerializeField] private AssetReference _levelPrefab;

    private AsyncOperationHandle<GameObject> _handle;

    public async void LoadLevel()
    {
        _handle = Addressables.InstantiateAsync(_levelPrefab);
        await _handle.Task;

        if (_handle.Status == AsyncOperationStatus.Succeeded)
        {
            Debug.Log("Level loaded successfully");
        }
        else
        {
            Debug.LogError("Failed to load level");
        }
    }

    // CRITICAL: Always release addressable handles
    private void OnDestroy()
    {
        if (_handle.IsValid())
        {
            Addressables.ReleaseInstance(_handle);
        }
    }
}

// Preload assets
public class AssetPreloader : MonoBehaviour
{
    [SerializeField] private AssetLabelReference _preloadLabel;

    private AsyncOperationHandle _downloadHandle;

    public async void PreloadAssets()
    {
        var sizeHandle = Addressables.GetDownloadSizeAsync(_preloadLabel);
        await sizeHandle.Task;

        long downloadSize = sizeHandle.Result;
        if (downloadSize > 0)
        {
            _downloadHandle = Addressables.DownloadDependenciesAsync(_preloadLabel);
            await _downloadHandle.Task;
        }
    }
}
```

---

## 5. Cinemachine (Camera)

```csharp
using UnityEngine;
using Unity.Cinemachine;

// Cinemachine cameras are configured primarily in the Inspector.
// Each virtual camera has Priority -- highest active priority wins.

public class CameraManager : MonoBehaviour
{
    [SerializeField] private CinemachineCamera _followCam;
    [SerializeField] private CinemachineCamera _aimCam;
    [SerializeField] private CinemachineCamera _cutsceneCam;

    public void SwitchToAim()
    {
        _followCam.Priority = 0;
        _aimCam.Priority = 10;
    }

    public void SwitchToFollow()
    {
        _aimCam.Priority = 0;
        _followCam.Priority = 10;
    }

    // Camera shake via Impulse
    public void ShakeCamera(Vector3 velocity)
    {
        var impulse = GetComponent<CinemachineImpulseSource>();
        impulse.GenerateImpulse(velocity);
    }
}
```

---

## 6. Physics

### Rigidbody and Colliders

```csharp
public class PhysicsObject : MonoBehaviour
{
    [SerializeField] private float _moveForce = 10f;
    private Rigidbody _rb;

    private void Awake()
    {
        _rb = GetComponent<Rigidbody>();
        // Configure physics
        _rb.interpolation = RigidbodyInterpolation.Interpolate;
        _rb.collisionDetectionMode = CollisionDetectionMode.Continuous;
    }

    private void FixedUpdate()
    {
        // Apply forces in FixedUpdate only
        _rb.AddForce(Vector3.forward * _moveForce);
    }

    // Collision callbacks (requires Collider, NOT trigger)
    private void OnCollisionEnter(Collision collision)
    {
        ContactPoint contact = collision.GetContact(0);
        Debug.Log($"Hit {collision.gameObject.name} at {contact.point}");
    }

    // Trigger callbacks (Collider with Is Trigger = true)
    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Collectible"))
        {
            Destroy(other.gameObject);
        }
    }
}
```

### Raycasting

```csharp
public class RaycastShooter : MonoBehaviour
{
    [SerializeField] private float _range = 100f;
    [SerializeField] private LayerMask _hitLayers;
    [SerializeField] private float _damage = 25f;

    public void Shoot()
    {
        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);

        if (Physics.Raycast(ray, out RaycastHit hit, _range, _hitLayers))
        {
            if (hit.collider.TryGetComponent<IDamageable>(out var target))
            {
                target.TakeDamage(_damage, DamageType.Projectile);
            }

            // Spawn impact effect at hit point
            SpawnImpact(hit.point, hit.normal);
        }
    }

    // SphereCast for wider detection (melee attacks)
    public bool CheckMeleeHit(out RaycastHit hit)
    {
        return Physics.SphereCast(
            transform.position,
            0.5f,                    // radius
            transform.forward,
            out hit,
            2f,                      // max distance
            _hitLayers
        );
    }
}
```

---

## 7. Animation

### Animator Controller

```csharp
public class CharacterAnimator : MonoBehaviour
{
    private Animator _animator;
    private static readonly int SpeedHash = Animator.StringToHash("Speed");
    private static readonly int JumpHash = Animator.StringToHash("Jump");
    private static readonly int AttackHash = Animator.StringToHash("Attack");
    private static readonly int IsGroundedHash = Animator.StringToHash("IsGrounded");
    private static readonly int DieHash = Animator.StringToHash("Die");

    private void Awake()
    {
        _animator = GetComponent<Animator>();
    }

    public void SetSpeed(float speed)
    {
        // Use hashed parameter names for performance
        _animator.SetFloat(SpeedHash, speed);
    }

    public void TriggerJump() => _animator.SetTrigger(JumpHash);
    public void TriggerAttack() => _animator.SetTrigger(AttackHash);
    public void SetGrounded(bool grounded) => _animator.SetBool(IsGroundedHash, grounded);
    public void TriggerDeath() => _animator.SetTrigger(DieHash);

    // Animation Events (called from animation clips)
    public void OnAttackHit()
    {
        // Deal damage at the exact frame configured in the animation
    }

    public void OnFootstep()
    {
        // Play footstep sound
    }
}
```

### Blend Trees

```
// Configure in Animator window:
// 1D Blend Tree: Speed (0=idle, 0.5=walk, 1=run)
// 2D Blend Tree: MoveX + MoveY (directional movement)

// Set blend parameters from code:
_animator.SetFloat("MoveX", moveInput.x);
_animator.SetFloat("MoveY", moveInput.y);
```

---

## 8. Async Patterns

### Coroutines

```csharp
public class SpawnManager : MonoBehaviour
{
    [SerializeField] private GameObject _enemyPrefab;
    [SerializeField] private float _spawnDelay = 2f;

    private Coroutine _spawnRoutine;

    private void Start()
    {
        _spawnRoutine = StartCoroutine(SpawnLoop());
    }

    private IEnumerator SpawnLoop()
    {
        while (true)
        {
            SpawnEnemy();
            yield return new WaitForSeconds(_spawnDelay);
        }
    }

    private IEnumerator FadeOut(CanvasGroup group, float duration)
    {
        float elapsed = 0f;
        float startAlpha = group.alpha;

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            group.alpha = Mathf.Lerp(startAlpha, 0f, elapsed / duration);
            yield return null; // Wait one frame
        }

        group.alpha = 0f;
    }

    private void OnDisable()
    {
        if (_spawnRoutine != null)
        {
            StopCoroutine(_spawnRoutine);
        }
    }
}
```

### Async/Await with UniTask

```csharp
// Install via Package Manager: com.cysharp.unitask
using Cysharp.Threading.Tasks;
using UnityEngine;

public class AsyncExample : MonoBehaviour
{
    public async UniTaskVoid LoadAndSpawn()
    {
        // Delay without coroutine
        await UniTask.Delay(System.TimeSpan.FromSeconds(2f));

        // Wait for a condition
        await UniTask.WaitUntil(() => _isReady);

        // Parallel tasks
        var (enemyData, levelData) = await UniTask.WhenAll(
            LoadEnemyDataAsync(),
            LoadLevelDataAsync()
        );

        // Frame-based delay
        await UniTask.DelayFrame(5);

        // Cancellation support
        var cts = new System.Threading.CancellationTokenSource();
        await UniTask.Delay(1000, cancellationToken: cts.Token);
    }

    private void OnDestroy()
    {
        // Cancel pending tasks when destroyed
        this.GetCancellationTokenOnDestroy();
    }
}
```

---

## 9. Object Pooling

```csharp
using UnityEngine;
using UnityEngine.Pool;

public class ProjectilePool : MonoBehaviour
{
    [SerializeField] private Projectile _prefab;
    [SerializeField] private int _defaultCapacity = 20;
    [SerializeField] private int _maxSize = 100;

    private ObjectPool<Projectile> _pool;

    private void Awake()
    {
        _pool = new ObjectPool<Projectile>(
            createFunc: () =>
            {
                var obj = Instantiate(_prefab);
                obj.SetPool(_pool);
                return obj;
            },
            actionOnGet: obj =>
            {
                obj.gameObject.SetActive(true);
            },
            actionOnRelease: obj =>
            {
                obj.gameObject.SetActive(false);
            },
            actionOnDestroy: obj =>
            {
                Destroy(obj.gameObject);
            },
            collectionCheck: true,
            defaultCapacity: _defaultCapacity,
            maxSize: _maxSize
        );
    }

    public Projectile Get() => _pool.Get();
}

// In Projectile.cs
public class Projectile : MonoBehaviour
{
    private ObjectPool<Projectile> _pool;

    public void SetPool(ObjectPool<Projectile> pool) => _pool = pool;

    public void ReturnToPool()
    {
        _pool.Release(this);
    }
}
```

---

## 10. NavMesh Navigation

```csharp
using UnityEngine;
using UnityEngine.AI;

[RequireComponent(typeof(NavMeshAgent))]
public class EnemyAI : MonoBehaviour
{
    [SerializeField] private float _detectionRange = 15f;
    [SerializeField] private float _attackRange = 2f;
    [SerializeField] private float _patrolSpeed = 2f;
    [SerializeField] private float _chaseSpeed = 5f;
    [SerializeField] private Transform[] _patrolPoints;

    private NavMeshAgent _agent;
    private Transform _target;
    private int _patrolIndex;

    private void Awake()
    {
        _agent = GetComponent<NavMeshAgent>();
    }

    private void Update()
    {
        float distanceToTarget = _target != null
            ? Vector3.Distance(transform.position, _target.position)
            : float.MaxValue;

        if (distanceToTarget <= _attackRange)
        {
            Attack();
        }
        else if (distanceToTarget <= _detectionRange)
        {
            Chase();
        }
        else
        {
            Patrol();
        }
    }

    private void Patrol()
    {
        _agent.speed = _patrolSpeed;

        if (_patrolPoints.Length == 0) return;

        if (!_agent.pathPending && _agent.remainingDistance < 0.5f)
        {
            _patrolIndex = (_patrolIndex + 1) % _patrolPoints.Length;
            _agent.SetDestination(_patrolPoints[_patrolIndex].position);
        }
    }

    private void Chase()
    {
        _agent.speed = _chaseSpeed;
        _agent.SetDestination(_target.position);
    }

    private void Attack()
    {
        _agent.ResetPath();
        transform.LookAt(_target);
        // Trigger attack logic
    }
}
```

---

## 11. Rendering (URP/HDRP)

### URP Setup

```csharp
// URP is configured via UniversalRenderPipelineAsset
// Project Settings > Graphics > Scriptable Render Pipeline Settings

// Shader Graph: visual shader editor (replaces writing HLSL by hand)
// Create > Shader Graph > URP > Lit Shader Graph

// Post-processing: add Volume component to a GameObject
// Add overrides: Bloom, Color Adjustments, Vignette, Tonemapping

// Custom Renderer Features (URP)
public class CustomRenderPass : ScriptableRenderPass
{
    public override void Execute(ScriptableRenderContext context,
        ref RenderingData renderingData)
    {
        // Custom rendering logic
    }
}
```

---

## 12. UI Toolkit

### UXML Structure

```xml
<!-- Assets/UI/MainMenu.uxml -->
<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <ui:VisualElement name="root" class="menu-root">
        <ui:Label name="title" text="My Game" class="title-label" />
        <ui:Button name="play-btn" text="Play" class="menu-button" />
        <ui:Button name="settings-btn" text="Settings" class="menu-button" />
        <ui:Button name="quit-btn" text="Quit" class="menu-button" />
    </ui:VisualElement>
</ui:UXML>
```

### USS Styling

```css
/* Assets/UI/MainMenu.uss */
.menu-root {
    flex-grow: 1;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.8);
}

.title-label {
    font-size: 48px;
    color: white;
    margin-bottom: 40px;
}

.menu-button {
    width: 200px;
    height: 50px;
    margin: 5px;
    font-size: 20px;
}

.menu-button:hover {
    background-color: rgb(80, 80, 80);
}
```

### C# Controller

```csharp
using UnityEngine;
using UnityEngine.UIElements;

public class MainMenuController : MonoBehaviour
{
    private void OnEnable()
    {
        var root = GetComponent<UIDocument>().rootVisualElement;

        root.Q<Button>("play-btn").clicked += OnPlayClicked;
        root.Q<Button>("settings-btn").clicked += OnSettingsClicked;
        root.Q<Button>("quit-btn").clicked += OnQuitClicked;
    }

    private void OnPlayClicked()
    {
        UnityEngine.SceneManagement.SceneManager.LoadScene("GameScene");
    }

    private void OnSettingsClicked()
    {
        // Show settings panel
    }

    private void OnQuitClicked()
    {
        Application.Quit();
    }
}
```

---

## 13. Multiplayer (Netcode for GameObjects)

```csharp
using Unity.Netcode;
using UnityEngine;

public class NetworkPlayer : NetworkBehaviour
{
    // NetworkVariable: automatically synced across clients
    private NetworkVariable<int> _health = new(
        100,
        NetworkVariableReadPermission.Everyone,
        NetworkVariableWritePermission.Server
    );

    private NetworkVariable<Vector3> _networkPosition = new(
        default,
        NetworkVariableReadPermission.Everyone,
        NetworkVariableWritePermission.Owner
    );

    public override void OnNetworkSpawn()
    {
        _health.OnValueChanged += OnHealthChanged;

        if (IsOwner)
        {
            // Enable input for local player only
            GetComponent<PlayerInput>().enabled = true;
        }
    }

    private void OnHealthChanged(int oldValue, int newValue)
    {
        // Update health bar UI
    }

    // ServerRpc: client calls, server executes
    [ServerRpc]
    public void TakeDamageServerRpc(int amount)
    {
        _health.Value = Mathf.Max(0, _health.Value - amount);

        if (_health.Value <= 0)
        {
            DieClientRpc();
        }
    }

    // ClientRpc: server calls, all clients execute
    [ClientRpc]
    private void DieClientRpc()
    {
        // Play death animation on all clients
        GetComponent<Animator>().SetTrigger("Die");
    }
}
```

---

## 14. Testing (Unity Test Framework)

### EditMode Tests

```csharp
using NUnit.Framework;

[TestFixture]
public class WeaponDataTests
{
    [Test]
    public void DamageCalculation_WithMultiplier_ReturnsCorrectValue()
    {
        float baseDamage = 10f;
        float multiplier = 1.5f;

        float result = DamageCalculator.Calculate(baseDamage, multiplier);

        Assert.AreEqual(15f, result, 0.001f);
    }

    [TestCase(0f, 1f, 0f)]
    [TestCase(10f, 2f, 20f)]
    [TestCase(5f, 0.5f, 2.5f)]
    public void DamageCalculation_VariousInputs(float damage, float mult, float expected)
    {
        float result = DamageCalculator.Calculate(damage, mult);
        Assert.AreEqual(expected, result, 0.001f);
    }
}
```

### PlayMode Tests

```csharp
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

public class PlayerMovementTests
{
    private GameObject _player;

    [UnitySetUp]
    public IEnumerator SetUp()
    {
        _player = new GameObject("Player");
        _player.AddComponent<Rigidbody>();
        _player.AddComponent<PlayerController>();
        yield return null; // Wait one frame for Start()
    }

    [UnityTearDown]
    public IEnumerator TearDown()
    {
        Object.Destroy(_player);
        yield return null;
    }

    [UnityTest]
    public IEnumerator Player_FallsWithGravity()
    {
        float startY = _player.transform.position.y;
        yield return new WaitForSeconds(1f);
        Assert.Less(_player.transform.position.y, startY);
    }
}
```

---

## 15. DOTS/Burst for Performance

```csharp
using Unity.Entities;
using Unity.Transforms;
using Unity.Mathematics;
using Unity.Burst;

// Component (data only)
public struct MoveSpeed : IComponentData
{
    public float Value;
}

public struct TargetPosition : IComponentData
{
    public float3 Value;
}

// System (logic only)
[BurstCompile]
public partial struct MoveTowardSystem : ISystem
{
    [BurstCompile]
    public void OnUpdate(ref SystemState state)
    {
        float deltaTime = SystemAPI.Time.DeltaTime;

        foreach (var (transform, speed, target) in
            SystemAPI.Query<RefRW<LocalTransform>, RefRO<MoveSpeed>, RefRO<TargetPosition>>())
        {
            float3 direction = math.normalize(target.ValueRO.Value - transform.ValueRO.Position);
            transform.ValueRW.Position += direction * speed.ValueRO.Value * deltaTime;
        }
    }
}

// Jobs for parallel processing
[BurstCompile]
public partial struct MoveJob : IJobEntity
{
    public float DeltaTime;

    public void Execute(ref LocalTransform transform, in MoveSpeed speed, in TargetPosition target)
    {
        float3 direction = math.normalize(target.Value - transform.Position);
        transform.Position += direction * speed.Value * DeltaTime;
    }
}
```

---

## 16. Common Patterns

### Service Locator

```csharp
public static class ServiceLocator
{
    private static readonly Dictionary<System.Type, object> _services = new();

    public static void Register<T>(T service) where T : class
    {
        _services[typeof(T)] = service;
    }

    public static T Get<T>() where T : class
    {
        if (_services.TryGetValue(typeof(T), out var service))
        {
            return service as T;
        }
        throw new System.InvalidOperationException(
            $"Service {typeof(T).Name} not registered");
    }

    public static void Clear() => _services.Clear();
}
```

### Save System

```csharp
using UnityEngine;
using System.IO;

public static class SaveSystem
{
    private static string SavePath => Path.Combine(Application.persistentDataPath, "save.json");

    public static void Save<T>(T data)
    {
        string json = JsonUtility.ToJson(data, prettyPrint: true);
        File.WriteAllText(SavePath, json);
    }

    public static T Load<T>() where T : new()
    {
        if (!File.Exists(SavePath))
        {
            return new T();
        }

        string json = File.ReadAllText(SavePath);
        return JsonUtility.FromJson<T>(json);
    }

    public static void Delete()
    {
        if (File.Exists(SavePath))
        {
            File.Delete(SavePath);
        }
    }
}

[System.Serializable]
public class SaveData
{
    public int Level;
    public float PlayTime;
    public int Score;
    public Vector3 PlayerPosition;
    public List<string> UnlockedItems;
}
```

---

## 17. Anti-Patterns

### NEVER

- Use `Find()`, `FindObjectOfType()`, or `FindWithTag()` in Update (cache references in Awake)
- Use string-based `Invoke()` or `SendMessage()` (use events, interfaces, or direct calls)
- Modify Rigidbody in Update (use FixedUpdate for physics)
- Instantiate/Destroy frequently (use object pooling)
- Use `Camera.main` in Update without caching (it calls FindWithTag internally)
- Compare tags with `gameObject.tag == "Enemy"` (use `CompareTag("Enemy")` -- no allocation)
- Use `GetComponent` in Update loops (cache in Awake)
- Put all logic in one MonoBehaviour (split into focused components)

### ALWAYS

- Cache component references in Awake
- Use `[SerializeField] private` instead of public fields
- Use `TryGetComponent` instead of null-checking `GetComponent`
- Use ScriptableObjects for shared data and event channels
- Hash animator parameters with `Animator.StringToHash`
- Use layer masks for physics queries (avoid checking everything)
- Unsubscribe from events in OnDisable to prevent memory leaks
- Use `CompareTag` for tag comparisons (zero allocation)
- Profile with the Unity Profiler before optimizing
- Use assembly definitions for faster compilation in large projects
