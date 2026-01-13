---
title: Inventory and Items System
description: Manage player inventories, item stacks, and create custom items in your Hytale plugins.
sidebar:
  order: 12
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

## Inventory Class

The `Inventory` class manages a living entity's complete inventory system with multiple sections.

### Inventory Sections

| Section | ID Constant | Capacity | Description |
|---------|-------------|----------|-------------|
| Hotbar | `HOTBAR_SECTION_ID` (-1) | 9 | Quick-access slots |
| Storage | `STORAGE_SECTION_ID` (-2) | 36 | Main inventory (4x9 grid) |
| Armor | `ARMOR_SECTION_ID` (-3) | 4 | Equipment slots |
| Utility | `UTILITY_SECTION_ID` (-5) | 4 | Utility item slots |
| Tools | `TOOLS_SECTION_ID` (-8) | 23 | Tool slots (deprecated) |
| Backpack | `BACKPACK_SECTION_ID` (-9) | Variable | Extra storage |

### Accessing Inventory

```java
import com.hypixel.hytale.server.core.inventory.Inventory;
import com.hypixel.hytale.server.core.inventory.ItemStack;
import com.hypixel.hytale.server.core.inventory.container.ItemContainer;
import com.hypixel.hytale.server.core.entity.entities.Player;

// Get player's inventory
Player player = // ... obtain player reference
Inventory inventory = player.getInventory();

// Access individual sections
ItemContainer hotbar = inventory.getHotbar();
ItemContainer storage = inventory.getStorage();
ItemContainer armor = inventory.getArmor();
ItemContainer utility = inventory.getUtility();
ItemContainer backpack = inventory.getBackpack();

// Get section by ID (useful for window/container interactions)
ItemContainer section = inventory.getSectionById(Inventory.HOTBAR_SECTION_ID);
```

### Active Slot Management

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

### Moving Items

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

// Take all items from a container window
inventory.takeAll(windowSectionId);

// Quick stack matching items to container
inventory.quickStack(windowSectionId);
```

### Inventory Operations

```java
// Clear all inventory sections
inventory.clear();

// Drop all items (returns list of dropped ItemStacks)
List<ItemStack> droppedItems = inventory.dropAllItemStacks();

// Sort storage inventory
inventory.sortStorage(SortType.NAME);

// Check for broken items
boolean hasBroken = inventory.containsBrokenItem();

// Resize backpack (overflow goes to remainder list)
List<ItemStack> remainder = new ArrayList<>();
inventory.resizeBackpack((short) 27, remainder);
```

### Combined Containers

The inventory provides pre-built combined containers for efficient item operations:

```java
// Hotbar first, then storage (for pickups)
CombinedItemContainer hotbarFirst = inventory.getCombinedHotbarFirst();

// Storage first, then hotbar
CombinedItemContainer storageFirst = inventory.getCombinedStorageFirst();

// All inventory sections combined
CombinedItemContainer everything = inventory.getCombinedEverything();

// Get appropriate container for item pickup based on player settings
ItemContainer pickupContainer = inventory.getContainerForItemPickup(item, playerSettings);
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

// Get associated block (for placeable items)
String blockKey = stack.getBlockKey();
```

### Immutable Modification

ItemStack is immutable - modification methods return new instances:

```java
// Modify quantity (returns null if quantity would be 0)
ItemStack modified = stack.withQuantity(32);

// Modify durability
ItemStack damaged = stack.withDurability(50.0);
ItemStack repaired = stack.withIncreasedDurability(25.0);
ItemStack fullyRepaired = stack.withRestoredDurability(100.0);
ItemStack upgraded = stack.withMaxDurability(150.0);

// Change item state
ItemStack newState = stack.withState("activated");

// Modify metadata
ItemStack withMeta = stack.withMetadata(metadata);
ItemStack withKeyedMeta = stack.withMetadata("CustomKey", Codec.STRING, "value");
```

### Stacking and Comparison

```java
// Check if items can stack together
boolean canStack = stack1.isStackableWith(stack2);

