---
title: Prefab System
description: Create, load, save, and place prefab structures in your Hytale plugins.
sidebar:
  order: 15
---

Hytale's Prefab System allows you to create, save, and place pre-built structures in the world. Prefabs can contain blocks, fluids, entities, and nested child prefabs with support for rotation and weighted spawning.

## Architecture Overview

```
PrefabStore (Singleton)
├── PREFAB_CACHE         - Cached BlockSelection objects
├── getPrefab()          - Load prefabs from disk
├── savePrefab()         - Save prefabs to disk
└── Path resolution      - Server, Asset, WorldGen prefabs

BlockSelection
├── Block data           - Block IDs, rotations, fillers
├── Fluid data           - Fluid IDs and levels
├── Entity data          - Entity holders
├── Anchor point         - Placement origin
└── place()              - Place in world

IPrefabBuffer
├── Column-based storage - Efficient block iteration
├── Child prefabs        - Nested prefab references
├── forEach()            - Block/entity iteration
└── Rotation support     - PrefabRotation transforms
```

## PrefabStore

The `PrefabStore` singleton manages loading, saving, and caching prefabs. Access it via the static `get()` method:

```java
import com.hypixel.hytale.server.core.prefab.PrefabStore;
import com.hypixel.hytale.server.core.prefab.selection.standard.BlockSelection;

PrefabStore store = PrefabStore.get();
```

### Loading Prefabs

```java
// Load from server prefabs directory
BlockSelection prefab = store.getServerPrefab("structures/house.prefab.json");

// Load from asset pack prefabs
BlockSelection assetPrefab = store.getAssetPrefab("buildings/tower.prefab.json");

// Load from world generation prefabs
BlockSelection worldGenPrefab = store.getWorldGenPrefab("dungeons/cave.prefab.json");

// Load from any asset pack (searches all packs)
BlockSelection anyPrefab = store.getAssetPrefabFromAnyPack("trees/oak.prefab.json");

// Load from absolute path
Path absolutePath = Path.of("/path/to/prefab.prefab.json");
BlockSelection customPrefab = store.getPrefab(absolutePath);
```

### Loading Multiple Prefabs

```java
import java.util.Map;
import java.nio.file.Path;

// Load all prefabs from a directory
Map<Path, BlockSelection> prefabs = store.getServerPrefabDir("structures/houses");

// Iterate loaded prefabs
for (Map.Entry<Path, BlockSelection> entry : prefabs.entrySet()) {
    Path path = entry.getKey();
    BlockSelection selection = entry.getValue();
    // Process each prefab
}
```

### Saving Prefabs

```java
BlockSelection selection = /* ... */;

// Save to server prefabs (fails if exists)
store.saveServerPrefab("mystructure.prefab.json", selection);

// Save with overwrite option
store.saveServerPrefab("mystructure.prefab.json", selection, true);

// Save to specific path
Path outputPath = Path.of("/custom/path/structure.prefab.json");
store.savePrefab(outputPath, selection, true);
```

### Prefab Paths

```java
// Get base paths
Path serverPrefabs = store.getServerPrefabsPath();      // prefabs/
Path assetPrefabs = store.getAssetPrefabsPath();        // Assets/Server/Prefabs/
Path worldGenPrefabs = store.getWorldGenPrefabsPath();  // WorldGen/Default/Prefabs/

// Get prefabs path for specific asset pack
AssetPack pack = /* ... */;
Path packPrefabs = store.getAssetPrefabsPathForPack(pack);
```

## BlockSelection

The `BlockSelection` class represents a prefab's content including blocks, fluids, and entities.

### Creating a Selection

```java
import com.hypixel.hytale.server.core.prefab.selection.standard.BlockSelection;
import com.hypixel.hytale.math.vector.Vector3i;

// Empty selection
BlockSelection selection = new BlockSelection();

// With initial capacity
BlockSelection selection = new BlockSelection(1000, 10); // blocks, entities

// Copy from another selection
BlockSelection copy = new BlockSelection(otherSelection);
```

### Setting Properties

```java
// Set position (world coordinates)
selection.setPosition(100, 64, 200);

// Set anchor point (relative to position)
selection.setAnchor(0, 0, 0);

// Set selection bounds
selection.setSelectionArea(
    new Vector3i(-5, 0, -5),  // min
    new Vector3i(5, 10, 5)     // max
);
```

