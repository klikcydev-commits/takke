import { create } from "zustand";

interface LayoutState {
  topInset: number;
  bottomInset: number;
  leftInset: number;
  rightInset: number;
  setInsets: (insets: { top: number; bottom: number; left: number; right: number }) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  topInset: 0,
  bottomInset: 0,
  leftInset: 0,
  rightInset: 0,
  setInsets: (insets) =>
    set({
      topInset: insets.top,
      bottomInset: insets.bottom,
      leftInset: insets.left,
      rightInset: insets.right,
    }),
}));
