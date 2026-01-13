---
title: World Generation
description: Understanding and customizing Hytale's procedural world generation system.
sidebar:
  order: 10
---

Hytale features a sophisticated procedural world generation system that creates diverse terrain, biomes, caves, and places prefab structures. This documentation covers the core APIs and systems that plugin developers can use to create custom world generators or modify generation behavior.

## Architecture Overview

The world generation system consists of several interconnected layers:

| Layer | Purpose |
|-------|---------|
| `IWorldGen` / `IWorldGenProvider` | Core interfaces for world generators |
| `ChunkGenerator` | Main implementation for Hytale's terrain generation |
| `NStagedChunkGenerator` | Alternative staged generation pipeline |
| Zone System | Large-scale region definitions |
| Biome System | Terrain characteristics and block placement |
| Cave System | Underground structure generation |
| Prefab System | Structure and decoration placement |

## Core Interfaces

### IWorldGen

The fundamental interface for world generators:

```java
import com.hypixel.hytale.server.core.universe.world.worldgen.IWorldGen;
import com.hypixel.hytale.server.core.universe.world.worldgen.GeneratedChunk;
import com.hypixel.hytale.math.vector.Transform;
import java.util.concurrent.CompletableFuture;
import java.util.function.LongPredicate;

public interface IWorldGen {
    // Get timing statistics for the generator
    WorldGenTimingsCollector getTimings();

    // Generate a chunk asynchronously
    CompletableFuture<GeneratedChunk> generate(
        int seed,           // World seed
        long index,         // Chunk index
        int x, int z,       // Chunk coordinates
        LongPredicate stillNeeded  // Check if generation is still required
    );

    // Get spawn points for the world
    Transform[] getSpawnPoints(int seed);

    // Get the default spawn provider
    ISpawnProvider getDefaultSpawnProvider(int seed);

    // Called when the generator should shut down
    default void shutdown() {}
}
```

### IWorldGenProvider

Factory interface for creating world generators:

```java
import com.hypixel.hytale.server.core.universe.world.worldgen.provider.IWorldGenProvider;
import com.hypixel.hytale.codec.lookup.BuilderCodecMapCodec;

public interface IWorldGenProvider {
    // Codec for serialization/deserialization
    BuilderCodecMapCodec<IWorldGenProvider> CODEC =
        new BuilderCodecMapCodec("Type", true);

    // Create the world generator instance
    IWorldGen getGenerator() throws WorldGenLoadException;
}
```

### Registering a Custom Generator

To register a custom world generator, use the `IWorldGenProvider.CODEC` registry in your plugin:

```java
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;
import com.hypixel.hytale.codec.lookup.Priority;

public class MyWorldGenPlugin extends JavaPlugin {

    public MyWorldGenPlugin(JavaPluginInit init) {
        super(init);
    }

    @Override
    protected void setup() {
        // Register custom world generator type
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

The container for all chunk data during generation:

```java
import com.hypixel.hytale.server.core.universe.world.worldgen.GeneratedChunk;

public class GeneratedChunk {
    // Block data (block IDs, rotations, fillers)
    public GeneratedBlockChunk getBlockChunk();

    // Block component state data (holders)
    public GeneratedBlockStateChunk getBlockStateChunk();

    // Entity spawn data
    public GeneratedEntityChunk getEntityChunk();

    // Section holders for chunk storage
    public Holder<ChunkStore>[] getSections();

    // Convert to world chunk for placement
    public Holder<ChunkStore> toWorldChunk(World world);
}
```

### GeneratedChunkSection

Stores block data for a 32x32x32 section:

```java
import com.hypixel.hytale.server.core.universe.world.worldgen.GeneratedChunkSection;

public class GeneratedChunkSection {
    // Block data array (32768 = 32^3 blocks)
    private final int[] data = new int[32768];

    // Get block at local coordinates
    public int getBlock(int x, int y, int z);

    // Get filler value at coordinates
    public int getFiller(int x, int y, int z);

    // Get rotation index at coordinates
    public int getRotationIndex(int x, int y, int z);

    // Set block with all properties
    public void setBlock(int x, int y, int z, int block, int rotation, int filler);

    // Reset section to empty
    public void reset();

    // Check if section is all air
    public boolean isSolidAir();

