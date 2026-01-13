---
title: Entity Stats System
description: Learn about Hytale's Entity Stats System for managing Health, Stamina, Mana, and custom character attributes.
sidebar:
  order: 9
---

Hytale's Entity Stats System provides a flexible framework for managing entity attributes like Health, Stamina, Mana, and Oxygen. The system supports dynamic modifiers, conditional regeneration, and custom stat types.

## Architecture Overview

```
EntityStatMap (Component)
├── EntityStatValue[]           - Individual stat instances
│   ├── value, min, max         - Current and bounds
│   ├── RegeneratingValue[]     - Regeneration handlers
│   └── Map<String, Modifier>   - Active modifiers
├── StatModifiersManager        - Recalculates modifiers from equipment/effects
└── EntityStatType (Asset)      - Stat definition from JSON
```

## Core Classes

### EntityStatValue

Represents a single stat instance on an entity. Contains the current value, min/max bounds, and any active modifiers.

```java
import com.hypixel.hytale.server.core.modules.entitystats.EntityStatValue;

public class EntityStatValue {
    // Get the current value
    public float get();

    // Get as percentage between min and max (0.0 to 1.0)
    public float asPercentage();

    // Bounds
    public float getMin();
    public float getMax();

    // Modifiers
    @Nullable
    public Modifier getModifier(String key);

    @Nullable
    public Map<String, Modifier> getModifiers();

    // Regeneration
    @Nullable
    public RegeneratingValue[] getRegeneratingValues();

    // Whether damage ignores invulnerability
    public boolean getIgnoreInvulnerability();
}
```

### EntityStatMap

A component that holds all stat values for an entity. Provides methods for reading and modifying stats.

```java
import com.hypixel.hytale.server.core.modules.entitystats.EntityStatMap;
import com.hypixel.hytale.server.core.modules.entitystats.EntityStatsModule;

// Get the component type
ComponentType<EntityStore, EntityStatMap> statMapType =
    EntityStatsModule.get().getEntityStatMapComponentType();

// Get from entity
EntityStatMap stats = store.getComponent(entityRef, statMapType);

// Get stat by index
EntityStatValue health = stats.get(DefaultEntityStatTypes.getHealth());

// Get stat by name (deprecated - prefer index)
EntityStatValue stamina = stats.get("Stamina");
```

### Modifying Stats

The `EntityStatMap` provides several methods for changing stat values:

```java
import com.hypixel.hytale.server.core.modules.entitystats.EntityStatMap;
import com.hypixel.hytale.server.core.modules.entitystats.asset.DefaultEntityStatTypes;

EntityStatMap stats = /* get from entity */;
int healthIndex = DefaultEntityStatTypes.getHealth();

// Set to specific value (clamped to min/max)
stats.setStatValue(healthIndex, 50.0f);

// Add to current value
stats.addStatValue(healthIndex, 10.0f);

// Subtract from current value
stats.subtractStatValue(healthIndex, 5.0f);

// Set to minimum
stats.minimizeStatValue(healthIndex);

// Set to maximum
stats.maximizeStatValue(healthIndex);

// Reset based on EntityStatType.ResetBehavior
stats.resetStatValue(healthIndex);
```

### Predictable Updates

For client prediction, use the `Predictable` enum to control network synchronization:

```java
import com.hypixel.hytale.server.core.modules.entitystats.EntityStatMap.Predictable;

// NONE - Normal server update (default)
stats.setStatValue(Predictable.NONE, healthIndex, 50.0f);

// SELF - Client can predict this change locally
stats.addStatValue(Predictable.SELF, staminaIndex, -10.0f);

// ALL - All viewers can predict this change
stats.subtractStatValue(Predictable.ALL, healthIndex, 25.0f);
```

## Default Stat Types

Hytale provides several built-in stat types accessible via `DefaultEntityStatTypes`:

```java
import com.hypixel.hytale.server.core.modules.entitystats.asset.DefaultEntityStatTypes;

int health = DefaultEntityStatTypes.getHealth();
int oxygen = DefaultEntityStatTypes.getOxygen();
int stamina = DefaultEntityStatTypes.getStamina();
int mana = DefaultEntityStatTypes.getMana();
int signatureEnergy = DefaultEntityStatTypes.getSignatureEnergy();
int ammo = DefaultEntityStatTypes.getAmmo();
```

