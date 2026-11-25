import js from "@eslint/js";
import ts from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
export default ts.config(
  {
    ignores: [
      "dist/**",
      "playwright-report/**",
      "test-results/**",
      ".claude/worktrees/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": hooks },
    rules: { ...hooks.configs.recommended.rules },
  },
  {
    // UI and shared modules reach the rules only through the src/game.ts facade.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/game.ts", "src/engine/**", "src/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/engine", "**/engine/*"],
              message: "Import from ./game, not engine internals.",
            },
          ],
        },
      ],
    },
  },
  {
    // The engine never depends on the UI; only shared data modules.
    files: ["src/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*", "!../progression", "!../expeditions"],
              message:
                "The engine may only import ../progression and ../expeditions.",
            },
            {
              group: ["react", "react-dom/*"],
              message: "Keep rules independent of React.",
            },
          ],
        },
      ],
    },
  },
);
