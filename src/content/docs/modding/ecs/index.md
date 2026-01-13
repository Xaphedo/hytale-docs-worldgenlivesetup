---
title: Entity System (ECS)
description: Learn about Hytale's Entity-Component-System architecture for game objects.
sidebar:
  order: 1
---

This section covers Hytale's Entity-Component-System (ECS) architecture, which provides efficient data access and flexible composition for game objects.

## What is ECS?

The Entity-Component-System architecture separates game objects into three core concepts:

- **Entities** - Lightweight references (IDs) to game objects
- **Components** - Data containers attached to entities
- **Systems** - Logic processors that operate on components

This separation provides:
- Efficient memory layout and cache-friendly data access
- Flexible composition without deep inheritance hierarchies
- Clean separation between data and logic

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

## Getting Started

1. **[Component System](./components)** - Learn about creating and using components
2. **[Entity Stats](./entity-stats)** - Health, stamina, mana, and custom attributes
3. **[Physics System](./physics)** - Physics simulation and collision
4. **[Player Management](./player-persistence)** - Player data and persistence

## Quick Example

```java
// Get the entity store from a world
EntityStore store = world.getEntityStore();

// Create an entity with components
Ref<EntityStore> entity = store.createEntity(
    new PositionComponent(0, 64, 0),
    new VelocityComponent(),
    new HealthComponent(100)
);

// Get a component from an entity
PositionComponent pos = store.getComponent(entity, PositionComponent.class);

// Query entities with specific components
store.query(PositionComponent.class, VelocityComponent.class)
    .forEach((ref, position, velocity) -> {
        // Process all entities with both components
        position.add(velocity);
    });
```

## Core Concepts

### Entity References (Ref)

Entities are referenced through lightweight `Ref` objects:

```java
public class Ref<ECS_TYPE> {
    private final Store<ECS_TYPE> store;
    private volatile int index;

    public boolean isValid() {
        return index != Integer.MIN_VALUE;
    }
}
```

:::caution
Always check `isValid()` before using a `Ref`. Entity references can become invalid when entities are removed.
:::

### Component Types

Components must implement `Cloneable` for entity copying:

```java
public interface Component<ECS_TYPE> extends Cloneable {
    @Nullable
    Component<ECS_TYPE> clone();
}
```

### Systems

Systems process entities with specific component combinations:

```java
public interface ISystem<ECS_TYPE> {
    default void onSystemRegistered() {}
    default void onSystemUnregistered() {}
    
    @Nonnull
    default Set<Dependency<ECS_TYPE>> getDependencies() {
        return Collections.emptySet();
    }
}
```

## Next Steps

- Read the [Component System](./components) guide for detailed documentation
- Learn about [Entity Stats](./entity-stats) for health and attributes
- Understand the [Physics System](./physics) for movement and collision
