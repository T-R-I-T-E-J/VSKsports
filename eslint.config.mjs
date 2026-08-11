import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // SQL injection: all database access goes through Prisma's typed client,
      // which parameterises every query. `$queryRaw`/`$executeRaw` are safe
      // (tagged templates parameterise their interpolations), but the *Unsafe*
      // variants take a plain string and will happily concatenate user input.
      // Ban them so the codebase's current zero-raw-SQL state can't silently
      // regress. If a raw query ever becomes genuinely necessary, use the
      // tagged-template form.
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[property.name='$queryRawUnsafe']",
          message:
            "$queryRawUnsafe concatenates strings into SQL. Use the $queryRaw tagged template, which parameterises interpolated values.",
        },
        {
          selector: "MemberExpression[property.name='$executeRawUnsafe']",
          message:
            "$executeRawUnsafe concatenates strings into SQL. Use the $executeRaw tagged template, which parameterises interpolated values.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
