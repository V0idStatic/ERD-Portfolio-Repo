## Build

### Easiest method

From the repository root, build and start localhost with one command:

```bat
collieai-local.cmd
```

This launcher uses the correct SQL and output paths automatically.

### Command Prompt (CMD) from the repository root

If the prompt ends with `ERD-Portfolio-Repo>`, run:

```bat
npx --yes @liam-hq/cli erd build --input CollieAI_ERD\collieAI.sql --format postgres --output-dir CollieAI_ERD\dist
```

Then start localhost:

```bat
npx --yes serve CollieAI_ERD\dist
```

### Command Prompt (CMD) from the CollieAI folder

If the prompt ends with `ERD-Portfolio-Repo\CollieAI_ERD>`, run:

```bat
local.cmd
```

This builds the ERD and starts localhost. The equivalent build-only command is:

```bat
npx --yes @liam-hq/cli erd build --input collieAI.sql --format postgres --output-dir dist
```

In CMD, use plain `npx`. If you switch to PowerShell and it blocks `npx.ps1`, use `npx.cmd` instead. Your installed Liam CLI expects the format name `postgres`.

## Run localhost

After the build finishes, run:

```bat
npx --yes serve dist
```

Open the address shown in Command Prompt, normally <http://localhost:3000>.

Keep Command Prompt open while using the ERD. Press `Ctrl+C` to stop localhost. After editing `collieAI.sql`, run `collieai-local.cmd` again.
