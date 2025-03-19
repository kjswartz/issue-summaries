export interface IssuesData {
  number: number;
  title: string;
  url: string;
  summary: string | null;
  trending?: string;
  target_date?: string;
  update?: string;
  isFlexReport?: string;
  flexReportName?: string;
}

interface BaseIssueCommentTypes {
  title: string;
  body: string;
  summary: string | null;
}

export interface IssueCommentType extends BaseIssueCommentTypes {
  toPlainObject: BaseIssueCommentTypes;
}

export class IssueComment implements IssueCommentType {
  private issue: IssuesData;

  constructor(issue: IssuesData) {
    this.issue = issue;
  }

  public get title(): string {
    const statusLine = this.issue.trending?.trim().split(" ");
    const statusColor = statusLine?.slice(0, 1);
    const statusDescription = statusLine?.slice(1).join(" ");
    return `${statusColor} (${statusDescription}) **[${this.issue.title}](${this.issue.url})**`;
  }

  public get body(): string {
    let body = "";
    if (this.targetDate) {
      body += `Target Date: ${this.targetDate}\n`;
    }
    body += `${this.issue.update}`;
    return body;
  }

  public get summary(): string | null {
    return this.issue.summary;
  }

  public get targetDate(): string | undefined {
    return this.issue.target_date;
  }

  public get toPlainObject(): BaseIssueCommentTypes {
    return {
      title: this.title,
      body: this.body,
      summary: this.issue.summary,
    };
  }
}
