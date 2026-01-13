---
title: Networking & Protocol
description: Understanding Hytale's networking layer and packet handling.
sidebar:
  order: 7
---

The Hytale server uses a sophisticated networking layer based on Netty with support for both QUIC (UDP) and TCP transports.

## Protocol Overview

### Wire Format

Each packet is framed with a header:

```
[4 bytes] Length (little-endian) - Payload size excluding header
[4 bytes] Packet ID (little-endian)
[...] Payload (may be Zstd-compressed)
```

The frame header is defined by `PacketIO.FRAME_HEADER_SIZE = 4`.

### Key Characteristics

- **Byte Order**: Little-endian throughout (all `LE` suffixed methods)
- **Compression**: Zstd for large packets (configurable level)
- **Variable-Length Integers**: 7-bit encoding (VarInt), max 5 bytes
- **String Encoding**: UTF-8 with VarInt length prefix, or fixed-length ASCII
- **Transport**: QUIC (UDP) primary, TCP fallback
- **Max Payload**: 1,677,721,600 bytes (0x64000000)

## Packet Structure

### Base Packet Interface

```java
package com.hypixel.hytale.protocol;

public interface Packet {
    int getId();
    void serialize(@Nonnull ByteBuf buffer);
    int computeSize();
}
```

### Example Packet Implementation

```java
import com.hypixel.hytale.protocol.Packet;
import com.hypixel.hytale.protocol.io.PacketIO;
import io.netty.buffer.ByteBuf;
import javax.annotation.Nonnull;

public class CustomPacket implements Packet {
    public static final int PACKET_ID = 999;

    private int fieldA;
    private String fieldB;

    @Override
    public int getId() {
        return PACKET_ID;
    }

    @Override
    public void serialize(@Nonnull ByteBuf buf) {
        buf.writeIntLE(fieldA);
        PacketIO.writeVarString(buf, fieldB, 1024);
    }

    @Override
    public int computeSize() {
        return 4 + PacketIO.stringSize(fieldB);
    }

    public static CustomPacket deserialize(@Nonnull ByteBuf buf, int offset) {
        CustomPacket packet = new CustomPacket();
        packet.fieldA = buf.getIntLE(offset);
        packet.fieldB = PacketIO.readVarString(buf, offset + 4);
        return packet;
    }

    public static ValidationResult validateStructure(@Nonnull ByteBuf buf, int offset) {
        if (buf.readableBytes() - offset < 4) {
            return ValidationResult.error("Buffer too small");
        }
        return ValidationResult.OK;
    }
}
```

## Packet I/O Utilities

The `PacketIO` class provides static methods for reading/writing protocol data types.

### String Operations

```java
import com.hypixel.hytale.protocol.io.PacketIO;

// Read variable-length UTF-8 string (VarInt prefix + bytes)
String value = PacketIO.readVarString(buf, offset);

// Read variable-length ASCII string
String ascii = PacketIO.readVarAsciiString(buf, offset);

// Write variable-length string with max byte length
PacketIO.writeVarString(buf, value, 1024);
PacketIO.writeVarAsciiString(buf, value, 256);

// Fixed-length strings (null-padded)
String ascii = PacketIO.readFixedAsciiString(buf, offset, 64);
String utf8 = PacketIO.readFixedString(buf, offset, 64);
PacketIO.writeFixedAsciiString(buf, ascii, 64);
PacketIO.writeFixedString(buf, utf8, 64);

// Calculate UTF-8 byte length and total size (including VarInt prefix)
int byteLen = PacketIO.utf8ByteLength(str);
int totalSize = PacketIO.stringSize(str);  // VarInt.size(byteLen) + byteLen
```

### UUID Operations

UUIDs are stored as 16 bytes (two longs):

```java
// Read UUID (16 bytes) - big-endian longs
UUID uuid = PacketIO.readUUID(buf, offset);

// Write UUID
PacketIO.writeUUID(buf, uuid);
```

### Numeric Operations

