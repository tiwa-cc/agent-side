## directories

- agent-side/
  - docir.toml
  - package.json
  - tsconfig.json
  - vite.config.ts

  - docs/
    - index.yml
    - sections/
      - concept.yml
      - renderer.yml

  - themes/
    - default.yml
    - technical.yml

  - src/
    - cli/
      - main.ts
      - commands/
        - validate.ts
        - render.ts
        - preview.ts

    - config/
      - loadConfig.ts
      - configSchema.ts

    - loader/
      - loadDoc.ts
      - resolveInclude.ts

    - schema/
      - docSchema.ts
      - blockSchemas.ts
      - themeSchema.ts

    - ast/
      - normalize.ts
      - types.ts

    - renderer/
      - types.ts
      - bootstrap/
        - renderDocument.ts
        - renderBlock.ts
        - templates/

    - preview/
      - index.html
      - main.ts

    - utils/
      - errors.ts
      - path.ts

  - tests/
    - fixtures/
    - snapshots/