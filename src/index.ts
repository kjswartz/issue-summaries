import { summary } from "@actions/core";
import { getOctokit } from "@actions/github";
import {
  createDiscussion,
  getRepoAndCategoryIds,
  getIssueComments,
} from "./api";
import {
  buildDiscussionBody,
  createSummaryContent,
  sortAndFilterIssues,
  runAiSummaryShellScript,
} from "./utils";
import { IssueComment } from "./issueComment";

const main = async () => {
  const isDryRun = process.env.IS_DRY_RUN == "true" ? true : false;
  const token = process.env.GH_TOKEN;
  const owner = process.env.REPO_OWNER;
  const repo = process.env.REPO_NAME;
  const categorySlug = process.env.CATEGORY_SLUG;
  const title = process.env.TITLE;
  if (!token || !owner || !repo || !categorySlug || !title) {
    throw new Error("missing required environment variables");
  }

  const octokit = getOctokit(token);
  console.log("Getting repository and category ids");
  const { categoryId, repositoryId } = await getRepoAndCategoryIds(
    octokit,
    owner,
    repo,
    categorySlug,
  );
  if (!categoryId || !repositoryId) {
    throw new Error("failed to get category or repository id");
  }

  console.log("Getting OPEN and CLOSED issue comments");
  const issueNodes = await getIssueComments(octokit, owner, repo);

  console.log("Sorting and filtering issues for /flex report comments");
  const { activeSortedIssuesData, closedSortedIssuesData } =
    await sortAndFilterIssues(issueNodes);

  console.log("Creating AI comment summary");
  const activeSummaries = await runAiSummaryShellScript(activeSortedIssuesData);
  const closedSummaries = await runAiSummaryShellScript(closedSortedIssuesData);

  console.log("Building discussion body with liquid template");
  const activeIssuesData = activeSummaries.map(
    (issue) => new IssueComment(issue),
  );
  const closedIssuesData = closedSummaries.map(
    (issue) => new IssueComment(issue),
  );
  const body = await buildDiscussionBody({
    activeIssuesData,
    closedIssuesData,
  });
  if (!body) {
    throw new Error("failed to create discussion body");
  }

  console.log(
    isDryRun ? "Dry run no discussion will be created" : "Creating discussion",
  );
  const url = isDryRun
    ? "dry_run"
    : await createDiscussion(octokit, repositoryId, categoryId, title, body);
  if (!url) {
    throw new Error("failed to create discussion");
  }

  console.log("Creating summary comment");
  const summaryContent = createSummaryContent(
    title,
    url,
    activeIssuesData,
    closedIssuesData,
  );
  summary.addRaw(summaryContent).write();
};

if (process.env.NODE_ENV !== "test") {
  main();
}
