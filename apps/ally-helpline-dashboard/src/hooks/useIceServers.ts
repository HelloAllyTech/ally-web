import { xirsysIdent, xirsysSecret } from "@/constants/envVariables";
import { useState, useEffect } from "react";

interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

const useIceServers = () => {
  const [iceServers, setIceServers] = useState<IceServer>();
  

  useEffect(() => {
    const fetchIceServers = async () => {
      try {
        const response = await fetch("https://global.xirsys.net/_turn/Lifeline", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${btoa(`${xirsysIdent}:${xirsysSecret}`)}`
          },
          body: JSON.stringify({
            format: "urls",
            domain: window.location.hostname,
            room: "default"
          }),
        });

        const data = await response.json();
        if (data?.v?.iceServers) {
          setIceServers(data.v.iceServers);
        }
      } catch (error) {
        console.error("Failed to fetch ICE servers:", error);
      }
    };

    fetchIceServers();
  }, []);

  return iceServers;
};

export { useIceServers };
