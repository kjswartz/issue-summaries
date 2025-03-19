import { describe, it, expect } from "bun:test";
import { IssueComment } from "../issueComment";

describe("IssueComment class", () => {
  const issue = {
    number: 1,
    title: "Active Issue",
    trending: "🟢 on track",
    url: "https://123.com",
    target_date: "2022-01-01",
    update: "Update",
    summary: "Summary 123",
  };
  const issueComment = new IssueComment(issue);

  it("should create a issueComment if correct input", () => {
    expect(issueComment).toBeInstanceOf(IssueComment);
  });

  it("should return title", () => {
    expect(issueComment.title).toEqual(
      "🟢 (on track) **[Active Issue](https://123.com)**",
    );
  });

  it("should return body", () => {
    expect(issueComment.body).toEqual("Target Date: 2022-01-01\nUpdate");
  });

  it("should return summary", () => {
    expect(issueComment.summary).toEqual("Summary 123");
  });
});