### Adding Blocks

```java
import com.hypixel.hytale.server.core.asset.type.blocktype.config.BlockType;
import com.hypixel.hytale.component.Holder;
import com.hypixel.hytale.server.core.universe.world.storage.ChunkStore;

// Add block at world position
int blockId = BlockType.getAssetMap().getAsset("hytale:stone").getBlockId();
selection.addBlockAtWorldPos(x, y, z, blockId, rotation, filler, supportValue);

// Add block at local position (relative to selection position)
selection.addBlockAtLocalPos(localX, localY, localZ, blockId, rotation, filler, supportValue);

// Add block with component state
Holder<ChunkStore> state = /* block state holder */;
selection.addBlockAtLocalPos(localX, localY, localZ, blockId, rotation, filler, supportValue, state);

// Add empty block (air)
selection.addEmptyAtWorldPos(x, y, z);
```

### Adding Fluids

```java
import com.hypixel.hytale.server.core.asset.type.fluid.Fluid;

int fluidId = Fluid.getAssetMap().getAsset("hytale:water").getAssetIndex();
byte fluidLevel = 8; // 0-8, where 8 is full

selection.addFluidAtWorldPos(x, y, z, fluidId, fluidLevel);
selection.addFluidAtLocalPos(localX, localY, localZ, fluidId, fluidLevel);
```

### Adding Entities

```java
import com.hypixel.hytale.component.Holder;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

Holder<EntityStore> entityHolder = /* entity holder */;

// Add from world (adjusts position relative to selection)
selection.addEntityFromWorld(entityHolder);

// Add raw holder (position already relative)
selection.addEntityHolderRaw(entityHolder);
```

### Iterating Content

```java
// Iterate blocks
selection.forEachBlock((x, y, z, block) -> {
    int blockId = block.blockId();
    int rotation = block.rotation();
    int filler = block.filler();
    int supportValue = block.supportValue();
    Holder<ChunkStore> state = block.holder();
    // Process block
});

// Iterate fluids
selection.forEachFluid((x, y, z, fluidId, fluidLevel) -> {
    // Process fluid
});

// Iterate entities
selection.forEachEntity(entityHolder -> {
    // Process entity
});
```

### Querying Content

```java
// Check if block exists
boolean hasBlock = selection.hasBlockAtWorldPos(x, y, z);
boolean hasLocalBlock = selection.hasBlockAtLocalPos(localX, localY, localZ);

// Get block ID
int blockId = selection.getBlockAtWorldPos(x, y, z);

// Get fluid
int fluidId = selection.getFluidAtWorldPos(x, y, z);
byte fluidLevel = selection.getFluidLevelAtWorldPos(x, y, z);

// Get block state
Holder<ChunkStore> state = selection.getStateAtWorldPos(x, y, z);

// Get counts
int blockCount = selection.getBlockCount();
int fluidCount = selection.getFluidCount();
int entityCount = selection.getEntityCount();
```

## Placing Prefabs

### Basic Placement

```java
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.component.ComponentAccessor;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

World world = /* ... */;
ComponentAccessor<EntityStore> accessor = /* ... */;

// Place at selection's position
selection.placeNoReturn(world, Vector3i.ZERO, accessor);

// Place at specific position
selection.placeNoReturn(world, new Vector3i(100, 64, 200), accessor);
```

### Placement with Undo

The `place()` method returns a `BlockSelection` containing the original blocks that were replaced:

```java
// Place and get previous state for undo
BlockSelection previousState = selection.place(feedback, world);

// Place at position
BlockSelection previousState = selection.place(feedback, world, position, blockMask);

// Undo the placement
previousState.place(feedback, world);
```

### Block Masks

Use block masks to filter which blocks are affected during placement:

```java
import com.hypixel.hytale.server.core.prefab.selection.mask.BlockMask;

BlockMask mask = /* ... */;
BlockSelection result = selection.place(feedback, world, position, mask);
```

### Entity Placement Callback

```java
import com.hypixel.hytale.component.Ref;

selection.place(feedback, world, position, blockMask, entityRef -> {
    // Called for each entity placed
    Ref<EntityStore> ref = entityRef;
    // Track or modify spawned entities
});
```

## PrefabRotation

