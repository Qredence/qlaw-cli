# Design System

## Philosophy

Clean, monochrome design with a single accent color for maximum focus and minimal distraction. Typography-driven hierarchy with subtle visual cues.

## Color Palette

### Background
```
Primary:   #0A0A0A  - Main background (deepest black)
Secondary: #121212  - Header/Footer background
Tertiary:  #1A1A1A  - Suggestions, highlights
Input:     #0F0F0F  - Input field base
Focused:   #151515  - Input field when focused
```

### Text
```
Primary:   #FFFFFF  - Main content
Secondary: #A0A0A0  - User messages, labels
Tertiary:  #606060  - System messages, secondary info
Dim:       #404040  - Timestamps, status indicators
```

### Accent
```
Cyan:      #00D4FF  - Commands, active states, AI indicators
```

### Borders
```
Border:    #252525  - Subtle dividers
```

## Typography

### Hierarchy

1. **Brand** - Header logo
   - Weight: Bold
   - Color: White (#FFFFFF)
   - Icon: Cyan square (■)

2. **Message Headers** - Role identification
   - Weight: Bold
   - Icons: › (User), ▪ (Assistant), • (System)
   - Colors: Based on role

3. **Message Content** - Primary text
   - Weight: Regular
   - Color: White or Secondary based on role
   - Line wrapping enabled

4. **Metadata** - Timestamps, counts
   - Weight: Regular
   - Attributes: DIM
   - Color: Dim gray

5. **Status** - Input states, processing
   - Weight: Regular
   - Attributes: DIM
   - Icons: ● (processing), ○ (ready)

## Spacing

- **Message spacing**: 3 lines between messages
- **Inner padding**: 2 units for main areas
- **Compact padding**: 1 unit for input/header
- **Text indent**: 2 units for message content

## Visual Elements

### Icons

```
■ - Brand logo (square)
› - User indicator (chevron)
▪ - Assistant indicator (small square)
• - System indicator (bullet)
● - Active/Processing (filled circle)
○ - Ready/Idle (empty circle)
▁▂▃ - Shimmer animation frames
```

### Animations

**Shimmer Loader**
- 3 frames: ▁▂▃
- 400ms per frame
- Cyan color (#00D4FF)
- Displays during AI processing

## Components

### Header

```
┌────────────────────────────────────┐
│ ■ QLAW            12 messages      │
└────────────────────────────────────┘
```

- Height: 3 lines
- Background: Secondary
- Border: Bottom only
- Logo: Cyan square + White text
- Meta: Message count (right-aligned, tertiary)

### Message

```
▪ Assistant
  Here is the response text that wraps
  automatically based on terminal width.
  12:34:56 PM
```

- Icon + Role (Bold, colored)
- Content (indented 2 spaces)
- Timestamp (optional, dim)
- Spacing: 3 lines between messages

### Loading State

```
▪ Assistant
  ▁▂▃
```

- Same header as message
- Animated shimmer characters
- Cyan accent color

### Input Area

```
┌────────────────────────────────────┐
│ › Message                          │
│ ┌────────────────────────────────┐ │
│ │ Type / for commands...         │ │
│ └────────────────────────────────┘ │
│ ○ Ready              ESC to exit   │
└────────────────────────────────────┘
```

- Mode indicator (› for chat, • for command/mention)
- Boxed input field with subtle border
- Status line with state and shortcuts
- Background: Secondary

### Command Suggestions

```
┌────────────────────────────────────┐
│ / clear, help, settings, export    │
└────────────────────────────────────┘
```

- Background: Tertiary
- Appears above input when typing / or @
- Lists available completions

## Input Modes

### Chat Mode (Default)
- Indicator: › Message
- Color: Tertiary
- Placeholder: "Type / for commands, @ for mentions..."

### Command Mode (/)
- Indicator: • Command mode
- Color: Cyan (accent)
- Placeholder: "Type command name..."
- Shows command suggestions

### Mention Mode (@)
- Indicator: • Mention mode
- Color: Secondary
- Placeholder: "Select mention type..."
- Shows mention suggestions

## Commands

### Available Commands

```
/clear    - Clear all messages
/help     - Show help text
/settings - Toggle timestamps
/export   - Export chat (mock)
/theme    - Theme toggle (not implemented)
```

### Mentions

```
@context  - Add context
@file     - Reference file
@code     - Code snippet
@docs     - Documentation
```

## State Management

### Settings

```typescript
{
  theme: "dark" | "light",
  showTimestamps: boolean,
  autoScroll: boolean
}
```

Currently only dark theme is implemented.

## Accessibility

- High contrast between text and background
- Clear visual hierarchy
- Icon + text labels for all states
- Keyboard-only navigation
- Consistent spacing for scannability

## Best Practices

1. **Maintain consistency** - Use design tokens for all colors
2. **Respect spacing** - Follow spacing guidelines for clean layout
3. **Clear feedback** - Always indicate current state
4. **Minimize color** - Only accent color for important UI states
5. **Typography hierarchy** - Let typography create visual structure

## Future Enhancements

- [ ] Light theme support
- [ ] Custom accent color selection
- [ ] Configurable icon sets
- [ ] Animation speed settings
- [ ] Font size adjustment
- [ ] Syntax highlighting themes
- [ ] Code block styling
