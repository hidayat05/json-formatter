# Installing on macOS (Bypassing Gatekeeper / "Cannot Verify Developer")

When downloading and installing the unnotarized `.dmg` or `.app` installer on macOS, you may see the standard Gatekeeper error warning:
> **"Palugada" cannot be opened because Apple cannot verify it for malicious software.**
> *Or: "Palugada" is damaged and cannot be opened. You should move it to the Trash.*

This is macOS Gatekeeper's default security check for apps not downloaded from the Mac App Store or not signed and notarized with a registered Apple Developer Account.

Below are the solutions to bypass the Gatekeeper check locally, and how to configure official code signing for distribution.

---

## 1. Quick Workarounds (Bypass Gatekeeper Locally)

### Option A: The "Right-Click Open" (Recommended)
1. Drag **Palugada** to your `/Applications` folder.
2. Open `/Applications` in Finder.
3. Right-click (or Control-click) the **Palugada** app icon and choose **Open** from the context menu.
4. A warning dialog will appear, but this time it will contain an **Open** button. Click **Open**.
5. macOS will whitelist this app binary, and you won't be asked again.

### Option B: Terminal Command (Quarantine Removal)
If macOS refuses to open the app or claims it is "damaged", it is because the OS added a quarantine attribute on download. You can strip the quarantine flag using Terminal:

```bash
# Run this command in your terminal:
xattr -d com.apple.quarantine /Applications/Palugada.app
```

---

## 2. Official Solution: Configure Code Signing and Notarization

To distribute **Palugada** to other macOS users without causing Gatekeeper warning screens, you must sign and notarize the app using an **Apple Developer Account** (cost: $99/year).

Tauri v2 natively supports signing and notarization during `cargo tauri build`.

### Step 1: Set up Apple Certificates
1. Create a **Developer ID Application** certificate in your Apple Developer portal.
2. Install it in your macOS Keychain.

### Step 2: Configure `src-tauri/tauri.conf.json`
Add the following configuration inside the `"bundle"` property:

```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TeamID)",
      "entitlements": null,
      "exceptionDomain": null,
      "providerShortName": "YourProviderShortName"
    }
  }
}
```

### Step 3: Set Environment Variables for Notarization
Before running the build command, set these environment variables in your terminal shell or CI/CD runner:

```bash
# Your Apple ID email address
export APPLE_ID="developer@example.com"

# An app-specific password generated at appleid.apple.com
export APPLE_PASSWORD="abcd-efgh-ijkl-mnop"

# Your Apple Developer Team ID
export APPLE_TEAM_ID="TEAMID1234"
```

### Step 4: Build the Signed Installer
Run the build command:

```bash
cargo tauri build
```

Tauri will compile the code, sign all binaries, bundle them into `.app` and `.dmg`, upload them to Apple's notarization servers, wait for approval, and staple the notarization ticket to the final installer bundle automatically.
