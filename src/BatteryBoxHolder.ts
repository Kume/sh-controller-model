import {addColor, Cacheable, Centered, chamfer, halfToFull, legacyCash} from './utls';
import {Viewable} from './types';
import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {circle, cuboid, cylinder, polygon, rectangle, roundedCuboid} from '@jscad/modeling/src/primitives';
import {
  mirrorZ,
  rotate,
  rotateX,
  rotateY,
  translate,
  translateX,
  translateY,
  translateZ,
} from '@jscad/modeling/src/operations/transforms';
import {intersect, subtract, union} from '@jscad/modeling/src/operations/booleans';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {degToRad} from '@jscad/modeling/src/utils';
import {commonSizeValue} from './common';
import {offset} from '@jscad/modeling/src/operations/expansions';
import {BatteryBoxTriggerJoint} from './BatteryBoxTriggerJoint';
import {hull} from '@jscad/modeling/src/operations/hulls';

interface BatteryBoxHolderProps {
  readonly minXDistanceFromGripBottom: number;
  readonly jointOffset: number;
}

export class BatteryBoxHolder extends Cacheable implements Viewable {
  public readonly batteryBox = new BatteryBox();
  public readonly joint = new BatteryBoxTriggerJoint();

  public readonly width = 30;
  public readonly baseHeight = 11.2;
  public readonly baseLength = 65;
  public readonly baseThickness = 1.8;

  public readonly topRadius = 3;
  public readonly topHeight = 6.8;
  public readonly topWidth = this.width - 0.8 * 2;
  public readonly topLengthMin = 2.3;
  public readonly topLengthMax = 14.3;
  public readonly topThickness = 1.2;
  public readonly topEndThickness = 1.5;
  public readonly topEndOffset = 0.5;

  public readonly color = [0.7, 0.7, 0.7] as const;

  public readonly endThickness = 3;

  public readonly grooveWidth = 3.7;
  public readonly grooveHeight = 10.2;
  public readonly grooveDepth = 2;
  public readonly grooveDistance = 10.2; // 左右の溝の端から端までの距離

  public readonly cutoutDepth = 3.5;
  public readonly cutoutWidth = 8.2;

  public readonly basementThickness = 1.2;
  public readonly basementHeight = 18;

  public constructor(public readonly props: BatteryBoxHolderProps) {
    super();
  }

  public get displayName() {
    return 'BatteryBoxHolder';
  }

