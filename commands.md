# Command System

Create custom server commands for your plugin.

## Architecture

```
CommandManager (Singleton)
├── System Commands (server built-ins)
└── Plugin Commands (per-plugin)
    └── AbstractCommand
        ├── Arguments (required/optional)
        └── SubCommands (nested)
```

## Creating Commands

### Simple Command

```java
public class HelloCommand extends AbstractCommand {

    public HelloCommand() {
        super("hello", "Says hello to a player");
    }

    @Override
    protected void acceptCall(@Nonnull CommandSender sender,
                              @Nonnull ParserContext context) {
        sender.sendMessage(Message.of("Hello, " + sender.getDisplayName() + "!"));
    }
}
```

### Register Command

```java
@Override
protected void setup() {
    getCommandRegistry().registerCommand(new HelloCommand());
}
```

## Command Arguments

### Required Arguments

```java
public class GiveCommand extends AbstractCommand {

    public GiveCommand() {
        super("give", "Give items to a player");

        // Add required arguments
        addRequiredArgument(new StringArgument("player", "Target player"));
        addRequiredArgument(new StringArgument("item", "Item ID"));
        addRequiredArgument(new IntegerArgument("amount", "Quantity", 1, 64));
    }

    @Override
    protected void acceptCall(@Nonnull CommandSender sender,
                              @Nonnull ParserContext context) {
        String player = context.get("player");
        String item = context.get("item");
        int amount = context.get("amount");

        // Implementation
        sender.sendMessage(Message.of("Gave " + amount + "x " + item + " to " + player));
    }
}
```

### Optional Arguments

```java
public class TeleportCommand extends AbstractCommand {

    public TeleportCommand() {
        super("tp", "Teleport to coordinates");

        addRequiredArgument(new DoubleArgument("x", "X coordinate"));
        addRequiredArgument(new DoubleArgument("y", "Y coordinate"));
        addRequiredArgument(new DoubleArgument("z", "Z coordinate"));

        // Optional argument
        addOptionalArgument("world", new StringArgument("world", "Target world"));
    }

    @Override
    protected void acceptCall(@Nonnull CommandSender sender,
                              @Nonnull ParserContext context) {
        double x = context.get("x");
        double y = context.get("y");
        double z = context.get("z");
        String world = context.getOrDefault("world", "default");

        // Implementation
    }
}
```

### Flag Arguments

```java
public class DebugCommand extends AbstractCommand {

    public DebugCommand() {
        super("debug", "Toggle debug mode");

        // Boolean flag: --verbose or -v
        addFlag("verbose", "v", "Enable verbose output");
        addFlag("all", "a", "Show all information");
    }

    @Override
    protected void acceptCall(@Nonnull CommandSender sender,
                              @Nonnull ParserContext context) {
        boolean verbose = context.hasFlag("verbose");
        boolean all = context.hasFlag("all");

        if (verbose) {
            // Verbose output
        }
    }
}
```

## SubCommands

### Command Collection

```java
public class AdminCommands extends AbstractCommandCollection {

    public AdminCommands() {
        super("admin", "Admin commands");

        addSubCommand(new KickSubCommand());
        addSubCommand(new BanSubCommand());
        addSubCommand(new MuteSubCommand());
    }
}

class KickSubCommand extends AbstractCommand {
    public KickSubCommand() {
        super("kick", "Kick a player");
        addRequiredArgument(new StringArgument("player", "Player to kick"));
    }

    @Override
    protected void acceptCall(CommandSender sender, ParserContext context) {
        String player = context.get("player");
        // Kick implementation
    }
}
```

Usage: `/admin kick PlayerName`

## Command Sender

### CommandSender Interface

```java
public interface CommandSender {
    void sendMessage(Message message);
    String getDisplayName();
    UUID getUuid();
    boolean hasPermission(String id);
    boolean hasPermission(String id, boolean def);
}
```

### Check Sender Type