    // Convert to final chunk section
    public BlockSection toChunkSection();
}
```

## Staged Generation Pipeline (NStagedChunkGenerator)

The `NStagedChunkGenerator` provides a flexible staged generation pipeline where each stage processes buffers of data.

### NStage Interface

```java
import com.hypixel.hytale.builtin.hytalegenerator.newsystem.stages.NStage;
import com.hypixel.hytale.builtin.hytalegenerator.newsystem.bufferbundle.buffers.type.NBufferType;
import com.hypixel.hytale.builtin.hytalegenerator.bounds.Bounds3i;

public interface NStage {
    // Execute the stage with given context
    void run(Context context);

    // Input buffer types and their required bounds
    Map<NBufferType, Bounds3i> getInputTypesAndBounds_bufferGrid();

    // Output buffer types produced by this stage
    List<NBufferType> getOutputTypes();

    // Stage name for debugging
    String getName();

    // Context passed to run()
    class Context {
        public Map<NBufferType, NBufferBundle.Access.View> bufferAccess;
        public WorkerIndexer.Id workerId;
    }
}
```

### Building a Staged Generator

```java
import com.hypixel.hytale.builtin.hytalegenerator.newsystem.NStagedChunkGenerator;

NStagedChunkGenerator.Builder builder = new NStagedChunkGenerator.Builder();

NStagedChunkGenerator generator = builder
    .withConcurrentExecutor(executor, workerIndexer)
    .withMaterialCache(materialCache)
    .withBufferCapacity(1.5, 128.0, 4.0)  // factor, viewDistance, playerCount
    .withStats("WorldGen", Set.of(100, 1000, 10000))  // checkpoints
    .appendStage(new NBiomeStage(...))
    .appendStage(new NTerrainStage(...))
    .appendStage(new NPropStage(...))
    .appendStage(new NTintStage(...))
    .appendStage(new NEnvironmentStage(...))
    .build();
```

### Built-in Stage Types

| Stage | Purpose |
|-------|---------|
| `NBiomeStage` | Generates biome data for each position |
| `NBiomeDistanceStage` | Calculates distance to biome borders |
| `NTerrainStage` | Generates terrain heightmap and blocks |
| `NPropStage` | Places props and decorations |
| `NTintStage` | Applies color tinting to blocks |
| `NEnvironmentStage` | Sets environment/atmosphere data |

## Procedural Library (ProceduralLib)

The procedural library provides noise functions, conditions, and suppliers for generation algorithms.

### Noise Functions

```java
import com.hypixel.hytale.procedurallib.NoiseFunction;
import com.hypixel.hytale.procedurallib.logic.SimplexNoise;
import com.hypixel.hytale.procedurallib.logic.PerlinNoise;
import com.hypixel.hytale.procedurallib.logic.ValueNoise;
import com.hypixel.hytale.procedurallib.logic.CellNoise;

// NoiseFunction interface
public interface NoiseFunction extends NoiseFunction2d, NoiseFunction3d {
    // 2D noise
    double get(int seed, int offsetSeed, double x, double y);

    // 3D noise
    double get(int seed, int offsetSeed, double x, double y, double z);
}

// Usage examples
SimplexNoise simplex = SimplexNoise.INSTANCE;
double value2d = simplex.get(seed, 0, x, z);
double value3d = simplex.get(seed, 0, x, y, z);
```

### NoiseProperty

Composite noise with transformations:

```java
import com.hypixel.hytale.procedurallib.property.NoiseProperty;

public interface NoiseProperty {
    // 2D evaluation
    double get(int seed, double x, double y);

    // 3D evaluation
    double get(int seed, double x, double y, double z);
}
```

### NoiseProperty Types

| Type | Description |
|------|-------------|
| `SingleNoiseProperty` | Base noise function wrapper |
| `FractalNoiseProperty` | Multi-octave fractal noise |
| `SumNoiseProperty` | Add multiple noise sources |
| `MultiplyNoiseProperty` | Multiply noise sources |
| `MaxNoiseProperty` | Maximum of noise sources |
| `MinNoiseProperty` | Minimum of noise sources |
| `ScaleNoiseProperty` | Scale input coordinates |
| `OffsetNoiseProperty` | Offset input coordinates |
| `NormalizeNoiseProperty` | Normalize to 0-1 range |
| `InvertNoiseProperty` | Invert noise values |
| `CurveNoiseProperty` | Apply curve transformation |
| `BlendNoiseProperty` | Blend between noise sources |
| `DistortedNoiseProperty` | Domain distortion |
| `RotateNoiseProperty` | Rotate input coordinates |
| `GradientNoiseProperty` | Gradient-based noise |

### Conditions

Conditions evaluate coordinate-based or value-based logic:

```java
import com.hypixel.hytale.procedurallib.condition.ICoordinateCondition;
import com.hypixel.hytale.procedurallib.condition.IDoubleCondition;
import com.hypixel.hytale.procedurallib.condition.IIntCondition;

