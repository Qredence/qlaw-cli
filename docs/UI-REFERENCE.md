# UI Reference

Visual guide to the QLAW CLI interface design.

## Full Interface Layout

```
┌──────────────────────────────────────────────────────────────┐
│ ■ QLAW                                      3 messages       │ ← Header
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  • System                                                    │ ← System Message
│    Welcome to QLAW CLI                                       │
│    12:34:56 PM                                              │
│                                                              │
│                                                              │
│  › You                                                       │ ← User Message
│    Tell me about TypeScript                                  │
│    12:35:03 PM                                              │
│                                                              │
│                                                              │
│  ▪ Assistant                                                 │ ← AI Message
│    TypeScript is a strongly typed programming language       │
│    that builds on JavaScript...                              │
│    12:35:05 PM                                              │
│                                                              │
│                                                              │ ← Scrollable
│  ▪ Assistant                                                 │   Area
│    ▁▂▃                                                       │ ← Loading
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ › Message                                                    │ ← Input Mode
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Type / for commands, @ for mentions...                 │  │ ← Input Field
│ └────────────────────────────────────────────────────────┘  │
│ ○ Ready                                    ESC to exit      │ ← Status Line
└──────────────────────────────────────────────────────────────┘
```

## Command Mode

When you type `/`:

```
┌──────────────────────────────────────────────────────────────┐
│ / clear, help, settings, export                              │ ← Suggestions
├──────────────────────────────────────────────────────────────┤
│ • Command mode                                               │ ← Mode Active
│ ┌────────────────────────────────────────────────────────┐  │
│ │ /help                                                   │  │ ← User Input
│ └────────────────────────────────────────────────────────┘  │
│ ○ Ready                                    ESC to exit      │
└──────────────────────────────────────────────────────────────┘
```

## Mention Mode

When you type `@`:

```
┌──────────────────────────────────────────────────────────────┐
│ @ context, file, code, docs                                  │ ← Suggestions
├──────────────────────────────────────────────────────────────┤
│ • Mention mode                                               │ ← Mode Active
│ ┌────────────────────────────────────────────────────────┐  │
│ │ @file                                                   │  │ ← User Input
│ └────────────────────────────────────────────────────────┘  │
│ ○ Ready                                    ESC to exit      │
└──────────────────────────────────────────────────────────────┘
```

## Processing State

```
┌──────────────────────────────────────────────────────────────┐
│ › Message                                                    │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ [Input disabled during processing]                      │  │
│ └────────────────────────────────────────────────────────┘  │
│ ● Processing...                            ESC to exit      │ ← Active
└──────────────────────────────────────────────────────────────┘
```

## Color Coding

### Text Colors

```
■ QLAW          ← Cyan (#00D4FF)
3 messages      ← Gray (#606060)
12:34:56 PM     ← Dark Gray (#404040)

› You           ← Gray (#A0A0A0)
  Message text  ← White (#FFFFFF)

▪ Assistant     ← White (#FFFFFF)
  Message text  ← White (#FFFFFF)

• System        ← Gray (#606060)
  Message text  ← Gray (#A0A0A0)
```

### Background Colors

```
Header:     #121212  ← Slightly lighter than main
Main Area:  #0A0A0A  ← Deepest black
Input:      #121212  ← Same as header
Input Box:  #151515  ← When focused
```

## Icon Reference

```
■  Brand logo (header)
›  User message indicator
▪  AI assistant indicator
•  System message / Command mode
●  Processing / Active state
○  Ready / Idle state
▁▂▃ Loading animation frames
```

## Spacing Guide

```
┌──────────────────────────────────────┐
│ ■ QLAW                  12 messages  │ ← 2 units padding
├──────────────────────────────────────┤
│                                      │ ← 2 units top padding
│  ▪ Assistant                         │ ← 0 left margin
│    Message content here              │ ← 2 units indent
│    12:34:56 PM                       │ ← 2 units indent
│                                      │
│                                      │ ← 3 lines between messages
│                                      │
│  › You                               │
│    Another message                   │
│    12:35:00 PM                       │
│                                      │ ← 1 unit bottom padding
├──────────────────────────────────────┤
│ › Message                            │ ← 1 unit padding
│ ┌──────────────────────────────────┐ │
│ │ Input field with 1 unit padding  │ │
│ └──────────────────────────────────┘ │
│ ○ Ready              ESC to exit    │ ← 1 unit margin top
└──────────────────────────────────────┘
```

## State Transitions

### Chat → Command

```
User types:  [empty]  →  /  →  /h  →  /help
Mode shows:  Chat     →  Cmd  →  Cmd →  Cmd
Suggests:    none     →  all  →  help → help
```

### Chat → Mention

```
User types:  [empty]  →  @  →  @f  →  @file
Mode shows:  Chat     →  Men  →  Men →  Men
Suggests:    none     →  all  →  file → file
```

### Submit Command

```
User types:  /clear  →  [Enter]
Action:      Clear all messages
Result:      Empty message area
Mode:        Returns to Chat
```

## Responsive Behavior

### Wide Terminal (>100 cols)
- Messages wrap naturally
- Full text visible
- Comfortable reading width

### Narrow Terminal (<60 cols)
- Text wraps more frequently
- All features remain accessible
- Vertical layout prioritized

### Tall Terminal (>30 rows)
- More message history visible
- Comfortable scrolling
- Input area remains fixed at bottom

### Short Terminal (<20 rows)
- Header remains (3 rows)
- Input remains (5-6 rows)
- Remaining space for messages
- Scrolling essential

## Accessibility Features

- **High Contrast**: White text on black background
- **Clear Icons**: Visual + text labels for all states
- **Status Indicators**: Always show current mode/state
- **Keyboard Only**: No mouse required
- **Consistent Layout**: Fixed header and input positions
- **Visual Hierarchy**: Bold headers, indented content

## Best Practices

1. **Keep it minimal** - Monochrome palette keeps focus on content
2. **Use icons consistently** - Each role has a distinct icon
3. **Maintain spacing** - Breathing room between messages
4. **Show state clearly** - Mode indicator always visible
5. **Provide feedback** - Status line shows what's happening

## Examples

### Help Command Output

```
▪ Assistant
  Available commands:
  /clear - Clear all messages
  /help - Show this help
  /settings - Toggle settings
  /export - Export chat
  /theme - Toggle theme
  
  Mentions:
  @context - Add context
  @file - Reference file
  @code - Code snippet
  @docs - Documentation
  12:34:56 PM
```

### Settings Toggle

```
• System
  Timestamps hidden
  12:34:56 PM
```

### Empty State

```
┌──────────────────────────────────────────────┐
│ ■ QLAW                           0 messages  │
├──────────────────────────────────────────────┤
│                                              │
│  [No messages yet]                           │
│                                              │
├──────────────────────────────────────────────┤
│ › Message                                    │
│ ┌────────────────────────────────────────┐  │
│ │ Type / for commands, @ for mentions... │  │
│ └────────────────────────────────────────┘  │
│ ○ Ready                    ESC to exit      │
└──────────────────────────────────────────────┘
```
