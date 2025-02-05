import { atom } from "recoil";
import { User } from "@/types/user";

export const userState = atom<User | null>({
  key: "userState",
  default: null,
});

export const isAuthenticatedState = atom<boolean>({
  key: "isAuthenticatedState",
  default: false,
});