The `PrefabRotation` enum handles rotation transformations for prefabs:

```java
import com.hypixel.hytale.server.core.prefab.PrefabRotation;
import com.hypixel.hytale.math.vector.Vector3i;
import com.hypixel.hytale.math.vector.Vector3d;

// Available rotations
PrefabRotation rot0 = PrefabRotation.ROTATION_0;     // 0 degrees
PrefabRotation rot90 = PrefabRotation.ROTATION_90;   // 90 degrees
PrefabRotation rot180 = PrefabRotation.ROTATION_180; // 180 degrees
PrefabRotation rot270 = PrefabRotation.ROTATION_270; // 270 degrees

// Get all rotations
PrefabRotation[] all = PrefabRotation.VALUES;

// Rotate vectors
Vector3i intVec = new Vector3i(5, 0, 3);
rot90.rotate(intVec);  // Modifies in place

Vector3d doubleVec = new Vector3d(5.0, 0.0, 3.0);
rot90.rotate(doubleVec);

// Get rotated coordinates
int newX = rot90.getX(originalX, originalZ);
int newZ = rot90.getZ(originalX, originalZ);

// Add rotations together
PrefabRotation combined = rot90.add(rot180); // Results in ROTATION_270

// Get yaw in radians
float yaw = rot90.getYaw();

// Convert from Rotation enum
import com.hypixel.hytale.server.core.asset.type.blocktype.config.Rotation;
PrefabRotation fromRotation = PrefabRotation.fromRotation(Rotation.Ninety);
```

### Transforming Selections

```java
import com.hypixel.hytale.math.Axis;

// Rotate around Y axis
BlockSelection rotated = selection.rotate(Axis.Y, 90);

// Rotate around custom origin
Vector3f origin = new Vector3f(5, 0, 5);
BlockSelection rotatedOrigin = selection.rotate(Axis.Y, 90, origin);

// Arbitrary rotation (yaw, pitch, roll in degrees)
BlockSelection arbitrary = selection.rotateArbitrary(45f, 0f, 0f);

// Flip along axis
BlockSelection flipped = selection.flip(Axis.X);

// Relativize (adjust coordinates relative to anchor)
BlockSelection relativized = selection.relativize();
BlockSelection relativizedOrigin = selection.relativize(originX, originY, originZ);

// Clone selection
BlockSelection clone = selection.cloneSelection();
```

## PrefabWeights

The `PrefabWeights` class handles weighted random selection of prefabs:

```java
import com.hypixel.hytale.server.core.prefab.PrefabWeights;
import java.util.Random;

// Create weights
PrefabWeights weights = new PrefabWeights();

// Set individual weights
weights.setWeight("oak_tree", 3.0);
weights.setWeight("birch_tree", 2.0);
weights.setWeight("pine_tree", 1.0);

// Set default weight for unlisted prefabs
weights.setDefaultWeight(1.0);

// Get weight for specific prefab
double oakWeight = weights.getWeight("oak_tree"); // 3.0
double unlisted = weights.getWeight("maple_tree"); // 1.0 (default)

// Remove specific weight (falls back to default)
weights.removeWeight("oak_tree");

// Select from array using weights
String[] prefabNames = {"oak_tree", "birch_tree", "pine_tree"};
Random random = new Random();

String selected = weights.get(
    prefabNames,
    name -> name,  // Name extraction function
    random
);

// Parse from string format
PrefabWeights parsed = PrefabWeights.parse("oak=3.0, birch=2.0, pine=1.0");

// Get string representation
String mappingString = weights.getMappingString(); // "oak=3.0, birch=2.0, pine=1.0"
```

### Weights Codec

For serialization in asset configurations:

```java
import com.hypixel.hytale.codec.Codec;

// Use the built-in codec
Codec<PrefabWeights> codec = PrefabWeights.CODEC;

// Example JSON structure:
// {
//   "Default": 1.0,
//   "Weights": {
//     "oak_tree": 3.0,
//     "birch_tree": 2.0
//   }
// }
```

## PrefabCopyableComponent

Mark entities as copyable when saving prefabs:

```java
import com.hypixel.hytale.server.core.prefab.PrefabCopyableComponent;
import com.hypixel.hytale.component.ComponentType;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

// Get the component type
ComponentType<EntityStore, PrefabCopyableComponent> componentType =
    PrefabCopyableComponent.getComponentType();

// Get singleton instance
PrefabCopyableComponent instance = PrefabCopyableComponent.get();

// Add to entity to make it copyable in prefabs
entityHolder.addComponent(componentType, instance);
```