| Stat Type | Description |
|-----------|-------------|
| `Health` | Entity health points |
| `Oxygen` | Breath underwater |
| `Stamina` | Used for sprinting and actions |
| `Mana` | Magic resource |
| `SignatureEnergy` | Special ability resource |
| `Ammo` | Ranged weapon ammunition |

## Stat Modifiers

Modifiers adjust stat bounds (min/max) dynamically. They're used by armor, effects, and items.

### Modifier Base Class

```java
import com.hypixel.hytale.server.core.modules.entitystats.modifier.Modifier;

public abstract class Modifier {
    // Which bound to modify
    public enum ModifierTarget {
        MIN,
        MAX
    }

    public ModifierTarget getTarget();
    public abstract float apply(float statValue);
}
```

### StaticModifier

The most common modifier type with additive or multiplicative calculation:

```java
import com.hypixel.hytale.server.core.modules.entitystats.modifier.StaticModifier;
import com.hypixel.hytale.server.core.modules.entitystats.modifier.Modifier.ModifierTarget;

// Additive: value + amount
StaticModifier armorBonus = new StaticModifier(
    ModifierTarget.MAX,
    StaticModifier.CalculationType.ADDITIVE,
    20.0f  // +20 max health
);

// Multiplicative: value * amount
StaticModifier percentBoost = new StaticModifier(
    ModifierTarget.MAX,
    StaticModifier.CalculationType.MULTIPLICATIVE,
    1.5f   // 1.5x max health
);
```

### Calculation Types

```java
public enum CalculationType {
    ADDITIVE {
        public float compute(float value, float amount) {
            return value + amount;
        }
    },
    MULTIPLICATIVE {
        public float compute(float value, float amount) {
            return value * amount;
        }
    }
}
```

### Applying Modifiers

```java
EntityStatMap stats = /* ... */;
int healthIndex = DefaultEntityStatTypes.getHealth();

// Add a modifier with a unique key
StaticModifier modifier = new StaticModifier(
    ModifierTarget.MAX,
    StaticModifier.CalculationType.ADDITIVE,
    50.0f
);
stats.putModifier(healthIndex, "my_plugin_bonus", modifier);

// Get existing modifier
Modifier existing = stats.getModifier(healthIndex, "my_plugin_bonus");

// Remove modifier
stats.removeModifier(healthIndex, "my_plugin_bonus");
```

### Built-in Modifier Keys

The game uses these key patterns for built-in modifiers:

| Key Pattern | Source |
|-------------|--------|
| `Effect_ADDITIVE` | Entity effects |
| `Effect_MULTIPLICATIVE` | Entity effects |
| `Armor_ADDITIVE` | Equipped armor |
| `Armor_MULTIPLICATIVE` | Equipped armor |
| `*Weapon_0`, `*Weapon_1`... | Held weapon |
| `*Utility_0`, `*Utility_1`... | Utility item |

## StatModifiersManager

The `StatModifiersManager` automatically recalculates modifiers from equipment and effects each tick.

```java
import com.hypixel.hytale.server.core.entity.StatModifiersManager;

// Located on LivingEntity
LivingEntity entity = /* ... */;
StatModifiersManager manager = entity.getStatModifiersManager();

// Trigger recalculation (usually after equipment change)
manager.setRecalculate(true);

// Queue stats to be cleared/minimized on next recalculation
int[] statsToClear = { healthIndex, staminaIndex };
manager.queueEntityStatsToClear(statsToClear);
```

The recalculation process:
1. Clears queued stats to minimum
2. Calculates effect modifiers from active entity effects
3. Calculates armor modifiers from equipped armor
4. Applies weapon stat modifiers from held item
5. Applies utility stat modifiers from utility slot

## Regenerating Values

Stats can regenerate automatically over time based on conditions.

### RegeneratingValue

Tracks regeneration state for a single regeneration rule:

```java
import com.hypixel.hytale.server.core.modules.entitystats.RegeneratingValue;

public class RegeneratingValue {
    // Check if regeneration should occur this tick
    public boolean shouldRegenerate(
        ComponentAccessor<EntityStore> store,
        Ref<EntityStore> ref,
        Instant currentTime,
        float dt,
        EntityStatType.Regenerating regenerating
    );

    // Calculate and apply regeneration amount
    public float regenerate(
        ComponentAccessor<EntityStore> store,
        Ref<EntityStore> ref,
        Instant currentTime,
        float dt,
        EntityStatValue value,
        float currentAmount
    );
}
```

