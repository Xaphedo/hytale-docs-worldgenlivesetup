# Event System

The Hytale event system provides a powerful way to react to game occurrences and inter-plugin communication.

## Architecture

```
EventBus (Global)
├── SyncEventBusRegistry    - Synchronous events (IEvent)
└── AsyncEventBusRegistry   - Asynchronous events (IAsyncEvent)

EventRegistry (Per-Plugin)
└── Wraps EventBus with lifecycle management
```

## Event Types

### Synchronous Events (IEvent)
Execute handlers immediately in priority order.

```java
public interface IEvent<KeyType> extends IBaseEvent<KeyType> {
}
```

### Asynchronous Events (IAsyncEvent)
Execute handlers with CompletableFuture chaining.

```java
public interface IAsyncEvent<KeyType> extends IBaseEvent<KeyType> {
}
```

### Cancellable Events
Events that can be cancelled to prevent default behavior.

```java
public interface ICancellable {
    boolean isCancelled();
    void setCancelled(boolean cancelled);
}
```

## Event Priorities

Events are dispatched in priority order:

| Priority | Value | Description |
|----------|-------|-------------|
| `FIRST` | -21844 | Execute first |
| `EARLY` | -10922 | Execute early |
| `NORMAL` | 0 | Default priority |
| `LATE` | 10922 | Execute late |
| `LAST` | 21844 | Execute last |

## Subscribing to Events

### Basic Registration

```java
@Override
protected void setup() {
    // Simple registration (NORMAL priority)
    getEventRegistry().register(BootEvent.class, this::onBoot);
}

private void onBoot(BootEvent event) {
    getLogger().info("Server booted!");
}
```

### With Priority

```java
getEventRegistry().register(
    EventPriority.EARLY,
    PlayerJoinEvent.class,
    event -> {
        // Handle early
    }
);

// Or with custom priority value
getEventRegistry().register(
    (short) -5000,
    PlayerJoinEvent.class,
    this::onPlayerJoin
);
```

### Keyed Events

Some events have keys for scoped listening:

```java
// Listen to events for specific world
getEventRegistry().register(
    WorldEvent.class,
    "world_name",  // Key
    event -> {
        // Only fires for events in "world_name"
    }
);
```

### Global Registration

Listen to all instances of an event regardless of key:

```java
getEventRegistry().registerGlobal(
    EntitySpawnEvent.class,
    event -> {
        // Handles all entity spawns in all worlds
    }
);
```

### Unhandled Fallback

Called when no key-specific handler matches:

```java
getEventRegistry().registerUnhandled(
    CustomEvent.class,
    event -> {
        // Fallback handler
    }
);
```

## Async Event Registration

```java
getEventRegistry().registerAsync(
    PlayerChatEvent.class,
    future -> future.thenApply(event -> {
        // Process asynchronously
        if (containsBadWord(event.getMessage())) {
            event.setCancelled(true);
        }
        return event;
    })
);
```

## Creating Custom Events

### Simple Synchronous Event

```java
public class MyEvent implements IEvent<Void> {
    private final String data;

    public MyEvent(String data) {
        this.data = data;
    }

    public String getData() {
        return data;
    }
}
```

### Keyed Event

```java
public class WorldSpecificEvent implements IEvent<String> {
    private final String worldName;
    private final int value;

    public WorldSpecificEvent(String worldName, int value) {
        this.worldName = worldName;
        this.value = value;
    }

    public String getWorldName() {
        return worldName;
    }

    public int getValue() {
        return value;
    }
}
```

### Cancellable Event

```java
public class CancellableEvent implements IEvent<Void>, ICancellable {
    private boolean cancelled = false;
    private final String action;

    public CancellableEvent(String action) {
        this.action = action;
    }

    @Override
    public boolean isCancelled() {
        return cancelled;
    }

    @Override
    public void setCancelled(boolean cancelled) {
        this.cancelled = cancelled;
    }

    public String getAction() {
        return action;
    }
}
```

### Async Event

