---
title: Server Configuration
description: Configure your Hytale server settings and world options.
sidebar:
  order: 3
---

This guide covers configuring your Hytale server after the initial setup.

## Configuration Files

After first launch, your server generates several configuration files:

```
my-server/
├── HytaleServer.jar
├── config.json              # Main server configuration
└── universe/
    └── worlds/
        └── default/
            └── config.json  # World-specific settings
```

## Server Configuration (config.json)

The main `config.json` file controls server-wide settings:

```json
{
  "ServerName": "Hytale Server",
  "MOTD": "",
  "Password": "",
  "MaxPlayers": 100,
  "MaxViewRadius": 32,
  "LocalCompressionEnabled": false,
  "Defaults": {
    "World": "default",
    "GameMode": "Adventure"
  },
  "ConnectionTimeouts": {
    "InitialTimeout": "PT10S",
    "AuthTimeout": "PT30S",
    "PlayTimeout": "PT1M"
  },
  "RateLimit": {
    "Enabled": true,
    "PacketsPerSecond": 2000,
    "BurstCapacity": 500
  }
}
```

### Key Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `ServerName` | string | `"Hytale Server"` | Display name for your server |
| `MOTD` | string | `""` | Message of the day shown to players |
| `Password` | string | `""` | Server password (empty for no password) |
| `MaxPlayers` | integer | `100` | Maximum concurrent players |
| `MaxViewRadius` | integer | `32` | Maximum view radius in chunks |
| `LocalCompressionEnabled` | boolean | `false` | Enable local network compression |
| `Defaults.World` | string | `"default"` | Default world players spawn in |
| `Defaults.GameMode` | string | `"Adventure"` | Default game mode for new players |

## World Configuration

Each world has its own `config.json` in `universe/worlds/<worldname>/`:

```json
{
  "UUID": "generated-uuid-here",
  "DisplayName": "My World",
  "Seed": 1234567890,
  "WorldGen": {
    "Type": "Hytale"
  },
  "ChunkStorage": {
    "Type": "Region"
  },
  "IsTicking": true,
  "IsBlockTicking": true,
  "IsPvpEnabled": false,
  "IsFallDamageEnabled": true,
  "IsGameTimePaused": false,
  "GameTime": "1970-01-01T05:30:00Z",
  "GameMode": "Adventure",
  "IsSpawningNPC": true,
  "IsSpawnMarkersEnabled": true,
  "IsSavingPlayers": true,
  "IsSavingChunks": true,
  "IsUnloadingChunks": true,
  "GameplayConfig": "Default"
}
```

### World Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `UUID` | string | auto-generated | Unique identifier for this world |
| `DisplayName` | string | null | Player-facing name of the world |
| `Seed` | long | current time | World generation seed |
| `WorldGen.Type` | string | `"Hytale"` | World generator type |
| `ChunkStorage.Type` | string | `"Region"` | Chunk storage system type |
| `IsTicking` | boolean | `true` | Whether chunks in this world tick |
| `IsBlockTicking` | boolean | `true` | Whether blocks in this world tick |
| `IsPvpEnabled` | boolean | `false` | Allow player vs player combat |
| `IsFallDamageEnabled` | boolean | `true` | Players take fall damage |
| `IsGameTimePaused` | boolean | `false` | Whether game time is paused |
| `GameTime` | ISO-8601 | `"1970-01-01T05:30:00Z"` | Current time of day (affects day/night cycle) |
| `GameMode` | string | inherits from server | Default game mode for this world |
| `IsSpawningNPC` | boolean | `true` | Whether NPCs can spawn |
| `IsSpawnMarkersEnabled` | boolean | `true` | Whether spawn markers are enabled |
| `IsSavingPlayers` | boolean | `true` | Whether player data is saved |
| `IsSavingChunks` | boolean | `true` | Whether chunk data is saved to disk |
| `IsUnloadingChunks` | boolean | `true` | Whether chunks can be unloaded |
| `GameplayConfig` | string | `"Default"` | Gameplay configuration to use |

## Memory Configuration

Allocate appropriate memory based on your player count:

| Players | Recommended RAM |
|---------|-----------------|
| 1-10 | 4GB |
| 10-20 | 6GB |
| 20-50 | 8GB |
| 50+ | 12GB+ |

Example for a larger server:

```bash
java -Xms8G -Xmx8G -jar HytaleServer.jar --assets ../HytaleAssets
```

## Backup Configuration

Enable automatic backups with command-line arguments:

```bash
java -Xms4G -Xmx4G -jar HytaleServer.jar \
  --assets ../HytaleAssets \
  --backup \
  --backup-dir ./backups \
  --backup-frequency 30 \
  --backup-max-count 5
```

This creates backups every 30 minutes in the `./backups` directory, keeping up to 5 backups.

## Authentication Modes

### Authenticated Mode (Default)

Players must have valid Hytale accounts. This is the recommended mode for public servers:

```bash
java -jar HytaleServer.jar --assets ../HytaleAssets --auth-mode authenticated
```

To authenticate as a server operator, use the in-game command:

```
/auth login device
```

This initiates OAuth 2.0 device authentication flow.

### Offline Mode

No account verification. Use for private/LAN servers only:

```bash
java -jar HytaleServer.jar --assets ../HytaleAssets --auth-mode offline
```

### Insecure Mode

Similar to offline mode but with additional relaxed security. Only use for development:

```bash
java -jar HytaleServer.jar --assets ../HytaleAssets --auth-mode insecure
```

:::caution
Never use `insecure` mode on public servers. This mode disables important security features.
:::

## Performance Tuning

### JVM Arguments

For better garbage collection performance:

```bash
java -Xms4G -Xmx4G \
  -XX:+UseG1GC \
  -XX:+ParallelRefProcEnabled \
  -XX:MaxGCPauseMillis=200 \
  -jar HytaleServer.jar --assets ../HytaleAssets
```

### View Distance

Adjust maximum view radius in `config.json` to balance performance:

```json
{
  "MaxViewRadius": 32
}
```

Lower values improve performance but reduce the visible area for players. The default of 32 chunks provides a good balance for most servers.

## Running as a Service

### Linux (systemd)

Create `/etc/systemd/system/hytale.service`:

```ini
[Unit]
Description=Hytale Server
After=network.target

[Service]
User=hytale
WorkingDirectory=/opt/hytale
ExecStart=/usr/bin/java -Xms4G -Xmx4G -jar HytaleServer.jar --assets ../HytaleAssets
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable hytale
sudo systemctl start hytale
```

View logs:

```bash
sudo journalctl -u hytale -f
```

### Windows Service

Use tools like NSSM (Non-Sucking Service Manager) to run as a Windows service:

```powershell
# Install NSSM and configure the service
nssm install HytaleServer "C:\Program Files\Java\jdk-25\bin\java.exe"
nssm set HytaleServer AppParameters "-Xms4G -Xmx4G -jar HytaleServer.jar --assets ..\HytaleAssets"
nssm set HytaleServer AppDirectory "C:\hytale-server"
nssm start HytaleServer
```

## Next Steps

Learn about [Server Commands](/core-concepts/commands/) to manage your server.
