import { SearchResources } from "@/components";

// TODO: Remove this once we have a real suggestions API
export const sampleSuggestions = ["Grounding techniques", "Boundaries", "Questions to encourage disclosure", "Things to say to help process grief"];

const Search = () => {
  return (
    <div className="h-full overflow-y-hidden flex h-[calc(100vh-50px)] sm:h-[calc(100vh-80px)] flex justify-center items-center px-[15%] pb-[100px]">
      <SearchResources />
    </div>
  );
};

export default Search;