```java
// Half-precision floats (2 bytes, little-endian)
float half = PacketIO.readHalfLE(buf, index);
PacketIO.writeHalfLE(buf, value);

// Byte arrays
byte[] bytes = PacketIO.readBytes(buf, offset, length);
byte[] array = PacketIO.readByteArray(buf, offset, length);
PacketIO.writeFixedBytes(buf, data, length);

// Short arrays (little-endian)
short[] shorts = PacketIO.readShortArrayLE(buf, offset, length);

// Float arrays (little-endian)
float[] floats = PacketIO.readFloatArrayLE(buf, offset, length);
```

### VarInt Encoding

Variable-length integers use 7-bit encoding with continuation bit:

```java
import com.hypixel.hytale.protocol.io.VarInt;

// Write variable-length integer (non-negative only)
VarInt.write(buf, value);

// Read variable-length integer (advances reader index)
int value = VarInt.read(buf);

// Peek at value without advancing reader index
int value = VarInt.peek(buf, index);

// Get byte length of VarInt at index
int length = VarInt.length(buf, index);

// Calculate encoded size for a value
int size = VarInt.size(value);
// Returns: 1 for 0-127, 2 for 128-16383, 3 for 16384-2097151, etc.
// Maximum: 5 bytes for values up to 2^28-1
```

## Packet Handlers

### Intercepting Packets

Use `PacketAdapters` to intercept inbound and outbound packets:

```java
import com.hypixel.hytale.server.core.io.adapter.PacketAdapters;
import com.hypixel.hytale.server.core.io.adapter.PacketFilter;
import com.hypixel.hytale.server.core.io.adapter.PlayerPacketWatcher;
import com.hypixel.hytale.server.core.io.adapter.PlayerPacketFilter;

// Watch inbound packets (PlayerPacketWatcher - no filtering)
PacketFilter registration = PacketAdapters.registerInbound(
    (PlayerRef player, Packet packet) -> {
        // Monitor packet - cannot prevent processing
        if (packet instanceof SomePacket) {
            // Log or record
        }
    }
);

// Filter inbound packets (PlayerPacketFilter - can block)
PacketFilter filter = PacketAdapters.registerInbound(
    (PlayerRef player, Packet packet) -> {
        if (packet instanceof SomePacket) {
            // Return true to consume (prevent further processing)
            // Return false to allow normal handling
            return shouldBlock(packet);
        }
        return false;
    }
);

// Watch/filter outbound packets
PacketAdapters.registerOutbound((player, packet) -> {
    // Monitor or filter outgoing packets
    return false;
});

// Deregister when done
PacketAdapters.deregisterInbound(filter);
PacketAdapters.deregisterOutbound(filter);
```

### Internal Packet Handling

The `__handleInbound` and `__handleOutbound` methods are called by packet handlers:

```java
// Returns true if packet was consumed by a filter
if (!PacketAdapters.__handleInbound(packetHandler, packet)) {
    // Normal packet processing
    handler.handle(packet);
}
```

## Sending Packets

### Via IPacketReceiver

The `IPacketReceiver` interface is implemented by player connections:

```java
import com.hypixel.hytale.server.core.receiver.IPacketReceiver;

IPacketReceiver receiver = /* player connection */;

// Send packet (uses internal caching for efficiency)
receiver.write(packet);

// Send packet without caching (for one-off packets)
receiver.writeNoCache(packet);
```

### Cached Packets

For broadcasting the same packet to multiple clients, use `CachedPacket` to avoid re-serialization:

```java
import com.hypixel.hytale.protocol.CachedPacket;

// Cache serialized packet (implements AutoCloseable)
CachedPacket<MyPacket> cached = CachedPacket.cache(new MyPacket(data));

try {
    // Send to multiple players efficiently
    for (IPacketReceiver player : players) {
        player.write(cached);
    }
} finally {
    // Release buffer when done
    cached.close();
}

// Or use try-with-resources
try (CachedPacket<MyPacket> cached = CachedPacket.cache(new MyPacket(data))) {
    for (IPacketReceiver player : players) {
        player.write(cached);
    }
}

// CachedPacket properties
int size = cached.getCachedSize();
Class<MyPacket> type = cached.getPacketType();
```

## Packet Categories

The protocol includes 354+ packet types organized into categories:

