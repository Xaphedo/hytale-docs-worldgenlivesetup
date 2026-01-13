---
title: Authentication
description: Configure server authentication modes for Hytale.
sidebar:
  order: 4
---

Hytale supports multiple authentication modes to accommodate different server use cases.

## Authentication Modes

### Authenticated Mode (Default)

Players must have valid Hytale accounts. This is the recommended mode for public servers:

```bash
java -jar HytaleServer.jar --assets ../HytaleAssets --auth-mode authenticated
```

**Features:**
- Account verification through Hytale authentication servers
- UUIDs are consistent and tied to player accounts
- Required for public-facing servers
- Best security against unauthorized access

### Offline Mode

No account verification. Use for private/LAN servers only:

```bash
java -jar HytaleServer.jar --assets ../HytaleAssets --auth-mode offline
```

**Features:**
- No internet connection required for authentication
- Players can join without Hytale accounts
- UUIDs are generated based on username (not consistent across servers)
- Suitable for private testing or LAN parties

:::caution
Offline mode allows anyone to join with any username. Do not use for public servers.
:::

### Insecure Mode

Similar to offline mode but with additional relaxed security. Only use for development:

```bash
java -jar HytaleServer.jar --assets ../HytaleAssets --auth-mode insecure
```

**Features:**
- All security checks disabled
- Useful for development and testing
- Never use in production

:::danger
Never use `insecure` mode on public servers. This mode disables important security features and exposes your server to attacks.
:::

## Operator Authentication

To authenticate as a server operator in authenticated mode, use the in-game command:

```
/auth login device
```

This initiates the OAuth 2.0 device authentication flow:

1. Run the command in-game
2. You'll receive a URL and code
3. Open the URL in a browser
4. Enter the code to authenticate
5. Your account is now linked as an operator

## Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Server    │────▶│ Hytale Auth │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │  1. Connect       │                   │
       │──────────────────▶│                   │
       │                   │  2. Verify Token  │
       │                   │──────────────────▶│
       │                   │                   │
       │                   │  3. Account Info  │
       │                   │◀──────────────────│
       │  4. Join Success  │                   │
       │◀──────────────────│                   │
```

## Command Line Options

| Option | Description |
|--------|-------------|
| `--auth-mode authenticated` | Require Hytale account (default) |
| `--auth-mode offline` | No authentication required |
| `--auth-mode insecure` | Development mode, all security disabled |

## Security Best Practices

1. **Always use authenticated mode for public servers**
2. **Keep server JARs updated** for security patches
3. **Use strong server passwords** when needed
4. **Monitor login attempts** through server logs
5. **Use firewalls** to restrict access to trusted IP ranges
