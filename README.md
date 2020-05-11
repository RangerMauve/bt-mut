# bt-mut
Sync folders with mutable Bittorrent links

Run it with npx

```
npx bt-mut --help
```

## tl;dr

Run `npx bt-mut` to turn your current folder into a torrent and get a magnet.
You can re-run the command on your folder to update it.
Run `npx bt-mut magnet:?xs=whatever` to sync a torrent into a local folder.
You can re-run the command to get updates.
After the initial sync you can also run `npx bt-mut` without arguments since the magnet URL is being saved in a `.bt` file.

## CLI Help Output

```
bit-sync [torrent]

Sync your folder with a torrent

Positionals:
  torrent  A magnet link for a torrent                                  [string]

Options:
  --version         Show version number                                [boolean]
  --help            Show help                                          [boolean]
  --path, -p        Where to sync the torrent. Defaults to current path
                           [string] [default: "/home/mauve/programming/bt-mut"]
  --secret-storage  The location that secrets should be stored in. Defaults to
                    user folder
```