### Regeneration Types

```java
public enum RegenType {
    ADDITIVE,    // Add fixed amount per interval
    PERCENTAGE   // Add percentage of (max - min) per interval
}
```

### RegeneratingModifier

Conditionally modifies regeneration rate:

```java
import com.hypixel.hytale.server.core.modules.entitystats.asset.modifier.RegeneratingModifier;

public class RegeneratingModifier {
    // Returns modifier amount if conditions met, 1.0f otherwise
    public float getModifier(
        ComponentAccessor<EntityStore> store,
        Ref<EntityStore> ref,
        Instant currentTime
    );
}
```

## Stat Conditions

Conditions control when regeneration occurs. They're evaluated each tick.

### Condition Base Class

```java
import com.hypixel.hytale.server.core.modules.entitystats.asset.condition.Condition;

public abstract class Condition {
    protected boolean inverse;  // Invert result

    // Evaluate with inverse handling
    public boolean eval(
        ComponentAccessor<EntityStore> componentAccessor,
        Ref<EntityStore> ref,
        Instant currentTime
    );

    // Override this for condition logic
    public abstract boolean eval0(
        ComponentAccessor<EntityStore> componentAccessor,
        Ref<EntityStore> ref,
        Instant currentTime
    );

    // Check all conditions in array
    public static boolean allConditionsMet(
        ComponentAccessor<EntityStore> componentAccessor,
        Ref<EntityStore> ref,
        Instant currentTime,
        Condition[] conditions
    );
}
```

### Built-in Conditions

| Condition | Description |
|-----------|-------------|
| `OutOfCombat` | True after delay since last combat action |
| `Gliding` | True when entity is gliding |
| `Charging` | True when entity is charging an attack |
| `Environment` | True when in specific environments |
| `RegenHealth` | Always true (marker condition) |
| `Player` | Check player game mode |
| `Stat` | Compare stat value against threshold |
| `Alive` | True when entity is alive |
| `NoDamageTaken` | True after delay since taking damage |
| `Suffocating` | True when entity is suffocating |
| `Sprinting` | True when entity is sprinting |
| `Wielding` | True when wielding specific item |
| `LogicCondition` | Combine conditions with AND/OR |

### OutOfCombatCondition

Checks if entity hasn't been in combat recently:

```java
import com.hypixel.hytale.server.core.modules.entitystats.asset.condition.OutOfCombatCondition;

// Uses DelaySeconds from config or world's CombatConfig.outOfCombatDelay
public class OutOfCombatCondition extends Condition {
    protected Duration delay;  // Optional override

    @Override
    public boolean eval0(...) {
        Duration delayToUse = delay != null ? delay : combatConfig.getOutOfCombatDelay();
        Instant lastCombatAction = damageDataComponent.getLastCombatAction();
        return TimeUtil.compareDifference(lastCombatAction, currentTime, delayToUse) >= 0;
    }
}
```

### EnvironmentCondition

Checks if entity is in specific biome environments:

```java
import com.hypixel.hytale.server.core.modules.entitystats.asset.condition.EnvironmentCondition;

public class EnvironmentCondition extends Condition {
    protected String[] unknownEnvironments;  // Environment IDs from JSON

    @Override
    public boolean eval0(...) {
        int environmentId = blockChunkComponent.getEnvironment(position);
        return Arrays.binarySearch(getEnvironments(), environmentId) >= 0;
    }
}
```

### StatCondition

Compares a stat value against a threshold:

```java
import com.hypixel.hytale.server.core.modules.entitystats.asset.condition.StatCondition;

public class StatCondition extends EntityStatBoundCondition {
    protected float amount;
    protected StatComparisonType comparison = StatComparisonType.GTE;

    public enum StatComparisonType {
        GTE(">="),   // Greater than or equal
        GT(">"),     // Greater than
        LTE("<="),   // Less than or equal
        LT("<"),     // Less than
        EQUAL("=");  // Equal
    }

    @Override
    public boolean eval0(Ref<EntityStore> ref, Instant currentTime, EntityStatValue statValue) {
        return comparison.satisfies(statValue.get(), amount);
    }
}
```

