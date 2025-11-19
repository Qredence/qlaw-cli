import { TextAttributes } from "@opentui/core";
import type { ThemeTokens } from "../themes";

export type SettingPanelItem = {
  id: string;
  label: string;
  value: string;
  description?: string;
  type: "text" | "toggle" | "info";
  onActivate?: () => void;
};

export type SettingSection = { title: string; items: SettingPanelItem[] };

interface SettingsMenuProps {
  sections: SettingSection[];
  focusIndex: number;
  colors: ThemeTokens;
}

export function SettingsMenu({
  sections,
  focusIndex,
  colors,
}: SettingsMenuProps) {
  let itemIndex = -1;
  return (
    <box
      style={{
        position: "absolute",
        top: 5,
        left: 10,
        right: 10,
        maxHeight: 25,
        backgroundColor: colors.bg.panel,
        border: true,
        borderColor: colors.border,
        padding: 2,
        zIndex: 100,
      }}
    >
      <box flexDirection="column" style={{ width: "100%" }}>
        <text
          content="Settings"
          style={{
            fg: colors.text.accent,
            attributes: TextAttributes.BOLD,
            marginBottom: 1,
          }}
        />
        <text
          content="↑↓ navigate · Enter edit/toggle · Esc close"
          style={{ fg: colors.text.dim, attributes: TextAttributes.DIM }}
        />
        {sections.map((section) => (
          <box
            key={section.title}
            flexDirection="column"
            style={{ marginTop: 1 }}
          >
            <text
              content={section.title}
              style={{
                fg: colors.text.secondary,
                attributes: TextAttributes.BOLD,
              }}
            />
            {section.items.map((item) => {
              itemIndex += 1;
              const isSelected = focusIndex === itemIndex;
              return (
                <box
                  key={item.id}
                  flexDirection="column"
                  style={{
                    marginTop: 1,
                    padding: 1,
                    border: true,
                    borderColor: isSelected
                      ? colors.text.accent
                      : colors.border,
                    backgroundColor: isSelected
                      ? colors.bg.hover
                      : colors.bg.panel,
                  }}
                >
                  <box style={{ justifyContent: "space-between" }}>
                    <text
                      content={item.label}
                      style={{
                        fg: colors.text.primary,
                        attributes: isSelected ? TextAttributes.BOLD : 0,
                      }}
                    />
                    <text
                      content={item.value}
                      style={{ fg: colors.text.secondary }}
                    />
                  </box>
                  {item.description && (
                    <text
                      content={item.description}
                      style={{
                        fg: colors.text.tertiary,
                        attributes: TextAttributes.DIM,
                        marginTop: 1,
                      }}
                    />
                  )}
                </box>
              );
            })}
          </box>
        ))}
        <text
          content={
            "\nTip: /keybindings set <action> <binding> to update suggestion keys.\nUse /af-bridge + /af-model to point workflow mode at a new agent-framework bridge."
          }
          style={{
            fg: colors.text.dim,
            attributes: TextAttributes.DIM,
            marginTop: 2,
          }}
        />
      </box>
    </box>
  );
}
