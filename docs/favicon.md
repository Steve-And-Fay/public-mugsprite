# Raster companion for the existing favicon

`public/favicon.svg` remains the unchanged source artwork and browser SVG icon.
`public/favicon.png` is a 128 × 128 offline raster export of that same green face,
declared alongside it in `index.html` and the existing web manifest. It lets icon
readers that intentionally refuse SVG use the actual brand icon.
`public/favicon.ico` is a byte-identical companion at the conventional path used
by the portal's bounded icon fetcher; its contents remain the approved PNG.

The committed PNG was generated from the trusted local file with librsvg 2.61.1:

```sh
rsvg-convert --width 128 --height 128 --output public/favicon.png public/favicon.svg
```

No remote SVG, new artwork, cropping, or new production dependency is involved.
Regeneration is a deliberate maintainer step, not part of the website build.
Review the output visually after regenerating it, then run `npm run verify` and
`npm run build`. Tests check the original artwork, PNG dimensions, and both public
declarations; the build must copy the PNG unchanged to `dist/favicon.png` and
`dist/favicon.ico`.

Publish only through the established complete website release workflow. A later
scoped portal icon refresh is separate; this source change does not refresh it.
