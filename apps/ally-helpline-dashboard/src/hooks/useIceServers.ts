import { useState, useEffect } from "react";
import {
  xirsysIdent,
  xirsysDomain,
  xirsysSecret,
  xirsysChannel,
} from "@/constants/envVariables";

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
        const response = await fetch(`${xirsysDomain}/${xirsysChannel}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(`${xirsysIdent}:${xirsysSecret}`)}`,
          },
          body: JSON.stringify({
            format: "urls",
            domain: window.location.hostname,
            room: "default",
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
