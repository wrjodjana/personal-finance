import { ViewTransition } from "react";

const TAB_SLIDE = { "tab-forward": "tab-forward", "tab-back": "tab-back", default: "none" };

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={TAB_SLIDE} exit={TAB_SLIDE} default="none">
      {children}
    </ViewTransition>
  );
}
