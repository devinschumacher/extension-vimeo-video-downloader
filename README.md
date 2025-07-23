# Vimeo Video Downloader Extension

> ⚠️  **UPDATE**
>
> The official [repository for the vimeo-downloader](https://github.com/serpapps/vimeo-video-downloader) releases, issues, etc. has been moved to the [@serpapps organization](https://github.com/serpapps).

<br>
<details>



A Chrome extension that extracts Vimeo video URLs from any webpage and provides download links using [the streamlink method](https://gist.github.com/devinschumacher/a189434fc9f374965888ca2dc793953e).

1. 🔗 Get it here: https://serp.ly/stuff/vimeo-video-downloader
2. 🆘 Ask for help: https://serp.ly/@serp/community
3. 🐛 Report bugs: [Submit an issue here so I can help fix it.](https://github.com/devinschumacher/devinschumacher/issues)


## Contact info

- [Linkedin](https://serp.ly/@devin/linkedin)
- [Instagram](https://serp.ly/@devin/instagram)
- [Facebook](https://serp.ly/@devin/facebook)
- [Twitter](https://serp.ly/@devin/twitter)
- [Github](https://serp.ly/@devin/github)

## Communities

- [SERP University Community Platform](https://serp.ly/@serp/community)
- [Discord](https://serp.ly/@serp/discord)


<details>
<summary></summary>
  
## Requirements

- Chrome browser
- streamlink installed on your system (`brew install streamlink` on macOS)
- For private videos: May require cookies or authentication
- License key

## Permissions

This extension requires the following permissions to function properly:

### activeTab
**Why we need it:** This permission allows the extension to access the content of the currently active tab when you click the extension icon. We use this to scan the page for Vimeo video URLs and extract video information only when you explicitly request it.

### scripting
**Why we need it:** This permission enables the extension to inject content scripts into web pages to detect Vimeo videos. The script searches for Vimeo player embeds, video IDs in the page HTML, and extracts video metadata to display in the extension popup.

### storage
**Why we need it:** This permission allows the extension to temporarily store found video information between page loads. This improves performance by caching video data and ensures a smooth user experience when switching between tabs.

### Host Permissions

#### `https://*.vimeo.com/*`

**Why we need it:** Required to access Vimeo's oEmbed API to fetch video titles and metadata. This ensures you can see the actual video titles instead of just ID numbers.

#### `https://player.vimeo.com/*`

**Why we need it:** Necessary to detect and interact with embedded Vimeo players on any website. Many sites embed videos using the player.vimeo.com domain.

#### `https://vimeo.com/api/*`

**Why we need it:** Used to make API calls to retrieve video information such as titles, descriptions, and thumbnail images for better video identification.

#### `https://*/*`

**Why we need it:** Required to detect Vimeo videos embedded on any website across the internet. Since Vimeo videos can be embedded on any domain, we need broad host permissions to scan for video content wherever you browse.

**Privacy Note:** The extension only activates when you click its icon and only processes video information from the current page. No data is collected, stored permanently, or transmitted to any external servers.

## Troubleshooting

### Audio Issues
The extension automatically includes the `--hls-audio-select "*"` parameter to ensure audio is included with all downloads. This parameter tells streamlink to select all available audio tracks, preventing silent videos.

If you still experience audio issues:
1. **Verbose mode**: Run streamlink with `-v` flag to see warnings about unrecognized languages
2. **Specific language**: If you see a warning like "Unrecognised language for media playlist", use `--hls-audio-select "language_code"` with the specific language code shown
3. **Player compatibility**: Some players (like QuickTime) may have issues. Try VLC Media Player for better compatibility
4. **Convert with VLC**: Use VLC's "Convert/Stream" option (File menu on Mac) to fix compatibility issues



</details>