// Check if same item type (ignoring quantity/durability)
boolean sameType = stack1.isEquivalentType(stack2);

// Static utility methods
boolean isEmpty = ItemStack.isEmpty(stack);
boolean stackable = ItemStack.isStackableWith(stack1, stack2);
boolean equivalent = ItemStack.isEquivalentType(stack1, stack2);
boolean sameItem = ItemStack.isSameItemType(stack1, stack2);
```

### Metadata Access

```java
// Read metadata
String value = stack.getFromMetadataOrNull("CustomKey", Codec.STRING);
MyData data = stack.getFromMetadataOrDefault("DataKey", MyData.CODEC);

// Using keyed codec
KeyedCodec<String> KEY = new KeyedCodec<>("CustomKey", Codec.STRING);
String keyedValue = stack.getFromMetadataOrNull(KEY);
```

## ItemContainer

`ItemContainer` is the base class for all inventory storage systems.

### Basic Operations

```java
import com.hypixel.hytale.server.core.inventory.container.ItemContainer;
import com.hypixel.hytale.server.core.inventory.container.SimpleItemContainer;
import com.hypixel.hytale.server.core.inventory.transaction.*;

// Create a container
ItemContainer container = new SimpleItemContainer((short) 27);

// Get capacity
short capacity = container.getCapacity();

// Check if empty
boolean isEmpty = container.isEmpty();

// Clear all items
ClearTransaction clearTx = container.clear();
```

### Slot Operations

```java
// Get item from slot
ItemStack item = container.getItemStack((short) 5);

// Set item in slot
ItemStackSlotTransaction setTx = container.setItemStackForSlot((short) 5, itemStack);

// Remove item from slot
SlotTransaction removeTx = container.removeItemStackFromSlot((short) 5);

// Remove specific quantity
ItemStackSlotTransaction removeTx = container.removeItemStackFromSlot(
    (short) 5,    // Slot
    16,           // Quantity
    true,         // All or nothing
    true          // Apply filters
);
```

### Adding Items

```java
// Add item to first available slot
ItemStackTransaction addTx = container.addItemStack(itemStack);

// Add with options
ItemStackTransaction addTx = container.addItemStack(
    itemStack,
    false,   // allOrNothing - if true, fails if can't add all
    false,   // fullStacks - if true, only creates new stacks
    true     // filter - apply slot filters
);

// Add to specific slot
ItemStackSlotTransaction slotTx = container.addItemStackToSlot(
    (short) 0,   // Slot
    itemStack,
    false,       // allOrNothing
    true         // filter
);

// Check if item can be added
boolean canAdd = container.canAddItemStack(itemStack);
boolean canAddAll = container.canAddItemStack(itemStack, false, true);

// Add multiple items
List<ItemStack> items = List.of(stack1, stack2, stack3);
ListTransaction<ItemStackTransaction> addAllTx = container.addItemStacks(items);
```

### Removing Items

```java
// Remove matching item stack
ItemStackTransaction removeTx = container.removeItemStack(itemStack);

// Remove with options
ItemStackTransaction removeTx = container.removeItemStack(
    itemStack,
    true,    // allOrNothing
    true     // filter
);

// Check if item can be removed
boolean canRemove = container.canRemoveItemStack(itemStack);

// Remove all items (returns removed stacks)
List<ItemStack> removed = container.removeAllItemStacks();

// Drop all items (respects drop filters)
List<ItemStack> dropped = container.dropAllItemStacks();
```

### Moving Items Between Containers

```java
// Move item from one container to another
MoveTransaction<ItemStackTransaction> moveTx = container.moveItemStackFromSlot(
    (short) 5,      // From slot
    otherContainer  // To container
);

// Move specific quantity
MoveTransaction<ItemStackTransaction> moveTx = container.moveItemStackFromSlot(
    (short) 5,      // From slot
    32,             // Quantity
    otherContainer, // To container
    false,          // allOrNothing
    true            // filter
);

