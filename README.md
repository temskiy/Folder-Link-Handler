# Folder Link Handler

A powerful Obsidian plugin that adds advanced support for folder and file links. Navigate to folders in the file tree, open them in the system explorer, use path autocompletion, customize link colors, and much more.

## Features

- 📂 Navigate to folders in the file tree with automatic expansion
- 🗂️ Open folders in the system explorer (desktop only)
- 📄 Open files with external programs (desktop only)
- ✨ Path autocompletion in the editor
- 🎨 Custom colors for folder and file links
- 🔴 Broken link indicators with detailed tooltips
- 🔧 Path modification rules using regular expressions
- 📝 Both Markdown and Wiki syntax support
- 🔗 Multiple links in one line with correct click handling
- 🌍 Russian and English interface with auto-detection
- 💾 Settings import/export
- 📱 Mobile-compatible (with some limitations)
- ⌨️ Modifier keys support (Ctrl+click)
- 🧩 Customizable protocol prefix

## Installation

### Manual Installation

1. **Locate your vault folder.** This is the directory where your Obsidian notes are stored. For example:
   - Windows: `C:\Users\YourName\Documents\MyVault`
   - macOS: `/Users/YourName/Documents/MyVault`
   - Linux: `/home/YourName/Documents/MyVault`

2. **Open the hidden `.obsidian` folder** inside your vault. If it doesn't exist, create it.

3. **Find or create the `plugins` folder** inside `.obsidian`.

4. **Create a new folder** inside `plugins` with the name `folder-link-handler`.

5. **Copy the plugin files** into the `folder-link-handler` folder:
   - `main.js`
   - `manifest.json`

6. **Reload Obsidian.** You can do this by pressing `Ctrl+P` and typing "Reload app without saving", or by restarting Obsidian completely.

7. **Enable the plugin.** Go to Settings → Community plugins → Installed plugins → Find "Folder Link Handler" → Toggle it on.

### File Structure

After installation, your folder structure should look like this:

```
MyVault/
└── .obsidian/
    └── plugins/
        └── folder-link-handler/
            ├── main.js
            └── manifest.json
```

## Usage

### Link Formats

The plugin uses a customizable protocol prefix (default: `folder`) to identify folder links.

**Markdown format:**

```markdown
[My Folder](<folder:/path/from/vault/root>)
[My Folder](<folder:./relative/path>)
[My Folder](<folder:../parent/folder>)
```

**Wiki format:**

```markdown
[[folder:/path/from/vault/root|My Folder]]
[[folder:./relative/path|My Folder]]
```

**File links (open in external program):**

```markdown
[Document](<file-ext:/path/to/file.pdf>)
[Document](<file-ext:./document.pdf>)
```

### Important: Angle Brackets

For Markdown format, the entire link content (prefix and path) must be wrapped in angle brackets `<...>`. This is **required** for paths with spaces and recommended for all paths.

```markdown
✅ [Folder](<folder:/My Documents/Project>)
❌ [Folder](folder:/My Documents/Project)  ← Won't render in reading mode
```

### Special Characters in Paths

Paths can contain parentheses, dots, and other special characters:

```markdown
[Software](<folder:/Software/App-v1.0(x64)>)
```

Parentheses in paths are treated as part of the path, not as link delimiters.

### Autocompletion

Start typing `[Text](folder:` in editing mode, and a folder list will appear. The selected path is automatically wrapped in `<...>` (if enabled). The cursor moves after the closing bracket.

### Commands

- **Insert folder link** — opens a folder picker dialog. Available from the command palette (`Ctrl+P`).
- **Copy as folder link** — right-click on a folder in the file tree and select this option from the context menu.

## Implemented Features

### Core Functionality

1. **Path Autocompletion** — shows a folder list when typing `[text](prefix:` in the editor. Works only for Markdown format.

2. **Insert Folder Link Command** — opens a folder picker dialog from the command palette. Supports both Markdown and Wiki formats.

3. **Modifier Keys Support** — `Ctrl+click` (Windows/Linux) or `Cmd+click` (macOS) performs the alternative action. For example, if the default action is "reveal in tree," Ctrl+click will open the folder in the system explorer.

4. **Wiki Syntax Support** — both Markdown and Wiki formats are supported for clicks. Autocompletion works only for Markdown format.

