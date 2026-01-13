# Plugin System

The Hytale server plugin system provides a robust framework for extending server functionality.

## Architecture Overview

```
PluginManager (Singleton)
├── Core Plugins (built into server)
├── Builtin Plugins (server classpath)
└── External Plugins (mods/ directory)
    └── Each Plugin
        ├── PluginManifest (metadata)
        ├── PluginClassLoader (isolation)
        └── Registries (components, events, commands, etc.)
```

## Plugin Types

### Core Plugins
Built into the server, loaded first. Examples include EntityModule, ItemModule, BlockModule.

### Builtin Plugins
Located in the server's builtin directory or classpath. Load before external plugins.

### External Plugins
User-created plugins placed in the `mods/` directory.

## Plugin Loading Process

1. **Discovery**: Scan `mods/` directory for JAR files
2. **Manifest Loading**: Parse `manifest.json` from each JAR
3. **Dependency Resolution**: Validate and sort by dependencies
4. **Class Loading**: Create isolated ClassLoader per plugin
5. **preLoad()**: Load configurations asynchronously
6. **setup()**: Initialize plugin, register components
7. **start()**: Start plugin functionality

## Early Plugin System

For plugins that need to transform classes at load time:

### Directory
Place early plugins in `earlyplugins/` directory.

### ClassTransformer Interface

```java
public interface ClassTransformer {
    // Higher priority loads first (default: 0)
    default int priority() {
        return 0;
    }

    // Return transformed bytecode or null to skip
    @Nullable
    byte[] transform(String className, String internalName, byte[] classBytes);
}
```

### Command-Line Options
- `--early-plugins=<path>` - Additional early plugin directories
- `--accept-early-plugins` - Accept transformers without confirmation

### Protected Packages
The following packages cannot be transformed:
- `java.`, `javax.`, `jdk.`, `sun.`, `com.sun.`
- `org.bouncycastle.`, `server.io.netty.`, `org.objectweb.asm.`
- `com.google.gson.`, `org.slf4j.`, `org.apache.logging.`
- `com.hypixel.hytale.plugin.early.`

## Manifest Format

### Full Example

```json
{
    "Group": "com.example",
    "Name": "AdvancedPlugin",
    "Version": "2.1.0",
    "Description": "An advanced example plugin",
    "Authors": [
        {
            "Name": "Developer Name",
            "Email": "dev@example.com",
            "Url": "https://developer.example.com"
        }
    ],
    "Website": "https://example.com/plugin",
    "Main": "com.example.advanced.AdvancedPlugin",
    "ServerVersion": ">=1.0.0 <2.0.0",
    "Dependencies": {
        "com.other:RequiredPlugin": "^1.0.0"
    },
    "OptionalDependencies": {
        "com.other:OptionalPlugin": ">=2.0.0"
    },
    "LoadBefore": {
        "com.other:LoadAfterMe": "*"
    },
    "DisabledByDefault": false,
    "IncludesAssetPack": true,
    "SubPlugins": []
}
```

### Version Ranges

| Format | Meaning |
|--------|---------|
| `1.0.0` | Exact version |
| `^1.0.0` | Compatible with 1.x.x |
| `>=1.0.0` | 1.0.0 or higher |
| `>=1.0.0 <2.0.0` | Between 1.0.0 and 2.0.0 |
| `*` | Any version |

## Plugin Base Class

### JavaPlugin

```java
public class MyPlugin extends JavaPlugin {

    public MyPlugin(@Nonnull JavaPluginInit init) {
        super(init);
    }

    // Called before setup() - load configs
    @Override
    protected CompletableFuture<Void> preLoad() {
        return super.preLoad();
    }

    // Initialize plugin - register everything
    @Override
    protected void setup() {
        // Register components
        // Register events
        // Register commands
        // Register assets
    }

    // Start plugin functionality
    @Override
    protected void start() {
        // Load models
        // Start tasks
    }

    // Clean up resources
    @Override
    protected void shutdown() {
        // Save data
        // Cancel tasks
    }
}
```

### Available Properties

```java
// Plugin identification
getIdentifier()          // PluginIdentifier (group:name)
getManifest()            // Full PluginManifest
getState()               // Current PluginState

// Resources
getDataDirectory()       // Plugin data directory path
getLogger()              // Plugin logger
getBasePermission()      // Base permission node (group.name)

// Registries
getEventRegistry()
getCommandRegistry()
getClientFeatureRegistry()
getBlockStateRegistry()
getEntityRegistry()
getTaskRegistry()
getEntityStoreRegistry()
getChunkStoreRegistry()
getAssetRegistry()
getCodecRegistry(codecMap)
```

## Dependency Management

### Required Dependencies
Plugin fails to load if dependency is missing or wrong version:

```json
"Dependencies": {
    "com.example:CoreLib": "^1.0.0"
}
```

### Optional Dependencies
Plugin loads without them, but uses them if available:

```json
"OptionalDependencies": {
    "com.example:OptionalLib": "^2.0.0"
}
```

### Load Order Control
Force this plugin to load before others:

```json
"LoadBefore": {
    "com.example:LoadsLater": "*"
}
```

## Class Loading

Each plugin has an isolated ClassLoader with access to:

1. System/server classes
2. Plugin's own JAR
3. Declared dependencies (via bridge)

### Accessing Other Plugin Classes

Only classes from declared dependencies are accessible:

```java
// In manifest.json:
"Dependencies": {
    "com.other:Library": "^1.0.0"
}

// In code - now accessible:
import com.other.library.SomeClass;
```

## Plugin Events

### PluginSetupEvent
Fired when a plugin completes setup successfully.

```java
eventRegistry.register(PluginSetupEvent.class, event -> {
    PluginBase plugin = event.getPlugin();
    getLogger().info("Plugin loaded: " + plugin.getIdentifier());
});
```

## Dynamic Loading/Unloading

### Programmatic Control

```java
PluginManager pm = PluginManager.get();

// Load plugin
pm.load(new PluginIdentifier("com.example", "MyPlugin"));

// Unload plugin
pm.unload(new PluginIdentifier("com.example", "MyPlugin"));

// Reload plugin
pm.reload(new PluginIdentifier("com.example", "MyPlugin"));

// Check availability
boolean available = pm.hasPlugin(
    new PluginIdentifier("com.example", "MyPlugin"),
    SemverRange.parse("^1.0.0")
);
```

## Configuration Management

### Server-Side Plugin Config

In `config.json`:

```json
{
    "ModConfig": {
        "com.example:MyPlugin": {
            "Enabled": true,
            "RequiredVersion": "^1.0.0"
        }
    }
}
```

### Plugin-Specific Config

```java
public class MyConfig {
    public static final BuilderCodec<MyConfig> CODEC =
        BuilderCodec.builder(MyConfig.class, MyConfig::new)
            .append(new KeyedCodec<>("Setting", Codec.INTEGER),
                (c, v) -> c.setting = v, c -> c.setting)
            .add()
            .build();

    private int setting = 42;
}

// In plugin:
Config<MyConfig> config = withConfig("myconfig", MyConfig.CODEC);
```

## Best Practices

1. **Set instance in setup()**: Enable singleton access pattern
2. **Use registries**: Never directly modify global state
3. **Handle cleanup**: Release resources in shutdown()
4. **Declare dependencies**: Ensure proper load order
5. **Version your plugin**: Use semantic versioning
6. **Log appropriately**: Use plugin logger, not System.out
7. **Respect lifecycle**: Don't access other plugins before they're enabled

## Metrics

Plugins automatically register metrics:
- Identifier
- Type (PLUGIN)
- State
- Whether builtin

Access via server metrics system.
