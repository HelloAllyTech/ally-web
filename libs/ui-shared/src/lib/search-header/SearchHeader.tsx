const SearchHeader = ({showDescriptionInMobile = true}) => {
  return (
    <div className="w-full flex flex-col gap-2 items-center justify-center font-['IBM_Plex_Serif'] mb-[18px]">
      <span className="sm:text-[64px] text-[48px] sm:leading-[70px] leading-[50px] text-[#0D0D0D] italic">Ally</span>
      <span className={`${showDescriptionInMobile ? 'block' : 'hidden'} sm:block text-[#000] text-center px-[10%]`}>
        Guidance, safety, and support — whenever you need it.
      </span>
    </div>
  );
};

export default SearchHeader;