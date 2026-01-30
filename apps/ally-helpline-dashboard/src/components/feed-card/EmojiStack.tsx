import { FC } from "react";

import { Emoji } from "emoji-picker-react";

interface EmojiStackProps {
  unicodeCodes: string[];
  emojiSize?: number;
  emojiContainerSize?: number;
}

const EmojiStack: FC<EmojiStackProps> = props => {
  const { unicodeCodes, emojiSize = 16, emojiContainerSize = 26 } = props;

  if (unicodeCodes.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center">
      {unicodeCodes.map((code, index) => (
        <div
          key={`${code}-${index}`}
          className="flex items-center justify-center bg-white border-[0.5px] border-border rounded-full"
          style={{
            width: emojiContainerSize,
            height: emojiContainerSize,
            marginLeft: index === 0 ? 0 : `-${emojiSize / 2}px`,
            zIndex: unicodeCodes.length - index,
          }}
        >
          <Emoji unified={code} size={emojiSize} />
        </div>
      ))}
    </div>
  );
};

export default EmojiStack;
