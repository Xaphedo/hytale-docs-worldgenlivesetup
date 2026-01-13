---
title: Windows System
description: Create and manage server-side GUI windows for player interactions in Hytale.
sidebar:
  order: 2
---

The Hytale window system provides a server-authoritative GUI framework for displaying inventory interfaces, crafting tables, containers, and custom interfaces to players.

## Architecture

```
WindowManager (Per-player window management)
├── Window (Base abstract class)
│   ├── ContainerWindow (Simple item container)
│   ├── ContainerBlockWindow (Block-bound container)
│   ├── ItemStackContainerWindow (ItemStack-based container)
│   └── Custom window implementations
├── WindowType (Protocol-defined window types)
└── WindowAction (Client-to-server actions)

Window Interfaces:
├── ItemContainerWindow - Windows with item storage
├── MaterialContainerWindow - Windows with extra resources
└── ValidatedWindow - Windows requiring periodic validation
```

## WindowManager

The `WindowManager` handles all window operations for a specific player. It is accessed through the player's component system.

### Accessing WindowManager

```java
import com.hypixel.hytale.server.core.entity.entities.player.windows.WindowManager;
import com.hypixel.hytale.server.core.entity.entities.Player;

// Get WindowManager from player component
Player playerComponent = store.getComponent(ref, Player.getComponentType());
WindowManager windowManager = playerComponent.getWindowManager();
```

### Opening Windows

```java
import com.hypixel.hytale.protocol.packets.window.OpenWindow;

// Open a window and get the packet to send
Window myWindow = new ContainerWindow(itemContainer);
OpenWindow packet = windowManager.openWindow(myWindow);

if (packet != null) {
    // Window opened successfully - packet is automatically sent
    int windowId = myWindow.getId();
}

// Open multiple windows at once
Window[] windows = { window1, window2, window3 };
List<OpenWindow> packets = windowManager.openWindows(windows);

if (packets == null) {
    // One or more windows failed to open - all are closed
}
```

### Updating Windows

```java
// Manually update a window (sends UpdateWindow packet)
windowManager.updateWindow(window);

// Mark a window as changed (will be updated on next tick)
windowManager.markWindowChanged(windowId);

// Update all dirty windows (called automatically by server)
windowManager.updateWindows();
```

### Closing Windows

```java
// Close a specific window by ID
Window closedWindow = windowManager.closeWindow(windowId);

// Close all windows for the player
windowManager.closeAllWindows();

// Close window from within the window instance
window.close();
```

### Window ID Management

| ID | Description |
|----|-------------|
| -1 | Invalid/unassigned |
| 0 | Reserved for client-initiated windows |
| 1+ | Server-assigned IDs (auto-incremented) |

```java
// Get a window by ID
Window window = windowManager.getWindow(windowId);

// Get all active windows
List<Window> allWindows = windowManager.getWindows();
```

## Window Types

Windows are categorized by `WindowType`, an enum defining the client-side rendering:

| WindowType | Value | Description |
|------------|-------|-------------|
| `Container` | 0 | Generic item container (chests, storage) |
| `PocketCrafting` | 1 | Quick crafting from inventory |
| `BasicCrafting` | 2 | Standard crafting bench interface |
| `DiagramCrafting` | 3 | Pattern-based crafting (diagrams) |
| `StructuralCrafting` | 4 | Building/structural crafting |
| `Processing` | 5 | Processing stations (furnaces, etc.) |
| `Memories` | 6 | Memory/collection interface |

## Creating Custom Windows

### Basic Window Implementation

```java
import com.hypixel.hytale.server.core.entity.entities.player.windows.Window;
import com.hypixel.hytale.protocol.packets.window.WindowType;
import com.google.gson.JsonObject;

public class CustomWindow extends Window {
    private final JsonObject windowData = new JsonObject();

    public CustomWindow() {
        super(WindowType.Container);
        windowData.addProperty("customProperty", "value");
    }

    @Override
    public JsonObject getData() {
        return windowData;
    }

    @Override
    protected boolean onOpen0() {
        // Called when window opens
        // Return false to cancel opening
        return true;
    }

    @Override
    protected void onClose0() {
        // Called when window closes
        // Clean up resources here
    }
}
```

### Window Lifecycle

```
1. Window constructed
2. WindowManager.openWindow() called
3. Window.init() - receives PlayerRef and WindowManager
4. Window.onOpen() -> onOpen0()
   - Return true to complete opening
   - Return false to cancel (window is closed)
5. OpenWindow packet sent to client
6. Window active - handles actions, updates
7. Window.close() or WindowManager.closeWindow()
8. Window.onClose() -> onClose0()
9. WindowCloseEvent dispatched
10. CloseWindow packet sent to client
```

### Window Data

Window data is sent to the client as JSON:

```java
@Override
public JsonObject getData() {
    JsonObject data = new JsonObject();
    data.addProperty("title", "My Window");
    data.addProperty("capacity", 27);
    data.addProperty("customFlag", true);
    return data;
}

// Mark window as needing a full rebuild
protected void setNeedRebuild() {
    this.needRebuild.set(true);
    this.getData().addProperty("needRebuild", Boolean.TRUE);
}
```

## WindowAction Types

Client interactions are sent as `WindowAction` subtypes:

| Action | Description |
|--------|-------------|
| `CraftRecipeAction` | Craft using a specific recipe |
| `CraftItemAction` | Craft a specific item |
| `TierUpgradeAction` | Upgrade crafting tier |
| `SelectSlotAction` | Select a slot in the window |
| `ChangeBlockAction` | Change block in structural crafting |
| `SetActiveAction` | Set active state |
| `UpdateCategoryAction` | Change category filter |
| `CancelCraftingAction` | Cancel ongoing craft |
| `SortItemsAction` | Sort items in container |

### Handling Actions

```java
@Override
public void handleAction(Ref<EntityStore> ref, Store<EntityStore> store, WindowAction action) {
    if (action instanceof SelectSlotAction selectSlot) {
        int slot = selectSlot.getSlot();
        // Handle slot selection
    } else if (action instanceof SortItemsAction) {
        // Sort the container contents
    }
}
```

## Window Events

### Close Event

```java
// Register for window close events
EventRegistration registration = window.registerCloseEvent(event -> {
    // Handle window close
    // event.getWindow() - the window being closed
});
```

## Built-in Window Classes

### ContainerWindow

Basic item container window:

```java
import com.hypixel.hytale.server.core.entity.entities.player.windows.ContainerWindow;
import com.hypixel.hytale.server.core.inventory.container.ItemContainer;

ItemContainer container = new ItemContainer(27);
ContainerWindow window = new ContainerWindow(container);
windowManager.openWindow(window);
```

### ContainerBlockWindow

Window bound to a block in the world:

```java
import com.hypixel.hytale.server.core.entity.entities.player.windows.ContainerBlockWindow;

ContainerBlockWindow window = new ContainerBlockWindow(
    container,
    blockPosition,
    worldRef
);
```

## Best Practices

1. **Validate window state** - Check if window is still valid before operations
2. **Handle close gracefully** - Clean up resources in `onClose0()`
3. **Batch updates** - Use `markWindowChanged()` for multiple changes
4. **Use appropriate types** - Choose the right `WindowType` for rendering
5. **Limit open windows** - Close old windows before opening new ones
