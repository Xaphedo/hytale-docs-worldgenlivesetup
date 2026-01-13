---
title: Networking
description: Networking and protocol documentation for Hytale plugin development.
slug: modding/networking
sidebar:
  order: 4
---

This section covers Hytale's networking layer and packet handling system.

## Overview

The Hytale server uses a sophisticated networking layer based on Netty with support for both QUIC (UDP) and TCP transports. The protocol uses little-endian byte order, Zstd compression for large packets, and variable-length integer encoding.

## In This Section

- [Protocol & Packets](./protocol/) - Wire format, packet structure, and I/O utilities

## Quick Reference

### Wire Format

```
[4 bytes] Length (little-endian)
[4 bytes] Packet ID (little-endian)
[...] Payload (may be Zstd-compressed)
```

### Key Characteristics

| Feature | Description |
|---------|-------------|
| Byte Order | Little-endian throughout |
| Compression | Zstd for large packets |
| VarInt | 7-bit encoding, max 5 bytes |
| Strings | UTF-8 with VarInt length prefix |
| Transport | QUIC (UDP) primary, TCP fallback |
| Max Payload | ~1.6GB |

### Packet Interface

```java
public interface Packet {
    int getId();
    void serialize(@Nonnull ByteBuf buffer);
    int computeSize();
}
```

### Intercepting Packets

```java
// Watch inbound packets
PacketFilter reg = PacketAdapters.registerInbound(
    (PlayerRef player, Packet packet) -> {
        // Monitor or filter
        return false; // true to consume
    }
);

// Cleanup
PacketAdapters.deregisterInbound(reg);
```
