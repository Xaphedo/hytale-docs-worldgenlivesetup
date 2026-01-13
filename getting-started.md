# Getting Started with Hytale Plugin Development

This guide walks you through creating your first Hytale server plugin.

## Prerequisites

- Java Development Kit (JDK) 17 or higher
- An IDE (IntelliJ IDEA, Eclipse, VS Code)
- HytaleServer.jar for compilation

## Project Setup

### 1. Create a New Java Project

Create a new Java project in your IDE and add `HytaleServer.jar` to your build path as a compile-only dependency.

### 2. Create the Plugin Main Class

```java
package com.example.myplugin;

import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;
import javax.annotation.Nonnull;

public class MyPlugin extends JavaPlugin {

    private static MyPlugin instance;

    public MyPlugin(@Nonnull JavaPluginInit init) {
        super(init);
        instance = this;
    }

    public static MyPlugin get() {
        return instance;
    }

    @Override
    protected void setup() {
        // Called during plugin initialization
        // Register components, events, commands here
        getLogger().info("MyPlugin is setting up!");
    }

    @Override
    protected void start() {
        // Called after setup, when plugin is ready
        // Load resources, start tasks here
        getLogger().info("MyPlugin has started!");
    }

    @Override
    protected void shutdown() {
        // Called when plugin is being disabled
        // Clean up resources here
        getLogger().info("MyPlugin is shutting down!");
    }
}
```

### 3. Create the Plugin Manifest

Create a file named `manifest.json` in your resources directory:

```json
{
    "Group": "com.example",
    "Name": "MyPlugin",
    "Version": "1.0.0",
    "Description": "My first Hytale plugin",
    "Authors": [
        {
            "Name": "Your Name",
            "Email": "you@example.com",
            "Url": "https://example.com"
        }
    ],
    "Website": "https://example.com/myplugin",
    "Main": "com.example.myplugin.MyPlugin",
    "ServerVersion": "^1.0.0"
}
```

### 4. Build and Deploy

1. Build your project as a JAR file
2. Ensure `manifest.json` is included in the JAR root
3. Place the JAR in the server's `mods/` directory
4. Start the server

## Manifest Fields

| Field | Required | Description |
|-------|----------|-------------|
| `Group` | Yes | Organization/package group (e.g., "com.example") |
| `Name` | Yes | Plugin name |
| `Version` | Yes | Semantic version (e.g., "1.0.0") |
| `Description` | No | Plugin description |
| `Authors` | No | List of author information |
| `Website` | No | Plugin website URL |
| `Main` | Yes | Fully qualified main class name |
| `ServerVersion` | No | Required server version range |
| `Dependencies` | No | Required plugin dependencies |
| `OptionalDependencies` | No | Optional plugin dependencies |
| `LoadBefore` | No | Plugins that should load after this one |
| `DisabledByDefault` | No | Whether plugin is disabled by default |
| `IncludesAssetPack` | No | Whether plugin contains asset pack |

## Plugin Lifecycle

```
1. NONE        → Plugin not initialized
2. SETUP       → setup() method executing
3. START       → start() method executing
4. ENABLED     → Plugin running
5. SHUTDOWN    → shutdown() method executing
6. DISABLED    → Plugin unloaded
```

## Available Registries

In your plugin's `setup()` method, you have access to:

```java
getEventRegistry()          // Register event listeners
getCommandRegistry()        // Register commands
getClientFeatureRegistry()  // Register client features
getBlockStateRegistry()     // Register block states
getEntityRegistry()         // Register entity types
getTaskRegistry()           // Register scheduled tasks
getEntityStoreRegistry()    // Register entity components/systems
getChunkStoreRegistry()     // Register chunk components/systems
getAssetRegistry()          // Register custom assets
getCodecRegistry()          // Register custom codecs
```

## Plugin Configuration

Create a configuration class and register it:

```java
public static class MyPluginConfig {
    public static final BuilderCodec<MyPluginConfig> CODEC =
        BuilderCodec.builder(MyPluginConfig.class, MyPluginConfig::new)
            .append(new KeyedCodec<>("Message", Codec.STRING),
                (c, v) -> c.message = v,
                c -> c.message)
            .add()
            .build();

    private String message = "Hello World";

    public String getMessage() { return message; }
}

// In your plugin:
private Config<MyPluginConfig> config;

@Override
protected void setup() {
    config = withConfig("config", MyPluginConfig.CODEC);
}

@Override
protected void start() {
    MyPluginConfig cfg = config.get();
    getLogger().info(cfg.getMessage());
}
```

Configuration is stored in `mods/<group>_<name>/config.json`.

## Logging

Use the built-in logger:

```java
getLogger().info("Information message");
getLogger().warning("Warning message");
getLogger().severe("Error message");
getLogger().fine("Debug message");
```

## Data Directory

Each plugin has a data directory at `mods/<group>_<name>/`:

```java
Path dataDir = getDataDirectory();
Path myFile = dataDir.resolve("mydata.json");
```

## Plugin Commands

Built-in plugin management commands:

| Command | Description |
|---------|-------------|
| `plugin list` | List loaded plugins |
| `plugin load <id>` | Load/enable a plugin |
| `plugin unload <id>` | Unload/disable a plugin |
| `plugin reload <id>` | Reload a plugin |

Plugin IDs use the format `<group>:<name>` (e.g., `com.example:MyPlugin`).

## Next Steps

- [Event System](events.md) - Learn to handle game events
- [Component System](components.md) - Add custom entity data
- [Commands](commands.md) - Create custom commands
- [Examples](examples.md) - See full plugin examples