// Coordinate condition (evaluates at x, y, z)
public interface ICoordinateCondition {
    boolean eval(int seed, int x, int y);
    boolean eval(int seed, int x, int y, int z);
}

// Double value condition
public interface IDoubleCondition {
    boolean eval(double value);
}

// Integer condition (e.g., biome ID matching)
public interface IIntCondition {
    boolean eval(int value);
}
```

### Height Threshold Interpreter

Controls terrain density at different heights:

```java
import com.hypixel.hytale.procedurallib.condition.IHeightThresholdInterpreter;

public interface IHeightThresholdInterpreter {
    // Height range where terrain can exist
    int getLowestNonOne();   // Below this: always solid
    int getHighestNonZero(); // Above this: always air

    // Get density threshold at position
    float getThreshold(int seed, double x, double z, int y);
    float getThreshold(int seed, double x, double z, int y, double context);

    // Get context value for position (heightmap noise)
    double getContext(int seed, double x, double z);

    // Check if height is valid for spawning
    boolean isSpawnable(int height);
}
```

### Suppliers and Ranges

```java
import com.hypixel.hytale.procedurallib.supplier.IDoubleRange;
import com.hypixel.hytale.procedurallib.supplier.DoubleRange;

public interface IDoubleRange {
    // Get value from random 0-1
    double getValue(double random);

    // Get value from supplier
    double getValue(DoubleSupplier supplier);

    // Get value from Random
    double getValue(Random random);

    // Get value from 2D coordinates
    double getValue(int seed, double x, double z, IDoubleCoordinateSupplier2d supplier);

    // Get value from 3D coordinates
    double getValue(int seed, double x, double y, double z, IDoubleCoordinateSupplier3d supplier);
}

// Example: range from 0.5 to 1.5
DoubleRange range = new DoubleRange(0.5, 1.5);
double value = range.getValue(random);
```

### Point Generators

For placing features at distributed points:

```java
import com.hypixel.hytale.procedurallib.logic.point.IPointGenerator;
import com.hypixel.hytale.procedurallib.logic.point.PointGenerator;

public interface IPointGenerator {
    // Find nearest point in 2D
    ResultBuffer.ResultBuffer2d nearest2D(int seed, double x, double z);

    // Find nearest point in 3D
    ResultBuffer.ResultBuffer3d nearest3D(int seed, double x, double y, double z);

    // Get transition data between cells
    ResultBuffer.ResultBuffer2d transition2D(int seed, double x, double z);

    // Collect all points in area
    void collect(int seed, double minX, double minZ,
                 double maxX, double maxZ, PointConsumer2d consumer);

    // Get grid interval
    double getInterval();
}
```

### Coordinate Randomizer

Deterministic random values from coordinates:

```java
import com.hypixel.hytale.procedurallib.random.ICoordinateRandomizer;

public interface ICoordinateRandomizer {
    // 2D random values
    double randomDoubleX(int seed, double x, double y);
    double randomDoubleY(int seed, double x, double y);

    // 3D random values
    double randomDoubleX(int seed, double x, double y, double z);
    double randomDoubleY(int seed, double x, double y, double z);
    double randomDoubleZ(int seed, double x, double y, double z);
}
```

## Zone and Biome Systems

### Zone

Zones define large-scale world regions:

```java
import com.hypixel.hytale.server.worldgen.zone.Zone;

public record Zone(
    int id,                                    // Unique zone ID
    String name,                               // Display name
    ZoneDiscoveryConfig discoveryConfig,       // UI discovery settings
    CaveGenerator caveGenerator,               // Zone's cave generator (nullable)
    BiomePatternGenerator biomePatternGenerator, // Biome placement logic
    UniquePrefabContainer uniquePrefabContainer  // Zone-specific prefabs
) {
    // Unique zone candidate for placement
    public record UniqueCandidate(UniqueEntry zone, Vector2i[] positions) {}

    // Unique zone entry configuration
    public record UniqueEntry(Zone zone, int color, int[] parent, int radius, int padding) {
        boolean matchesParent(int color);
    }

    // Placed unique zone
    public record Unique(Zone zone, CompletableFuture<Vector2i> position) {
        Vector2i getPosition();
    }
}
```

### Biome

Biomes define terrain characteristics:

```java
import com.hypixel.hytale.server.worldgen.biome.Biome;

