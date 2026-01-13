---
title: UI Building Tools
description: Use UICommandBuilder and UIEventBuilder to create dynamic UIs in Hytale.
sidebar:
  order: 5
---

The UI building tools provide a fluent API for constructing and updating user interfaces from server-side code.

## UICommandBuilder

Build UI manipulation commands to send to the client.

### Creating a Builder

```java
import com.hypixel.hytale.server.core.ui.builder.UICommandBuilder;

UICommandBuilder builder = new UICommandBuilder();
```

### Command Types

| Type | Description |
|------|-------------|
| `Append` | Add elements from a document path |
| `AppendInline` | Add elements from inline UI definition |
| `InsertBefore` | Insert elements before a selector |
| `InsertBeforeInline` | Insert inline elements before a selector |
| `Remove` | Remove elements matching selector |
| `Set` | Set property value on elements |
| `Clear` | Clear children of elements |

### Appending Content

```java
// Append UI document to page root
builder.append("Pages/MyPage.ui");

// Append to specific container
builder.append("#container", "Components/Button.ui");

// Append inline UI markup
builder.appendInline("#container", "<div class=\"item\">Content</div>");
```

### Inserting Content

```java
// Insert before an element
builder.insertBefore("#target-element", "Components/Header.ui");

// Insert inline before an element
builder.insertBeforeInline("#target-element", "<div>Inserted Content</div>");
```

### Removing and Clearing

```java
// Remove element from DOM entirely
builder.remove("#old-element");

// Clear element's children but keep element
builder.clear("#container");
```

### Setting Values

```java
// Set text content
builder.set("#health-text", "100 HP");

// Set numeric values
builder.set("#health-bar", 0.75f);
builder.set("#count", 42);

// Set boolean values
builder.set("#is-visible", true);

// Set null value
builder.setNull("#optional-field");

// Set complex objects (must be serializable)
builder.setObject("#item-slot", itemGridSlot);

// Set collections
builder.set("#items", itemStackList);
```

### Using Value References

Reference values from other UI documents:

```java
import com.hypixel.hytale.server.core.ui.builder.Value;

// Reference a style from Common.ui
builder.set("#button.Style", Value.ref("Common.ui", "DefaultButtonStyle"));

// Reference with nested path
builder.set("#panel.Theme", Value.ref("Themes.ui", "DarkTheme.Colors"));
```

### Getting Commands

```java
// Get array of commands to send
CustomUICommand[] commands = builder.getCommands();
```

## UIEventBuilder

Bind UI events to server-side handlers.

### Creating a Builder

```java
import com.hypixel.hytale.server.core.ui.builder.UIEventBuilder;

UIEventBuilder eventBuilder = new UIEventBuilder();
```

### Event Types

| Type | Description |
|------|-------------|
| `Click` | Mouse click or tap |
| `Change` | Value changed (sliders, inputs) |
| `Submit` | Form submission |
| `Focus` | Element gained focus |
| `Blur` | Element lost focus |

### Basic Event Binding

```java
import com.hypixel.hytale.protocol.packets.interface_.CustomUIEventBindingType;

// Simple click binding
eventBuilder.addEventBinding(CustomUIEventBindingType.Click, "#my-button");

// Change binding for inputs
eventBuilder.addEventBinding(CustomUIEventBindingType.Change, "#slider");
```

### Events with Data

```java
import com.hypixel.hytale.server.core.ui.builder.EventData;

// Create event data
EventData data = new EventData()
    .append("action", "submit")
    .append("itemId", "123")
    .append("quantity", 5);

// Bind with data
eventBuilder.addEventBinding(CustomUIEventBindingType.Click, "#submit-btn", data);
```

### Non-Locking Events

By default, events lock the UI until the server responds. For responsive UIs, use non-locking events:

```java
// Non-locking event (doesn't block UI)
eventBuilder.addEventBinding(
    CustomUIEventBindingType.Change,
    "#slider",
    data,
    false  // isLocking = false
);
```

### Getting Event Bindings

```java
// Get array of bindings
CustomUIEventBinding[] bindings = eventBuilder.getEvents();
```

## EventData

Pass key-value parameters with events.

### Creating EventData

```java
import com.hypixel.hytale.server.core.ui.builder.EventData;

// Chain append calls
EventData data = new EventData()
    .append("key1", "value1")
    .append("key2", "value2")
    .append("count", 42);

// Create with initial value
EventData data = EventData.of("action", "confirm");

// Append enum values
data.append("direction", Direction.NORTH);
```

### Supported Value Types

- `String` - Text values
- `int`, `long` - Integer numbers
- `float`, `double` - Decimal numbers
- `boolean` - True/false
- `Enum` - Enum constants (serialized as strings)

## Complete Example

A custom interactive page with event handling:

```java
import com.hypixel.hytale.server.core.entity.entities.player.pages.InteractiveCustomUIPage;
import com.hypixel.hytale.server.core.entity.entities.player.pages.CustomPageLifetime;
import com.hypixel.hytale.server.core.ui.builder.*;
import com.hypixel.hytale.protocol.packets.interface_.CustomUIEventBindingType;

public class ShopPage extends InteractiveCustomUIPage<ShopEventData> {

    private final List<ShopItem> items;

    public ShopPage(PlayerRef playerRef, List<ShopItem> items) {
        super(playerRef, CustomPageLifetime.CanDismiss, ShopEventData.CODEC);
        this.items = items;
    }

    @Override
    public void build(Ref<EntityStore> ref, UICommandBuilder commands,
                      UIEventBuilder events, Store<EntityStore> store) {
        // Load page template
        commands.append("Pages/ShopPage.ui");
        commands.set("#shop-title", "Item Shop");

        // Add items dynamically
        for (int i = 0; i < items.size(); i++) {
            ShopItem item = items.get(i);

            // Append item template
            commands.append("#item-list", "Components/ShopItem.ui");
            commands.set("#item-" + i + "-name", item.getName());
            commands.set("#item-" + i + "-price", item.getPrice() + " coins");

            // Bind purchase event
            events.addEventBinding(
                CustomUIEventBindingType.Click,
                "#buy-btn-" + i,
                EventData.of("action", "buy").append("index", i)
            );
        }

        // Bind close button
        events.addEventBinding(CustomUIEventBindingType.Click, "#close-btn");
    }

    @Override
    public void handleDataEvent(Ref<EntityStore> ref, Store<EntityStore> store,
                                ShopEventData data) {
        if ("buy".equals(data.action())) {
            ShopItem item = items.get(data.index());
            // Process purchase...
            
            // Update UI
            UICommandBuilder update = new UICommandBuilder();
            update.set("#balance", newBalance + " coins");
            sendUpdate(update);
        } else {
            close();
        }
    }
}
```

## Best Practices

1. **Batch updates** - Combine multiple `set()` calls in one builder
2. **Use non-locking events** for frequent updates like sliders
3. **Reference styles** from Common.ui for consistency
4. **Clear before append** when replacing dynamic content
5. **Handle event data validation** - clients can send malformed data
