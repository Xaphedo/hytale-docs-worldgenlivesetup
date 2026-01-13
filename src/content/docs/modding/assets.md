---
title: Assets & Registry
description: Register custom content and manage assets in your Hytale plugin.
sidebar:
  order: 5
---

The Hytale asset system provides a powerful way to register, load, and manage custom game content.

## Architecture

```
AssetRegistry (Global)
├── AssetStore<K, T, M>[]     - Type-specific stores
│   ├── AssetCodec            - Serialization
│   ├── AssetMap              - Storage/lookup
│   └── AssetPack[]           - Content packs
└── TagSystem                  - Asset tagging
```

## Asset Stores

### Registering an Asset Store

Asset stores are registered with the global `AssetRegistry`:

```java
import com.hypixel.hytale.assetstore.AssetRegistry;
import com.hypixel.hytale.assetstore.codec.AssetCodec;
import com.hypixel.hytale.assetstore.map.IndexedLookupTableAssetMap;
import com.hypixel.hytale.server.core.asset.HytaleAssetStore;

@Override
protected void setup() {
    // Register directly with the global AssetRegistry
    AssetRegistry.register(
        HytaleAssetStore.builder(MyAsset.class, new IndexedLookupTableAssetMap<>(MyAsset[]::new))
            .setPath("MyAssets")
            .setCodec((AssetCodec) MyAsset.CODEC)
            .setKeyFunction(MyAsset::getId)
            .loadsAfter(OtherAsset.class)  // Load dependencies
            .build()
    );
}
```

### Asset Store Builder

The `HytaleAssetStore.Builder` provides methods to configure how assets are loaded and managed:

```java
HytaleAssetStore.builder(AssetClass.class, new IndexedLookupTableAssetMap<>(AssetClass[]::new))
    .setPath("AssetDirectory")           // JSON files location relative to asset pack root
    .setCodec((AssetCodec) Asset.CODEC)  // Serialization codec
    .setKeyFunction(Asset::getId)         // Key extraction function
    .loadsAfter(Dependency.class)         // Load after this asset type
    .loadsBefore(Dependent.class)         // Load before this asset type
    .setReplaceOnRemove(replacer)         // Replacement when asset is removed
    .setPacketGenerator(packetGen)        // Optional: for client sync
    .setNotificationItemFunction(func)    // Optional: for reload notifications
    .build();
```

### Asset Map Types

Hytale provides different asset map implementations:

```java
// For indexed lookups (most common)
new IndexedLookupTableAssetMap<>(MyAsset[]::new)

// For simple key-value storage
new DefaultAssetMap<String, MyAsset>()
```

## Creating Assets

### Asset Class

Assets extend `JsonAssetWithMap` and define a codec for serialization:

```java
import com.hypixel.hytale.assetstore.AssetRegistry;
import com.hypixel.hytale.assetstore.AssetStore;
import com.hypixel.hytale.assetstore.codec.AssetCodecMapCodec;
import com.hypixel.hytale.assetstore.map.IndexedLookupTableAssetMap;
import com.hypixel.hytale.assetstore.map.JsonAssetWithMap;
import com.hypixel.hytale.codec.Codec;
import com.hypixel.hytale.codec.KeyedCodec;
import com.hypixel.hytale.codec.builder.BuilderCodec;

public class MyAsset
implements JsonAssetWithMap<String, IndexedLookupTableAssetMap<String, MyAsset>> {

    // Define the codec with polymorphic type support
    public static final AssetCodecMapCodec<String, MyAsset> CODEC =
        new AssetCodecMapCodec<>(
            Codec.STRING,
            (asset, key) -> asset.id = key,    // Key setter
            asset -> asset.id,                  // Key getter
            (asset, data) -> asset.data = data, // Extra data setter
            asset -> asset.data                 // Extra data getter
        );

    // Abstract codec for shared fields (if supporting inheritance)
    public static final BuilderCodec<MyAsset> ABSTRACT_CODEC =
        BuilderCodec.builder(MyAsset.class, MyAsset::new)
            .append(new KeyedCodec<>("Name", Codec.STRING),
                (obj, val) -> obj.name = val,
                obj -> obj.name)
            .add()
            .append(new KeyedCodec<>("Value", Codec.INTEGER),
                (obj, val) -> obj.value = val,
                obj -> obj.value)
            .add()
            .build();

    private static AssetStore<String, MyAsset, IndexedLookupTableAssetMap<String, MyAsset>> ASSET_STORE;

    private String id;
    private Object data;  // AssetExtraInfo.Data
    private String name;
    private int value;

    public static AssetStore<String, MyAsset, IndexedLookupTableAssetMap<String, MyAsset>> getAssetStore() {
        if (ASSET_STORE == null) {
            ASSET_STORE = AssetRegistry.getAssetStore(MyAsset.class);
        }
        return ASSET_STORE;
    }

    public static IndexedLookupTableAssetMap<String, MyAsset> getAssetMap() {
        return getAssetStore().getAssetMap();
    }

    @Override
    public String getId() { return id; }
    public String getName() { return name; }
    public int getValue() { return value; }
}
```