:::note
Entities without the `PrefabCopyableComponent` may not be included when copying regions to prefabs.
:::

## PrefabEntry

The `PrefabEntry` record provides metadata about a prefab file:

```java
import com.hypixel.hytale.server.core.prefab.PrefabEntry;
import com.hypixel.hytale.assetstore.AssetPack;
import java.nio.file.Path;

// Create entry
Path path = Path.of("/assets/prefabs/house.prefab.json");
Path relativePath = Path.of("house.prefab.json");
AssetPack pack = /* ... */;

PrefabEntry entry = new PrefabEntry(path, relativePath, pack);

// Access properties
Path fullPath = entry.path();
Path relative = entry.relativePath();
AssetPack sourcePack = entry.pack();
String displayName = entry.displayName();

// Check source
boolean isFromBasePack = entry.isFromBasePack();
boolean isFromAssetPack = entry.isFromAssetPack();
String packName = entry.getPackName();

// Get file name
String fileName = entry.getFileName();
String displayWithPack = entry.getDisplayNameWithPack(); // "[PackName] house.prefab.json"
```

## IPrefabBuffer

The `IPrefabBuffer` interface provides efficient iteration over prefab data:

```java
import com.hypixel.hytale.server.core.prefab.selection.buffer.impl.IPrefabBuffer;
import com.hypixel.hytale.server.core.prefab.selection.buffer.PrefabBufferCall;

IPrefabBuffer buffer = /* ... */;

// Get bounds
int minX = buffer.getMinX();
int minY = buffer.getMinY();
int minZ = buffer.getMinZ();
int maxX = buffer.getMaxX();
int maxY = buffer.getMaxY();
int maxZ = buffer.getMaxZ();

// Get bounds with rotation
int minXRotated = buffer.getMinX(PrefabRotation.ROTATION_90);

// Get anchor
int anchorX = buffer.getAnchorX();
int anchorY = buffer.getAnchorY();
int anchorZ = buffer.getAnchorZ();

// Get column count
int columns = buffer.getColumnCount();

// Get maximum extent (for any rotation)
int maxExtent = buffer.getMaximumExtend();

// Get block data at position
int blockId = buffer.getBlockId(x, y, z);
int filler = buffer.getFiller(x, y, z);
int rotationIndex = buffer.getRotationIndex(x, y, z);

// Release buffer when done
buffer.release();
```

### Iterating with PrefabBufferCall

```java
import com.hypixel.hytale.server.core.prefab.selection.buffer.PrefabBufferCall;

// Create call context
PrefabBufferCall call = new PrefabBufferCall();
call.rotation = PrefabRotation.ROTATION_0;
call.random = new Random();

// Iterate all blocks
buffer.forEach(
    IPrefabBuffer.iterateAllColumns(),
    (x, y, z, blockId, holder, supportValue, rotation, filler, ctx, fluidId, fluidLevel) -> {
        // Process each block
    },
    (x, z, entityHolders, ctx) -> {
        // Process entities in column
    },
    (x, y, z, path, fitHeightmap, inheritSeed, inheritHeightCondition, weights, rotation, ctx) -> {
        // Process child prefab references
    },
    call
);
```

## PrefabLoader

Load prefabs using wildcard patterns:

```java
import com.hypixel.hytale.server.core.prefab.selection.buffer.PrefabLoader;
import java.nio.file.Path;

Path rootFolder = PrefabStore.get().getServerPrefabsPath();
PrefabLoader loader = new PrefabLoader(rootFolder);

// Load single prefab
loader.resolvePrefabs("structures.house", path -> {
    // path: structures/house.prefab.json
});

// Load all prefabs in folder (wildcard)
loader.resolvePrefabs("structures.*", path -> {
    // Called for each .prefab.json in structures/
});

// Static method variant
PrefabLoader.resolvePrefabs(rootFolder, "dungeons.*", path -> {
    // Process each dungeon prefab
});
```

## Prefab Events

### PrefabPasteEvent

Fired when a prefab paste operation begins or ends:

