---
title: Server Settings
description: Configure main server settings in config.json.
sidebar:
  order: 2
---

The main `config.json` file controls server-wide settings.

## Configuration File

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

## Server Identity

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `ServerName` | string | `"Hytale Server"` | Display name for your server |
| `MOTD` | string | `""` | Message of the day shown to players |
| `Password` | string | `""` | Server password (empty for no password) |

## Player Limits

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `MaxPlayers` | integer | `100` | Maximum concurrent players |
| `MaxViewRadius` | integer | `32` | Maximum view radius in chunks |

## Default Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `Defaults.World` | string | `"default"` | Default world players spawn in |
| `Defaults.GameMode` | string | `"Adventure"` | Default game mode for new players |

## Network Settings

### Compression

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `LocalCompressionEnabled` | boolean | `false` | Enable compression for local network |

:::note
Compression is typically only beneficial for remote connections. Keep disabled for LAN servers.
:::

### Connection Timeouts

Connection timeouts use ISO-8601 duration format:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `InitialTimeout` | duration | `PT10S` | Initial connection timeout (10 seconds) |
| `AuthTimeout` | duration | `PT30S` | Authentication timeout (30 seconds) |
| `PlayTimeout` | duration | `PT1M` | Play session timeout (1 minute) |

### Rate Limiting

Rate limiting protects against packet flooding:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `RateLimit.Enabled` | boolean | `true` | Enable rate limiting |
| `RateLimit.PacketsPerSecond` | integer | `2000` | Max packets per second |
| `RateLimit.BurstCapacity` | integer | `500` | Burst capacity allowance |

:::caution
Disabling rate limiting can expose your server to denial-of-service attacks.
:::

## ISO-8601 Duration Format

Duration values use the ISO-8601 format:
- `PT10S` = 10 seconds
- `PT30S` = 30 seconds  
- `PT1M` = 1 minute
- `PT5M` = 5 minutes
- `PT1H` = 1 hour
