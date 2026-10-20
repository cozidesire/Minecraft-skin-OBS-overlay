# Minecraft Skins Overlay: setup

Windows setup for an OBS Browser source that displays Minecraft Java skins as slowly rising 3D characters. Keep this folder in a permanent location; the examples below use `C:\Overlays\Minecraft-skins-Overlay`. Replace that path with your actual folder path everywhere

## 1. Extract and build the skins

Put one Minecraft username per line in `names.txt`. Open PowerShell in the `Minecraft-skins-Overlay` folder and run:

```powershell
.\extract-skins.ps1
.\generate-skins.ps1
```

The first script clears `images-examples` and re-downloads **every** name's current skin; the second rebuilds `skins.generated.js`. Keep wanted usernames in `names.txt`, since the next extraction removes any PNGs added manually

## 2. Add the OBS source

Add a **Browser** source named `Minecraft Skin Overlay`. Enable **Local file** and select `C:\Overlays\Minecraft-skins-Overlay\index.html` (using your actual path). Set its width and height to your OBS canvas size, leave Custom CSS empty, and place it above your game capture. The background is transparent. [OBS Browser Source help](https://obsproject.com/kb/browser-source)

## 3. Set up the Streamer.bot chat command

1. Connect your broadcaster account under **Platforms → Twitch → Accounts**. For automatic OBS refresh, enable OBS WebSocket and connect it under **Stream Apps → OBS** in Streamer.bot (same-PC host `127.0.0.1`, usually port `4455`, plus your OBS WebSocket password). [Twitch setup](https://docs.streamer.bot/guide/platforms/twitch/) · [OBS setup](https://docs.streamer.bot/guide/stream-apps/obs-studio)
2. Under **Actions & Queues → Queues**, create a **Blocking** queue named `Skin updates`. This prevents two requests from clearing `images-examples` at the same time
3. Under **Commands**, add an enabled command with Source **Twitch Message** and Mode **Regex**. Use `^!skin (?<minecraftName>[A-Za-z0-9_]{3,16})$`. Choose who can use it and set a global cooldown (for example, 300 seconds). Viewers can then send `!skin geilo_11`; the name becomes `%minecraftName%`. [Command help](https://docs.streamer.bot/guide/core/commands)
4. Under **Actions**, create `Add Minecraft skin`, assign it to the `Skin updates` queue, disable **Concurrent**, and add a **Core → Commands → Command Triggered** trigger for that command
5. Add these sub-actions **in order**, replacing `C:\Overlays\Minecraft-skins-Overlay` with your actual full folder path:

   | Order | Sub-action | Settings |
   | --- | --- | --- |
   | 1 | **Core → File I/O → Write To File** | File: `C:\Overlays\Minecraft-skins-Overlay\names.txt`; **Append to file** on; text: `%lf%%minecraftName%` |
   | 2 | **Core → System → Run a Program** | Command: `powershell.exe`; Working Directory: project folder; Arguments: `-NoProfile -ExecutionPolicy Bypass -File "C:\Overlays\Minecraft-skins-Overlay\extract-skins.ps1"`; **Wait for Exit**: `600` seconds |
   | 3 | **Core → System → Run a Program** | Same as above, but use `generate-skins.ps1`; **Wait for Exit**: `30` seconds |
   | 4 | **OBS Studio → Raw** | Send the JSON below to refresh the Browser source (optional if you don't mind refreshing it yourself) |

   `%lf%` starts a new line even if `names.txt` doesn't have a trailing newline. Increase the wait time if a large name list takes longer to process. [File action](https://docs.streamer.bot/api/sub-actions/core/file-io/write-to-file/) · [Program action](https://docs.streamer.bot/api/sub-actions/core/system/run-a-program)

```json
{
  "requestType": "PressInputPropertiesButton",
  "requestData": {
    "inputName": "Minecraft Skin Overlay",
    "propertyName": "refreshnocache"
  }
}
```

### -If you gave the OBS source a different name, change `inputName` too ///
### -Without the OBS Raw step, manually use **Refresh cache of current page** on the Browser source after updates ///
#
#
##  TEST

With OBS and Streamer.bot running, send `!skin geilo_11` in Twitch chat. Check that it appears on its own line in `names.txt`, `images-examples\geilo_11.png` exists, `skins.generated.js` is updated, and OBS shows the skin. If something fails, check **Actions & Queues → Action History** in Streamer.bot. A failed download leaves the name in `names.txt` for the next run, but the overlay may temporarily show fewer skins because extraction clears the folder first

To adjust the animation, edit the values at the top of `overlay.js` in CONFIG, you can change speed, size and other settings :)
#
<div align="center">
  <img src="https://cdn.7tv.app/emote/01GYQB78R800087CVEGR4KSP6M/4x.avif" alt="Alt text">
</div>