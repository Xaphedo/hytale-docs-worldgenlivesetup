# Hytale Server Modding Documentation

This documentation provides a comprehensive guide to creating mods and plugins for the Hytale dedicated server.

## Table of Contents

1. [Getting Started](getting-started.md) - Quick start guide for plugin development
2. [Plugin System](plugin-system.md) - Plugin architecture, lifecycle, and manifest format
3. [Event System](events.md) - Subscribing to and creating custom events
4. [Component System](components.md) - Entity-Component-System architecture
5. [Commands](commands.md) - Creating custom commands
6. [Networking](networking.md) - Protocol and packet handling
7. [Assets & Registry](assets.md) - Custom content registration
8. [Examples](examples.md) - Code examples and patterns

## Overview

The Hytale server uses a sophisticated plugin architecture that allows developers to:

- Create custom game mechanics
- Add new entities, blocks, and items
- Implement custom commands
- Handle network packets
- Register custom assets and content
- Subscribe to game events

## Server Architecture

```
HytaleServer
├── PluginManager      - Plugin loading and lifecycle
├── EventBus           - Event dispatch system
├── CommandManager     - Command registration and execution
├── Universe           - World and player management
├── ServerManager      - Network I/O
└── AssetRegistry      - Asset management
```

## Key Concepts

### Plugins
Plugins are Java JAR files placed in the `mods/` directory. Each plugin has a `manifest.json` that defines metadata, dependencies, and the main class.

### Components (ECS)
Hytale uses an Entity-Component-System architecture. Entities are lightweight references, components store data, and systems process logic.

### Events
The event system allows plugins to react to game occurrences. Events can be synchronous or asynchronous, and support priority ordering.

### Registries
Custom content (components, commands, assets) is registered through type-safe registries that handle lifecycle management.

## Requirements

- Java 17 or higher
- HytaleServer.jar

## Quick Start

1. Create a new Java project
2. Add HytaleServer.jar to your classpath
3. Create your plugin class extending `JavaPlugin`
4. Create a `manifest.json` file
5. Build your JAR and place it in the `mods/` directory

See [Getting Started](getting-started.md) for detailed instructions.

## Default Server Port

The default server port is **5520**.

## Configuration

Server configuration is stored in `config.json` and includes:
- Server name, MOTD, password
- Max players and view radius
- Connection timeouts
- Rate limiting
- Module configurations
- Per-plugin settings

## Disclaimer

This documentation was generated through decompilation and analysis of the HytaleServer.jar. Some implementation details may change in future versions.
