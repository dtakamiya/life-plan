import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // .claude/.superpowers はローカルのツール用ディレクトリ（worktree の別チェックアウトを含む）。
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "out/**",
      "build/**",
      "coverage/**",
      ".claude/**",
      ".superpowers/**",
    ],
  },
];

export default eslintConfig;
