---
title: Player Management & Persistence
description: Manage players, store custom data, and handle player authentication in your Hytale plugins.
sidebar:
  order: 11
---

This guide covers the Hytale player management and persistence systems, including how to look up players, store custom player data, handle player events, and understand server authentication.

## Architecture Overview

```
Universe
├── PlayerRef (connected players map)
├── PlayerStorage (data persistence)
└── World
    ├── Players (world-specific player map)
    └── EntityStore (ECS for player entities)

Player Data Flow:
PlayerStorage.load() -> Holder<EntityStore> -> World.addPlayer() -> Ref<EntityStore>
```

## PlayerRef - Player Session Handle

`PlayerRef` is the primary handle for accessing a connected player's session. It provides access to player identity, networking, and entity state.

### Key Properties

```java
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.Universe;

// Get a player by UUID
PlayerRef player = Universe.get().getPlayer(uuid);

// Access player information
UUID uuid = player.getUuid();
String username = player.getUsername();
String language = player.getLanguage();

// Get the player's packet handler for sending packets
PacketHandler packetHandler = player.getPacketHandler();

// Get the entity reference (if player is in a world)
Ref<EntityStore> entityRef = player.getReference();

// Get the holder (if player is between worlds)
Holder<EntityStore> holder = player.getHolder();
```

### Looking Up Players

```java
import com.hypixel.hytale.server.core.NameMatching;
import com.hypixel.hytale.server.core.universe.Universe;

Universe universe = Universe.get();

// By UUID (exact match)
PlayerRef player = universe.getPlayer(uuid);

// By username with matching strategy
PlayerRef playerExact = universe.getPlayerByUsername("PlayerName", NameMatching.EXACT);
PlayerRef playerPartial = universe.getPlayerByUsername("Play", NameMatching.STARTS_WITH);
PlayerRef playerFuzzy = universe.getPlayerByUsername("playername", NameMatching.IGNORE_CASE);

// Get all connected players
List<PlayerRef> allPlayers = universe.getPlayers();
int playerCount = universe.getPlayerCount();
```

### World-Specific Player Access

```java
import com.hypixel.hytale.server.core.universe.world.World;

World world = Universe.get().getWorld("default");

// Get players in this specific world
Collection<PlayerRef> worldPlayers = world.getPlayerRefs();
```

## Player Entity Component

The `Player` class is an entity component that extends `LivingEntity` and provides gameplay-related functionality.

### Accessing Player Component

```java
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

// From PlayerRef (when player is in a world)
Ref<EntityStore> ref = playerRef.getReference();
if (ref != null) {
    Store<EntityStore> store = ref.getStore();
    Player player = store.getComponent(ref, Player.getComponentType());

    // Access player-specific data
    GameMode gameMode = player.getGameMode();
    Inventory inventory = player.getInventory();
    int viewRadius = player.getViewRadius();
}

// From Holder (when player is between worlds)
Holder<EntityStore> holder = playerRef.getHolder();
if (holder != null) {
    Player player = holder.getComponent(Player.getComponentType());
}
```

### Player Managers

```java
// Access various player managers through the Player component
WindowManager windowManager = player.getWindowManager();
PageManager pageManager = player.getPageManager();
HudManager hudManager = player.getHudManager();
HotbarManager hotbarManager = player.getHotbarManager();
WorldMapTracker worldMapTracker = player.getWorldMapTracker();
```

## Player Storage System

### PlayerStorage Interface

The `PlayerStorage` interface defines how player data is loaded and saved:

```java
import com.hypixel.hytale.server.core.universe.playerdata.PlayerStorage;
import com.hypixel.hytale.component.Holder;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

public interface PlayerStorage {
    // Load player data by UUID
    CompletableFuture<Holder<EntityStore>> load(UUID uuid);

    // Save player data
    CompletableFuture<Void> save(UUID uuid, Holder<EntityStore> holder);

    // Remove player data
    CompletableFuture<Void> remove(UUID uuid);

    // Get all stored player UUIDs
    Set<UUID> getPlayers() throws IOException;
}
```

### Accessing PlayerStorage

```java
import com.hypixel.hytale.server.core.universe.Universe;

// Get the active player storage
PlayerStorage storage = Universe.get().getPlayerStorage();

// Load a player's stored data
storage.load(playerUuid).thenAccept(holder -> {
    // Process the loaded player data
    Player player = holder.getComponent(Player.getComponentType());
    PlayerConfigData config = player.getPlayerConfigData();
});

// Replace the player storage (for custom implementations)
Universe.get().setPlayerStorage(myCustomStorage);
```

