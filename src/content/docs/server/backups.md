---
title: Backup Configuration
description: Configure automatic backups for your Hytale server.
sidebar:
  order: 7
---

Protect your server data with automatic backups.

## Command Line Options

Enable automatic backups with command-line arguments:

```bash
java -Xms4G -Xmx4G -jar HytaleServer.jar \
  --assets ../HytaleAssets \
  --backup \
  --backup-dir ./backups \
  --backup-frequency 30 \
  --backup-max-count 5
```

## Backup Options

| Option | Description | Default |
|--------|-------------|---------|
| `--backup` | Enable automatic backups | disabled |
| `--backup-dir <path>` | Backup directory | `./backups` |
| `--backup-frequency <minutes>` | Minutes between backups | 30 |
| `--backup-max-count <count>` | Maximum backups to keep | 5 |

## Example Configurations

### Frequent Backups (High Activity Server)

```bash
java -Xms4G -Xmx4G -jar HytaleServer.jar \
  --assets ../HytaleAssets \
  --backup \
  --backup-dir ./backups \
  --backup-frequency 15 \
  --backup-max-count 10
```

Backs up every 15 minutes, keeps last 10 backups (2.5 hours of history).

### Hourly Backups (Low Activity Server)

```bash
java -Xms4G -Xmx4G -jar HytaleServer.jar \
  --assets ../HytaleAssets \
  --backup \
  --backup-dir ./backups \
  --backup-frequency 60 \
  --backup-max-count 24
```

Backs up every hour, keeps last 24 backups (24 hours of history).

### Extended History

```bash
java -Xms4G -Xmx4G -jar HytaleServer.jar \
  --assets ../HytaleAssets \
  --backup \
  --backup-dir /mnt/backup-drive/hytale \
  --backup-frequency 30 \
  --backup-max-count 48
```

Backs up every 30 minutes to external drive, keeps 48 backups (24 hours of history).

## Backup Contents

Backups include:
- `universe/` directory (all worlds)
- Player data
- World configurations
- Chunk data

## Manual Backup

For manual backups, stop the server and copy:

```bash
# Stop server first, then:
cp -r universe/ backups/manual-backup-$(date +%Y%m%d-%H%M%S)/
```

## Restore from Backup

1. Stop the server
2. Replace the `universe/` directory with backup
3. Start the server

```bash
# Stop server
sudo systemctl stop hytale

# Restore backup
rm -rf universe/
cp -r backups/backup-20240101-120000/universe .

# Start server
sudo systemctl start hytale
```

## Best Practices

1. **Test restores regularly** - Verify backups work
2. **Store off-site copies** - Protect against hardware failure
3. **Monitor disk space** - Ensure room for backups
4. **Document backup schedule** - Know your recovery point
5. **Automate notifications** - Alert on backup failures

## External Backup Solutions

Consider combining with:
- **Cloud storage** (AWS S3, Google Cloud Storage)
- **Rsync** to remote servers
- **Scheduled cron jobs** for additional copies
- **RAID storage** for redundancy
