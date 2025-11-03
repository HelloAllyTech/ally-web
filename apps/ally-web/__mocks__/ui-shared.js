export const logger = {
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
};

export const SearchClient = ({ searchQuery, category, totalDocumentCount }) => (
  <div data-testid="search-client">
    <h1>Search Results</h1>
    <p>Query: {searchQuery}</p>
    <p>Category: {category || "All"}</p>
    <p>Total: {totalDocumentCount}</p>
  </div>
);