public abstract class Biome {
    protected final int id;
    protected final String name;
    protected final BiomeInterpolation interpolation;
    protected final IHeightThresholdInterpreter heightmapInterpreter;
    protected final CoverContainer coverContainer;      // Surface cover blocks
    protected final LayerContainer layerContainer;      // Layer definitions
    protected final PrefabContainer prefabContainer;    // Prefab placement
    protected final TintContainer tintContainer;        // Block tinting
    protected final EnvironmentContainer environmentContainer; // Atmosphere
    protected final WaterContainer waterContainer;      // Water placement
    protected final FadeContainer fadeContainer;        // Border fading
    protected final NoiseProperty heightmapNoise;       // Heightmap noise
    protected final int mapColor;                       // Map display color

    // Getters for all properties...
    public String getName();
    public BiomeInterpolation getInterpolation();
    public IHeightThresholdInterpreter getHeightmapInterpreter();
    public CoverContainer getCoverContainer();
    public LayerContainer getLayerContainer();
    public PrefabContainer getPrefabContainer();
    // ... etc
}
```

### BiomeDataSystem

ECS system that tracks player biome/zone for UI updates:

```java
import com.hypixel.hytale.server.worldgen.BiomeDataSystem;

public class BiomeDataSystem extends DelayedEntitySystem<EntityStore> {
    // Queries players with TransformComponent
    // Updates WorldMapTracker with current zone/biome info
    // Triggers zone discovery notifications
}
```

### MaskProvider

Provides zone mask lookup with fuzzy zooming:

```java
import com.hypixel.hytale.server.worldgen.chunk.MaskProvider;

public class MaskProvider {
    protected final FuzzyZoom fuzzyZoom;

    // Get randomized X coordinate
    public double getX(int seed, double x, double y);

    // Get randomized Y coordinate
    public double getY(int seed, double x, double y);

    // Get zone ID at position
    public int get(int seed, double x, double y);

    // Get distance to edge
    public double distance(double x, double y);

    // Check if in valid bounds
    public boolean inBounds(double x, double y);

    // Generate unique zone candidates
    public Zone.UniqueCandidate[] generateUniqueZoneCandidates(
        Zone.UniqueEntry[] entries, int maxPositions);

    // Generate unique zones
    public MaskProvider generateUniqueZones(int seed,
        Zone.UniqueCandidate[] candidates, FastRandom random, List<Zone.Unique> zones);
}
```

### HeightThresholdInterpolator

Interpolates height thresholds across biome borders:

```java
import com.hypixel.hytale.server.worldgen.chunk.HeightThresholdInterpolator;

public class HeightThresholdInterpolator {
    public static final int MAX_RADIUS = 5;

    // Populate interpolation data for chunk
    public HeightThresholdInterpolator populate(int seed);

    // Get interpolated height noise
    public double getHeightNoise(int cx, int cz);

    // Get interpolated threshold at position
    public float getHeightThreshold(int seed, int x, int z, int y);

    // Get lowest height where threshold != 1
    public int getLowestNonOne(int cx, int cz);

    // Get highest height where threshold != 0
    public int getHighestNonZero(int cx, int cz);

    // Generate interpolated biome counts
    public void generateInterpolatedBiomeCountAt(int cx, int cz,
        InterpolatedBiomeCountList biomeCountList);
}
```

## Cave Generation

### CaveGenerator

Generates cave structures within zones:

```java
import com.hypixel.hytale.server.worldgen.cave.CaveGenerator;
import com.hypixel.hytale.server.worldgen.cave.Cave;
import com.hypixel.hytale.server.worldgen.cave.CaveType;

public class CaveGenerator {
    private final CaveType[] caveTypes;

    // Generate cave at position
    public Cave generate(int seed, ChunkGenerator chunkGenerator,
                         CaveType caveType, int x, int y, int z);

    // Get all cave types
    public CaveType[] getCaveTypes();
}
```

### CaveGeneratorCache

Caches generated caves for performance:

```java
import com.hypixel.hytale.server.worldgen.cache.CaveGeneratorCache;

