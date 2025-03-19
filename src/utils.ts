import { promisify } from "node:util";
import { exec as execCallback } from "node:child_process";
import { Liquid } from "liquidjs";
import { IssueComment, type IssuesData } from "./issueComment";
import { type IssuesResponseNode } from "./api";
import path from "path";

const SEVEN_DAYS_AGO = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);

const BUILD_DIRECTORY = "./dist";

const scriptPath =
  process.env.NODE_ENV !== "test"
    ? `${BUILD_DIRECTORY}/scripts/summarize.sh`
    : path.join(__dirname, "scripts/summarize.sh");

const templatePath =
  process.env.NODE_ENV !== "test"
    ? `${BUILD_DIRECTORY}/templates/discussionTemplate.md.liquid`
    : path.join(__dirname, "templates/discussionTemplate.md.liquid");

export const exec = promisify(execCallback);

export const buildDiscussionBody = async (data: {
  activeIssuesData: IssueComment[];
  closedIssuesData: IssueComment[];
}) => {
  const liquidEngine = new Liquid();
  try {
    const body: string = await liquidEngine.renderFileSync(templatePath, {
      activeIssuesData: data.activeIssuesData.map(
        (issue) => issue.toPlainObject,
      ),
      closedIssuesData: data.closedIssuesData.map(
        (issue) => issue.toPlainObject,
      ),
    });
    return body;
  } catch (error) {
    console.log(`Error rendering discussion template: ${error}`);
    return;
  }
};

export const createSummaryContent = (
  title: string,
  url: string,
  activeIssuesData: IssueComment[],
  closedIssuesData: IssueComment[],
) => {
  const isDryrun = url === "dry_run";
  let summaryContent = isDryrun
    ? `### Weekly Report Dry Run\n`
    : `### Weekly Report Created\n`;
  summaryContent += isDryrun ? `${title}\n` : `[${title}](${url})\n`;
  summaryContent += `### 🟢 Weekly Report Issues\n`;

  if (activeIssuesData.length > 0) {
    activeIssuesData.forEach((issue) => {
      summaryContent += `${issue.title}\n`;
      if (issue.targetDate)
        summaryContent += `Target Date: ${issue.targetDate}\n`;
      if (issue.summary) summaryContent += `${issue.summary}\n`;
    });
  } else {
    summaryContent += `No active issues found\n`;
  }
  summaryContent += `### 🟣 Closed Issues\n`;
  if (closedIssuesData.length > 0) {
    closedIssuesData.forEach((issue) => {
      summaryContent += `${issue.title}\n`;
      if (issue.summary) summaryContent += `${issue.summary}\n`;
    });
  } else {
    summaryContent += `No closed issues found\n`;
  }
  return summaryContent;
};

export const sortAndFilterIssues = async (issueNodes: IssuesResponseNode[]) => {
  const activeSortedIssuesData: IssuesData[] = [];
  const closedSortedIssuesData: IssuesData[] = [];

  for (const issue of issueNodes) {
    if (!issue.comments.nodes.length) {
      continue;
    }
    // sort comments by createdAt date descending
    const issueComments = issue.comments.nodes.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    for (const comment of issueComments) {
      const parsed = parseData(comment.body);
      // if issue comment createdAt within last 7 days add to activeIssuesData
      if (
        parsed["isSummaryReport"] === "true" &&
        parsed["summaryReportName"] === "summary" &&
        new Date(comment.createdAt) >= SEVEN_DAYS_AGO
      ) {
        const issueData = {
          ...parsed,
          update: parsed["update"]?.trim(),
          number: issue.number,
          title: issue.title,
          url: comment.url,
          summary: null,
        };
        if (issue.state === "OPEN") {
          activeSortedIssuesData.push(issueData);
        } else {
          closedSortedIssuesData.push(issueData);
        }
        break;
      }
    }
  }

  return {
    activeSortedIssuesData,
    closedSortedIssuesData,
  };
};

export const parseData = (commentBody: string): Record<string, string> => {
  let keyMarker: string | null = null;
  const data: Record<string, string> = {};

  const lines = commentBody.split("\n");
  lines.forEach((line) => {
    const startKey = line.match(/<!-- data key="(\w+)" start -->/);
    if (startKey) {
      const key = startKey[1].trim();
      keyMarker = key;
      return;
    }

    const endKey = line.match(/<!-- data end -->/);
    if (endKey) {
      keyMarker = null;
      return;
    }

    if (keyMarker) {
      data[keyMarker] = (data[keyMarker] || "") + line.trim() + "\n";
      return;
    }

    const dataPatternKeyValue = line.match(
      /<!-- data key="(\w+)" value="(\w+)" -->/,
    );
    if (dataPatternKeyValue) {
      const key = dataPatternKeyValue[1].trim();
      const value = dataPatternKeyValue[2].trim();
      data[key] = value;
      return;
    }
  });
  return data;
};

export const runAiSummaryShellScript = async (
  payload: IssuesData[],
  isTesting?: boolean,
): Promise<IssuesData[]> => {
  const stringData = JSON.stringify(
    payload.map((issue) => JSON.stringify(issue)),
  );
  const command = `${scriptPath} ${stringData} ${isTesting ? "true" : "false"}`;
  const { stdout, stderr } = await exec(command);
  if (stderr) {
    console.error("stderr:", stderr);
    return payload;
  }
  try {
    return JSON.parse(stdout);
  } catch (error) {
    console.error("runAiSummaryShellScript ERROR: ", error);
    return payload;
  }
};
