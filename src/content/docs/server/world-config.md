---
title: World Configuration
description: Configure individual world settings in Hytale.
sidebar:
  order: 3
---

Each world has its own `config.json` file in `universe/worlds/<worldname>/`.

## Configuration File

```json
{
  "UUID": "generated-uuid-here",
  "DisplayName": "My World",
  "Seed": 1234567890,
  "WorldGen": {
    "Type": "Hytale"
  },
  "ChunkStorage": {
    "Type": "Region"
  },
  "IsTicking": true,
  "IsBlockTicking": true,
  "IsPvpEnabled": false,
  "IsFallDamageEnabled": true,
  "IsGameTimePaused": false,
  "GameTime": "1970-01-01T05:30:00Z",
  "GameMode": "Adventure",
  "IsSpawningNPC": true,
  "IsSpawnMarkersEnabled": true,
  "IsSavingPlayers": true,
  "IsSavingChunks": true,
  "IsUnloadingChunks": true,
  "GameplayConfig": "Default"
}
```

## World Identity

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `UUID` | string | auto-generated | Unique identifier for this world |
| `DisplayName` | string | null | Player-facing name of the world |

## World Generation

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `Seed` | long | current time | World generation seed |
| `WorldGen.Type` | string | `"Hytale"` | World generator type |
| `ChunkStorage.Type` | string | `"Region"` | Chunk storage system type |

### World Generator Types

- `Hytale` - The default procedural world generator
- Custom generators can be registered via plugins

### Chunk Storage Types

- `Region` - Region-based storage (similar to Minecraft's .mca format)

## Gameplay Settings

### Combat & Damage

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `IsPvpEnabled` | boolean | `false` | Allow player vs player combat |
| `IsFallDamageEnabled` | boolean | `true` | Players take fall damage |

### Game Mode

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `GameMode` | string | inherits from server | Default game mode for this world |
| `GameplayConfig` | string | `"Default"` | Gameplay configuration to use |

Available game modes:
- `Adventure` - Standard survival gameplay
- `Creative` - Building mode with unlimited resources
- `Spectator` - Observer mode

## Time Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `IsGameTimePaused` | boolean | `false` | Whether game time is paused |
| `GameTime` | ISO-8601 | `"1970-01-01T05:30:00Z"` | Current time of day |

The `GameTime` setting affects the day/night cycle. Times are specified in ISO-8601 format where the time portion determines the in-game time of day.

## Tick Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `IsTicking` | boolean | `true` | Whether chunks in this world tick |
| `IsBlockTicking` | boolean | `true` | Whether blocks in this world tick |

:::tip
Disable ticking for lobby or hub worlds where dynamic block behavior isn't needed. This improves performance.
:::

## Entity & Spawning

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `IsSpawningNPC` | boolean | `true` | Whether NPCs can spawn |
| `IsSpawnMarkersEnabled` | boolean | `true` | Whether spawn markers are enabled |

## Persistence

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `IsSavingPlayers` | boolean | `true` | Whether player data is saved |
| `IsSavingChunks` | boolean | `true` | Whether chunk data is saved to disk |
| `IsUnloadingChunks` | boolean | `true` | Whether chunks can be unloaded |

:::caution
Disabling `IsSavingChunks` means all world changes are lost on restart. Only use for temporary worlds.
:::

## Creating Multiple Worlds

To create additional worlds:

1. Create a new directory: `universe/worlds/<worldname>/`
2. Add a `config.json` with at minimum:
   ```json
   {
     "DisplayName": "My Custom World",
     "Seed": 123456
   }
   ```
3. Restart the server or use the world management commands

The server will generate missing settings with defaults.
