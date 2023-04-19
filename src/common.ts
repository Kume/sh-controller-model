export const colors = {
  translucentBoard: [0, 0.6, 0, 0.8],
  board: [0, 0.6, 0, 0.8],
  red: [0.8, 0, 0],
  translucentRed: [0.8, 0, 0, 0.6],
} satisfies Record<string, [number, number, number, number?]>;

// 循環参照してしまうような定数定義はここで行う
export const commonSizeValue = {
  buttonPadSideScrewDistanceFromEdge: 8,
};
