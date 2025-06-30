import { useEffect, useState } from "react";
import "./Breather.css"; // Import the CSS for animations
import BackgroundVideo from "@/assets/videos/BreatherVideo.mp4";

type BreatherProps = {
  onComplete: () => void;
};

const Breather = ({ onComplete }: BreatherProps) => {
  const [seconds, setSeconds] = useState(120); // 2 minutes
  const [isBreathingIn, setIsBreathingIn] = useState(true); // Start with breathing in

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => (prev > 0 ? prev - 1 : 0));

      // Change breathing state only after the first 10 seconds
      if (seconds > 0 && seconds % 10 === 0 && seconds !== 120) {
        setIsBreathingIn(prev => !prev);
      }
      if (seconds === 1) {
        onComplete();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [seconds]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const secs = time % 60;
    return `${minutes}:${secs < 10 ? `0${secs}` : secs}`;
  };

  return (
    <div
      className="flex flex-col items-center h-full relative"
      style={{ backgroundColor: "#ffffff" }}
    >
      <video
        autoPlay
        loop
        muted
        className="absolute top-0 left-0 w-full h-full opacity-50 object-cover"
      >
        <source src={BackgroundVideo} type="video/mp4" />
      </video>
      <div className="m-5 text-3xl">{formatTime(seconds)}</div>
      <div className={`circle mt-[165px] ${isBreathingIn ? "breathing-in" : "breathing-out"}`}>
        <span className="text-black text-2xl">{isBreathingIn ? "Breathe in" : "Breathe out"}</span>
      </div>
    </div>
  );
};

export default Breather;