### PlayerCondition

Checks player game mode:

```java
import com.hypixel.hytale.server.core.modules.entitystats.asset.condition.PlayerCondition;
import com.hypixel.hytale.protocol.GameMode;

public class PlayerCondition extends Condition {
    @Nullable
    private GameMode gameModeToCheck;  // null = always pass

    @Override
    public boolean eval0(...) {
        if (gameModeToCheck == null) return true;
        Player player = componentAccessor.getComponent(ref, Player.getComponentType());
        return player != null && player.getGameMode() == gameModeToCheck;
    }
}
```

## Creating Custom Stat Types

Custom stat types are defined in JSON asset files.

### JSON Structure

Create a file at `Entity/Stats/MyCustomStat.json`:

```json
{
    "Id": "MyCustomStat",
    "InitialValue": 100.0,
    "Min": 0.0,
    "Max": 100.0,
    "Shared": true,
    "IgnoreInvulnerability": false,
    "ResetType": "InitialValue",
    "Regenerating": [
        {
            "Interval": 1.0,
            "Amount": 5.0,
            "RegenType": "ADDITIVE",
            "ClampAtZero": true,
            "Conditions": [
                {
                    "Type": "OutOfCombat",
                    "DelaySeconds": 3.0
                }
            ],
            "Modifiers": [
                {
                    "Conditions": [
                        {
                            "Type": "Environment",
                            "Environments": ["Desert"]
                        }
                    ],
                    "Amount": 0.5
                }
            ]
        }
    ],
    "MinValueEffects": {
        "TriggerAtZero": false,
        "SoundEventId": "MyMod:StatEmpty",
        "Interactions": "MyMod:OnStatDepleted"
    },
    "MaxValueEffects": {
        "TriggerAtZero": false,
        "SoundEventId": "MyMod:StatFull"
    }
}
```

### Configuration Options

| Field | Type | Description |
|-------|------|-------------|
| `Id` | String | Unique identifier |
| `InitialValue` | Float | Starting value |
| `Min` | Float | Minimum bound |
| `Max` | Float | Maximum bound |
| `Shared` | Boolean | Visible to other players |
| `IgnoreInvulnerability` | Boolean | Can decrease when invulnerable |
| `ResetType` | Enum | `InitialValue` or `MaxValue` |
| `Regenerating` | Array | Regeneration rules |
| `MinValueEffects` | Object | Effects when reaching minimum |
| `MaxValueEffects` | Object | Effects when reaching maximum |

### Regenerating Configuration

| Field | Type | Description |
|-------|------|-------------|
| `Interval` | Float | Seconds between regeneration ticks |
| `Amount` | Float | Amount to regenerate |
| `RegenType` | Enum | `ADDITIVE` (fixed) or `PERCENTAGE` (of range) |
| `ClampAtZero` | Boolean | Prevent going below zero |
| `Conditions` | Array | Conditions that must be met |
| `Modifiers` | Array | Conditional rate modifiers |

### Accessing Custom Stats

```java
import com.hypixel.hytale.server.core.modules.entitystats.asset.EntityStatType;

// Get stat index by ID
int customStatIndex = EntityStatType.getAssetMap().getIndex("MyCustomStat");

// Get EntityStatType asset
EntityStatType customStatType = EntityStatType.getAssetMap().getAsset(customStatIndex);

// Use with EntityStatMap
EntityStatMap stats = /* ... */;
EntityStatValue customStat = stats.get(customStatIndex);
float current = customStat.get();
float percent = customStat.asPercentage();
```

## Registering Custom Conditions

Register custom conditions in your plugin setup:

```java
import com.hypixel.hytale.server.core.modules.entitystats.asset.condition.Condition;
import com.hypixel.hytale.codec.Codec;

public class MyPlugin extends JavaPlugin {
    @Override
    protected void setup() {
        // Register custom condition type
        Condition.CODEC.register(
            "MyCondition",
            (Class<Condition>) MyCondition.class,
            (Codec<Condition>) MyCondition.CODEC
        );
    }
}

public class MyCondition extends Condition {
    public static final BuilderCodec<MyCondition> CODEC =
        BuilderCodec.builder(MyCondition.class, MyCondition::new, Condition.BASE_CODEC)
            // Add fields...
            .build();

    @Override
    public boolean eval0(
        ComponentAccessor<EntityStore> componentAccessor,
        Ref<EntityStore> ref,
        Instant currentTime
    ) {
        // Your condition logic
        return true;
    }
}
```

