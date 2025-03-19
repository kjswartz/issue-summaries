# create-discussion-summary

## Description

The purpose of this action is to automate the creation of a discussion post. All of the `OPEN` and `CLOSED` issues in the repository are searched and the issues with a comment created within the last 7 days of the workflow run, utilizing the `/summary` command are collected. The workflow attempts to summarize the comment using AI via the command line `gh models` extension. It is not always reliable, and sometimes the extension fails to install, possibly related to token issues, but not certian yet. If the attempt to summarize the comment fails, the workflow will still continue and create the discussion post. The user can then go and manually update the summary sections.

## Required Environment Variables:
* `IS_DRY_RUN`: If set, the discussion creation will be simulated. This allows you to preview which issues will be included in the discussion post.
* `GH_TOKEN`: The GitHub token to use for the gh model commands to create the AI. You cannot use a token created through GitHub App action for running gh cli commands.
* `REPO_OWNER`: Owner of the repository.
* `REPO_NAME`: Name of the repository.
* `CATEGORY_SLUG`: Slug of the discussion category under which to create the discussion.
* `TITLE`: Title for the discussion post.

## Functional Steps
1. Retrieves necessary environment variables.
  - @throws {Error} If any required environment variable is missing.
2. Initializes the GitHub Octokit client.
3. Fetches the repository and category IDs.
  - @throws {Error} If fetching repository or category ID fails.
4. Retrieves and processes active and closed issues data.
5. Builds the discussion body content.
  - @throws {Error} If creating the discussion body fails.
6. Creates the discussion on GitHub (or performs a dry run).
  - @throws {Error} If creating the discussion fails.
7. Generates and writes a summary of the workflow.

## Development
To install dependencies:
```bash
bun install
```

To run:
```bash
bun run start
```

To test:
```bash
bun test
```

To see lint errors:
```
bun run lint
```

To fix lint errors:
```
bun run lintFix
```

To create build:
```
bun run build
```