```java
@Override
protected void acceptCall(CommandSender sender, ParserContext context) {
    if (sender instanceof PlayerSender) {
        PlayerSender player = (PlayerSender) sender;
        PlayerRef playerRef = player.getPlayerRef();
        // Player-specific logic
    } else if (sender instanceof ConsoleSender) {
        // Console-specific logic
    }
}
```

### ConsoleSender

```java
// Always has all permissions
ConsoleSender console = ConsoleSender.INSTANCE;
console.sendMessage(Message.of("Console message"));
```

## Permissions

### Automatic Permission Generation

By default, commands generate permission nodes from the plugin's base permission:

```java
// Plugin: com.example:MyPlugin
// Command: mycommand
// Generated permission: com.example.myplugin.mycommand
```

### Custom Permission

```java
public class ProtectedCommand extends AbstractCommand {

    public ProtectedCommand() {
        super("protected", "A protected command");
    }

    @Override
    protected String generatePermissionNode() {
        return "custom.permission.node";
    }

    @Override
    protected void acceptCall(CommandSender sender, ParserContext context) {
        // Only executed if sender has custom.permission.node
    }
}
```

### Disable Permission Check

```java
@Override
protected boolean canGeneratePermission() {
    return false;  // Anyone can use this command
}
```

### Manual Permission Check

```java
@Override
protected void acceptCall(CommandSender sender, ParserContext context) {
    if (!sender.hasPermission("special.action")) {
        sender.sendMessage(Message.of("You don't have permission!"));
        return;
    }
    // Continue with action
}
```

## Command Aliases

```java
public class TeleportCommand extends AbstractCommand {

    public TeleportCommand() {
        super("teleport", "Teleport to location");

        // Add aliases
        addAlias("tp");
        addAlias("warp");
    }
}
```

## Confirmation Required

For dangerous commands:

```java
public class ResetCommand extends AbstractCommand {

    public ResetCommand() {
        super("reset", "Reset all data", true);  // true = requires confirmation
    }

    @Override
    protected void acceptCall(CommandSender sender, ParserContext context) {
        // Only called after confirmation
        resetAllData();
    }
}
```

## Async Execution

Commands execute asynchronously on ForkJoinPool by default.

```java
@Override
protected void acceptCall(CommandSender sender, ParserContext context) {
    // This runs async
    CompletableFuture.supplyAsync(() -> {
        // Heavy computation
        return result;
    }).thenAccept(result -> {
        sender.sendMessage(Message.of("Result: " + result));
    });
}
```

## Messages

### Simple Message

```java
sender.sendMessage(Message.of("Hello World"));
```

### Formatted Message

```java
sender.sendMessage(Message.of("Player {0} has {1} health", playerName, health));
```

## Running Commands Programmatically

```java
// Single command
CommandManager.get().handleCommand(sender, "give Player stone 64");

// Multiple commands
Deque<String> commands = new ArrayDeque<>();
commands.add("command1");
commands.add("command2");
CommandManager.get().handleCommands(sender, commands);

// From console
CommandManager.get().handleCommand(ConsoleSender.INSTANCE, "stop");
```

## Built-in Commands

| Command | Description |
|---------|-------------|
| `help` | List available commands |
| `stop` | Stop the server |
| `kick <player>` | Kick a player |
| `plugin list` | List plugins |
| `plugin load/unload/reload <id>` | Manage plugins |
| `gamemode <mode>` | Change game mode |
| `give <player> <item> [amount]` | Give items |
| `tp <x> <y> <z>` | Teleport |

## Argument Types

| Type | Description |
|------|-------------|
| `StringArgument` | Text string |
| `IntegerArgument` | Integer with optional min/max |
| `DoubleArgument` | Double with optional min/max |
| `BooleanArgument` | true/false |
| `PlayerArgument` | Player selector |
| `WorldArgument` | World name |

## Best Practices

1. **Use descriptive help**: Good descriptions help users
2. **Validate input**: Check arguments before use
3. **Handle errors gracefully**: Send clear error messages
4. **Use permissions**: Protect sensitive commands
5. **Support tab completion**: Implement argument suggestions
6. **Keep it async-safe**: Commands run on worker threads
7. **Use subcommands**: Group related functionality
