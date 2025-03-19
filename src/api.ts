import { Octokit } from "@octokit/core";
import {
  CREATE_DISCUSSION_MUTATION,
  REPO_AND_CATEGORY_IDS_QUERY,
  ISSUE_COMMENTS_QUERY,
} from "./graphql";

interface DiscussionMutationResponse {
  createDiscussion: {
    discussion: {
      id: string;
      url: string;
    };
  };
}

interface RepoAndCategoryIdsResponse {
  repository: {
    id: string;
    discussionCategories: {
      nodes: {
        id: string;
        slug: string;
        description: string;
      }[];
    };
  };
}

export interface IssuesResponseNode {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED";
  updatedAt: string;
  closedAt: string | null;
  comments: {
    nodes: {
      createdAt: string;
      body: string;
      url: string;
    }[];
  };
}

interface IssuesResponse {
  repository: {
    issues: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
      };
      nodes: IssuesResponseNode[];
    };
  };
}

export const getRepoAndCategoryIds = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  categorySlug: string,
) => {
  let categoryId;
  let repositoryId;
  try {
    const response = await octokit.graphql<RepoAndCategoryIdsResponse>(
      REPO_AND_CATEGORY_IDS_QUERY,
      {
        owner,
        name: repo,
      },
    );

    repositoryId = response.repository.id;
    categoryId = response.repository.discussionCategories.nodes.find(
      ({ slug }) => slug === categorySlug,
    )?.id;
  } catch (error) {
    console.log(error);
  }

  return { categoryId, repositoryId };
};

export const createDiscussion = async (
  octokit: Octokit,
  repositoryId: string,
  categoryId: string,
  title: string,
  body: string,
) => {
  let url: string | null = null;
  try {
    const response = await octokit.graphql<DiscussionMutationResponse>(
      CREATE_DISCUSSION_MUTATION,
      {
        repositoryId,
        categoryId,
        title,
        body,
      },
    );

    url = response?.createDiscussion?.discussion?.url;
  } catch (error) {
    console.error(error);
  }

  return url;
};

export const getIssueComments = async (
  octokit: Octokit,
  owner: string,
  repo: string,
) => {
  let issueNodes: IssuesResponseNode[] = [];
  let pageInfo: {
    hasNextPage: boolean;
    endCursor?: string;
  } = { hasNextPage: true };

  try {
    while (pageInfo?.hasNextPage) {
      console.log("Fetching issues comments: ", pageInfo?.endCursor);
      const {
        repository: { issues },
      } = await octokit.graphql<IssuesResponse>(ISSUE_COMMENTS_QUERY, {
        owner,
        name: repo,
        cursor: pageInfo.endCursor,
      });
      pageInfo = issues.pageInfo;
      issueNodes = issueNodes.concat(issues.nodes);
    }
  } catch (error) {
    console.error(error);
  }

  return issueNodes;
};
