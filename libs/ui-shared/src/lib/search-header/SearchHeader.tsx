import allyIcon from "./ally.svg?url";

/**
 * SearchHeader component displays the main header and optional description for the search UI.
 * @component
 * @param {Object} props
 * @param {boolean} [props.showDescriptionInMobile=true] - Whether to show the description on mobile devices.
 */

interface SearchHeaderProps {
  showDescriptionInMobile?: boolean;
  description?: string;
  logoAlt?: string;
}

const SearchHeader = ({
  showDescriptionInMobile = true,
  description = "Guidance, safety, and support — whenever you need it.",
  logoAlt = "Ally Logo",
}: SearchHeaderProps) => {
  return (
    <div
      className="w-full flex flex-col gap-2 items-center justify-center font-['IBM_Plex_Serif'] mb-4 mt-10"
      data-testid="search-header"
    >
      <img src={allyIcon} alt={logoAlt} className="w-24 h-16" data-testid="search-header-logo" />
      <span
        data-testid="search-header-description"
        className={`${
          showDescriptionInMobile ? "block" : "hidden"
        } sm:block text-[#000] text-center px-[10%]`}
      >
        {description}
      </span>
    </div>
  );
};

export default SearchHeader;
