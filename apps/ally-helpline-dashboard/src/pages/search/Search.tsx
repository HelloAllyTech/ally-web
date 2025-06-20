import { SearchResources } from "@/components";

const Search = () => {
  return (
    <div className="h-full overflow-y-hidden flex h-[calc(100vh-50px)] sm:h-[calc(100vh-80px)] flex justify-center items-center px-[15%] pb-[100px] pt-[80px]">
      <SearchResources />
    </div>
  );
};

export default Search;
