import { SearchResources } from "@/components";

// TODO: Remove this once we have a real suggestions API
export const sampleSuggestions = ["Grounding techniques", "Boundaries", "Questions to encourage disclosure", "Things to say to help process grief"];

const Search = () => {
  return (
    <div className="h-full flex justify-center items-center">
      <SearchResources />
    </div>
  );
};

export default Search;
