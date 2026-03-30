import { logger } from "@ally-ui-mono/ui-shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION;

export const INITIAL_FETCH_LIMIT = 10;

// TODO: make the params in object
const fetchReferenceDocuments = async (
  query: string,
  category?: string,
  limit: number = INITIAL_FETCH_LIMIT,
  excludedIds?: string[],
) => {
  try {
    let filters = undefined;
    if (category) {
      filters = { category };
    }
    const response = await fetch(
      `${API_BASE_URL}/api/${API_VERSION}/reference-document/search/public`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, limit, filters, excludedIds }),
      },
    );
    return response.json();
  } catch (error) {
    logger.info(`Error in fetchReferenceDocuments: ${error}`);
    throw error;
  }
};

const fetchCategories = async () => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/${API_VERSION}/reference-document/categories`,
      {
        method: "GET",
      },
    );
    return response.json();
  } catch (error) {
    logger.info(`Error in fetchCategories: ${error}`);
    throw error;
  }
};

export { fetchReferenceDocuments, fetchCategories };
