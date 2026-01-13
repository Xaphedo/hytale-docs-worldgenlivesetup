---
title: World Generation
description: Understanding and customizing Hytale's procedural world generation system.
sidebar:
  order: 5
---

Hytale features a sophisticated procedural world generation system for terrain, biomes, caves, and structures.

## Architecture

| Layer | Purpose |
|-------|---------|
| `IWorldGen` / `IWorldGenProvider` | Core interfaces |
| `ChunkGenerator` | Main terrain generation |
| `NStagedChunkGenerator` | Staged pipeline |
| Zone System | Large-scale regions |
| Biome System | Terrain characteristics |
| Cave System | Underground structures |
| Prefab System | Structure placement |

## Core Interfaces

### IWorldGen

The fundamental interface for world generators:

```java
import com.hypixel.hytale.server.core.universe.world.worldgen.IWorldGen;

public interface IWorldGen {
    // Timing statistics
    WorldGenTimingsCollector getTimings();

    // Generate chunk asynchronously
    CompletableFuture<GeneratedChunk> generate(
        int seed, long index, int x, int z,
        LongPredicate stillNeeded
    );

    // Get spawn points
    Transform[] getSpawnPoints(int seed);

    // Get default spawn provider
    ISpawnProvider getDefaultSpawnProvider(int seed);
}
```

### Registering Custom Generators

```java
public class MyWorldGenPlugin extends JavaPlugin {
    @Override
    protected void setup() {
        IWorldGenProvider.CODEC.register(
            Priority.DEFAULT,
            "MyGenerator",
            MyWorldGenProvider.class,
            MyWorldGenProvider.CODEC
        );
    }
}
```

## Generated Chunk Structures

### GeneratedChunk

Container for all chunk data:

```java
import com.hypixel.hytale.server.core.universe.world.worldgen.GeneratedChunk;

// Access chunk data
GeneratedBlockChunk blocks = chunk.getBlockChunk();
GeneratedBlockStateChunk states = chunk.getBlockStateChunk();
GeneratedEntityChunk entities = chunk.getEntityChunk();

// Convert to world chunk
Holder<ChunkStore> worldChunk = chunk.toWorldChunk(world);
```

### GeneratedChunkSection

Stores block data for 32x32x32 sections:

```java
GeneratedChunkSection section = new GeneratedChunkSection();

// Set/get blocks
section.setBlock(x, y, z, blockId, rotation, filler);
int blockId = section.getBlock(x, y, z);
int filler = section.getFiller(x, y, z);
int rotation = section.getRotationIndex(x, y, z);

// Check state
boolean isEmpty = section.isSolidAir();
```

## Staged Generation (NStagedChunkGenerator)

Flexible staged pipeline where each stage processes buffers:

```java
NStagedChunkGenerator generator = new NStagedChunkGenerator.Builder()
    .withConcurrentExecutor(executor, workerIndexer)
    .withMaterialCache(materialCache)
    .withBufferCapacity(1.5, 128.0, 4.0)
    .appendStage(new NBiomeStage(...))
    .appendStage(new NTerrainStage(...))
    .appendStage(new NPropStage(...))
    .appendStage(new NTintStage(...))
    .appendStage(new NEnvironmentStage(...))
    .build();
```

### Built-in Stages

| Stage | Purpose |
|-------|---------|
| `NBiomeStage` | Biome data generation |
| `NBiomeDistanceStage` | Distance to biome borders |
| `NTerrainStage` | Terrain heightmap/blocks |
| `NPropStage` | Props and decorations |
| `NTintStage` | Color tinting |
| `NEnvironmentStage` | Environment data |

## Procedural Library

### Noise Functions

```java
import com.hypixel.hytale.procedurallib.logic.*;

SimplexNoise simplex = SimplexNoise.INSTANCE;
double value2d = simplex.get(seed, 0, x, z);
double value3d = simplex.get(seed, 0, x, y, z);

// Other noise types
PerlinNoise perlin = PerlinNoise.INSTANCE;
ValueNoise value = ValueNoise.INSTANCE;
CellNoise cell = CellNoise.INSTANCE;
```

### NoiseProperty Types

| Type | Description |
|------|-------------|
| `FractalNoiseProperty` | Multi-octave fractal |
| `SumNoiseProperty` | Add noise sources |
| `MultiplyNoiseProperty` | Multiply sources |
| `ScaleNoiseProperty` | Scale coordinates |
| `NormalizeNoiseProperty` | Normalize to 0-1 |
| `CurveNoiseProperty` | Apply curve |
| `BlendNoiseProperty` | Blend sources |
| `DistortedNoiseProperty` | Domain distortion |

### Conditions

```java
import com.hypixel.hytale.procedurallib.condition.*;

// Coordinate condition
public interface ICoordinateCondition {
    boolean eval(int seed, int x, int y);
    boolean eval(int seed, int x, int y, int z);
}

// Value conditions
public interface IDoubleCondition {
    boolean eval(double value);
}

public interface IIntCondition {
    boolean eval(int value);
}
```

### Height Threshold

Controls terrain density at different heights:

```java
public interface IHeightThresholdInterpreter {
    int getLowestNonOne();   // Below: always solid
    int getHighestNonZero(); // Above: always air

    float getThreshold(int seed, double x, double z, int y);
    double getContext(int seed, double x, double z);
    boolean isSpawnable(int height);
}
```

### Ranges and Suppliers

```java
import com.hypixel.hytale.procedurallib.supplier.DoubleRange;

DoubleRange range = new DoubleRange(0.5, 1.5);
double value = range.getValue(random);
```

### Point Generators

For placing features at distributed points:

```java
import com.hypixel.hytale.procedurallib.logic.point.IPointGenerator;

IPointGenerator generator = /* ... */;

// Find nearest point
ResultBuffer.ResultBuffer2d nearest = generator.nearest2D(seed, x, z);

// Collect points in area
generator.collect(seed, minX, minZ, maxX, maxZ, (px, pz) -> {
    // Process point
});
```

## Zones

Large-scale region definitions:

```java
import com.hypixel.hytale.builtin.hytalegenerator.zone.Zone;
import com.hypixel.hytale.builtin.hytalegenerator.zone.ZoneManager;

ZoneManager zones = /* ... */;

// Get zone at position
Zone zone = zones.getZone(x, z);

// Zone properties
String name = zone.getName();
BiomeSet biomes = zone.getBiomes();
```

## Biomes

Terrain characteristics and block placement:

```java
import com.hypixel.hytale.builtin.hytalegenerator.biome.Biome;

// Biome properties
String id = biome.getId();
float temperature = biome.getTemperature();
float humidity = biome.getHumidity();

// Surface blocks
BlockType surface = biome.getSurfaceBlock();
BlockType subsurface = biome.getSubsurfaceBlock();
```

## Caves

Underground structure generation:

```java
import com.hypixel.hytale.builtin.hytalegenerator.cave.*;

// Cave carver
ICaveCarver carver = /* ... */;
carver.carve(context, x, y, z);

// Check if position is in cave
boolean inCave = carver.isInCave(seed, x, y, z);
```

## Best Practices

1. **Use async generation** - Never block the main thread
2. **Cache noise results** - Expensive to recompute
3. **Respect stillNeeded predicate** - Cancel work for unneeded chunks
4. **Profile with getTimings()** - Identify bottlenecks
5. **Use staged pipeline** - For complex generation logic
