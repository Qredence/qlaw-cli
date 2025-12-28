import { TextAttributes } from "@opentui/core";
import type { CommandMeta } from "../commands";
import type { ThemeTokens } from "../themes";

interface CommandPaletteProps {
  commands: CommandMeta[];
  focusIndex: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (command: CommandMeta) => void;
  onClose: () => void;
  colors: ThemeTokens;
}

export function CommandPalette({
  commands,
  focusIndex,
  searchQuery,
  onSearchChange,
  onSelect,
  onClose,
  colors,
}: CommandPaletteProps) {
  // Filter commands based on search query
  const filteredCommands = commands.filter((cmd) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      cmd.name.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query) ||
      cmd.keywords?.some((k) => k.toLowerCase().includes(query))
    );
  });

  // Group commands by first letter for better organization
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    const letter = (cmd.name[0] || "").toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(cmd);
    return acc;
  }, {} as Record<string, CommandMeta[]>);

  const sortedGroups = Object.entries(groupedCommands).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <box
      style={{
        position: "absolute",
        top: 5,
        left: "50%",
        width: 60,
        maxHeight: 18,
        backgroundColor: colors.bg.panel,
        border: true,
        borderColor: colors.border,
        padding: 1,
        zIndex: 200,
      }}
    >
      <box flexDirection="column" style={{ width: "100%" }}>
        {/* Header */}
        <text
          content="Command Palette"
          style={{
            fg: colors.text.accent,
            attributes: TextAttributes.BOLD,
            marginBottom: 1,
          }}
        />

        {/* Search Input */}
        <box style={{ marginBottom: 1 }}>
          <input
            value={searchQuery}
            onChange={(e: any) => onSearchChange(e.target?.value || "")}
            placeholder="Search commands…"
            focused={true}
            style={{
              backgroundColor: colors.bg.secondary,
              textColor: colors.text.primary,
              placeholderColor: colors.text.dim,
              width: "100%",
            }}
          />
        </box>

        {/* Command List */}
        <box
          flexDirection="column"
          style={{
            maxHeight: 10,
            overflow: "hidden",
          }}
        >
          {sortedGroups.length === 0 ? (
            <text
              content="No commands found"
              style={{ fg: colors.text.tertiary, marginTop: 1 }}
            />
          ) : (
            sortedGroups.map(([letter, cmds]) => (
              <box key={letter} flexDirection="column">
                <text
                  content={letter}
                  style={{
                    fg: colors.text.accent,
                    attributes: TextAttributes.BOLD,
                    marginTop: 1,
                  }}
                />
                {cmds.map((cmd, idx) => {
                  // Calculate global index for focus tracking
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === focusIndex;

                  return (
                    <box
                      key={cmd.name}
                      flexDirection="row"
                      justifyContent="space-between"
                      style={{
                        marginTop: 0,
                        paddingLeft: 1,
                        paddingRight: 1,
                        border: true,
                        borderColor: isSelected
                          ? colors.text.accent
                          : "transparent",
                        backgroundColor: isSelected
                          ? colors.bg.hover
                          : "transparent",
                      }}
                    >
                      <box flexDirection="row">
                        <text
                          content={`/${cmd.name}`}
                          style={{
                            fg: isSelected
                              ? colors.text.accent
                              : colors.text.primary,
                            attributes: isSelected
                              ? TextAttributes.BOLD
                              : 0,
                            marginRight: 2,
                          }}
                        />
                        <text
                          content={cmd.description}
                          style={{
                            fg: colors.text.secondary,
                          }}
                        />
                      </box>
                      {cmd.requiresValue && (
                        <text
                          content="[value]"
                          style={{
                            fg: colors.text.dim,
                            attributes: TextAttributes.DIM,
                          }}
                        />
                      )}
                    </box>
                  );
                })}
              </box>
            ))
          )}
        </box>

        {/* Footer */}
        <text
          content={
            searchQuery
              ? `↑↓ select · enter to run · esc close · ${filteredCommands.length} commands`
              : "↑↓ select · enter run · esc close"
          }
          style={{
            fg: colors.text.dim,
            attributes: TextAttributes.DIM,
            marginTop: 1,
          }}
        />

        {/* Result count */}
        {searchQuery && filteredCommands.length > 0 && (
          <text
            content={`Found ${filteredCommands.length} command${
              filteredCommands.length !== 1 ? "s" : ""
            }`}
            style={{
              fg: colors.text.tertiary,
              attributes: TextAttributes.DIM,
              marginTop: 0,
            }}
          />
        )}
      </box>
    </box>
  );
}