```java
import com.hypixel.hytale.server.core.prefab.event.PrefabPasteEvent;

getEventRegistry().register(PrefabPasteEvent.class, event -> {
    int prefabId = event.getPrefabId();
    boolean isStart = event.isPasteStart();

    if (event.isPasteStart()) {
        // Paste starting
    } else {
        // Paste completed
    }

    // Cancel to prevent paste
    event.setCancelled(true);
});
```

### PrefabPlaceEntityEvent

Fired for each entity placed from a prefab:

```java
import com.hypixel.hytale.server.core.prefab.event.PrefabPlaceEntityEvent;

getEventRegistry().register(PrefabPlaceEntityEvent.class, event -> {
    int prefabId = event.getPrefabId();
    Holder<EntityStore> entityHolder = event.getHolder();

    // Modify entity before spawn
    // Note: This event is not cancellable
});
```

## SelectionManager

The `SelectionManager` provides access to the current selection provider:

```java
import com.hypixel.hytale.server.core.prefab.selection.SelectionManager;
import com.hypixel.hytale.server.core.prefab.selection.SelectionProvider;

// Get current provider
SelectionProvider provider = SelectionManager.getSelectionProvider();

// Set custom provider
SelectionManager.setSelectionProvider(myProvider);
```

### SelectionProvider Interface

```java
import com.hypixel.hytale.server.core.prefab.selection.SelectionProvider;
import com.hypixel.hytale.server.core.entity.entities.Player;

public interface SelectionProvider {
    <T extends Throwable> void computeSelectionCopy(
        Ref<EntityStore> entityRef,
        Player player,
        ThrowableConsumer<BlockSelection, T> consumer,
        ComponentAccessor<EntityStore> accessor
    );
}
```

## World Generation Integration

Prefabs integrate with world generation through the `PrefabPopulator`:

```java
import com.hypixel.hytale.server.worldgen.chunk.populator.PrefabPopulator;

// Prefabs are automatically placed during world generation based on:
// - Biome configuration
// - Noise density conditions
// - Height conditions
// - Parent block conditions
// - Priority-based conflict resolution
```

### Child Prefabs

Prefabs can contain references to other prefabs (child prefabs):

```java
import com.hypixel.hytale.server.core.prefab.selection.buffer.impl.PrefabBuffer;

PrefabBuffer.ChildPrefab[] children = buffer.getChildPrefabs();

for (PrefabBuffer.ChildPrefab child : children) {
    int x = child.getX();
    int y = child.getY();
    int z = child.getZ();
    String path = child.getPath();
    boolean fitHeightmap = child.isFitHeightmap();
    boolean inheritSeed = child.isInheritSeed();
    boolean inheritHeightCondition = child.isInheritHeightCondition();
    PrefabWeights weights = child.getWeights();
    PrefabRotation rotation = child.getRotation();
}
```

## Serialization

Prefabs are serialized using BSON format with the `SelectionPrefabSerializer`:

```java
import com.hypixel.hytale.server.core.prefab.config.SelectionPrefabSerializer;
import org.bson.BsonDocument;

// Serialize to BSON
BsonDocument doc = SelectionPrefabSerializer.serialize(selection);

// Deserialize from BSON
BlockSelection loaded = SelectionPrefabSerializer.deserialize(doc);
```

The prefab format includes:
- Version number (current: 8)
- Block ID version for migration
- Anchor position
- Blocks array with position, name, rotation, filler, support, and components
- Fluids array with position, name, and level
- Entities array with full component data

## Best Practices

1. **Cache loaded prefabs** - The `PrefabStore` caches automatically, but avoid repeated lookups
2. **Release buffers** - Call `release()` on `IPrefabBuffer` when done
3. **Use appropriate placement method** - Use `placeNoReturn()` for performance when undo is not needed
4. **Set anchor points correctly** - The anchor determines the placement origin
5. **Handle rotation consistently** - Use `PrefabRotation` for all rotation operations
6. **Use weights for variety** - Configure `PrefabWeights` for natural-looking world generation
7. **Mark entities copyable** - Add `PrefabCopyableComponent` to entities that should be saved
8. **Validate paths** - Use the prefab file pattern `.prefab.json` for compatibility
9. **Handle exceptions** - Catch `PrefabLoadException` and `PrefabSaveException` appropriately
10. **Use child prefabs** - For modular, composable structures