public class CaveGeneratorCache extends ExtendedCoordinateCache<CaveType, Cave> {

    public CaveGeneratorCache(CaveFunction caveFunction, int maxSize, long expireAfterSeconds);

    @FunctionalInterface
    public interface CaveFunction {
        Cave compute(CaveType type, int seed, int x, int z);
    }
}
```

## Prefab Spawning

### PrefabPatternGenerator

Controls where and how prefabs are placed:

```java
import com.hypixel.hytale.server.worldgen.prefab.PrefabPatternGenerator;

public class PrefabPatternGenerator {
    protected final int seedOffset;
    protected final PrefabCategory category;
    protected final IPointGenerator gridGenerator;        // Distribution
    protected final ICoordinateRndCondition heightCondition;
    protected final IHeightThresholdInterpreter heightThresholdInterpreter;
    protected final BlockMaskCondition prefabPlacementConfiguration;
    protected final ICoordinateCondition mapCondition;    // Zone/biome check
    protected final IBlockFluidCondition parentCondition; // Block below check
    protected final PrefabRotation[] rotations;           // Allowed rotations
    protected final ICoordinateDoubleSupplier displacement;
    protected final boolean fitHeightmap;                 // Adjust to terrain
    protected final boolean onWater;                      // Place on water
    protected final boolean deepSearch;                   // Search deep for valid spot
    protected final boolean submerge;                     // Allow underwater
    protected final int maxSize;                          // Max prefab size
    protected final int exclusionRadius;                  // Min distance between

    // Getters...
}
```

### PrefabContainer

Holds prefab entries for a biome:

```java
import com.hypixel.hytale.server.worldgen.container.PrefabContainer;

public class PrefabContainer {
    private final PrefabContainerEntry[] entries;
    private final int maxSize;

    public PrefabContainerEntry[] getEntries();
    public int getMaxSize();

    public static class PrefabContainerEntry {
        protected final IWeightedMap<WorldGenPrefabSupplier> prefabs;
        protected final PrefabPatternGenerator prefabPatternGenerator;
        protected final int environmentId;

        public IWeightedMap<WorldGenPrefabSupplier> getPrefabs();
        public PrefabPatternGenerator getPrefabPatternGenerator();
        public int getEnvironmentId();
        public int getExtents();
    }
}
```

## Generation Execution

### ChunkGeneratorExecution

Manages the generation of a single chunk:

```java
import com.hypixel.hytale.server.worldgen.chunk.ChunkGeneratorExecution;

public class ChunkGeneratorExecution {
    private final ChunkGenerator chunkGenerator;
    private final GeneratedBlockChunk blockChunk;
    private final GeneratedBlockStateChunk blockStateChunk;
    private final GeneratedEntityChunk entityChunk;
    private final Holder<ChunkStore>[] sections;
    private final BlockPriorityChunk priorityChunk;
    private final HeightThresholdInterpolator interpolator;

    // Execute full chunk generation
    public void execute(int seed) {
        // 1. Generate tint mapping
        // 2. Generate environment mapping
        // 3. BlockPopulator.populate() - terrain blocks
        // 4. CavePopulator.populate() - caves
        // 5. PrefabPopulator.populate() - structures
        // 6. WaterPopulator.populate() - water
    }

    // Block placement with priority system
    public boolean setBlock(int x, int y, int z, byte type, int block);
    public boolean setBlock(int x, int y, int z, byte type, int block,
                           Holder<ChunkStore> holder, int supportValue,
                           int rotation, int filler);

    // Fluid placement
    public boolean setFluid(int x, int y, int z, byte type, int fluid);

    // Override without priority check
    public void overrideBlock(int x, int y, int z, byte type, int block);

    // Coordinate conversion
    public int globalX(int localX);
    public int globalZ(int localZ);
}
```

### Block Priority Types

The priority system prevents lower-priority blocks from overwriting higher-priority ones:

| Priority | Value | Description |
|----------|-------|-------------|
| Filling | 1 | Base terrain fill |
| Layer | 2 | Surface layers (dirt, grass) |
| Cover | 3 | Surface decorations |
| Cave | 4 | Cave carving |
| Water | 5 | Water placement |
| Prefab | 6+ | Structure blocks |

## Caching and Performance

### ChunkGeneratorCache

Main cache for generation data:

```java
import com.hypixel.hytale.server.worldgen.cache.ChunkGeneratorCache;