  public get viewerItems() {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'outlineHalf', model: () => this.outlineHalf},
        {label: 'half', model: () => this.half},
        {label: 'full', model: () => this.full},
        {label: 'full2', model: () => this.full2},
        {label: 'coverHalf', model: () => this.coverHalf},
        {label: 'fullWithBatteryBox', model: () => this.fullWithBatteryBox},
        {label: 'halfWithCover', model: () => this.halfWithCover},
        {label: 'switchPusher', model: () => this.switchPusher},
      ];
    });
  }

  public get baseOutlineHalf() {
    return Centered.cuboid([this.baseHeight, this.width / 2, this.baseLength]);
  }

  public get outlineHalf(): Geom3[] {
    const topFace = this.makeTopFaceHalf();
    const baseRect = Centered.rectangle([this.baseHeight, this.width / 2]);
    return [
      addColor(
        this.color,
        extrudeLinear({height: this.baseLength}, union(translateX(this.baseHeight, topFace), baseRect)),
      ),
    ];
  }

  /* グリップの領域を削るために極端に大きめに定義した領域 */
  public get extraLooseOutlineHalf(): Geom3 {
    return union(
      translateY(
        this.width / 2,
        rotateX(Math.PI / 2, extrudeLinear({height: this.width / 2}, offset({delta: 0.25}, this.baseSideFace))),
      ),
      translateX(this.baseHeight, Centered.cuboid([30, this.width / 2, this.baseLength + 20])),
    );
  }

  public get half2(): Geom3[] {
    const bottomOffset = 0.5;
    const bottomWidth = this.width / 2 - this.baseThickness - bottomOffset;
    return [
      // 後方の壁
      subtract(
        Centered.cuboid([this.baseHeight, this.width / 2, this.endThickness]),
        translate(
          [this.baseHeight - this.cutoutDepth, 0, 0],
          Centered.cuboid([this.cutoutDepth, this.cutoutWidth / 2, this.endThickness]),
        ),
        chamfer(rectangle({size: [this.baseHeight, this.width], center: [this.baseHeight / 2, 0]}), 1),
      ),

      // 横壁
      subtract(
        translateY(
          this.width / 2,
          rotateX(Math.PI / 2, extrudeLinear({height: this.baseThickness}, this.baseSideFace)),
        ),
        chamfer(rectangle({size: [this.baseHeight, this.width], center: [this.baseHeight / 2, 0]}), 1),
      ),

      // 底面
      translateZ(this.endThickness, Centered.cuboid([1, bottomWidth, this.baseLength - this.endThickness])),

      // 底面と横壁の隙間を埋める
      intersect(
        translateZ(
          this.endThickness,
          Centered.cuboid([1, this.width / 2 - this.baseThickness, this.baseLength - this.endThickness]),
        ),
        translateY(
          this.width / 2 - bottomOffset,
          rotateX(Math.PI / 2, extrudeLinear({height: this.baseThickness + bottomOffset}, this.baseSideFace)),
        ),
      ),

      ...this.triggerJoint2,

      this.gripJoint,

      // トリガー近くの丸いカバー
      subtract(
        translate(
          [this.baseHeight, 0, this.baseLength - this.topLengthMax],
          extrudeLinear(
            {height: this.topLengthMax + this.topEndOffset + this.topEndThickness},
            subtract(this.makeTopFaceHalf(), this.makeTopFaceHalf(-this.topThickness, -this.topThickness)),
          ),
        ),
        translateZ(0.3, this.coverHalf),
      ),
      translate(
        [this.baseHeight, 0, this.baseLength + 0.7],
        rotateY(
          -degToRad(commonSizeValue.batteryBoxRotateDegree),
          extrudeLinear(
            {height: 1.3},
            subtract(this.makeTopFaceHalf(), this.makeTopFaceHalf(-this.topThickness, -this.topThickness)),
          ),
        ),
      ),
    ].map((g) => addColor(this.color, g));
  }

  public get triggerJoint2(): Geom3[] {
    const width = 6;
    const height = 5;
    const startZ = 25;
    const nanameStartOffset = 3;
    const additionalLength = 25;
    const rotateYRad = -degToRad(commonSizeValue.batteryBoxRotateDegree);
    const baseJoint = translate(
      [1, this.width / 2 - width - this.baseThickness - 0.5, startZ],
      hull(
        translate([-1, 0, 0], Centered.cuboid([1, width, 1])),
        translate([-height, 0, 10], Centered.cuboid([height, 3, this.baseLength - 10 - startZ + additionalLength])),
        translate([-1, 0, 10], Centered.cuboid([1, width, this.baseLength - 10 - startZ + additionalLength])),
      ),
    );
    const nanameJoint = translate(
      [1, this.width / 2 - width - this.baseThickness - 0.5, this.baseLength - nanameStartOffset],
      rotateY(
        rotateYRad,
        hull(
          translate([-height - 2, 0, 0], Centered.cuboid([height + 2, 1, additionalLength])),
          translate([-1, 0, 0], Centered.cuboid([1, width, additionalLength])),
        ),
      ),
    );
    return [
      subtract(
        union(
          baseJoint,
          nanameJoint,
          hull(
            intersect(
              baseJoint,
              translate([0, 0, this.baseLength - nanameStartOffset], Centered.cuboid([100, 100, 100])),
            ),
            nanameJoint,
          ),
          hull(
            intersect(
              nanameJoint,
              translate([-13, 0, this.baseLength - nanameStartOffset - 4], Centered.cuboid([10, 100, 3])),
            ),
            intersect(
              baseJoint,
              translate([-13, 0, this.baseLength - nanameStartOffset - 4], Centered.cuboid([10, 100, 4])),
            ),
          ),

          // ケーブルをまとめるための橋
          translate(
            [-height - 1, 0, this.baseLength - 3],
            Centered.cuboid([1, this.width / 2 - width - this.basementThickness - 0.5, 5]),
          ),
        ),
        translate(
          [1, 0, this.baseLength + additionalLength - 5],
          rotateY(rotateYRad, Centered.cuboid([100, 100, 100])),
        ),
        translate(
          [1, 0, this.baseLength + additionalLength - 5],
          rotateY(rotateYRad, translate([-100, 0, 0], Centered.cuboid([100, 100, 100]))),
        ),
      ),
    ];
  }

  public get half(): Geom3[] {
    const bottomOffset = 0.5;
    return [
      subtract(
        Centered.cuboid([this.baseHeight, this.width / 2, this.endThickness]),
        translate(
          [0, this.grooveDistance / 2, this.endThickness - this.grooveDepth],
          Centered.cuboid([this.grooveHeight, this.grooveWidth, this.grooveDepth]),
        ),
        translate(
          [this.baseHeight - this.cutoutDepth, 0, 0],
          Centered.cuboid([this.cutoutDepth, this.cutoutWidth / 2, this.endThickness]),
        ),
      ),
      translateY(this.width / 2, rotateX(Math.PI / 2, extrudeLinear({height: this.baseThickness}, this.baseSideFace))),
      translateZ(
        this.endThickness,
        Centered.cuboid([1, this.width / 2 - this.baseThickness - bottomOffset, this.baseLength - this.endThickness]),
      ),
      intersect(
        translateZ(
          this.endThickness,
          Centered.cuboid([1, this.width / 2 - this.baseThickness, this.baseLength - this.endThickness]),
        ),
        translateY(
          this.width / 2 - bottomOffset,
          rotateX(Math.PI / 2, extrudeLinear({height: this.baseThickness + bottomOffset}, this.baseSideFace)),
        ),
      ),
      // トリガーとの接合用の棒
      subtract(
        union(
          translate(
            [-0.5, this.props.jointOffset, this.baseLength],
            rotate(
              [0, -degToRad(commonSizeValue.batteryBoxRotateDegree + 90), 0],
              translate([0, 0, 0], mirrorZ(this.joint.main)),
            ),
          ),
          ...this.jointTail,
        ),
        Centered.cuboid([10, this.width / 2, this.baseLength]),
      ),
      this.gripJoint,
      subtract(
        translate(
          [this.baseHeight, 0, this.baseLength - this.topLengthMax],
          extrudeLinear(
            {height: this.topLengthMax + this.topEndOffset + this.topEndThickness},
            subtract(this.makeTopFaceHalf(), this.makeTopFaceHalf(-this.topThickness, -this.topThickness)),
          ),
        ),
        translateZ(0.3, this.coverHalf),
      ),
      // translate(
      //   [this.baseHeight, 0, this.baseLength + this.topEndOffset],
      //   extrudeLinear({height: this.topEndThickness}, this.makeTopFaceHalf()),
      // ),
    ].map((g) => addColor(this.color, g));
  }

  public get jointTail(): Geom3[] {
    const length = 35;
    const height = 3;
    return [
      translate(
        [-height, this.props.jointOffset, this.baseLength - length],
        Centered.cuboid([height, this.joint.widthForPrint, length]),
      ),
      translate(
        [0, this.props.jointOffset + this.joint.widthForPrint, this.baseLength - 35 - height],
        rotateX(
          Math.PI / 2,
          extrudeLinear(
            {height: this.joint.widthForPrint},
            polygon({
              points: [
                [-height, height],
                [0, 0],
                [0, height],
              ],
            }),
          ),
        ),
      ),
    ];
  }

  public get jointTail2(): Geom3[] {
    const length = 35;
    const height = 3;
    return [
      translate([-height, 0, this.baseLength - length], Centered.cuboid([height, this.joint.widthForPrint, length])),
      translate(
        [0, this.joint.widthForPrint, this.baseLength - 35 - height],
        rotateX(
          Math.PI / 2,
          extrudeLinear(
            {height: this.joint.widthForPrint},
            polygon({
              points: [
                [-height, height],
                [0, 0],
                [0, height],
              ],
            }),
          ),
        ),
      ),
    ];
  }

  public get gripJoint(): Geom3 {
    const width = 2;
    const height = 5;
    const length = 14;
    const yOffset = this.width / 2 - width - commonSizeValue.gripSideThickness - 0.3;

    // 以下、CGモデルを目で見て適当に調整した値
    const jointOffsetZ = 7.3;
    const jointLength = 7;

    return union(
      subtract(
        translate(
          [-height - 3.2, yOffset, 0],
          rotateY(
            degToRad(commonSizeValue.gripRotateDegree - commonSizeValue.batteryBoxRotateDegree),
            Centered.cuboid([height, width, length]),
          ),
        ),
        // 印刷時の底面を揃えるために削る部分
        cuboid({size: [20, 20, 20], center: [-10, 10, -10]}),
      ),
      translate([-height, yOffset, jointOffsetZ], Centered.cuboid([height, width, jointLength])),
    );
  }

  public get baseSideFace(): Geom2 {
    const jointBaseLengthMin =
      commonSizeValue.triggerJointHeight -
      this.props.minXDistanceFromGripBottom / Math.cos(degToRad(commonSizeValue.gripRotateDegree));
    const jointBaseLengthMax =
      commonSizeValue.triggerJointHeight +
      5 -
      this.props.minXDistanceFromGripBottom / Math.cos(degToRad(commonSizeValue.gripRotateDegree));
    return polygon({
      points: [
        [this.baseHeight, 0],
        [
          this.baseHeight,
          this.baseLength + jointBaseLengthMax * Math.sin(degToRad(commonSizeValue.batteryBoxRotateDegree)),
        ],
        [
          jointBaseLengthMin * Math.cos(degToRad(commonSizeValue.batteryBoxRotateDegree)),
          this.baseLength + jointBaseLengthMin * Math.sin(degToRad(commonSizeValue.batteryBoxRotateDegree)),
        ],
        [0, this.baseLength - 24],
        [0, 0],
      ],
    });
  }

  public get coverHalf(): Geom3[] {
    return [
      subtract(
        union(
          extrudeLinear(
            {height: this.baseLength - this.topLengthMin},
            subtract(this.makeTopFaceHalf(), this.makeTopFaceHalf(-this.topThickness, -this.topThickness)),
          ),
          extrudeLinear({height: this.endThickness}, this.makeTopFaceHalf()),
        ),
        translate(
          [0, this.width / 2 - this.baseThickness - this.topHeight, this.baseLength - this.topLengthMax],
          extrudeLinear(
            {height: this.topLengthMax - this.topLengthMin, twistAngle: -degToRad(90), twistSteps: 30},
            rectangle({size: [10, 10], center: [-10 / 2, 10 / 2]}),
          ),
        ),
        Centered.cuboid([100, 100, 1]),
        translateZ(1, chamfer(union(this.makeTopFaceHalf(), rectangle({size: [5, this.topWidth]})), 1)),
      ),
    ].map((g) => translateX(this.baseHeight, g));
  }

  public get coverFull(): Geom3[] {
    return [...halfToFull(this.coverHalf)];
  }

  public get halfWithBatteryBox(): Geom3[] {
    return [...this.half2, this.transformBatteryBox(this.batteryBox.full)];
  }

  public get halfWithCover(): Geom3[] {
    return [...this.half2, ...this.coverHalf];
  }

  public get full(): Geom3[] {
    return halfToFull(this.half);
  }

  public get full2(): Geom3[] {
    return [
      subtract(
        union(halfToFull(this.half2)),

        // ケーブルを通すための溝と穴
        translate(
          [0, -this.grooveDistance / 2 - this.grooveWidth, this.endThickness - this.grooveDepth],
          Centered.cuboid([this.grooveHeight, this.grooveWidth, this.grooveDepth]),
        ),
        translate([0, -this.grooveDistance / 2 - this.grooveWidth, 0], Centered.cuboid([1, this.grooveWidth, 10])),

        // switchSupportとの干渉を避ける穴
        cuboid({size: [2, 17.6, 11], center: [0, 0, 11 / 2 + this.endThickness + 4]}),

        // RP2040用のリセットボタンアクセス用穴 電池ボックスの穴と同じ位置
        cuboid({size: [100, 6, 4], center: [0, 1, 4 / 2 + this.endThickness + 4]}),
      ),
    ];
  }

  public get fullWithBatteryBox(): Geom3[] {
    return [...this.full, this.transformBatteryBox(this.batteryBox.full)];
  }

  private makeTopFaceHalf(xOffset = 0, yOffset = 0): Geom2 {
    const widthWithoutRadius = this.topWidth - this.topRadius * 2 + yOffset * 2;
    const widthRect = Centered.rectangle([this.topHeight - this.topRadius + xOffset, this.topWidth / 2 + yOffset]);
    const heightRect = Centered.rectangle([this.topHeight + xOffset, widthWithoutRadius / 2]);
    const corner = circle({
      radius: this.topRadius,
      center: [this.topHeight - this.topRadius + xOffset, widthWithoutRadius / 2],
    });
    return union(widthRect, heightRect, corner);
  }

  public transformBatteryBox = (batteryBox: Geom3): Geom3 => {
    return translate(
      [this.basementThickness + this.batteryBox.height, 0, this.endThickness],
      rotateY(-Math.PI / 2, batteryBox),
    );
  };

  public get switchPusher(): Geom3[] {
    const baseWidth = 20;
    const mainWidth = 8;
    const thickness = 4;
    const baseThickness = 1.5;
    const mainHeight = this.baseHeight - 2;
    const maxHeight = this.baseHeight + 2;
    const holeOffset = 16.5 / 2 - 1.5 / 2;
    const holeRadius = 1;

    return [
      subtract(
        union(
          cuboid({size: [thickness, baseWidth, baseThickness], center: [0, 0, baseThickness / 2]}),
          cuboid({size: [thickness - 1, mainWidth, mainHeight], center: [0, 0, mainHeight / 2]}),
          cuboid({size: [thickness - 1, 4, maxHeight], center: [0, 0, maxHeight / 2]}),
        ),
        cylinder({radius: holeRadius, height: baseThickness, center: [0, holeOffset, baseThickness / 2]}),
        cylinder({radius: holeRadius, height: baseThickness, center: [0, -holeOffset, baseThickness / 2]}),
      ),
    ];
  }
}

export class BatteryBox extends Cacheable implements Viewable {
  public readonly width = 25;
  public readonly height = 15;
  public readonly length = 63;
  public readonly radius = 2;
  public readonly color = [0.2, 0.2, 0.2] as const;

  public get displayName() {
    return 'BatteryBox';
  }

  public get viewerItems() {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {
          label: 'full',
          model: () => this.full,
        },
      ];
    });
  }

  public get full(): Geom3 {
    return addColor(
      this.color,
      translate(
        [this.length / 2, 0, this.height / 2],
        roundedCuboid({size: [this.length, this.width, this.height], roundRadius: 2}),
      ),
    );
  }
}
