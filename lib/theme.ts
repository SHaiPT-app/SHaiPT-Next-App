import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Neon Orange (primary brand color)
        neonOrange: {
          50: { value: "#FFF0E6" },
          100: { value: "#FFD1B3" },
          200: { value: "#FFB380" },
          300: { value: "#FF944D" },
          400: { value: "#FF761A" },
          500: { value: "#FF6600" },
          600: { value: "#E55C00" },
          700: { value: "#CC5200" },
          800: { value: "#B34700" },
          900: { value: "#993D00" },
          950: { value: "#663300" },
        },
        // Neon Hot Pink
        neonPink: {
          50: { value: "#ffe6f2" },
          100: { value: "#ffb3d9" },
          200: { value: "#ff80bf" },
          300: { value: "#ff4da6" },
          400: { value: "#ff1a8c" },
          500: { value: "#ff007f" },
          600: { value: "#e60073" },
          700: { value: "#cc0066" },
          800: { value: "#b30059" },
          900: { value: "#99004d" },
          950: { value: "#660033" },
        },
        // Dark background palette
        dark: {
          50: { value: "#E5E5E7" },
          100: { value: "#A0A0A8" },
          200: { value: "#4A4A55" },
          300: { value: "#3A3A45" },
          400: { value: "#2A2A35" },
          500: { value: "#1F1F29" },
          600: { value: "#1A1A24" },
          700: { value: "#15151F" },
          800: { value: "#10101A" },
          900: { value: "#0B0B15" },
          950: { value: "#060610" },
        },
      },
    },
    semanticTokens: {
      colors: {
        // Primary uses neon orange
        primary: {
          solid: {
            value: { _light: "{colors.neonOrange.500}", _dark: "{colors.neonOrange.500}" },
          },
          contrast: {
            value: { _light: "{colors.white}", _dark: "{colors.white}" },
          },
          fg: {
            value: { _light: "{colors.neonOrange.600}", _dark: "{colors.neonOrange.400}" },
          },
          muted: {
            value: { _light: "{colors.neonOrange.100}", _dark: "{colors.neonOrange.950}" },
          },
          subtle: {
            value: { _light: "{colors.neonOrange.50}", _dark: "{colors.neonOrange.950}" },
          },
          emphasized: {
            value: { _light: "{colors.neonOrange.200}", _dark: "{colors.neonOrange.800}" },
          },
          focusRing: {
            value: { _light: "{colors.neonOrange.500}", _dark: "{colors.neonOrange.500}" },
          },
        },
        // Accent also uses neon orange
        accent: {
          solid: {
            value: { _light: "{colors.neonOrange.500}", _dark: "{colors.neonOrange.500}" },
          },
          contrast: {
            value: { _light: "{colors.white}", _dark: "{colors.white}" },
          },
          fg: {
            value: { _light: "{colors.neonOrange.600}", _dark: "{colors.neonOrange.400}" },
          },
          muted: {
            value: { _light: "{colors.neonOrange.100}", _dark: "{colors.neonOrange.950}" },
          },
          subtle: {
            value: { _light: "{colors.neonOrange.50}", _dark: "{colors.neonOrange.950}" },
          },
        },
        // Secondary uses neon pink
        secondary: {
          solid: {
            value: { _light: "{colors.neonPink.500}", _dark: "{colors.neonPink.500}" },
          },
          contrast: {
            value: { _light: "{colors.white}", _dark: "{colors.white}" },
          },
          fg: {
            value: { _light: "{colors.neonPink.600}", _dark: "{colors.neonPink.400}" },
          },
          muted: {
            value: { _light: "{colors.neonPink.100}", _dark: "{colors.neonPink.950}" },
          },
          subtle: {
            value: { _light: "{colors.neonPink.50}", _dark: "{colors.neonPink.950}" },
          },
        },
        // Background tokens for dark theme
        bg: {
          DEFAULT: {
            value: { _light: "{colors.white}", _dark: "{colors.dark.700}" },
          },
          subtle: {
            value: { _light: "{colors.gray.50}", _dark: "{colors.dark.600}" },
          },
          muted: {
            value: { _light: "{colors.gray.100}", _dark: "{colors.dark.500}" },
          },
          emphasized: {
            value: { _light: "{colors.gray.200}", _dark: "{colors.dark.400}" },
          },
          panel: {
            value: { _light: "{colors.white}", _dark: "{colors.dark.500}" },
          },
        },
        // Foreground tokens
        fg: {
          DEFAULT: {
            value: { _light: "{colors.black}", _dark: "{colors.dark.50}" },
          },
          muted: {
            value: { _light: "{colors.gray.600}", _dark: "{colors.dark.100}" },
          },
        },
        // Border tokens
        border: {
          DEFAULT: {
            value: { _light: "{colors.gray.200}", _dark: "rgba(255, 255, 255, 0.1)" },
          },
          muted: {
            value: { _light: "{colors.gray.100}", _dark: "rgba(255, 255, 255, 0.06)" },
          },
        },
        // Success / Error / Warning
        success: {
          solid: {
            value: { _light: "#10b981", _dark: "#10b981" },
          },
        },
        error: {
          solid: {
            value: { _light: "#ef4444", _dark: "#ef4444" },
          },
        },
        warning: {
          solid: {
            value: { _light: "#f59e0b", _dark: "#f59e0b" },
          },
        },
      },
    },
  },
  globalCss: {
    "html, body": {
      bg: "bg",
      color: "fg",
      colorScheme: "dark",
    },
  },
})

export const system = createSystem(defaultConfig, config)
