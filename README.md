# MD3 Themes for OpenCode TUI

194 [Material Design 3](https://m3.material.io/) (Material You) themes
for the [OpenCode](https://opencode.ai/) TUI: 9 variants × 12 hues
(`monochrome` only ships hue `0`), plain + OLED. Each file carries
**both** light and dark appearances (OpenCode switches itself).

> Active set is generated from `src/dynamic/` (`OpenCodeDynamicSchema` +
> `OpenCodeDynamic`: MD variant + HCT source in, all v2 tokens out).
> `deprecated-theme/` keeps the archived V1 static set.

| Light                                                                                                                                            | Dark                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ![Monochrome Light](https://raw.githubusercontent.com/sandlada/opencode-material-theme/main/docs/monochrome-light.png)                           | ![Content 150 Dark](https://raw.githubusercontent.com/sandlada/opencode-material-theme/main/docs/content-150-dark.png)             |
| ![Vibrant 90 Light](https://raw.githubusercontent.com/sandlada/opencode-material-theme/main/docs/vibrant-90-light.png)                           | ![Content 330 Dark OLED](https://raw.githubusercontent.com/sandlada/opencode-material-theme/main/docs/content-330-oled-dark.png) |

More screenshots in [`docs/ on GitHub`](https://github.com/sandlada/opencode-material-theme/tree/main/docs).

## Requirements

- A terminal with **truecolor** support (`COLORTERM=truecolor`), otherwise
  colors degrade to the nearest 256-color approximation.
- Node.js 22+ (installer only; the themes themselves are plain JSON).

## Install

```sh
npx -y -p @sandlada/opencode-material-theme opencode-md3-themes install
```

Subset example (expressive greens, plain only):

```sh
opencode-md3-themes install --variant expressive --hue 120,150 --oled plain
```

Or copy the files manually (`src/themes/` — the v2 set):

```sh
git clone --depth 1 https://github.com/sandlada/opencode-material-theme.git
mkdir -p ~/.config/opencode/themes
cp opencode-material-theme/src/themes/*.json ~/.config/opencode/themes/
```

Then pick a theme with `/theme`. Theme files are not hot-reloaded: restart
the TUI (or leave and re-enter the session) after installing or switching
light/dark mode — see the upstream-issue note below.

## Theme names

`md3-{variant}-{hue}[-oled].json`, all lowercase:

- `{variant}`: `monochrome`, `neutral`, `tonal-spot`, `vibrant`,
  `expressive`, `fidelity`, `content`, `rainbow`, `fruit-salad`
- `{hue}`: HCT hue `0-330` step `30` (`monochrome` only ships hue `0`,
  source is `Hct.from(hue, 75, 50)`)
- `-oled`: the file whose dark half is pitch-black

## Contributing

```sh
npm install
npm --prefix dev-app install
npm run dev:app        # theme lab: variant/HCT controls, TUI mock, export
bun scripts/check-dynamic.mjs                    # validate 648 combos
bun scripts/generate-dynamic-matrix.mjs --out ./src/themes   # rebuild 194
```

## Known upstream issue

Light/dark switching can leave stale colors (e.g. markdown list text keeps
the old mode's color) until restart — an OpenCode TUI bug, not a theme bug:
[anomalyco/opencode#55735](https://github.com/anomalyco/opencode/issues/55735),
fix PR [anomalyco/opencode#56323](https://github.com/anomalyco/opencode/pull/56323)
(open, unmerged).

## License

MIT, copyright Kai-Orion & Sandlada.
