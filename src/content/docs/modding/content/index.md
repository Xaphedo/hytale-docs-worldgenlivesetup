---
title: Content & World
description: Learn about creating custom content, assets, and world generation for Hytale.
sidebar:
  order: 1
---

This section covers content creation and world building features in Hytale, including assets, items, prefabs, and world generation.

## Overview

Hytale's content system allows you to:

- Register and manage custom assets
- Create items and inventory systems
- Build and place prefab structures
- Customize world generation

## Getting Started

1. **[Assets & Registry](./assets)** - Register custom content and manage assets
2. **[Inventory & Items](./inventory)** - Player inventories and item management
3. **[Prefab System](./prefabs)** - Create and place structures
4. **[World Generation](./world-generation)** - Customize terrain generation

## Architecture

```
AssetRegistry (Global)
├── AssetStore<K, T, M>[]     - Type-specific stores
│   ├── AssetCodec            - Serialization
│   ├── AssetMap              - Storage/lookup
│   └── AssetPack[]           - Content packs
└── TagSystem                  - Asset tagging

World Generation
├── IWorldGen                  - Generator interface
├── ChunkGenerator             - Terrain generation
├── Biome System               - Biome definitions
├── Cave System                - Underground generation
└── Prefab System              - Structure placement
```

## Quick Example

### Registering an Asset

```java
@Override
protected void setup() {
    AssetRegistry.register(
        HytaleAssetStore.builder(MyAsset.class, new IndexedLookupTableAssetMap<>(MyAsset[]::new))
            .setPath("MyAssets")
            .setCodec((AssetCodec) MyAsset.CODEC)
            .setKeyFunction(MyAsset::getId)
            .build()
    );
}
```

### Placing a Prefab

```java
PrefabStore store = PrefabStore.get();
BlockSelection prefab = store.getServerPrefab("structures/house.prefab.json");

// Place at position
prefab.place(world, new Vector3i(100, 64, 100));
```

## Content Types

| Type | Description |
|------|-------------|
| Assets | Registered game content (items, blocks, entities) |
| Items | Holdable objects with behaviors |
| Prefabs | Pre-built structures and decorations |
| World Generators | Terrain and biome generation logic |

## Next Steps

- Read the [Assets & Registry](./assets) guide for content registration
- Learn about the [Inventory System](./inventory) for item management
- Explore [Prefabs](./prefabs) for structure placement
- Customize terrain with [World Generation](./world-generation)
