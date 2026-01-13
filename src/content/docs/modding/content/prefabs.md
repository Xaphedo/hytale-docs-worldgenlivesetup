---
title: Prefab System
description: Create, load, save, and place prefab structures in Hytale.
sidebar:
  order: 4
---

The Prefab System allows you to create, save, and place pre-built structures containing blocks, fluids, entities, and nested child prefabs with rotation support.

## Architecture

```
PrefabStore (Singleton)
├── PREFAB_CACHE         - Cached BlockSelection objects
├── getPrefab()          - Load prefabs from disk
├── savePrefab()         - Save prefabs to disk
└── Path resolution      - Server, Asset, WorldGen prefabs

BlockSelection
├── Block/Fluid/Entity data
├── Anchor point
└── place() methods
```

## PrefabStore

The `PrefabStore` singleton manages loading, saving, and caching prefabs:

```java
import com.hypixel.hytale.server.core.prefab.PrefabStore;
import com.hypixel.hytale.server.core.prefab.selection.standard.BlockSelection;

PrefabStore store = PrefabStore.get();

// Load from different locations
BlockSelection serverPrefab = store.getServerPrefab("structures/house.prefab.json");
BlockSelection assetPrefab = store.getAssetPrefab("buildings/tower.prefab.json");
BlockSelection worldGenPrefab = store.getWorldGenPrefab("dungeons/cave.prefab.json");

// Load from any asset pack
BlockSelection anyPrefab = store.getAssetPrefabFromAnyPack("trees/oak.prefab.json");

// Load all from directory
Map<Path, BlockSelection> prefabs = store.getServerPrefabDir("structures/houses");
```

### Saving Prefabs

```java
BlockSelection selection = /* ... */;

// Save to server prefabs
store.saveServerPrefab("mystructure.prefab.json", selection);

// Save with overwrite
store.saveServerPrefab("mystructure.prefab.json", selection, true);

// Save to custom path
store.savePrefab(Path.of("/custom/path/structure.prefab.json"), selection, true);
```

## BlockSelection

The `BlockSelection` class represents a prefab's content.

### Creating Selections

```java
import com.hypixel.hytale.server.core.prefab.selection.standard.BlockSelection;
import com.hypixel.hytale.math.vector.Vector3i;

BlockSelection selection = new BlockSelection();

// Set position and anchor
selection.setPosition(100, 64, 200);
selection.setAnchor(0, 0, 0);

// Set bounds
selection.setSelectionArea(
    new Vector3i(-5, 0, -5),  // min
    new Vector3i(5, 10, 5)    // max
);
```

### Adding Content

```java
// Add blocks
int blockId = BlockType.getAssetMap().getAsset("hytale:stone").getBlockId();
selection.addBlockAtWorldPos(x, y, z, blockId, rotation, filler, supportValue);
selection.addBlockAtLocalPos(localX, localY, localZ, blockId, rotation, filler, supportValue);

// Add fluids
int fluidId = Fluid.getAssetMap().getAsset("hytale:water").getAssetIndex();
selection.addFluidAtWorldPos(x, y, z, fluidId, (byte) 8);

// Add entities
selection.addEntityFromWorld(entityHolder);
```

### Iterating Content

```java
// Iterate blocks
selection.forEachBlock((x, y, z, block) -> {
    int blockId = block.blockId();
    int rotation = block.rotation();
    // Process block
});

// Iterate fluids and entities
selection.forEachFluid((x, y, z, fluidId, level) -> { /* ... */ });
selection.forEachEntity(entityHolder -> { /* ... */ });
```

## Placing Prefabs

### Basic Placement

```java
// Place at position (no undo support)
selection.placeNoReturn(world, new Vector3i(100, 64, 200), accessor);

// Place with undo support
BlockSelection previousState = selection.place(feedback, world);

// Undo placement
previousState.place(feedback, world);
```

### Entity Callback

```java
selection.place(feedback, world, position, blockMask, entityRef -> {
    // Called for each entity placed
    Ref<EntityStore> ref = entityRef;
});
```

## PrefabRotation

Handle rotation transformations:

```java
import com.hypixel.hytale.server.core.prefab.PrefabRotation;

PrefabRotation rot90 = PrefabRotation.ROTATION_90;

// Rotate vectors
Vector3i vec = new Vector3i(5, 0, 3);
rot90.rotate(vec);

// Get rotated coordinates
int newX = rot90.getX(originalX, originalZ);
int newZ = rot90.getZ(originalX, originalZ);

// Combine rotations
PrefabRotation combined = rot90.add(PrefabRotation.ROTATION_180);
```

### Transforming Selections

```java
// Rotate around Y axis
BlockSelection rotated = selection.rotate(Axis.Y, 90);

// Flip along axis
BlockSelection flipped = selection.flip(Axis.X);

// Clone
BlockSelection clone = selection.cloneSelection();
```

## PrefabWeights

Handle weighted random selection:

```java
import com.hypixel.hytale.server.core.prefab.PrefabWeights;

PrefabWeights weights = new PrefabWeights();
weights.setWeight("oak_tree", 3.0);
weights.setWeight("birch_tree", 2.0);
weights.setDefaultWeight(1.0);

// Select weighted random
String[] names = {"oak_tree", "birch_tree", "pine_tree"};
String selected = weights.get(names, name -> name, random);

// Parse from string
PrefabWeights parsed = PrefabWeights.parse("oak=3.0, birch=2.0");
```

## PrefabCopyableComponent

Mark entities as copyable when saving prefabs:

```java
import com.hypixel.hytale.server.core.prefab.PrefabCopyableComponent;

// Add to entity to include in prefab copies
entityHolder.addComponent(
    PrefabCopyableComponent.getComponentType(),
    PrefabCopyableComponent.get()
);
```

:::note
Entities without the `PrefabCopyableComponent` may not be included when copying regions to prefabs.
:::
