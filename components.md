# Component System (ECS)

Hytale uses an Entity-Component-System architecture for game objects. This provides efficient data access and flexible composition.

## Architecture Overview

```
Store<ECS_TYPE>
├── ComponentRegistry     - Type registration
├── Archetype[]           - Component combinations
│   └── ArchetypeChunk[]  - Entity storage
│       └── Component[][] - Component data
├── Resource[]            - Global resources
└── System[]              - Logic processors
```

## Core Concepts

### Entities (Ref)
Lightweight references to entity data:

```java
public class Ref<ECS_TYPE> {
    private final Store<ECS_TYPE> store;
    private volatile int index;

    public boolean isValid() {
        return index != Integer.MIN_VALUE;
    }
}
```

### Components
Data containers attached to entities:

```java
public interface Component<ECS_TYPE> extends Cloneable {
    @Nullable
    Component<ECS_TYPE> clone();
}
```

### Systems
Logic processors that operate on components:

```java
public interface ISystem<ECS_TYPE> {
    default void onSystemRegistered() {}
    default void onSystemUnregistered() {}
}
```

### Resources
Global shared state per store:

```java
public interface Resource<ECS_TYPE> {
}
```

## Creating Components

### Simple Data Component

```java
public class HealthComponent implements Component<EntityStore> {

    public static final BuilderCodec<HealthComponent> CODEC =
        BuilderCodec.builder(HealthComponent.class, HealthComponent::new)
            .append(new KeyedCodec<>("MaxHealth", Codec.FLOAT),
                (c, v) -> c.maxHealth = v, c -> c.maxHealth)
            .add()
            .append(new KeyedCodec<>("CurrentHealth", Codec.FLOAT),
                (c, v) -> c.currentHealth = v, c -> c.currentHealth)
            .add()
            .build();

    private float maxHealth = 100f;
    private float currentHealth = 100f;

    public HealthComponent() {}

    public HealthComponent(float maxHealth) {
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;
    }

    public float getMaxHealth() { return maxHealth; }
    public float getCurrentHealth() { return currentHealth; }

    public void setCurrentHealth(float health) {
        this.currentHealth = Math.min(health, maxHealth);
    }

    public void damage(float amount) {
        this.currentHealth = Math.max(0, currentHealth - amount);
    }

    @Override
    public Component<EntityStore> clone() {
        HealthComponent copy = new HealthComponent(maxHealth);
        copy.currentHealth = this.currentHealth;
        return copy;
    }
}
```

### Singleton/Marker Component

```java
public class FlyingMarker implements Component<EntityStore> {
    public static final FlyingMarker INSTANCE = new FlyingMarker();

    public static final BuilderCodec<FlyingMarker> CODEC =
        BuilderCodec.builder(FlyingMarker.class, () -> INSTANCE).build();

    private FlyingMarker() {}

    @Override
    public Component<EntityStore> clone() {
        return INSTANCE;
    }
}
```

## Registering Components

### In Plugin Setup

```java
public class MyPlugin extends JavaPlugin {
    private ComponentType<EntityStore, HealthComponent> healthComponentType;

    @Override
    protected void setup() {
        // With serialization (saved to disk)
        healthComponentType = getEntityStoreRegistry().registerComponent(
            HealthComponent.class,
            "Health",
            HealthComponent.CODEC
        );

        // Without serialization (runtime only)
        ComponentType<EntityStore, TempData> tempType =
            getEntityStoreRegistry().registerComponent(
                TempData.class,
                TempData::new
            );
    }

    public ComponentType<EntityStore, HealthComponent> getHealthComponentType() {
        return healthComponentType;
    }
}
```

## Accessing Components

### Get Component

```java
Ref<EntityStore> entityRef = /* ... */;
Store<EntityStore> store = entityRef.getStore();

// May return null if entity doesn't have component
HealthComponent health = store.getComponent(entityRef, healthComponentType);

if (health != null) {
    float current = health.getCurrentHealth();
}
```

### Ensure Component Exists

```java
// Throws if component missing
HealthComponent health = store.ensureAndGetComponent(entityRef, healthComponentType);
```

### Add Component

```java
CommandBuffer<EntityStore> commandBuffer = /* ... */;

commandBuffer.addComponent(
    entityRef,
    healthComponentType,
    new HealthComponent(200f)
);
```

### Remove Component

```java
commandBuffer.removeComponent(entityRef, healthComponentType);
```

### Modify Component

```java
HealthComponent health = store.getComponent(entityRef, healthComponentType);
if (health != null) {
    health.damage(25f);
    // Changes are automatically tracked
}
```

## Creating Systems

### Basic Ticking System