### Built-in Storage Providers

#### DefaultPlayerStorageProvider

The default provider that delegates to `DiskPlayerStorageProvider`:

```java
import com.hypixel.hytale.server.core.universe.playerdata.DefaultPlayerStorageProvider;

// ID: "Hytale"
// Uses DiskPlayerStorageProvider internally
```

#### DiskPlayerStorageProvider

Stores player data as JSON files on disk:

```java
import com.hypixel.hytale.server.core.universe.playerdata.DiskPlayerStorageProvider;

// ID: "Disk"
// Stores files at: universe/players/{uuid}.json
```

### Server Configuration

Configure the storage provider in `config.json`:

```json
{
  "PlayerStorageProvider": {
    "Type": "Disk",
    "Path": "universe/players"
  }
}
```

## Storing Custom Player Data

### Using PlayerConfigData

`PlayerConfigData` stores persistent player information across sessions:

```java
import com.hypixel.hytale.server.core.entity.entities.player.data.PlayerConfigData;
import com.hypixel.hytale.server.core.entity.entities.player.data.PlayerWorldData;

Player player = /* get player component */;
PlayerConfigData config = player.getPlayerConfigData();

// Global player data
String currentWorld = config.getWorld();
String preset = config.getPreset();
Set<String> knownRecipes = config.getKnownRecipes();
Set<String> discoveredZones = config.getDiscoveredZones();
Set<UUID> discoveredInstances = config.getDiscoveredInstances();
Object2IntMap<String> reputationData = config.getReputationData();

// Per-world player data
PlayerWorldData worldData = config.getPerWorldData("world_name");
Transform lastPosition = worldData.getLastPosition();
boolean isFirstSpawn = worldData.isFirstSpawn();
PlayerRespawnPointData[] respawnPoints = worldData.getRespawnPoints();

// Mark data as changed to trigger save
config.markChanged();
```

### Saving Player Data

Player data is automatically saved periodically, but you can trigger a save manually:

```java
import com.hypixel.hytale.server.core.universe.Universe;

// Save player config and entity data
Player player = /* get player component */;
World world = player.getWorld();
Holder<EntityStore> holder = playerRef.getHolder();

// This saves the player's entity state
player.saveConfig(world, holder).thenRun(() -> {
    System.out.println("Player data saved!");
});

// Or save via PlayerStorage directly
Universe.get().getPlayerStorage().save(playerUuid, holder);
```

### Adding Custom Components

For custom persistent data, register and use your own components:

```java
import com.hypixel.hytale.component.ComponentType;
import com.hypixel.hytale.codec.builder.BuilderCodec;

// Define your custom component
public class MyPlayerData implements Component<EntityStore> {
    public static final BuilderCodec<MyPlayerData> CODEC = BuilderCodec.builder(
        MyPlayerData.class,
        MyPlayerData::new
    )
    .addField(new KeyedCodec<>("customField", Codec.STRING),
        (data, value) -> data.customField = value,
        data -> data.customField)
    .build();

    private String customField;

    public String getCustomField() { return customField; }
    public void setCustomField(String value) {
        this.customField = value;
    }

    @Override
    public Component<EntityStore> clone() {
        MyPlayerData copy = new MyPlayerData();
        copy.customField = this.customField;
        return copy;
    }
}

// Register in your plugin's setup
@Override
protected void setup() {
    ComponentType<EntityStore, MyPlayerData> myDataType =
        getEntityStoreRegistry().registerComponent(
            MyPlayerData.class,
            MyPlayerData::new
        );
}

// Use the component
Holder<EntityStore> holder = playerRef.getHolder();
MyPlayerData data = holder.ensureAndGetComponent(myDataType);
data.setCustomField("value");
```

## Player Events

### Connection Events

```java
import com.hypixel.hytale.server.core.event.events.player.*;

@Override
protected void setup() {
    EventRegistry events = getEventRegistry();

    // Player connecting to server (before entering world)
    events.register(PlayerConnectEvent.class, event -> {
        PlayerRef playerRef = event.getPlayerRef();
        Holder<EntityStore> holder = event.getHolder();
        World targetWorld = event.getWorld();

        // Redirect to a different world
        event.setWorld(Universe.get().getWorld("lobby"));
    });

    // Player disconnected from server
    events.register(PlayerDisconnectEvent.class, event -> {
        PlayerRef playerRef = event.getPlayerRef();
        PacketHandler.DisconnectReason reason = event.getDisconnectReason();
        getLogger().info(playerRef.getUsername() + " disconnected: " + reason);
    });
}
```

