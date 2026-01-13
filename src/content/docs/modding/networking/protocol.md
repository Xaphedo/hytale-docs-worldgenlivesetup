---
title: Protocol & Packets
description: Understanding Hytale's networking protocol and packet handling.
sidebar:
  order: 1
---

The Hytale server uses a Netty-based networking layer supporting QUIC (UDP) and TCP transports.

## Wire Format

Each packet is framed with a header:

```
[4 bytes] Length (little-endian) - Payload size excluding header
[4 bytes] Packet ID (little-endian)
[...] Payload (may be Zstd-compressed)
```

### Key Characteristics

- **Byte Order**: Little-endian throughout
- **Compression**: Zstd for large packets
- **VarInt**: 7-bit encoding, max 5 bytes
- **Strings**: UTF-8 with VarInt length prefix
- **Transport**: QUIC (UDP) primary, TCP fallback
- **Max Payload**: 1,677,721,600 bytes

## Packet Structure

### Base Interface

```java
public interface Packet {
    int getId();
    void serialize(@Nonnull ByteBuf buffer);
    int computeSize();
}
```

### Example Implementation

```java
public class CustomPacket implements Packet {
    public static final int PACKET_ID = 999;
    private int fieldA;
    private String fieldB;

    @Override
    public int getId() { return PACKET_ID; }

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
}
```

## Packet I/O Utilities

### String Operations

```java
// Variable-length strings
String value = PacketIO.readVarString(buf, offset);
PacketIO.writeVarString(buf, value, 1024);

// Fixed-length strings (null-padded)
String fixed = PacketIO.readFixedAsciiString(buf, offset, 64);
PacketIO.writeFixedAsciiString(buf, ascii, 64);

// Size calculation
int byteLen = PacketIO.utf8ByteLength(str);
int totalSize = PacketIO.stringSize(str);
```

### UUID & Numeric Operations

```java
// UUIDs (16 bytes)
UUID uuid = PacketIO.readUUID(buf, offset);
PacketIO.writeUUID(buf, uuid);

// Half-precision floats
float half = PacketIO.readHalfLE(buf, index);
PacketIO.writeHalfLE(buf, value);

// Arrays
byte[] bytes = PacketIO.readByteArray(buf, offset, length);
short[] shorts = PacketIO.readShortArrayLE(buf, offset, length);
float[] floats = PacketIO.readFloatArrayLE(buf, offset, length);
```

### VarInt Encoding

```java
import com.hypixel.hytale.protocol.io.VarInt;

VarInt.write(buf, value);
int value = VarInt.read(buf);
int peeked = VarInt.peek(buf, index);
int size = VarInt.size(value);
```

## Packet Handlers

### Intercepting Packets

```java
import com.hypixel.hytale.server.core.io.adapter.PacketAdapters;

// Watch inbound packets
PacketFilter filter = PacketAdapters.registerInbound(
    (PlayerRef player, Packet packet) -> {
        if (packet instanceof SomePacket) {
            return shouldBlock(packet); // true to consume
        }
        return false;
    }
);

// Watch outbound packets
PacketAdapters.registerOutbound((player, packet) -> false);

// Cleanup
PacketAdapters.deregisterInbound(filter);
```

## Sending Packets

### Via IPacketReceiver

```java
IPacketReceiver receiver = /* player connection */;
receiver.write(packet);
receiver.writeNoCache(packet); // Skip caching
```

### Cached Packets (Broadcast)

```java
import com.hypixel.hytale.protocol.CachedPacket;

try (CachedPacket<MyPacket> cached = CachedPacket.cache(new MyPacket(data))) {
    for (IPacketReceiver player : players) {
        player.write(cached);
    }
}
```

## Packet Categories

| Category | Description |
|----------|-------------|
| `connection` | Connect/disconnect |
| `auth` | Authentication |
| `player` | Movement, input |
| `entities` | Entity updates |
| `world` | Chunks, blocks |
| `inventory` | Inventory ops |
| `interface_` | UI, chat |

## Validation

```java
public record ValidationResult(boolean isValid, @Nullable String error) {
    public static final ValidationResult OK = new ValidationResult(true, null);

    public static ValidationResult error(String message) {
        return new ValidationResult(false, message);
    }
}
```

### Protocol Exceptions

```java
throw new ProtocolException("Custom error message");
ProtocolException.arrayTooLong(fieldName, actual, max);
ProtocolException.bufferTooSmall(fieldName, required, available);
ProtocolException.invalidEnumValue(enumName, value);
```

## Best Practices

1. **Validate structure first** - Check buffer size before deserializing
2. **Use VarInt** - Efficient for small values
3. **Cache broadcast packets** - Use `CachedPacket` for efficiency
4. **Handle errors gracefully** - Invalid packets close connections
5. **Use little-endian** - All numeric fields
6. **Release cached packets** - Always close to avoid leaks
7. **Deregister filters** - Clean up in plugin shutdown
