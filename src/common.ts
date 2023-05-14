export const colors = {
  translucentBoard: [0, 0.6, 0, 0.8],
  board: [0, 0.6, 0, 0.8],
  red: [0.8, 0, 0],
  translucentRed: [0.8, 0, 0, 0.6],
} satisfies Record<string, [number, number, number, number?]>;

// 循環参照してしまうような定数定義はここで行う
export const commonSizeValue = {
  gripThickness: 1,
  gripSideThickness: 2,
  buttonPadSideScrewDistanceFromEdge: 6.5,
  /** トリガーとグリップの接続部分の高さ */
  triggerJointHeight: 15,
  /** メイン(トリガー等)部分に対する電池ボックスの傾き */
  batteryBoxRotateDegree: 10,
  /** メイン(トリガー等)部分に対するグリップの傾き */
  gripRotateDegree: 24,

  basicScrewHeadHeight: 2.5,

  buttonPadThickness: 12,
  buttonPadRotationDegree: -76,
  /** ネジ締結部分の厚さ */
  buttonPadScrewBaseThickness: 1.5,
  buttonPadWallThickness: 1.5,

  buttonPadJointLength: 16,
  buttonPadJointScrewDistance: 5,

  triggerJointSocketThickness: 1,
  triggerButtonFaceRotateDegree: 34,
};