```java
public class MyAsyncEvent implements IAsyncEvent<Void>, ICancellable {
    private boolean cancelled = false;
    private String result;

    @Override
    public boolean isCancelled() {
        return cancelled;
    }

    @Override
    public void setCancelled(boolean cancelled) {
        this.cancelled = cancelled;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }
}
```

## Dispatching Events

### Get Dispatcher and Check for Listeners

```java
IEventDispatcher<MyEvent, MyEvent> dispatcher =
    HytaleServer.get().getEventBus().dispatchFor(MyEvent.class);

if (dispatcher.hasListener()) {
    MyEvent event = new MyEvent("data");
    dispatcher.dispatch(event);
}
```

### With Key

```java
IEventDispatcher<WorldEvent, WorldEvent> dispatcher =
    HytaleServer.get().getEventBus().dispatchFor(
        WorldEvent.class,
        worldName  // Key
    );

dispatcher.dispatch(new WorldEvent(worldName, value));
```

### Async Dispatch

```java
HytaleServer.get().getEventBus()
    .dispatchForAsync(PlayerChatEvent.class)
    .dispatch(new PlayerChatEvent(sender, targets, message))
    .whenComplete((event, error) -> {
        if (error != null) {
            // Handle error
            return;
        }
        if (event.isCancelled()) {
            // Event was cancelled
            return;
        }
        // Process result
        sendMessage(event.getTargets(), event.getMessage());
    });
```

## Built-in Events

### Server Lifecycle

| Event | Description |
|-------|-------------|
| `BootEvent` | Server fully booted |
| `ShutdownEvent` | Server shutting down |

### Plugin Events

| Event | Description |
|-------|-------------|
| `PluginSetupEvent` | Plugin setup completed |

### Asset Events

| Event | Description |
|-------|-------------|
| `LoadedAssetsEvent` | Assets loaded |
| `RemovedAssetsEvent` | Assets removed |
| `GenerateAssetsEvent` | Asset generation |

### World Events

| Event | Description |
|-------|-------------|
| `AddWorldEvent` | World added |
| `AllWorldsLoadedEvent` | All worlds loaded |

### Player Events

| Event | Description |
|-------|-------------|
| `PlayerConnectEvent` | Player connecting |
| `PlayerDisconnectEvent` | Player disconnected |
| `PlayerChatEvent` | Player chat message (async) |
| `PlayerCraftEvent` | Player crafting |

### Entity Events

| Event | Description |
|-------|-------------|
| `EntityRemoveEvent` | Entity removed |
| `LivingEntityInventoryChangeEvent` | Inventory changed |

### Block Events

| Event | Description |
|-------|-------------|
| `PlaceBlockEvent` | Block placed (cancellable) |
| `BreakBlockEvent` | Block broken (cancellable) |

## ShutdownEvent Priorities

The ShutdownEvent has special priority constants:

```java
ShutdownEvent.DISCONNECT_PLAYERS = -48  // First
ShutdownEvent.UNBIND_LISTENERS = -40    // Second
ShutdownEvent.SHUTDOWN_WORLDS = -32     // Third
```

Register with appropriate priority for proper shutdown ordering:

```java
getEventRegistry().register(
    (short) ShutdownEvent.SHUTDOWN_WORLDS + 1,
    ShutdownEvent.class,
    event -> {
        // Runs after worlds but before complete shutdown
        savePluginData();
    }
);
```

## Event Registration Cleanup

Registrations are automatically cleaned up when plugin is disabled:

```java
// This is automatically unregistered on plugin disable
getEventRegistry().register(SomeEvent.class, this::handler);
```

## Best Practices

1. **Use appropriate priority**: Don't always use FIRST/LAST
2. **Check hasListener()**: Avoid creating events when no one listens
3. **Handle async properly**: Don't block in async handlers
4. **Respect cancellation**: Check isCancelled() before actions
5. **Use keyed events**: For scoped/efficient event handling
6. **Clean exception handling**: Exceptions in handlers are logged but don't stop other handlers