// Caches:
// - ZoneBiomeResult at each position
// - InterpolatedBiomeCountList for blending
// - Height values
// - Interpolated height noise

ChunkGeneratorCache cache = new ChunkGeneratorCache(
    zoneBiomeResultFunction,
    interpolatedBiomeCountFunction,
    heightFunction,
    heightNoiseFunction,
    maxSize,           // e.g., 50000 entries
    expireAfterSeconds // e.g., 20 seconds
);
```

### CoreDataCacheEntry

Cached data per coordinate:

```java
import com.hypixel.hytale.server.worldgen.cache.CoreDataCacheEntry;

public class CoreDataCacheEntry {
    public ZoneBiomeResult zoneBiomeResult;
    public InterpolatedBiomeCountList biomeCountList;
    public double heightNoise = Double.NEGATIVE_INFINITY;
    public int height = Integer.MIN_VALUE;
}
```

### Performance Tips

1. **Use caches** - The generator caches zone/biome results, heights, and caves
2. **Thread pools** - Generation runs on `POOL_SIZE` threads (75% of available CPUs)
3. **Lazy evaluation** - Heights and interpolation computed on-demand
4. **Buffer reuse** - `NStagedChunkGenerator` reuses buffers between chunks
5. **Priority check** - Skip expensive operations for blocks that won't be placed

## Configuration

### HytaleWorldGenProvider

The default world generator provider:

```json
{
  "Type": "Hytale",
  "Name": "Default",
  "Path": "worldgen/"
}
```

| Field | Description |
|-------|-------------|
| `Type` | Must be "Hytale" for the default generator |
| `Name` | Generator preset name (loads from `Path/Name/`) |
| `Path` | Base path for world generation configs |

### World Configuration

World generation is configured through JSON files in the worldgen folder:

```
worldgen/
  World.json          # Main world config
  Zones/              # Zone definitions
  Biomes/             # Biome definitions
  Caves/              # Cave type configs
  Prefabs/            # Structure definitions
  Noise/              # Noise property definitions
```

## Example: Simple Custom Generator

```java
import com.hypixel.hytale.server.core.universe.world.worldgen.IWorldGen;
import com.hypixel.hytale.server.core.universe.world.worldgen.GeneratedChunk;
import com.hypixel.hytale.math.vector.Transform;
import java.util.concurrent.CompletableFuture;

public class FlatWorldGenerator implements IWorldGen {
    private final int groundHeight;
    private final int groundBlockId;

    public FlatWorldGenerator(int groundHeight, int groundBlockId) {
        this.groundHeight = groundHeight;
        this.groundBlockId = groundBlockId;
    }

    @Override
    public CompletableFuture<GeneratedChunk> generate(
            int seed, long index, int x, int z, LongPredicate stillNeeded) {
        return CompletableFuture.supplyAsync(() -> {
            if (stillNeeded != null && !stillNeeded.test(index)) {
                return null;
            }

            GeneratedChunk chunk = new GeneratedChunk();
            GeneratedBlockChunk blockChunk = chunk.getBlockChunk();
            blockChunk.setCoordinates(index, x, z);

            // Fill ground
            for (int bx = 0; bx < 32; bx++) {
                for (int bz = 0; bz < 32; bz++) {
                    for (int by = 0; by <= groundHeight; by++) {
                        blockChunk.setBlock(bx, by, bz, groundBlockId, 0, 0);
                    }
                }
            }

            blockChunk.generateHeight();
            return chunk;
        });
    }

    @Override
    public Transform[] getSpawnPoints(int seed) {
        return new Transform[] {
            new Transform(16.5, groundHeight + 1, 16.5)
        };
    }

    @Override
    public WorldGenTimingsCollector getTimings() {
        return null;
    }
}
```

## Best Practices

1. **Determinism** - Always use seeded random for reproducible generation
2. **Cache expensive operations** - Zone/biome lookups, height calculations
3. **Respect priority** - Use appropriate block priorities for placement
4. **Async generation** - Return `CompletableFuture` for non-blocking generation
5. **Check stillNeeded** - Skip generation if chunk is no longer required
6. **Handle boundaries** - Consider chunk borders for seamless terrain
7. **Use interpolation** - Blend biome properties at borders for smooth transitions
