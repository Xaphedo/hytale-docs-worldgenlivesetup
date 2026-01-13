---
title: Modding Overview
description: Unofficial community guide to creating mods and plugins for Hytale servers.
sidebar:
  order: 1
---

> **Note:** This is unofficial community documentation created through decompilation and analysis. Some details may change in future versions.

This documentation provides a comprehensive guide to creating mods and plugins for the Hytale dedicated server.

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
├── PluginManager      - Plugin loading, lifecycle, and hot-reloading
├── EventBus           - Event dispatch system
├── CommandManager     - Command registration and execution
├── Universe           - World, entity, and player management
├── ServerManager      - Network I/O (QUIC/UDP protocol)
└── AssetModule        - Asset pack loading and management
```

### Plugin Locations

Plugins are loaded from multiple locations in this order:
1. **Core plugins** - Built-in server functionality
2. **Builtin directory** - `builtin/` next to the server JAR
3. **Classpath** - Plugins bundled with the server
4. **Mods directory** - `mods/` (user plugins)
5. **Additional directories** - Specified via `--mods-directories` option

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

- Java 25 or higher (Adoptium/Temurin recommended)
- HytaleServer.jar

## Quick Start

1. Create a new Java project
2. Add HytaleServer.jar to your classpath
3. Create your plugin class extending `JavaPlugin`
4. Create a `manifest.json` file
5. Build your JAR and place it in the `mods/` directory

## Default Server Port

The default server port is **5520** (UDP with QUIC protocol).
