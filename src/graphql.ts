export const CREATE_DISCUSSION_MUTATION = `mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
  createDiscussion(input: { repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body }) {
    discussion {
      id
      url
    }
  }
}`;

export const REPO_AND_CATEGORY_IDS_QUERY = `query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    id
    discussionCategories(first: 100) {
      nodes {
        id
        slug
        description
      }
    }
  }
}`;

export const ISSUE_COMMENTS_QUERY = `query($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 100, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        number
        title
        state
        updatedAt
        closedAt
        comments(orderBy: {field: UPDATED_AT, direction: DESC}, first: 20) {
          nodes {
            createdAt
            body
            url
          }
        }
      }
    }
  }
}`;
