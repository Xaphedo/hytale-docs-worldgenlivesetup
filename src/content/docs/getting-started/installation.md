---
title: Installation
description: Install Java and set up your Hytale server files.
sidebar:
  order: 2
---

This guide walks you through installing all prerequisites and setting up your Hytale dedicated server.

## Installing Java 25

Hytale servers require Java 25 or higher. We recommend using Adoptium (Temurin).

### Windows

1. Download the JDK installer from [Adoptium](https://adoptium.net/)
2. Select **Temurin 25** and **Windows x64**
3. Run the installer and follow the prompts
4. Ensure "Add to PATH" is selected during installation

### macOS

Using Homebrew:

```bash
brew install --cask temurin@25
```

Or download directly from [Adoptium](https://adoptium.net/) and run the installer.

### Linux

#### Ubuntu/Debian

```bash
# Add Adoptium repository
wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | sudo apt-key add -
echo "deb https://packages.adoptium.net/artifactory/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/adoptium.list

# Install Java 25
sudo apt update
sudo apt install temurin-25-jdk
```

#### Fedora/RHEL

```bash
sudo dnf install java-25-openjdk
```

### Verify Installation

Open a terminal and verify Java is installed correctly:

```bash
java -version
```

You should see output indicating Java 25 or higher.

## Getting Server Files

1. Locate your Hytale installation folder
2. Copy the **Server** folder to your desired server location
3. Note the path to your **HytaleAssets** folder (or copy it alongside the server)

Your server directory should contain:

```
my-server/
├── HytaleServer.jar
└── (config files will be generated on first run)

# Assets can be in a sibling directory or specified with --assets flag
../HytaleAssets/   # Default location the server looks for
```

## Launching the Server

### Basic Launch

Run the server with minimum and maximum memory allocation:

```bash
java -Xms4G -Xmx4G -jar HytaleServer.jar --assets ../HytaleAssets
```

- `-Xms4G` - Minimum memory (4GB)
- `-Xmx4G` - Maximum memory (4GB)
- `--assets` - Path to your assets directory or `.zip` file

### Command-Line Arguments

| Argument | Description |
|----------|-------------|
| `--assets <Path>` | Path to assets directory or `.zip` file (default: `../HytaleAssets`) |
| `-b, --bind <Address>` | Address and port to listen on, comma-separated for multiple (default: `0.0.0.0:5520`) |
| `--auth-mode <Mode>` | Authentication mode: `authenticated`, `offline`, or `insecure` |
| `--universe <Path>` | Path to the universe directory |
| `--mods <Paths>` | Comma-separated list of additional mod directories |
| `--backup` | Enable automatic backups |
| `--backup-dir <Path>` | Directory for backup files (required if `--backup` is set) |
| `--backup-frequency <Minutes>` | Backup interval in minutes (default: 30) |
| `--backup-max-count <Count>` | Maximum number of backups to keep (default: 5) |
| `--boot-command <Commands>` | Comma-separated commands to run on server start |
| `--help` | Print help message |
| `--version` | Print version information |

### Custom Port Example

To run on a different port:

```bash
java -Xms4G -Xmx4G -jar HytaleServer.jar --assets ../HytaleAssets --bind 0.0.0.0:25565
```

To bind to multiple addresses:

```bash
java -Xms4G -Xmx4G -jar HytaleServer.jar --assets ../HytaleAssets --bind 0.0.0.0:5520,0.0.0.0:5521
```

### Create a Start Script

#### Windows (start.bat)

```batch
@echo off
java -Xms4G -Xmx4G -jar HytaleServer.jar --assets ../HytaleAssets
pause
```

#### Linux/macOS (start.sh)

```bash
#!/bin/bash
java -Xms4G -Xmx4G -jar HytaleServer.jar --assets ../HytaleAssets
```

Make it executable:

```bash
chmod +x start.sh
```

## Firewall Configuration

Hytale uses **UDP** (not TCP) with the **QUIC protocol**.

### Windows Firewall

```powershell
netsh advfirewall firewall add rule name="Hytale Server" dir=in action=allow protocol=UDP localport=5520
```

### Linux (UFW)

```bash
sudo ufw allow 5520/udp
```

### Linux (firewalld)

```bash
sudo firewall-cmd --permanent --add-port=5520/udp
sudo firewall-cmd --reload
```

## Port Forwarding

If hosting behind a router/NAT:

1. Access your router's admin panel (usually `192.168.1.1`)
2. Find Port Forwarding settings
3. Create a new rule:
   - **Protocol**: UDP
   - **External Port**: 5520
   - **Internal Port**: 5520
   - **Internal IP**: Your server's local IP address

## First Run

On first launch, the server will:

1. Generate default configuration files
2. Create the `universe/worlds/` directory structure
3. Start listening for connections

You'll see output like:

```
[INFO] Loading assets from Assets.zip
[INFO] Server started on 0.0.0.0:5520
[INFO] Ready for connections
```

## Connecting to Your Server

- **Local**: Connect to `localhost:5520`
- **LAN**: Connect to your machine's local IP (e.g., `192.168.1.100:5520`)
- **Internet**: Connect to your public IP or domain name

## Next Steps

Your server is now running! Continue with [Server Configuration](/getting-started/project-setup/) to customize your server settings.
