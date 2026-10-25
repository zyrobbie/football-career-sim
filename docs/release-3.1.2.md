# 3.1.2 — Mobile PNG saving

- The scrollable SVG reader is explicitly a browsing view, not a long-press save target.
- The save dialog presents verified PNG bytes as its actual image source, with full natural dimensions rather than a screenshot of the visible frame.
- System image sharing, PNG file download and opening the original PNG are separate actions. Supported browsers receive a PNG file, not a webpage link, through the system share menu.
- Cancellation leaves the image available; repeated clicks and switching image parts retain coherent state.
- Saving guidance distinguishes Photos from Files/Downloads and explains restricted in-app browsers. A webpage cannot silently write to the system photo library or guarantee which actions the operating system offers.

Validation uses generated anonymous game examples in cloud Chromium and WebKit. Browser-engine checks do not prove a physical device's long-press menu or photo-library permissions.

Game rules, save schema, poster content and dependency versions are unchanged.
