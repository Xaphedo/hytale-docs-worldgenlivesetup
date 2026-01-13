---
title: Inventory and Items System
description: Manage player inventories, item stacks, and create custom items in your Hytale plugins.
sidebar:
  order: 3
---

The Hytale inventory system provides comprehensive APIs for managing player inventories, item containers, and item manipulation.

## Architecture

```
Inventory (Player inventory manager)
├── ItemContainer (Storage, Hotbar, Armor, Utility, Backpack)
│   └── ItemStack (Individual item instances)
├── HotbarManager (Saved hotbar presets)
└── Equipment (Visual equipment slots)

ItemModule (Item registration and utilities)
├── Item (Asset definition)
│   ├── ItemWeapon
│   ├── ItemArmor
│   ├── ItemTool
│   └── ItemUtility
└── ItemContext (Item interaction context)
```

## Inventory Sections

| Section | ID Constant | Capacity | Description |
|---------|-------------|----------|-------------|
| Hotbar | `HOTBAR_SECTION_ID` (-1) | 9 | Quick-access slots |
| Storage | `STORAGE_SECTION_ID` (-2) | 36 | Main inventory (4x9 grid) |
| Armor | `ARMOR_SECTION_ID` (-3) | 4 | Equipment slots |
| Utility | `UTILITY_SECTION_ID` (-5) | 4 | Utility item slots |
| Backpack | `BACKPACK_SECTION_ID` (-9) | Variable | Extra storage |

## Accessing Inventory

```java
import com.hypixel.hytale.server.core.inventory.Inventory;
import com.hypixel.hytale.server.core.inventory.ItemStack;
import com.hypixel.hytale.server.core.inventory.container.ItemContainer;

// Get player's inventory
Player player = // ... obtain player reference
Inventory inventory = player.getInventory();

// Access individual sections
ItemContainer hotbar = inventory.getHotbar();
ItemContainer storage = inventory.getStorage();
ItemContainer armor = inventory.getArmor();
ItemContainer utility = inventory.getUtility();
ItemContainer backpack = inventory.getBackpack();

// Get section by ID
ItemContainer section = inventory.getSectionById(Inventory.HOTBAR_SECTION_ID);
```

## Active Slot Management

```java
// Get/set active hotbar slot (0-8)
byte activeSlot = inventory.getActiveHotbarSlot();
inventory.setActiveHotbarSlot((byte) 3);

// Get item currently in hand
ItemStack itemInHand = inventory.getItemInHand();
ItemStack activeHotbarItem = inventory.getActiveHotbarItem();

// Utility slot management
byte utilitySlot = inventory.getActiveUtilitySlot();
inventory.setActiveUtilitySlot((byte) 1);
ItemStack utilityItem = inventory.getUtilityItem();
```

## Moving Items

```java
// Move item between sections
inventory.moveItem(
    Inventory.STORAGE_SECTION_ID,  // From section
    5,                              // From slot
    32,                             // Quantity
    Inventory.HOTBAR_SECTION_ID,   // To section
    0                               // To slot
);

// Smart move (auto-equip armor, merge stacks)
inventory.smartMoveItem(
    Inventory.STORAGE_SECTION_ID,
    10,
    1,
    SmartMoveType.EquipOrMergeStack
);
```

## ItemStack

`ItemStack` represents a stack of items with quantity, durability, and metadata.

### Creating ItemStacks

```java
import com.hypixel.hytale.server.core.inventory.ItemStack;

// Basic creation
ItemStack stack = new ItemStack("Stone");
ItemStack stackWithQuantity = new ItemStack("Stone", 64);

// With metadata
BsonDocument metadata = new BsonDocument();
metadata.put("CustomData", new BsonString("value"));
ItemStack stackWithMeta = new ItemStack("Stone", 64, metadata);

// With full parameters
ItemStack fullStack = new ItemStack(
    "DiamondSword",   // Item ID
    1,                // Quantity
    100.0,            // Current durability
    100.0,            // Max durability
    metadata          // Metadata
);

// Empty stack constant
ItemStack empty = ItemStack.EMPTY;
```