// Move to specific slot
MoveTransaction<SlotTransaction> moveTx = container.moveItemStackFromSlotToSlot(
    (short) 5,       // From slot
    32,              // Quantity
    otherContainer,  // To container
    (short) 0        // To slot
);

// Move all items
ListTransaction<MoveTransaction<ItemStackTransaction>> moveAllTx =
    container.moveAllItemStacksTo(otherContainer);

// Quick stack (only matching items)
container.quickStackTo(otherContainer);

// Swap items between containers
container.swapItems((short) 0, otherContainer, (short) 0, (short) 9);
```

### Sorting and Iteration

```java
// Sort items
ListTransaction<SlotTransaction> sortTx = container.sortItems(SortType.NAME);

// Iterate over items
container.forEach((slot, itemStack) -> {
    System.out.println("Slot " + slot + ": " + itemStack.getItemId());
});

// Count items matching predicate
int count = container.countItemStacks(stack -> stack.getItemId().equals("Stone"));

// Check if contains stackable items
boolean hasStackable = container.containsItemStacksStackableWith(itemStack);
```

### Change Events

```java
import com.hypixel.hytale.event.EventRegistration;
import com.hypixel.hytale.server.core.inventory.container.ItemContainer.ItemContainerChangeEvent;

// Register change listener
EventRegistration reg = container.registerChangeEvent(event -> {
    ItemContainer changedContainer = event.container();
    Transaction transaction = event.transaction();

    if (transaction.succeeded()) {
        // Handle successful change
    }
});

// With priority
EventRegistration reg = container.registerChangeEvent(
    EventPriority.EARLY,
    this::onContainerChange
);

// Unregister when done
reg.close();
```

## MaterialQuantity and ResourceQuantity

These classes represent crafting ingredients and resource requirements.

### MaterialQuantity

```java
import com.hypixel.hytale.server.core.inventory.MaterialQuantity;

// Create by item ID
MaterialQuantity material = new MaterialQuantity(
    "Stone",    // Item ID (or null)
    null,       // Resource type ID (or null)
    null,       // Tag (or null)
    5,          // Quantity
    null        // Metadata
);

// Create by resource type
MaterialQuantity resource = new MaterialQuantity(
    null,
    "Wood",     // Resource type
    null,
    10,
    null
);

// Create by tag
MaterialQuantity tagged = new MaterialQuantity(
    null,
    null,
    "ore",      // Item tag
    3,
    null
);

// Convert to ItemStack
ItemStack stack = material.toItemStack();

// Convert to ResourceQuantity
ResourceQuantity res = material.toResource();

// Check and remove from container
if (container.canRemoveMaterial(material)) {
    MaterialTransaction tx = container.removeMaterial(material);
}

// Remove multiple materials
List<MaterialQuantity> materials = List.of(material1, material2);
if (container.canRemoveMaterials(materials)) {
    ListTransaction<MaterialTransaction> tx = container.removeMaterials(materials);
}
```

### ResourceQuantity

```java
import com.hypixel.hytale.server.core.inventory.ResourceQuantity;

// Create resource requirement
ResourceQuantity resource = new ResourceQuantity("Wood", 10);

// Properties
String resourceId = resource.getResourceId();
int quantity = resource.getQuantity();

// Clone with different quantity
ResourceQuantity doubled = resource.clone(20);

// Remove from container
if (container.canRemoveResource(resource)) {
    ResourceTransaction tx = container.removeResource(resource);
}
```

## ItemContext

`ItemContext` provides context about an item's location in an inventory.

```java
import com.hypixel.hytale.server.core.inventory.ItemContext;

// Create context
ItemContext context = new ItemContext(container, (short) 5, itemStack);

