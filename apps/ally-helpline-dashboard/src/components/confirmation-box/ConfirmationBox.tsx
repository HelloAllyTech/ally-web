import { CopilotIcon } from "@/assets/icons";
import { Button } from "../generic/button";

type ConfirmationBoxProps = {
  text: string | React.ReactNode;
  onYes: () => void;
  onNo: () => void;
};

const ConfirmationBox = ({ ...props }: ConfirmationBoxProps) => {
  const {
    text = (
      <div>
        Good Job. You made use of counselling skills and
        counselling techniques. I noticed that you have been in sessions for
        a while now.

        Would you like to take a two-minute breather?
      </div>
    ),
    onYes,
    onNo,
  } = props;
  return (
    <>
      <div
        className={"rounded-lg px-5 py-4 text-sm mb-4"}
        style={{
          background:
            "linear-gradient(134.31deg, #D8C3F9 -105.84%, #EDF7EA -3.5%, #DAE3F8 62.45%)",
        }}
      >
        <div className="flex items-center mb-1">
          <CopilotIcon />
        </div>
        <div className="break-words">{text}</div>
      </div>
      <div className="flex text-sm gap-8 px-2">
        <Button
          onClick={onYes}
          className="w-20 text-center bg-[#EAF4ED] rounded-[38px] px-4 py-1 border border-[#D9D9D9] hover:bg-[#d5e6da]"
        >
          Yes
        </Button>
        <Button
          onClick={onNo}
          className="w-20 text-center bg-[#EAF4ED] rounded-[38px] px-4 py-1 border border-[#D9D9D9] hover:bg-[#d5e6da]"
        >
          No
        </Button>
      </div>
    </>
  );
};

export default ConfirmationBox;