### World Events

```java
// Player added to a world (keyed by world name)
events.register(AddPlayerToWorldEvent.class, "world_name", event -> {
    Holder<EntityStore> holder = event.getHolder();
    World world = event.getWorld();

    // Suppress join message broadcast
    event.setBroadcastJoinMessage(false);
});

// Player removed from a world (keyed by world name)
events.register(DrainPlayerFromWorldEvent.class, "world_name", event -> {
    Holder<EntityStore> holder = event.getHolder();
    World world = event.getWorld();
    Transform position = event.getTransform();

    // Redirect to a different world
    event.setWorld(Universe.get().getWorld("hub"));
    event.setTransform(new Transform(0, 64, 0));
});

// Player ready to receive gameplay (client loaded)
events.register(PlayerReadyEvent.class, event -> {
    Player player = event.getPlayer();
    Ref<EntityStore> ref = event.getRef();
    int readyId = event.getReadyId();

    // Safe to send initial game state now
});
```

### Global Registration

To listen for events across all worlds:

```java
// Listen to all player additions regardless of world
events.registerGlobal(AddPlayerToWorldEvent.class, event -> {
    // Handles all worlds
});
```

## Server Authentication

### ServerAuthManager

The `ServerAuthManager` handles server-side authentication with Hytale's authentication services:

```java
import com.hypixel.hytale.server.core.auth.ServerAuthManager;

ServerAuthManager authManager = ServerAuthManager.getInstance();

// Check authentication status
ServerAuthManager.AuthMode authMode = authManager.getAuthMode();
boolean hasSession = authManager.hasSessionToken();
boolean hasIdentity = authManager.hasIdentityToken();
String status = authManager.getAuthStatus();

// Check if a player is the server owner
boolean isOwner = authManager.isOwner(playerUuid);

// Check if running in singleplayer mode
boolean isSingleplayer = authManager.isSingleplayer();
```

### Authentication Modes

```java
public enum AuthMode {
    NONE,              // No authentication
    SINGLEPLAYER,      // Singleplayer mode
    EXTERNAL_SESSION,  // Session from CLI/environment tokens
    OAUTH_BROWSER,     // Authenticated via browser OAuth
    OAUTH_DEVICE,      // Authenticated via device code flow
    OAUTH_STORE        // Restored from stored credentials
}
```

### AuthConfig Constants

```java
import com.hypixel.hytale.server.core.auth.AuthConfig;

// OAuth endpoints
String authUrl = AuthConfig.OAUTH_AUTH_URL;
String tokenUrl = AuthConfig.OAUTH_TOKEN_URL;
String deviceAuthUrl = AuthConfig.DEVICE_AUTH_URL;

// Service URLs
String sessionService = AuthConfig.SESSION_SERVICE_URL;
String accountData = AuthConfig.ACCOUNT_DATA_URL;

// Environment variables for tokens
String sessionTokenEnv = AuthConfig.ENV_SERVER_SESSION_TOKEN;
String identityTokenEnv = AuthConfig.ENV_SERVER_IDENTITY_TOKEN;

// OAuth scopes
String[] scopes = AuthConfig.SCOPES; // ["openid", "offline", "auth:server"]
```

### Credential Storage

Configure credential storage in `config.json`:

```json
{
  "AuthCredentialStore": {
    "Type": "Memory"
  }
}
```

Available types:
- `Memory` - Stores credentials in memory only (lost on restart)
- `Encrypted` - Stores credentials encrypted on disk

## Player Transfer Between Worlds

### Moving Players Between Worlds

```java
import com.hypixel.hytale.server.core.universe.Universe;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.math.vector.Transform;

World targetWorld = Universe.get().getWorld("adventure");
Transform spawnPoint = new Transform(100, 64, 200);

// Add player to new world
targetWorld.addPlayer(playerRef, spawnPoint)
    .thenAccept(player -> {
        getLogger().info("Player transferred to " + targetWorld.getName());
    })
    .exceptionally(error -> {
        getLogger().severe("Transfer failed: " + error.getMessage());
        return null;
    });
```

### Resetting Player Data

