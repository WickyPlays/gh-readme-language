import { Request, Response } from "express";
import { getUserReposWithStats } from "../services/indexService";

export const getUserRepos = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const allAffiliations = req.query?.allAffiliations === "true";
    const response = await getUserReposWithStats(username, allAffiliations);

    res.set("Content-Type", "image/svg+xml");
    res.render("index", { data: response });
  } catch (error) {
    console.error("Error fetching GitHub data:", error);

    let statusCode = 500;
    let errorMessage = "Failed to fetch GitHub data";

    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("user not found")
    ) {
      statusCode = 404;
      errorMessage = "GitHub user not found";
    } else if (
      error instanceof Error &&
      error.message.includes("API rate limit exceeded")
    ) {
      statusCode = 429;
      errorMessage = "GitHub API rate limit exceeded";
    }

    res.status(statusCode).json({
      success: false,
      error: {
        message: errorMessage,
      },
    });
  }
};
