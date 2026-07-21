# STAATI B2B Presentation

A production-ready static bilingual presentation website for STAATI. It behaves like an interactive 16:9 deck, not a normal landing page.

## Run locally

No Node build is required. Open `index.html` directly, or run a tiny static server:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Files

- `index.html` loads Tailwind CDN, Lucide, html-to-image, jsPDF and JSZip.
- `styles.css` contains the STAATI visual system, slide sizing, presentation chrome and export styles.
- `presentationData.js` contains all Arabic and English slide content and editable brand defaults.
- `app.js` renders the deck, handles navigation, fullscreen mode, settings and exports.

## Edit Content

Edit `presentationData.js`. Each slide includes:

- `id`
- `number`
- `theme`
- `type`
- `label`
- `title`
- `subtitle`
- `body`
- `bullets`
- `metrics`
- `notes`
- `cta`

Every bilingual field uses:

```js
{ en: "English copy", ar: "النص العربي" }
```

Add or remove slides by editing the `slides` array.

## Replace Logo

Use the Presentation Settings modal in the browser to upload a STAATI logo and a target organization logo. These are saved locally in the browser and shown on the cover and closing slides.

The default logos are stored at `assets/brand/logo-white.svg` and `assets/brand/logo-black.svg`. Dark slides use the white SVG, and light slides use the black SVG. The settings modal can still override the logo locally in the browser.

## Export

The export does not use browser print.

The workflow is:

1. Wait for `document.fonts.ready`.
2. Wait for images to load.
3. Render each slide inside the hidden `#export-root` container at a fixed 1920x1080 canvas.
4. Use `html-to-image` to convert the slide canvas to PNG.
5. Add each PNG as a full-page image in `jsPDF`.
6. Save one full-bleed image page per slide.

Normal export uses 1920x1080. High quality uses 2560x1440 through a higher pixel ratio.

Available export options:

- PDF: `STAATI-B2B-Presentation-EN.pdf` or `STAATI-B2B-Presentation-AR.pdf`
- Current slide PNG
- All slides as PNG files inside a ZIP
- Share link with current slide and language

## Navigation

- Buttons: previous / next
- Keyboard: arrow keys, spacebar, Home, End, Escape
- Swipe: horizontal swipe on touch devices
- Thumbnails: open the slide navigator and jump to any slide
- Fullscreen: presentation mode shows one slide at a time

## Deploy on Vercel

Create a static project and deploy the folder contents. No build command is needed.

Recommended Vercel settings:

- Framework preset: Other
- Build command: empty
- Output directory: `.`

Because libraries and fonts are loaded from official CDNs, the deployed site needs public internet access.