### Asset JSON File

```json
{
  "Id": "my_asset_id",
  "Name": "My Asset",
  "Value": 42
}
```

## Codec System

### BuilderCodec

Type-safe serialization for structured data:

```java
public static final BuilderCodec<MyData> CODEC =
    BuilderCodec.builder(MyData.class, MyData::new)
        .append(new KeyedCodec<>("Name", Codec.STRING),
            (obj, val) -> obj.name = val,
            obj -> obj.name)
        .add()
        .append(new KeyedCodec<>("Count", Codec.INTEGER),
            (obj, val) -> obj.count = val,
            obj -> obj.count)
        .add()
        .append(new KeyedCodec<>("Items", Codec.list(Item.CODEC)),
            (obj, val) -> obj.items = val,
            obj -> obj.items)
        .add()
        .build();
```

### Built-in Codecs

```java
Codec.STRING      // String
Codec.BOOLEAN     // boolean
Codec.INTEGER     // int
Codec.LONG        // long
Codec.FLOAT       // float
Codec.DOUBLE      // double
Codec.BYTE        // byte
Codec.SHORT       // short
Codec.INT_ARRAY   // int[]
Codec.FLOAT_ARRAY // float[]
Codec.UUID_STRING // UUID as string
Codec.PATH        // Path
Codec.INSTANT     // Instant
Codec.DURATION    // Duration
```

### Collection Codecs

```java
// List codec
Codec<List<String>> stringList = Codec.list(Codec.STRING);

// Map codec
Codec<Map<String, Integer>> stringIntMap =
    Codec.map(Codec.STRING, Codec.INTEGER);

// Optional codec
Codec<Optional<String>> optionalString = Codec.optional(Codec.STRING);
```

### Polymorphic Codecs

For types with multiple implementations (like Interactions), use `AssetCodecMapCodec`:

```java
import com.hypixel.hytale.assetstore.codec.AssetCodecMapCodec;

public abstract class Interaction {
    // Polymorphic codec that routes to different implementations based on "Type" field
    public static final AssetCodecMapCodec<String, Interaction> CODEC =
        new AssetCodecMapCodec<>(
            Codec.STRING,
            (t, k) -> t.id = k,
            t -> t.id,
            (t, data) -> t.data = data,
            t -> t.data
        );
}

// Implementations are registered with the codec
Interaction.CODEC.register("Click", ClickInteraction.class, ClickInteraction.CODEC);
Interaction.CODEC.register("Hold", HoldInteraction.class, HoldInteraction.CODEC);
```

Registration in plugin using the codec registry:

```java
import com.hypixel.hytale.server.core.modules.interaction.interaction.config.Interaction;

@Override
protected void setup() {
    // Register custom interaction type with the Interaction codec
    getCodecRegistry(Interaction.CODEC)
        .register("MyInteraction", MyInteraction.class, MyInteraction.CODEC);
}
```

### Real-World Example: Custom Interaction

Here is how the built-in `ProjectileModule` registers a custom interaction:

```java
// From ProjectileModule.java
@Override
protected void setup() {
    this.getCodecRegistry(Interaction.CODEC)
        .register("Projectile", ProjectileInteraction.class, ProjectileInteraction.CODEC);
}
```

## Asset Loading

### Load from Directory

```java
AssetStore<String, MyAsset, ?> store = AssetRegistry.getAssetStore(MyAsset.class);

// Load all assets from a directory
store.loadAssetsFromDirectory(path);
```

### Load Specific Paths

```java
store.loadAssetsFromPaths(packId, List.of(
    Paths.get("assets/my_asset_1.json"),
    Paths.get("assets/my_asset_2.json")
));
```

### Load Events

Listen for asset loading/unloading:

```java
@Override
protected void setup() {
    getEventRegistry().register(
        LoadedAssetsEvent.class,
        MyAsset.class,
        this::onAssetsLoaded
    );

    getEventRegistry().register(
        RemovedAssetsEvent.class,
        MyAsset.class,
        this::onAssetsRemoved
    );
}

private void onAssetsLoaded(LoadedAssetsEvent<MyAsset> event) {
    for (MyAsset asset : event.getAssets()) {
        getLogger().info("Loaded asset: " + asset.getId());
    }
}
```