## Stat Effects

When stats reach their min or max values, effects can be triggered.

### EntityStatEffects

```java
public class EntityStatEffects {
    private boolean triggerAtZero;      // Trigger when crossing zero instead of bound
    private String soundEventId;        // Sound to play
    private ModelParticle[] particles;  // Particles to spawn
    private String interactions;        // Interaction chain to execute
}
```

### Effect Triggers

- **Min Value Effects**: Triggered when stat value reaches minimum (or crosses zero if `TriggerAtZero`)
- **Max Value Effects**: Triggered when stat value reaches maximum (or crosses zero if `TriggerAtZero`)

## System Integration

The stats system integrates with several ECS systems:

```java
// System execution order
EntityStatsSystems.Setup              // Add EntityStatMap to new entities
EntityStatsSystems.Regenerate         // Process regeneration each tick
EntityStatsSystems.Recalculate        // Recalculate modifiers from equipment
EntityStatsSystems.Changes            // Process stat changes, trigger effects
EntityStatsSystems.EntityTrackerUpdate // Sync changes to clients
EntityStatsSystems.ClearChanges       // Clear pending updates
```

### Creating a Custom StatModifyingSystem

Implement `StatModifyingSystem` to ensure your system runs before stat changes are processed:

```java
import com.hypixel.hytale.server.core.modules.entitystats.EntityStatsSystems.StatModifyingSystem;
import com.hypixel.hytale.component.system.tick.EntityTickingSystem;

public class MyStatSystem
    extends EntityTickingSystem<EntityStore>
    implements StatModifyingSystem {

    @Override
    public Query<EntityStore> getQuery() {
        return EntityStatMap.getComponentType();
    }

    @Override
    public void tick(float dt, int index,
                     ArchetypeChunk<EntityStore> chunk,
                     Store<EntityStore> store,
                     CommandBuffer<EntityStore> buffer) {
        EntityStatMap stats = chunk.getComponent(index, EntityStatMap.getComponentType());
        // Modify stats...
    }
}
```

## Best Practices

1. **Use stat indices** - Cache indices from `EntityStatType.getAssetMap().getIndex()` for performance
2. **Unique modifier keys** - Use plugin-prefixed keys like `"myplugin_bonus"` to avoid conflicts
3. **Respect invulnerability** - Check `IgnoreInvulnerability` when dealing damage
4. **Use Predictable wisely** - Only use `SELF` or `ALL` for changes the client can accurately predict
5. **Clean up modifiers** - Remove modifiers when effects expire or equipment is removed
6. **Test regeneration** - Verify conditions work correctly in all scenarios
7. **Consider network traffic** - `Shared: false` stats don't sync to other players
8. **Handle missing stats** - Always null-check when getting `EntityStatValue`

## Example: Custom Resource System

```java
public class MyResourcePlugin extends JavaPlugin {
    private int focusStatIndex;

    @Override
    protected void setup() {
        // Custom stat is defined in JSON
    }

    @Override
    protected void start() {
        // Cache stat index after assets load
        focusStatIndex = EntityStatType.getAssetMap().getIndex("Focus");
    }

    public void consumeFocus(Ref<EntityStore> ref, Store<EntityStore> store, float amount) {
        EntityStatMap stats = store.getComponent(ref, EntityStatMap.getComponentType());
        if (stats == null) return;

        EntityStatValue focus = stats.get(focusStatIndex);
        if (focus == null || focus.get() < amount) {
            return; // Not enough focus
        }

        stats.subtractStatValue(Predictable.SELF, focusStatIndex, amount);
    }

    public void addFocusModifier(Ref<EntityStore> ref, Store<EntityStore> store) {
        EntityStatMap stats = store.getComponent(ref, EntityStatMap.getComponentType());
        if (stats == null) return;

        StaticModifier bonus = new StaticModifier(
            Modifier.ModifierTarget.MAX,
            StaticModifier.CalculationType.ADDITIVE,
            25.0f
        );
        stats.putModifier(focusStatIndex, "focus_mastery", bonus);
    }
}
```
