import { SearchResources } from "@components";

export const Search = () => {
  return (
    <div className="h-full overflow-y-hidden md:h-[calc(100dvh-30px)] flex justify-center items-center sm:px-[15%] px-0">
      <SearchResources />
    </div>
  );
};