## Asset Access

### Get Asset by Key

```java
DefaultAssetMap<String, MyAsset> map = MyAsset.getAssetMap();
MyAsset asset = map.getAsset("my_asset_id");

if (asset != null) {
    // Use asset
}
```

### Iterate All Assets

```java
for (String key : map.getKeys()) {
    MyAsset asset = map.getAsset(key);
    // Process asset
}
```

### Check Asset Existence

```java
boolean exists = map.containsKey("my_asset_id");
```

## Asset Inheritance

Assets can inherit from parent assets:

```java
public static final BuilderCodec<MyAsset> CODEC =
    BuilderCodec.builder(MyAsset.class, MyAsset::new)
        .append(new KeyedCodec<>("Parent", Codec.STRING),
            (obj, val) -> obj.parentId = val,
            obj -> obj.parentId)
        .addInherited()  // Mark as inheritable
        .append(new KeyedCodec<>("Name", Codec.STRING),
            (obj, val) -> obj.name = val,
            obj -> obj.name)
        .add()
        .build();
```

JSON with inheritance:

```json
{
  "Id": "my_child_asset",
  "Parent": "my_parent_asset",
  "Name": "Overridden Name"
}
```

## Asset Validation

### Custom Validators

```java
public static final BuilderCodec<MyAsset> CODEC =
    BuilderCodec.builder(MyAsset.class, MyAsset::new)
        .append(new KeyedCodec<>("Value", Codec.INTEGER),
            (obj, val) -> obj.value = val,
            obj -> obj.value)
        .validator((obj, results) -> {
            if (obj.value < 0) {
                results.addError("Value must be non-negative");
            }
        })
        .add()
        .build();
```

### Asset Reference Validation

```java
// Validates that referenced assets exist
new AssetKeyValidator<>(MyOtherAsset::getAssetMap)
```

## Content Packs

### AssetPack Structure

```java
public class AssetPack {
    String name;           // Pack identifier
    Path root;             // Filesystem root
    boolean isImmutable;   // Prevents modification
    PluginManifest manifest;
}
```

### Loading from Packs

Assets are automatically loaded from registered content packs during server startup.

## Registry Types

### Plugin Registries

The `PluginBase` class provides several registry accessors for registering different types of content:

```java
// Asset registry (via PluginBase.getAssetRegistry())
// Note: For global asset stores, use AssetRegistry.register() directly
getAssetRegistry().register(assetStore);

// Codec registry for polymorphic types (via PluginBase)
getCodecRegistry(ParentCodec.CODEC).register("Type", MyClass.class, MyClass.CODEC);

// Block state registry
getBlockStateRegistry().registerBlockState(StateClass.class, "name", CODEC);

// Client feature registry
getClientFeatureRegistry().register(ClientFeature.MyFeature);
getClientFeatureRegistry().registerClientTag("MyTag");

// Entity store registry (for components and systems)
getEntityStoreRegistry().registerComponent(MyComponent.class, "Name", MyComponent.CODEC);
getEntityStoreRegistry().registerSystem(new MySystem());
getEntityStoreRegistry().registerResource(MyResource.class, MyResource::new);

// Chunk store registry
getChunkStoreRegistry().registerComponent(MyChunkComponent.class, "Name", CODEC);

// Command registry
getCommandRegistry().registerCommand(new MyCommand());

// Event registry
getEventRegistry().register(SomeEvent.class, this::onEvent);

// Task registry
getTaskRegistry().scheduleTask(task);
```

## Thread Safety

Asset operations use read-write locks:

```java
// Global asset lock
AssetRegistry.ASSET_LOCK.readLock();   // For reads
AssetRegistry.ASSET_LOCK.writeLock();  // For writes

// Always released in finally block
```

## Asset Loading Flow

```
1. loadAssetsFromPaths()
   ↓
2. Discover filesystem paths
   ↓
3. Create RawAsset objects
   ↓
4. loadAssets0() - Parallel decoding
   ↓
5. GenerateAssetsEvent dispatch
   ↓
6. assetMap.putAll() - Insert into storage
   ↓
7. loadContainedAssets() - Recursive children
   ↓
8. LoadedAssetsEvent dispatch
   ↓
9. Send update packets to clients
```

## Best Practices

1. **Define clear codecs** - Type-safe serialization prevents errors
2. **Use load ordering** - Declare dependencies with loadsAfter/loadsBefore
3. **Validate assets** - Add validators to catch invalid data
4. **Handle events** - React to asset loading/unloading
5. **Use inheritance** - Reduce duplication with parent assets
6. **Cache asset references** - Store frequently accessed assets
7. **Thread-safe access** - Use proper locking for modifications
