import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Neon Electric Blue
        neonBlue: {
          50: { value: "#e6f4ff" },
          100: { value: "#b3dfff" },
          200: { value: "#80caff" },
          300: { value: "#4db5ff" },
          400: { value: "#1aa0ff" },
          500: { value: "#00d4ff" },
          600: { value: "#00b8e6" },
          700: { value: "#008fcc" },
          800: { value: "#0066b3" },
          900: { value: "#003d99" },
          950: { value: "#002266" },
        },
        // Neon Vivid Green
        neonGreen: {
          50: { value: "#e6fff0" },
          100: { value: "#b3ffd6" },
          200: { value: "#80ffbb" },
          300: { value: "#4dffa1" },
          400: { value: "#1aff86" },
          500: { value: "#39ff14" },
          600: { value: "#2ee611" },
          700: { value: "#23cc0e" },
          800: { value: "#18b30b" },
          900: { value: "#0d9908" },
          950: { value: "#066605" },
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
        // Primary uses neon blue
        primary: {
          solid: {
            value: { _light: "{colors.neonBlue.500}", _dark: "{colors.neonBlue.500}" },
          },
          contrast: {
            value: { _light: "{colors.white}", _dark: "{colors.white}" },
          },
          fg: {
            value: { _light: "{colors.neonBlue.600}", _dark: "{colors.neonBlue.400}" },
          },
          muted: {
            value: { _light: "{colors.neonBlue.100}", _dark: "{colors.neonBlue.950}" },
          },
          subtle: {
            value: { _light: "{colors.neonBlue.50}", _dark: "{colors.neonBlue.950}" },
          },
          emphasized: {
            value: { _light: "{colors.neonBlue.200}", _dark: "{colors.neonBlue.800}" },
          },
          focusRing: {
            value: { _light: "{colors.neonBlue.500}", _dark: "{colors.neonBlue.500}" },
          },
        },
        // Accent uses neon green
        accent: {
          solid: {
            value: { _light: "{colors.neonGreen.500}", _dark: "{colors.neonGreen.500}" },
          },
          contrast: {
            value: { _light: "{colors.black}", _dark: "{colors.black}" },
          },
          fg: {
            value: { _light: "{colors.neonGreen.600}", _dark: "{colors.neonGreen.400}" },
          },
          muted: {
            value: { _light: "{colors.neonGreen.100}", _dark: "{colors.neonGreen.950}" },
          },
          subtle: {
            value: { _light: "{colors.neonGreen.50}", _dark: "{colors.neonGreen.950}" },
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
