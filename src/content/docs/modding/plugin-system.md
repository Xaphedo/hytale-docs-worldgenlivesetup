---
title: Plugin System
description: Learn how to create and structure plugins for the Hytale server.
sidebar:
  order: 2
---

The Hytale server uses a powerful plugin system that allows you to extend server functionality.

## Plugin Structure

### Manifest File

Every plugin requires a `manifest.json` file in the root of your JAR:

```json
{
  "Group": "com.example",
  "Name": "MyPlugin",
  "Version": "1.0.0",
  "Description": "A sample plugin",
  "Main": "com.example.MyPlugin",
  "Authors": [
    {
      "Name": "Your Name",
      "Website": "https://example.com"
    }
  ],
  "Website": "https://example.com/myplugin",
  "ServerVersion": ">=0.0.1",
  "Dependencies": {
    "Hytale:SomePlugin": ">=1.0.0"
  },
  "OptionalDependencies": {
    "Hytale:OptionalPlugin": "*"
  },
  "LoadBefore": {
    "Hytale:AnotherPlugin": "*"
  },
  "DisabledByDefault": false,
  "IncludesAssetPack": false
}
```

#### Manifest Fields

| Field | Required | Description |
|-------|----------|-------------|
| `Group` | Yes | The plugin's group/namespace (e.g., `com.example`) |
| `Name` | Yes | The plugin name (used with Group to form identifier) |
| `Version` | Yes | Semantic version string (e.g., `1.0.0`) |
| `Description` | No | Short description of the plugin |
| `Main` | Yes | Fully qualified class name of the main plugin class |
| `Authors` | No | Array of author objects with `Name` and optional `Website` |
| `Website` | No | Plugin website URL |
| `ServerVersion` | No | Required server version range (e.g., `>=0.1.0`) |
| `Dependencies` | No | Map of required plugin identifiers to version ranges |
| `OptionalDependencies` | No | Map of optional plugin identifiers to version ranges |
| `LoadBefore` | No | Map of plugins that should load after this plugin |
| `DisabledByDefault` | No | If true, plugin won't load unless explicitly enabled |
| `IncludesAssetPack` | No | If true, registers the JAR as an asset pack |

The plugin identifier is formed as `Group:Name` (e.g., `com.example:MyPlugin`).

### Main Plugin Class

```java
package com.example;

import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;
import javax.annotation.Nonnull;

public class MyPlugin extends JavaPlugin {

    private static MyPlugin instance;

    public MyPlugin(@Nonnull JavaPluginInit init) {
        super(init);
    }

    public static MyPlugin get() {
        return instance;
    }

    @Override
    protected void setup() {
        instance = this;
        getLogger().info("Plugin setup complete!");
    }

    @Override
    protected void start() {
        getLogger().info("Plugin started!");
    }

    @Override
    protected void shutdown() {
        getLogger().info("Plugin shutting down!");
    }
}
```

## Plugin Lifecycle

Plugins go through these states:

| State | Description |
|-------|-------------|
| `NONE` | Initial state before loading |
| `SETUP` | `setup()` method being called |
| `START` | `start()` method being called |
| `ENABLED` | Plugin fully operational |
| `SHUTDOWN` | `shutdown()` method being called |
| `DISABLED` | Plugin disabled/unloaded |

### Lifecycle Methods

```java
@Override
protected void setup() {
    // Register components, systems, commands, events
    // Called during server initialization
}

@Override
protected void start() {
    // Load resources, validate assets
    // Called after all plugins are set up
}

@Override
protected void shutdown() {
    // Clean up resources
    // Called during server shutdown
}
```

## Available Registries

The `JavaPlugin` class (via `PluginBase`) provides access to several registries:

```java
// Entity components, systems, and resources (ECS)
getEntityStoreRegistry().registerComponent(MyComponent.class, MyComponent::new);
getEntityStoreRegistry().registerSystem(new MySystem());

// Chunk components and systems
getChunkStoreRegistry().registerComponent(MyChunkComponent.class, MyChunkComponent::new);
getChunkStoreRegistry().registerSystem(new MyChunkSystem());

// Commands
getCommandRegistry().registerCommand(new MyCommand());

// Events - subscribe to game events
getEventRegistry().register(SomeEvent.class, TargetClass.class, this::onEvent);

// Entity types
getEntityRegistry().register(...);

// Scheduled tasks
getTaskRegistry().register(...);

// Assets
getAssetRegistry().register(...);

// Block states
getBlockStateRegistry().registerBlockState(MyBlockState.class, "myState", MyBlockState.CODEC);

// Client features
getClientFeatureRegistry().register(...);

// Polymorphic codec registries (for extensible types)
getCodecRegistry(Interaction.CODEC).register("MyInteraction", MyInteraction.class, MyInteraction.CODEC);
```

