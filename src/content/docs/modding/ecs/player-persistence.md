---
title: Player Management & Persistence
description: Manage players, store custom data, and handle player events in your Hytale plugins.
sidebar:
  order: 5
---

This guide covers the Hytale player management and persistence systems, including how to look up players, store custom player data, and handle player events.

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

`PlayerRef` is the primary handle for accessing a connected player's session:

```java
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.Universe;

// Get a player by UUID
PlayerRef player = Universe.get().getPlayer(uuid);

// Access player information
UUID uuid = player.getUuid();
String username = player.getUsername();
String language = player.getLanguage();

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

## Player Entity Component

The `Player` class is an entity component that extends `LivingEntity`:

```java
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.component.Ref;

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
```

### Player Managers

```java
// Access various player managers through the Player component
WindowManager windowManager = player.getWindowManager();
PageManager pageManager = player.getPageManager();
HudManager hudManager = player.getHudManager();
HotbarManager hotbarManager = player.getHotbarManager();
```

## Storing Custom Player Data

### Using PlayerConfigData

`PlayerConfigData` stores persistent player information across sessions:

```java
import com.hypixel.hytale.server.core.entity.entities.player.data.PlayerConfigData;

Player player = /* get player component */;
PlayerConfigData config = player.getPlayerConfigData();

// Global player data
String currentWorld = config.getWorld();
Set<String> knownRecipes = config.getKnownRecipes();
Set<String> discoveredZones = config.getDiscoveredZones();

// Per-world player data
PlayerWorldData worldData = config.getPerWorldData("world_name");
Transform lastPosition = worldData.getLastPosition();
boolean isFirstSpawn = worldData.isFirstSpawn();

// Mark data as changed to trigger save
config.markChanged();
```

### Adding Custom Components

For custom persistent data, register your own components:

```java
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

    // Redirect to a different world
    event.setWorld(Universe.get().getWorld("hub"));
    event.setTransform(new Transform(0, 64, 0));
});

// Player ready to receive gameplay (client loaded)
events.register(PlayerReadyEvent.class, event -> {
    Player player = event.getPlayer();
    // Safe to send initial game state now
});
```

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

### Server Referral

Transfer players to another server:

```java
// Refer player to another server
playerRef.referToServer("other.server.com", 25565);

// With custom data payload (max 4096 bytes)
byte[] transferData = /* custom data */;
playerRef.referToServer("other.server.com", 25565, transferData);
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