```java
Universe universe = Universe.get();

// Reset player with fresh data
universe.resetPlayer(playerRef).thenAccept(newPlayerRef -> {
    getLogger().info("Player reset complete");
});

// Reset with specific holder and destination
Holder<EntityStore> freshHolder = universe.getPlayerStorage().load(uuid).join();
World targetWorld = universe.getWorld("spawn");
Transform spawn = new Transform(0, 64, 0);

universe.resetPlayer(playerRef, freshHolder, targetWorld, spawn)
    .thenAccept(newPlayerRef -> {
        getLogger().info("Player reset and moved to spawn");
    });
```

### Server Referral

Transfer players to another server:

```java
// Refer player to another server
playerRef.referToServer("other.server.com", 25565);

// With custom data payload (max 4096 bytes)
byte[] transferData = /* custom data */;
playerRef.referToServer("other.server.com", 25565, transferData);
```

## Complete Example Plugin

```java
package com.example.playermanager;

import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;
import com.hypixel.hytale.server.core.event.events.player.*;
import com.hypixel.hytale.server.core.universe.Universe;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.component.Holder;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class PlayerManagerPlugin extends JavaPlugin {

    private final Map<UUID, Long> sessionStartTimes = new ConcurrentHashMap<>();

    public PlayerManagerPlugin(JavaPluginInit init) {
        super(init);
    }

    @Override
    protected void setup() {
        // Track player connections
        getEventRegistry().register(PlayerConnectEvent.class, this::onPlayerConnect);
        getEventRegistry().register(PlayerDisconnectEvent.class, this::onPlayerDisconnect);

        // Handle world joins
        getEventRegistry().registerGlobal(AddPlayerToWorldEvent.class, this::onPlayerJoinWorld);

        // Player ready for gameplay
        getEventRegistry().registerGlobal(PlayerReadyEvent.class, this::onPlayerReady);
    }

    private void onPlayerConnect(PlayerConnectEvent event) {
        PlayerRef playerRef = event.getPlayerRef();
        UUID uuid = playerRef.getUuid();

        sessionStartTimes.put(uuid, System.currentTimeMillis());
        getLogger().info("Player connecting: " + playerRef.getUsername());

        // Check if this is a new player
        Holder<EntityStore> holder = event.getHolder();
        Player player = holder.getComponent(Player.getComponentType());

        if (player.getPlayerConfigData().getWorld() == null) {
            // New player - send to tutorial world
            event.setWorld(Universe.get().getWorld("tutorial"));
        }
    }

    private void onPlayerDisconnect(PlayerDisconnectEvent event) {
        PlayerRef playerRef = event.getPlayerRef();
        UUID uuid = playerRef.getUuid();

        Long startTime = sessionStartTimes.remove(uuid);
        if (startTime != null) {
            long sessionDuration = System.currentTimeMillis() - startTime;
            getLogger().info(playerRef.getUsername() + " played for " +
                (sessionDuration / 1000) + " seconds");
        }
    }

    private void onPlayerJoinWorld(AddPlayerToWorldEvent event) {
        // Suppress default join message for silent joins
        if (event.getWorld().getName().equals("admin")) {
            event.setBroadcastJoinMessage(false);
        }
    }

    private void onPlayerReady(PlayerReadyEvent event) {
        Player player = event.getPlayer();

        // Send welcome message
        player.sendMessage(Message.of("Welcome back, " + player.getDisplayName() + "!"));

        // Check first spawn in this world
        if (player.isFirstSpawn()) {
            player.sendMessage(Message.of("This is your first time in this world!"));
        }
    }

    // API for other plugins
    public long getSessionDuration(UUID playerUuid) {
        Long startTime = sessionStartTimes.get(playerUuid);
        if (startTime == null) return 0;
        return System.currentTimeMillis() - startTime;
    }
}
```

## Best Practices

1. **Use PlayerRef for session data** - Keep runtime state in PlayerRef, persistent state in PlayerConfigData
2. **Check entity reference validity** - Always verify `playerRef.getReference() != null` before accessing entity state
3. **Handle async operations** - Player storage operations are async; use CompletableFuture properly
4. **Mark data as changed** - Call `markChanged()` on PlayerConfigData when modifying persistent fields
5. **Use world-keyed events** - Register for specific worlds when possible for better performance
6. **Clean up on disconnect** - Remove temporary data in PlayerDisconnectEvent handlers
7. **Respect player state** - Check if player is in a world (Reference) vs between worlds (Holder)
8. **Handle transfer failures** - World transfers can fail; always handle exceptions