| Category | Description |
|----------|-------------|
| `connection` | Connect/disconnect handling |
| `auth` | Authentication packets |
| `player` | Movement, input, state |
| `entities` | Entity updates, animations |
| `world` | Chunks, blocks, world state |
| `assets` | Asset management |
| `inventory` | Inventory operations |
| `interface_` | UI, chat, notifications |
| `window` | Window/UI interactions |
| `interaction` | NPC/entity interactions |
| `buildertools` | Builder tool operations |
| `camera` | Camera control |
| `worldmap` | World map updates |

## Common Packet Examples

### Connection Packet (ID 0)

```java
// Fields:
String protocolHash;      // 64-byte fixed ASCII
ClientType clientType;    // Game/Editor/etc
UUID uuid;
String language;          // optional VarString
String identityToken;     // optional VarString
String username;          // max 16 chars VarString
byte[] referralData;      // optional
```

### Client Movement Packet (ID 108)

```java
// Fields (all optional via nullable bitmap):
MovementStates movementStates;
HalfFloatPosition relativePosition;
Position absolutePosition;
Direction bodyOrientation;
Direction lookOrientation;
TeleportAck teleportAck;
Position wishMovement;
Vector3d velocity;
int mountedTo;
MovementStates riderMovementStates;
```

### SetChunk Packet (ID 131)

```java
// Compressed packet
int x, y, z;              // 4 bytes each (little-endian)
byte[] localLight;        // optional, max 4MB
byte[] globalLight;       // optional, max 4MB
byte[] data;              // optional, max 4MB
```

## Validation

### ValidationResult

```java
public record ValidationResult(boolean isValid, @Nullable String error) {
    public static final ValidationResult OK = new ValidationResult(true, null);

    public static ValidationResult error(String message) {
        return new ValidationResult(false, message);
    }

    public void throwIfInvalid() {
        if (!isValid) {
            throw new ProtocolException(error);
        }
    }
}
```

### Protocol Exceptions

The `ProtocolException` class provides factory methods for common errors:

```java
import com.hypixel.hytale.protocol.io.ProtocolException;

// Throw on validation failures
throw new ProtocolException("Custom error message");

// Factory methods for common cases
ProtocolException.arrayTooLong(fieldName, actual, max);
ProtocolException.stringTooLong(fieldName, actual, max);
ProtocolException.bufferTooSmall(fieldName, required, available);
ProtocolException.negativeLength(fieldName, value);
ProtocolException.unknownPolymorphicType(typeName, typeId);
ProtocolException.invalidEnumValue(enumName, value);
```

## Connection Management

### Protocol Utilities

```java
// Application-level error codes
int APPLICATION_NO_ERROR = 0;
int APPLICATION_RATE_LIMITED = 1;
int APPLICATION_AUTH_FAILED = 2;
int APPLICATION_INVALID_VERSION = 3;

// Close connection
ProtocolUtil.closeConnection(channel);  // Protocol violation
ProtocolUtil.closeConnection(channel, QuicTransportError.PROTOCOL_VIOLATION);
ProtocolUtil.closeApplicationConnection(channel);  // Application-level close
```

## Compression

Large packets use Zstd compression. Compression is handled automatically by `PacketIO.writeFramedPacket`:

```java
// Compression level configurable via system property
// Default: Zstd.defaultCompressionLevel()
// -Dhytale.protocol.compressionLevel=3

// Max payload size (compressed or uncompressed)
// 1,677,721,600 bytes (0x64000000)
```

The `PacketRegistry.PacketInfo` contains a `compressed` flag indicating whether a packet type uses compression.

## Best Practices

1. **Validate structure first** - Always validate buffer size before deserializing
2. **Use VarInt for variable data** - More efficient than fixed sizes for small values
3. **Compress large packets** - Register packet types with `compressed=true`
4. **Cache broadcast packets** - Use `CachedPacket` for efficiency when sending to multiple players
5. **Handle errors gracefully** - Invalid packets close connections via `ProtocolException`
6. **Respect size limits** - Check `maxSize` in packet registration
7. **Use little-endian** - All numeric fields use little-endian byte order
8. **Release cached packets** - Always close `CachedPacket` instances to avoid memory leaks
9. **Deregister packet filters** - Clean up `PacketAdapters` registrations in plugin shutdown