// Access properties
ItemContainer container = context.getContainer();
short slot = context.getSlot();
ItemStack item = context.getItemStack();
```

## Item Asset Configuration

Items are defined as assets with various properties and behaviors.

### Item Properties

```java
import com.hypixel.hytale.server.core.asset.type.item.config.Item;

// Get item from asset registry
Item item = Item.getAssetMap().getAsset("DiamondSword");

// Basic properties
String id = item.getId();
String icon = item.getIcon();
int maxStack = item.getMaxStack();
double maxDurability = item.getMaxDurability();
boolean isConsumable = item.isConsumable();
boolean isVariant = item.isVariant();

// Categories
String[] categories = item.getCategories();

// Block association (for placeable items)
boolean hasBlock = item.hasBlockType();
String blockId = item.getBlockId();

// Translation keys
String nameKey = item.getTranslationKey();
String descKey = item.getDescriptionTranslationKey();
```

### Item Type Properties

```java
// Weapon properties
ItemWeapon weapon = item.getWeapon();
if (weapon != null) {
    Int2ObjectMap<StaticModifier[]> statMods = weapon.getStatModifiers();
    boolean renderDualWielded = weapon.renderDualWielded;
}

// Armor properties
ItemArmor armor = item.getArmor();
if (armor != null) {
    ItemArmorSlot slot = armor.getArmorSlot();
    double baseResistance = armor.getBaseDamageResistance();
    Int2ObjectMap<StaticModifier[]> statMods = armor.getStatModifiers();
}

// Tool properties
ItemTool tool = item.getTool();
if (tool != null) {
    ItemToolSpec[] specs = tool.getSpecs();
    float speed = tool.getSpeed();
}

// Utility properties
ItemUtility utility = item.getUtility();
boolean isUsable = utility.isUsable();
boolean isCompatible = utility.isCompatible();

// Glider properties
ItemGlider glider = item.getGlider();
```

### Armor Slots

```java
import com.hypixel.hytale.protocol.ItemArmorSlot;

// Available armor slots
ItemArmorSlot.Head;   // 0 - Helmet
ItemArmorSlot.Chest;  // 1 - Chestplate
ItemArmorSlot.Hands;  // 2 - Gloves
ItemArmorSlot.Legs;   // 3 - Leggings

// Get slot from value
ItemArmorSlot slot = ItemArmorSlot.fromValue(0); // Head

// All slots
ItemArmorSlot[] allSlots = ItemArmorSlot.VALUES;
```

## HotbarManager

Manages saved hotbar presets for creative mode.

```java
import com.hypixel.hytale.server.core.entity.entities.player.HotbarManager;

// Maximum saved hotbars
int maxHotbars = HotbarManager.HOTBARS_MAX; // 10

// Save current hotbar (creative mode only)
hotbarManager.saveHotbar(playerRef, (short) 0, componentAccessor);

// Load saved hotbar (creative mode only)
hotbarManager.loadHotbar(playerRef, (short) 0, componentAccessor);

// Get current hotbar index
int currentIndex = hotbarManager.getCurrentHotbarIndex();

// Check if currently loading
boolean isLoading = hotbarManager.getIsCurrentlyLoadingHotbar();
```

## Equipment

Equipment represents the visually rendered items on an entity.

```java
import com.hypixel.hytale.protocol.Equipment;

// Equipment contains
// - armorIds[] - IDs of equipped armor
// - rightHandItemId - Item in right hand
// - leftHandItemId - Item in left hand
```

## Inventory Events

### LivingEntityInventoryChangeEvent

Fired when any inventory section changes.

```java
import com.hypixel.hytale.server.core.event.events.entity.LivingEntityInventoryChangeEvent;

getEventRegistry().register(
    LivingEntityInventoryChangeEvent.class,
    worldName,
    event -> {
        LivingEntity entity = event.getEntity();
        ItemContainer container = event.getItemContainer();
        Transaction transaction = event.getTransaction();

        if (transaction.succeeded()) {
            // Handle inventory change
        }
    }
);
```

### DropItemEvent

Fired when an item is dropped.

```java
import com.hypixel.hytale.server.core.event.events.ecs.DropItemEvent;