### ItemStack Properties

```java
// Basic properties
String itemId = stack.getItemId();
int quantity = stack.getQuantity();
Item item = stack.getItem();

// Durability
double durability = stack.getDurability();
double maxDurability = stack.getMaxDurability();
boolean isBroken = stack.isBroken();
boolean isUnbreakable = stack.isUnbreakable();

// Validation
boolean isEmpty = stack.isEmpty();
boolean isValid = stack.isValid();
```

### Modifying ItemStacks

```java
// Quantity
stack.setQuantity(32);
stack.addQuantity(5);
stack.subtractQuantity(10);

// Durability
stack.setDurability(50.0);
stack.takeDamage(10.0);  // Reduces durability

// Create split stack
ItemStack split = stack.split(16);  // Remove 16 from stack

// Create copy
ItemStack copy = stack.copy();
ItemStack singleCopy = stack.copyWithQuantity(1);
```

## ItemContainer

`ItemContainer` manages a collection of item slots.

### Basic Operations

```java
// Get/set items
ItemStack item = container.getItem(0);
container.setItem(0, new ItemStack("Stone", 32));

// Add items (finds available slots)
int remainder = container.addItem(new ItemStack("Stone", 64));
if (remainder > 0) {
    // Container full, couldn't fit all items
}

// Remove items
container.removeItem(0);
container.clear();
```

### Searching

```java
// Find slot containing item
int slot = container.findSlot("Stone");

// Find empty slot
int emptySlot = container.findEmptySlot();

// Count items
int stoneCount = container.countItem("Stone");
int totalItems = container.countTotalItems();

// Check contents
boolean hasStone = container.containsItem("Stone");
boolean isEmpty = container.isEmpty();
```

## Item Types

### Item Categories

```java
public enum ItemCategory {
    WEAPON,      // Swords, bows
    TOOL,        // Pickaxes, axes
    ARMOR,       // Helmets, chestplates
    CONSUMABLE,  // Food, potions
    MATERIAL,    // Crafting materials
    UTILITY,     // Torches, buckets
    BLOCK        // Placeable blocks
}
```

### Item Properties

```java
Item item = ItemModule.get().getItem("DiamondSword");

String id = item.getId();
String name = item.getName();
ItemCategory category = item.getCategory();
int maxStackSize = item.getMaxStackSize();
double maxDurability = item.getMaxDurability();
```

## Giving Items to Players

```java
// Via inventory
inventory.addItem(new ItemStack("Stone", 64));

// Via command
CommandManager.get().handleCommand(consoleSender, "give " + playerName + " Stone 64");

// As dropped item in world
world.dropItem(new ItemStack("Stone", 64), position);
```

## Item Events

```java
// Item dropped
getEventRegistry().register(DropItemEvent.class, event -> {
    ItemStack droppedItem = event.getItemStack();
    if (event instanceof ICancellable) {
        ((ICancellable) event).setCancelled(true);  // Prevent drop
    }
});

// Item picked up
getEventRegistry().register(InteractivelyPickupItemEvent.class, event -> {
    ItemStack pickedUp = event.getItemStack();
});

// Inventory change
getEventRegistry().register(LivingEntityInventoryChangeEvent.class, event -> {
    // Handle inventory modification
});
```

## Best Practices

1. **Use section constants** - Reference sections by ID for consistency
2. **Check slot bounds** - Validate slot indices before access
3. **Handle remainders** - `addItem` returns unfitted quantity
4. **Clone ItemStacks** - Copy before modification to avoid side effects
5. **Use smart moves** - `smartMoveItem` handles armor equipping automatically
6. **Listen to events** - Track inventory changes through events
7. **Validate ItemStacks** - Check `isEmpty()` before operations
