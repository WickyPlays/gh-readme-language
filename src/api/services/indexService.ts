import axios from "axios";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.warn("⚠️ No GitHub token provided - you may hit rate limits");
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

const graphqlRequest = async (query: string, variables: Record<string, any>) => {
  try {
    const response = await axios.post(
      GITHUB_GRAPHQL_URL,
      { query, variables },
      {
        headers: {
          Authorization: GITHUB_TOKEN ? `Bearer ${GITHUB_TOKEN}` : "",
          "Content-Type": "application/json",
        },
      }
    );
    if (response.data.errors) {
      throw new Error(
        response.data.errors.map((e: any) => e.message).join("\n")
      );
    }
    return response.data.data;
  } catch (err) {
    console.error("❌ GraphQL request failed:", err);
    throw err;
  }
};

export const getUserReposWithStats = async (
  username: string,
  includeAllAffiliations: boolean = false
): Promise<UserReposResponse> => {
  const repos = await getGithubReposWithLanguages(username, includeAllAffiliations);
  const languageStats = calculateLanguageStats(repos);

  const transformedRepos: TransformedRepository[] = repos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.fullName,
    language: repo.primaryLanguage?.name ?? null,
    languages: Object.fromEntries(
      repo.languages.map((lang) => [lang.name, lang.size ?? 0])
    ),
  }));

  return {
    title: `GitHub Repositories of ${username}`,
    username,
    repositories: transformedRepos,
    languageStats,
  };
};

export const getGithubReposWithLanguages = async (
  username: string,
  includeAllAffiliations: boolean = false
): Promise<Repository[]> => {
  const query = `
    query ($username: String!, $cursor: String, $affiliations: [RepositoryAffiliation]) {
      user(login: $username) {
        repositories(
          first: 100,
          after: $cursor,
          ownerAffiliations: $affiliations,
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
            owner { login }
            primaryLanguage { name color }
            languages(first: 50, orderBy: { field: SIZE, direction: DESC }) {
              edges {
                size
                node { name color }
              }
            }
          }
        }
      }
    }
  `;

  let allRepos: Repository[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const data = await graphqlRequest(query, {
      username,
      cursor,
      affiliations: includeAllAffiliations
        ? ["OWNER", "COLLABORATOR", "ORGANIZATION_MEMBER"]
        : ["OWNER"],
    });

    if (!data.user) throw new Error("User not found");

    const repos = data.user.repositories;
    hasNextPage = repos.pageInfo.hasNextPage;
    cursor = repos.pageInfo.endCursor;

    const transformedRepos: Repository[] = repos.nodes.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: `${username}/${repo.name}`,
      url: repo.url,
      primaryLanguage: repo.primaryLanguage
        ? { name: repo.primaryLanguage.name, color: repo.primaryLanguage.color }
        : null,
      languages: repo.languages.edges.map((edge: any) => ({
        name: edge.node.name,
        size: edge.size,
        color: edge.node.color,
      })),
    }));

    allRepos = allRepos.concat(transformedRepos);
  }

  return allRepos;
};

export const calculateLanguageStats = (repos: Repository[]): LanguageStat[] => {
  const languageMap: Record<string, { bytes: number; color: string | null }> = {};
  let totalBytes = 0;

  for (const repo of repos) {
    for (const lang of repo.languages) {
      if (!languageMap[lang.name]) {
        languageMap[lang.name] = { bytes: 0, color: lang.color ?? null };
      }
      languageMap[lang.name].bytes += lang.size ?? 0;
      totalBytes += lang.size ?? 0;
    }
  }

  let languageStats: LanguageStat[] = Object.entries(languageMap)
    .map(([name, { bytes, color }]) => ({
      name,
      size: bytes,
      percentage: totalBytes > 0 ? (bytes / totalBytes) * 100 : 0,
      color,
    }))
    .sort((a, b) => b.size - a.size);

  const threshold = 1; // group small langs into "Other"
  const mainLanguages = languageStats.filter((lang) => lang.percentage >= threshold);
  const otherLanguages = languageStats.filter((lang) => lang.percentage < threshold);

  if (otherLanguages.length > 0) {
    const otherBytes = otherLanguages.reduce((sum, lang) => sum + lang.size, 0);
    const otherPercentage = otherLanguages.reduce((sum, lang) => sum + lang.percentage, 0);

    mainLanguages.push({
      name: "Other",
      size: otherBytes,
      percentage: otherPercentage,
      color: "#cccccc",
    });
  }

  return mainLanguages;
};
