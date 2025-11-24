# AdaptiveTextInput (OpenTUI)

A React/OpenTUI component that implements a dynamically expanding text input with accessibility and responsive behavior for terminal user interfaces.

## Features
- Initial height of one line with padding and subtle border (`#CCCCCC`)
- Dynamic expansion on input width (>95% of container) or Enter/newlines
- Height constrained to `--max-lines` (default 8) with visual indicator
- Debounced input (100ms), sanitized paste handling
- Long word wrapping (break-word equivalent)
- Responsive to terminal resize and varying font sizes
- Accessibility: keyboard Tab/Shift+Tab, console announcements of line count

## Usage
```tsx
import { AdaptiveTextInput } from "../src/components/AdaptiveTextInput";
import { getTheme } from "../src/themes";

const colors = getTheme("dark");

<AdaptiveTextInput
  value={""}
  onChange={(val) => {/* handle */}}
  colors={colors}
  maxLines={8}
  width={"100%"}
  paddingV={1}
  paddingH={2}
  onFocusNext={() => {/* move focus */}}
  onFocusPrev={() => {/* move focus back */}}
/>
```

## Customization
- `maxLines` (maps to CSS-like `--max-lines` concept)
- `width`: number or percentage string
- `paddingV`/`paddingH`: approximate px mapped to terminal cells (defaults 1/2)
- Theme colors from `getTheme`

## Behavior Notes
- Expansion logic wraps content by container columns; explicit newlines increase height
- Ellipsis indicator (`…`) appears when `lineCount > maxLines`
- Screen reader announcements simulated by writing to the OpenTUI console (`Textbox lines: N`)

## Compatibility
- Tested with Bun + OpenTUI React on macOS; terminal environments use monospaced metrics
- Font size ranges 12–24px are approximated by terminal cell sizing; component adapts on resize

## Testing
- Unit tests for wrapping and line counting in `tests/adaptive-input.test.ts`
- Performance checks ensure fast computation for large inputs
- Accessibility logic validated via console announcements and keyboard navigation

