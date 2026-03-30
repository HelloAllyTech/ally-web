import lifelineIcon from "./lifeline.svg?url";

/**
 * SearchHeader component displays the main header and optional description for the search UI.
 * @component
 * @param {Object} props
 * @param {boolean} [props.showDescriptionInMobile=true] - Whether to show the description on mobile devices.
 */

const SearchHeader = ({ showDescriptionInMobile = true }) => {
  return (
    <div
      className="w-full flex flex-col gap-2 items-center justify-center font-['IBM_Plex_Serif'] mb-4 mt-10"
      data-testid="search-header"
    >
      <img
        src={lifelineIcon}
        alt="lifeline Logo"
        className="w-24 h-16"
        data-testid="search-header-logo"
      />
      <span
        data-testid="search-header-description"
        className={`${
          showDescriptionInMobile ? "block" : "hidden"
        } sm:block text-[#000] text-center px-[10%]`}
      >
        Guidance, safety, and support — whenever you need it.
      </span>
    </div>
  );
};

export default SearchHeader;