```java
public class HealthRegenSystem extends EntityTickingSystem<EntityStore> {

    private final ComponentType<EntityStore, HealthComponent> healthType;

    public HealthRegenSystem(ComponentType<EntityStore, HealthComponent> healthType) {
        this.healthType = healthType;
    }

    @Override
    public Query<EntityStore> getQuery() {
        return healthType;  // Only process entities with HealthComponent
    }

    @Override
    public void tick(float dt, int index,
                     ArchetypeChunk<EntityStore> chunk,
                     Store<EntityStore> store,
                     CommandBuffer<EntityStore> commandBuffer) {

        HealthComponent health = chunk.getComponent(index, healthType);
        if (health.getCurrentHealth() < health.getMaxHealth()) {
            health.setCurrentHealth(health.getCurrentHealth() + dt * 5f);
        }
    }
}
```

### Register System

```java
@Override
protected void setup() {
    getEntityStoreRegistry().registerSystem(new HealthRegenSystem(healthComponentType));
}
```

## System Dependencies

Control execution order with dependencies:

```java
public class MySystem extends TickingSystem<EntityStore> {

    @Override
    public Set<Dependency<EntityStore>> getDependencies() {
        return Set.of(
            Dependency.after(OtherSystem.class),
            Dependency.before(AnotherSystem.class)
        );
    }

    @Override
    public void tick(float dt, int index, Store<EntityStore> store) {
        // Process
    }
}
```

## Resources (Global State)

### Define Resource

```java
public class GameStateResource implements Resource<EntityStore> {
    private int score = 0;
    private boolean gameOver = false;

    public int getScore() { return score; }
    public void addScore(int points) { score += points; }
    public boolean isGameOver() { return gameOver; }
    public void setGameOver(boolean over) { gameOver = over; }
}
```

### Register Resource

```java
private ResourceType<EntityStore, GameStateResource> gameStateType;

@Override
protected void setup() {
    gameStateType = getEntityStoreRegistry().registerResource(
        GameStateResource.class,
        GameStateResource::new
    );
}
```

### Access Resource

```java
Store<EntityStore> store = /* ... */;
GameStateResource state = store.getResource(gameStateType);
state.addScore(100);
```

## Queries

Filter entities by component composition:

### Component Query

```java
// Entities with HealthComponent
Query<EntityStore> query = healthComponentType;
```

### Combined Queries

```java
// Entities with both Health AND Position
Query<EntityStore> both = Query.and(healthType, positionType);

// Entities with Health OR Armor
Query<EntityStore> either = Query.or(healthType, armorType);

// Entities with Health but NOT Dead marker
Query<EntityStore> alive = Query.and(healthType, Query.not(deadMarkerType));

// All entities
Query<EntityStore> all = Query.any();
```

## Archetypes

Archetypes represent unique component combinations:

```java
Archetype<EntityStore> archetype = store.getArchetype(entityRef);

// Check if archetype has component
if (archetype.contains(healthComponentType)) {
    // Entity has health
}
```

## Command Buffer

All entity modifications go through CommandBuffer for thread safety:

```java
CommandBuffer<EntityStore> buffer = store.getCommandBuffer();

// Queue operations
Ref<EntityStore> newEntity = buffer.addEntity(holder, AddReason.SPAWNED);
buffer.addComponent(newEntity, healthType, new HealthComponent(100f));
buffer.removeEntity(oldEntity, RemoveReason.KILLED);

// Operations execute at end of tick
```

## Entity Holders (Templates)

Create entity templates:

```java
// Create holder with components
Holder<EntityStore> enemyHolder = registry.newHolder();
enemyHolder.init(
    archetype,
    new Component<?>[] {
        new HealthComponent(50f),
        new PositionComponent(0, 0, 0),
        new AIComponent()
    }
);

// Spawn entity from template
Ref<EntityStore> enemy = commandBuffer.addEntity(enemyHolder, AddReason.SPAWNED);
```

## Store Types

### EntityStore
For game entities (players, NPCs, items):

```java
getEntityStoreRegistry().registerComponent(...)
getEntityStoreRegistry().registerSystem(...)
getEntityStoreRegistry().registerResource(...)
```

### ChunkStore
For chunk-level data:

```java
getChunkStoreRegistry().registerComponent(...)
getChunkStoreRegistry().registerSystem(...)
```

## Best Practices

1. **Use components for data**: Keep logic in systems
2. **Implement clone()**: Required for entity copying
3. **Use CommandBuffer**: Never modify directly during iteration
4. **Define codecs**: For persistence support
5. **Use marker components**: For boolean flags (no data needed)
6. **Query efficiently**: Combine queries to minimize iteration
7. **Respect system order**: Use dependencies correctly
8. **Cache ComponentTypes**: Store references for fast access
