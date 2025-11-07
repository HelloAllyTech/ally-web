import { useNavigate } from "react-router-dom";

import { SuspendedUserIcon } from "@assets";

export const SuspendedUser = () => {
  const navigate = useNavigate();

  const GoToLogin = () => {
    navigate("/");
  };

  return (
    <div className="flex  flex-col justify-center  items-center h-screen gap-2">
      <div className="border rounded-lg px-16 py-10 flex flex-col justify-center items-center gap-2">
        <SuspendedUserIcon />
        <div className="text-2xl font-[Replay-pro]">Account Suspended</div>
        <div className="flex flex-col text-center font-primary">
          <div>Your account has been suspended. Contact your</div>
          <div>administrator for assistance</div>
        </div>

        <button
          className="border border-gray-300 rounded-full px-5 py-2 font-tertiary mt-8"
          onClick={GoToLogin}
        >
          Go to login
        </button>
      </div>
    </div>
  );
};