### Registry Lifecycle

All registrations are automatically cleaned up when your plugin is disabled or the server shuts down. The server tracks what each plugin registers and handles cleanup automatically.

## Plugin Configuration

Plugins can define configuration with type-safe codecs. Configuration files are stored in JSON format in the plugin's data directory.

```java
public class MyPluginConfig {
    public static final BuilderCodec<MyPluginConfig> CODEC =
        BuilderCodec.builder(MyPluginConfig.class, MyPluginConfig::new)
            .append(new KeyedCodec<>("MaxPlayers", Codec.INTEGER),
                (c, v) -> c.maxPlayers = v, c -> c.maxPlayers)
            .add()
            .append(new KeyedCodec<>("WelcomeMessage", Codec.STRING),
                (c, v) -> c.welcomeMessage = v, c -> c.welcomeMessage)
            .add()
            .build();

    private int maxPlayers = 100;
    private String welcomeMessage = "Welcome!";

    // Getters
    public int getMaxPlayers() { return maxPlayers; }
    public String getWelcomeMessage() { return welcomeMessage; }
}
```

In your plugin class, register the config before `setup()` is called:

```java
public class MyPlugin extends JavaPlugin {
    // Config must be declared BEFORE setup() is called
    // The file will be named "config.json" in your plugin's data directory
    private final Config<MyPluginConfig> config =
        this.withConfig(MyPluginConfig.CODEC);

    // Or with a custom filename (creates "settings.json")
    private final Config<MyPluginConfig> settings =
        this.withConfig("settings", MyPluginConfig.CODEC);

    public MyPlugin(@Nonnull JavaPluginInit init) {
        super(init);
    }

    @Override
    protected void start() {
        // Config is automatically loaded before start() is called
        MyPluginConfig cfg = config.get();
        getLogger().info("Max players: " + cfg.getMaxPlayers());
    }
}
```

The config system automatically:
- Creates default config if the file doesn't exist
- Loads config asynchronously during plugin initialization
- Provides the loaded config via `config.get()`

## Dependencies

Declare dependencies in `manifest.json` using plugin identifiers mapped to version ranges:

```json
{
  "Dependencies": {
    "com.example:RequiredPlugin": ">=1.0.0",
    "Hytale:CraftingPlugin": "*"
  },
  "OptionalDependencies": {
    "com.example:OptionalPlugin": ">=2.0.0"
  },
  "LoadBefore": {
    "com.example:AnotherPlugin": "*"
  }
}
```

### Version Ranges

Version ranges use semantic versioning:
- `*` - Any version
- `>=1.0.0` - Version 1.0.0 or higher
- `1.0.0` - Exactly version 1.0.0
- `>=1.0.0 <2.0.0` - Between versions (inclusive/exclusive)

### Load Order

- **Dependencies**: Must be present and loaded before your plugin. If missing, your plugin won't load.
- **OptionalDependencies**: Loaded before your plugin if present, but not required.
- **LoadBefore**: Your plugin will load before these plugins (useful for providing APIs).

## Sub-Plugins

A single JAR can contain multiple plugins using the `SubPlugins` manifest field:

```json
{
  "Group": "com.example",
  "Name": "MainPlugin",
  "Version": "1.0.0",
  "Main": "com.example.MainPlugin",
  "SubPlugins": [
    {
      "Name": "SubFeatureA",
      "Main": "com.example.SubFeatureA",
      "DisabledByDefault": true
    },
    {
      "Name": "SubFeatureB",
      "Main": "com.example.SubFeatureB"
    }
  ]
}
```

Sub-plugins inherit `Group`, `Version`, `Authors`, `Website`, and `DisabledByDefault` from the parent manifest if not specified. Each sub-plugin automatically depends on its parent.

## Best Practices

1. **Use singleton pattern** - Store instance for global access
2. **Register in setup()** - All registrations should happen in setup()
3. **Load resources in start()** - Assets and models load in start()
4. **Clean up in shutdown()** - Release resources properly
5. **Use type-safe registries** - Let the server manage lifecycle
6. **Handle errors gracefully** - Log and recover from failures
7. **Use SubPlugins for optional features** - Allow users to enable/disable parts of your plugin
