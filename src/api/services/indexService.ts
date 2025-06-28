import axios from "axios";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.warn("No GitHub token provided - you may hit rate limits");
}

interface Language {
  name: string;
  size?: number;
  color?: string | null;
}

interface Repository {
  id: string;
  name: string;
  fullName: string;
  url: string;
  primaryLanguage: Language | null;
  languages: Language[];
}

interface TransformedRepository {
  id: string;
  name: string;
  full_name: string;
  language: string | null;
  languages: Record<string, number>;
}

interface LanguageStat {
  name: string;
  percentage: number;
  size: number;
  color: string | null;
}

interface UserReposResponse {
  title: string;
  username: string;
  repositories: TransformedRepository[];
  languageStats: LanguageStat[];
}

export const getUserReposWithStats = async (
  username: string
): Promise<UserReposResponse> => {
  const repos = await getGithubReposWithLanguages(username);
  const languageStats = calculateLanguageStats(repos);

  const transformedRepos = repos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.fullName,
    language: repo.primaryLanguage?.name || null,
    languages: repo.languages.reduce((acc, lang) => {
      acc[lang.name] = lang.size ?? 0;
      return acc;
    }, {} as Record<string, number>),
  }));

  return {
    title: `GitHub Repositories of ${username}`,
    username,
    repositories: transformedRepos,
    languageStats,
  };
};

export const getGithubReposWithLanguages = async (
  username: string
): Promise<Repository[]> => {
  const query = `
    query ($username: String!, $cursor: String) {
      user(login: $username) {
        repositories(
          first: 100,
          after: $cursor,
          ownerAffiliations: OWNER,
          orderBy: { field: UPDATED_AT, direction: DESC },
          isFork: false
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            name
            url
            primaryLanguage {
              name
              color
            }
            languages(first: 15, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node {
                  name
                  color
                }
              }
            }
          }
        }
      }
    }
  `;

  let allRepos: Repository[] = [];
  let hasNextPage = true;
  let cursor = null;

  try {
    while (hasNextPage) {
      const response: any = await axios.post(
        GITHUB_GRAPHQL_URL,
        { query, variables: { username, cursor } },
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.errors) {
        throw new Error(
          response.data.errors.map((e: any) => e.message).join("\n")
        );
      }

      if (!response.data.data?.user) {
        throw new Error("User not found");
      }

      const repos = response.data.data.user.repositories;
      hasNextPage = repos.pageInfo.hasNextPage;
      cursor = repos.pageInfo.endCursor;

      const transformedRepos = repos.nodes.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        fullName: `${username}/${repo.name}`,
        url: repo.url,
        primaryLanguage: repo.primaryLanguage
          ? {
              name: repo.primaryLanguage.name,
              color: repo.primaryLanguage.color,
            }
          : null,
        languages: repo.languages.edges.map((edge: any) => ({
          name: edge.node.name,
          size: edge.size,
          color: edge.node.color,
        })),
      }));

      allRepos = [...allRepos, ...transformedRepos];
    }

    return allRepos;
  } catch (error) {
    console.error("Error fetching repositories with GraphQL:", error);
    throw error;
  }
};

export const calculateLanguageStats = (repos: Repository[]) => {
  const languageMap: Record<string, { bytes: number; color: string | null }> =
    {};
  let totalBytes = 0;

  repos.forEach((repo) => {
    repo.languages.forEach((lang) => {
      if (!languageMap[lang.name]) {
        languageMap[lang.name] = {
          bytes: 0,
          color: lang.color || null,
        };
      }
      languageMap[lang.name].bytes += lang.size || 0;
      totalBytes += lang.size || 0;
    });
  });

  let languageStats = Object.entries(languageMap)
    .map(([name, { bytes, color }]) => ({
      name,
      size: bytes,
      percentage: totalBytes > 0 ? (bytes / totalBytes) * 100 : 0,
      color,
    }))
    .sort((a, b) => b.size - a.size);

  const threshold = 1;
  const mainLanguages = languageStats.filter(
    (lang) => lang.percentage >= threshold
  );
  const otherLanguages = languageStats.filter(
    (lang) => lang.percentage < threshold
  );

  if (otherLanguages.length > 0) {
    const otherBytes = otherLanguages.reduce((sum, lang) => sum + lang.size, 0);
    const otherPercentage = otherLanguages.reduce(
      (sum, lang) => sum + lang.percentage,
      0
    );

    mainLanguages.push({
      name: "Other",
      size: otherBytes,
      percentage: otherPercentage,
      color: "#cccccc",
    });
  }

  return mainLanguages;
};