// Handle drop request from player
getEventRegistry().register(DropItemEvent.PlayerRequest.class, event -> {
    int sectionId = event.getInventorySectionId();
    short slotId = event.getSlotId();

    // Cancel to prevent drop
    event.setCancelled(true);
});

// Handle actual item drop
getEventRegistry().register(DropItemEvent.Drop.class, event -> {
    ItemStack dropped = event.getItemStack();
    float throwSpeed = event.getThrowSpeed();

    // Modify throw speed
    event.setThrowSpeed(2.0f);

    // Modify dropped item
    event.setItemStack(dropped.withQuantity(1));
});
```

### InteractivelyPickupItemEvent

Fired when a player interactively picks up an item.

```java
import com.hypixel.hytale.server.core.event.events.ecs.InteractivelyPickupItemEvent;

getEventRegistry().register(InteractivelyPickupItemEvent.class, event -> {
    ItemStack item = event.getItemStack();

    // Modify the picked up item
    event.setItemStack(item.withQuantity(item.getQuantity() * 2));

    // Or cancel pickup
    event.setCancelled(true);
});
```

## ItemModule

The `ItemModule` provides item registration and utility functions.

```java
import com.hypixel.hytale.server.core.modules.item.ItemModule;

// Get module instance
ItemModule itemModule = ItemModule.get();

// Check if item exists
boolean exists = ItemModule.exists("Stone");

// Get flat list of item categories
List<String> categories = itemModule.getFlatItemCategoryList();

// Generate random drops from drop list
List<ItemStack> drops = itemModule.getRandomItemDrops("DropListId");
```

## Transactions

All container operations return transaction objects for tracking success/failure.

### Transaction Types

| Transaction | Description |
|-------------|-------------|
| `Transaction` | Base transaction with success status |
| `SlotTransaction` | Single slot operation |
| `ItemStackTransaction` | Item stack add/remove |
| `ItemStackSlotTransaction` | Item stack slot operation |
| `MoveTransaction` | Item movement between containers |
| `ListTransaction` | Multiple operations |
| `MaterialTransaction` | Material removal |
| `ResourceTransaction` | Resource removal |
| `ClearTransaction` | Clear operation |

### Using Transactions

```java
// Check success
ItemStackTransaction tx = container.addItemStack(itemStack);
if (tx.succeeded()) {
    ItemStack remainder = tx.getRemainder();
    if (!ItemStack.isEmpty(remainder)) {
        // Some items couldn't be added
    }
}

// Slot transactions
ItemStackSlotTransaction slotTx = container.setItemStackForSlot((short) 0, itemStack);
ItemStack before = slotTx.getSlotBefore();
ItemStack after = slotTx.getSlotAfter();
short slot = slotTx.getSlot();

// Move transactions
MoveTransaction<ItemStackTransaction> moveTx = container.moveItemStackFromSlot((short) 0, other);
Transaction fromTx = moveTx.getRemoveTransaction();
ItemStackTransaction addTx = moveTx.getAddTransaction();
ItemContainer otherContainer = moveTx.getOtherContainer();

// List transactions
ListTransaction<ItemStackTransaction> listTx = container.addItemStacks(items);
List<ItemStackTransaction> transactions = listTx.getList();
```

## Best Practices

1. **Check capacity before adding** - Use `canAddItemStack()` before `addItemStack()`
2. **Handle remainders** - Check transaction remainders for items that couldn't be placed
3. **Use appropriate containers** - Use combined containers for pickup operations
4. **Respect filters** - Pass `filter=true` to respect slot type restrictions
5. **Listen to events** - Register change events to sync custom UI or logic
6. **Use transactions** - Always check transaction success before assuming operation completed
7. **Immutable ItemStacks** - Remember ItemStack modification methods return new instances
8. **Clean up registrations** - Unregister event listeners when no longer needed
