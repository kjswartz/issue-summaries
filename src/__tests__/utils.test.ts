import { describe, it, expect, mock } from "bun:test";
import {
  buildDiscussionBody,
  createSummaryContent,
  parseData,
  sortAndFilterIssues,
  runAiSummaryShellScript,
} from "../utils";
import { IssueComment, type IssuesData } from "../issueComment";
import { type IssuesResponseNode } from "../api";

const activeIssuesData: IssueComment[] = [
  new IssueComment({
    number: 1,
    title: "Title 1",
    trending: "🟢 on track",
    url: "https://1.com",
    update: "Update 1",
    summary: "Summary 1",
  }),
  new IssueComment({
    number: 2,
    title: "Title 2",
    trending: "🟡 at risk",
    url: "https://2.com",
    update: "Update 2",
    summary: "Summary 2",
  }),
];

const closedIssuesData = [
  new IssueComment({
    number: 3,
    title: "Title 3",
    trending: "🟣 done",
    url: "https://3.com",
    update: "Update 3",
    summary: "Summary 3",
  }),
];

const DISCUSSION_BODY = `### Summary
<!-- data key="summary" start -->
_insert summary here_
<!-- data end -->

### 🚀 Looking Ahead
<!-- data key="lookAhead" start -->
_insert lookahead details here_
<!-- data end -->

### 🟢 Active Initiatives
<!-- data key="activeProjectsSummary" start -->

  - 🟢 (on track) **[Title 1](https://1.com)**
    Summary 1

  - 🟡 (at risk) **[Title 2](https://2.com)**
    Summary 2

<!-- data end -->

### 🟣 Closed Projects
<!-- data key="closedProjectsSummary" start -->

  - 🟣 (done) **[Title 3](https://3.com)**
    Summary 3

<!-- data end -->
### Original Rollup Summary

<details><summary> Expand to read original content! </summary>
<!-- data key="activeProjectsRollup" start -->

  - 🟢 (on track) **[Title 1](https://1.com)**
    Update 1

  - 🟡 (at risk) **[Title 2](https://2.com)**
    Update 2

<!-- data end -->
<!-- data key="closedProjectsRollup" start -->

  - 🟣 (done) **[Title 3](https://3.com)**
    Update 3

<!-- data end -->
</details>

<!-- data key="isSummaryDiscussion" value="true" -->
<!-- data key="summaryDiscussion" value="summary" -->
`;

describe("buildDiscussionBody", () => {
  it("should return discussion body", async () => {
    const body = await buildDiscussionBody({
      activeIssuesData,
      closedIssuesData,
    });
    expect(body).toEqual(DISCUSSION_BODY);
  });
});

describe("createSummaryContent", () => {
  it("should return discussion title with url", () => {
    const title = "DRAFT Discussion Title";
    const url = "https://123.com";
    const string = `### Weekly Report Created
[DRAFT Discussion Title](https://123.com)
### 🟢 Weekly Report Issues
🟢 (on track) **[Title 1](https://1.com)**
Summary 1
🟡 (at risk) **[Title 2](https://2.com)**
Summary 2
### 🟣 Closed Issues
🟣 (done) **[Title 3](https://3.com)**
Summary 3
`;
    expect(
      createSummaryContent(title, url, activeIssuesData, closedIssuesData),
    ).toEqual(string);
  });
});

describe("parseData", () => {
  it("should return parsed data object", () => {
    const commentBody = `### Trending

    <!-- data key="trending" start -->
    🟢 on track
    <!-- data end -->
  
    ### Update
  
    <!-- data key="update" start -->
    test update
    <!-- data end -->
  
  
  
    <!-- data key="isSummaryReport" value="true" -->
    <!-- data key="summaryReportName" value="summary" -->`;
    expect(parseData(commentBody)).toEqual({
      trending: "🟢 on track\n",
      update: "test update\n",
      isSummaryReport: "true",
      summaryReportName: "summary",
    });
  });
});

describe("sortAndFilterIssues", () => {
  it("should return active and closed issues data", async () => {
    const currentDate = new Date();
    const issueNodes: IssuesResponseNode[] = [
      {
        comments: {
          nodes: [
            {
              body: `<!-- data key="isSummaryReport" value="true" -->
                <!-- data key="update" start -->
                test update old update
                <!-- data end -->
              <!-- data key="summaryReportName" value="summary" -->`,
              createdAt: `${new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000)}`,
              url: "https:/123.com",
            },
            {
              body: `<!-- data key="isSummaryReport" value="true" -->
                <!-- data key="update" start -->
                test update latest update
                <!-- data end -->
              <!-- data key="summaryReportName" value="summary" -->`,
              createdAt: `${currentDate}`,
              url: "https:/123.com",
            },
          ],
        },
        state: "OPEN",
        number: 1,
        title: "test",
        updatedAt: `${currentDate}`,
        closedAt: null,
      },
      {
        comments: {
          nodes: [
            {
              body: `<!-- data key="isSummaryReport" value="true" -->
              <!-- data key="update" start -->
              test update older update
              <!-- data end -->
              <!-- data key="summaryReportName" value="summary" -->`,
              createdAt: `${new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000)}`,
              url: "https:/123.com",
            },
            {
              body: `<!-- data key="isSummaryReport" value="true" -->
              <!-- data key="update" start -->
              test update latest update
              <!-- data end -->
              <!-- data key="summaryReportName" value="summary" -->`,
              createdAt: `${currentDate}`,
              url: "https:/321.com",
            },
          ],
        },
        state: "CLOSED",
        number: 2,
        title: "test",
        closedAt: `${currentDate}`,
        updatedAt: `${currentDate}`,
      },
    ];
    const sorted = await sortAndFilterIssues(issueNodes);
    expect(sorted).toEqual({
      activeSortedIssuesData: [
        {
          isSummaryReport: "true",
          summaryReportName: "summary",
          update: "test update latest update",
          number: 1,
          title: "test",
          url: "https:/123.com",
          summary: null,
        },
      ],
      closedSortedIssuesData: [
        {
          isSummaryReport: "true",
          summaryReportName: "summary",
          update: "test update latest update",
          number: 2,
          title: "test",
          url: "https:/321.com",
          summary: null,
        },
      ],
    });
  });
});

describe("runAiSummaryShellScript", () => {
  const isTesting = true;
  const data: IssuesData[] = [
    {
      isSummaryReport: "true",
      summaryReportName: "summary",
      update: "test update latest update",
      number: 1,
      title: "test",
      url: "https:/123.com",
      summary: null,
    },
  ];

  it("should return summarized data", async () => {
    const result = await runAiSummaryShellScript(data, isTesting);
    expect(result).toEqual([
      {
        isSummaryReport: "true",
        summaryReportName: "summary",
        update: "test update latest update",
        number: 1,
        title: "test",
        url: "https:/123.com",
        summary: "test update latest update summarized",
      },
    ]);
  });

  it("should return original data if error", async () => {
    // Mock the function to throw an error
    mock.module("../utils", () => ({
      exec: () => {
        return { stderr: "error processing request" };
      },
    }));

    const result = await runAiSummaryShellScript(data, isTesting);
    expect(result).toEqual(data);
  });
});