5. **Broken Link Indicators** — if the referenced folder or file does not exist, the link is marked with a dashed underline. Hovering shows a tooltip with the reason.

6. **Copy as Folder Link Command** — right-click on a folder in the file tree to copy its path as a folder link.

7. **Link Colors** — separate colors can be set for folder links and file links. Broken links can have their own color.

8. **Absolute Paths from Vault Root** — paths starting with `/` are treated as absolute paths from the vault root.

### Additional Features

- **Customizable Protocol Prefix** — change the default `folder:` prefix to any other string.

- **File Links Protocol** — the `file-ext:` protocol opens files with external programs using the OS default handler.

- **Path Modification Rules** — regular expressions for modifying paths before passing them to external programs. Supports literal mode and flags.

- **Cross-Platform Slash Normalization** — slashes are automatically normalized for your OS (Windows uses `\`, others use `/`).

- **Lazy Tree Loading Support** — folders outside the visible area of the file tree are correctly expanded using the internal `revealInFolder` method.

- **Angle Brackets Handling** — paths with spaces are correctly handled when wrapped in angle brackets.

- **Parentheses in Paths** — paths containing parentheses are correctly parsed using a character-by-character parser with depth tracking.

- **Multiple Links in One Line** — when multiple links are in the same line, clicking on a specific link opens that link (the nearest one to the click position).

- **Standard Preview Blocking** — the standard Obsidian hover preview is blocked for folder and file links to prevent incorrect "file not found" messages.

- **Bilingual Interface** — the plugin interface supports Russian and English with automatic system language detection or manual selection.

- **Settings Import/Export** — export settings to a JSON file and import them on another device.

- **Mobile Compatibility** — most features work on mobile devices. Desktop-only features are clearly indicated.

- **Debug Mode** — diagnostic messages can be output to the console for troubleshooting.

## Configuration

See plugin settings for:

- **Language** — interface language selection (Auto / Russian / English)
- **Protocol prefix** — customize the link prefix
- **Debug mode** — output diagnostic messages to console
- **Link behavior** — actions in reading and editing modes
- **Ctrl+click** — invert behavior with modifier key
- **Link format** — Markdown or Wiki format for insertion
- **Angle brackets** — toggle angle brackets for Markdown format
- **Path format** — absolute or relative paths for insertion
- **Autocompletion** — enable/disable folder suggestions
- **Colors** — broken links, folder links, file links, highlight color
- **Highlight duration** — how long the folder is highlighted
- **Path modification** — rules for external program paths
- **Import/Export** — settings backup and restore

## Mobile Support

Most features work on mobile devices. Desktop-only features are clearly indicated in the plugin settings.

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Navigate to folder in file tree | ✅ | ✅ |
| Open folder in system explorer | ✅ | ❌ |
| Open file with external program | ✅ | ❌ |
| Path autocompletion | ✅ | ✅ |
| Insert folder link command | ✅ | ✅ |
| Copy as folder link command | ✅ | ⚠️ |
| Broken link indicators | ✅ | ✅ |
| Link colors | ✅ | ✅ |
| Path modification rules | ✅ | ❌ |
| Wiki syntax support | ✅ | ✅ |
| Multiple links in one line | ✅ | ✅ |
| Parentheses in paths | ✅ | ✅ |
| Angle brackets in paths | ✅ | ✅ |
| Ctrl+click modifier | ✅ | ❌ |
| Bilingual interface | ✅ | ✅ |
| Settings import/export | ✅ | ✅ |
| Debug mode | ✅ | ✅ |

**Legend:**
- ✅ — Fully supported
- ❌ — Not available
- ⚠️ — Limited support (may not work on all devices)

**Mobile limitations:**

- Opening folders in the system explorer is not available because mobile devices don't have direct access to the file system.
- Opening files with external programs is not available for the same reason.
- Path modification rules are not applied because external program integration is not available.
- Ctrl+click modifier is not available because mobile devices don't have a keyboard.
- The "Copy as folder link" command may not work on all mobile devices due to clipboard API limitations.

## Known Limitations

- Autocompletion works only for Markdown format. Wiki format autocompletion conflicts with Obsidian's built-in wiki link suggestions.
- On mobile devices, some features are not available due to platform limitations.
- Path modification rules are applied only when passing paths to external programs. Folder tree navigation is not affected.
