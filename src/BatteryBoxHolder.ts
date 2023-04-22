import {addColor, Cacheable, Centered, halfToFull, legacyCash} from './utls';
import {Viewable} from './types';
import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {circle, cuboid, polygon, rectangle, roundedCuboid} from '@jscad/modeling/src/primitives';
import {
  rotateX,
  rotateY,
  translate,
  translateX,
  translateY,
  translateZ,
} from '@jscad/modeling/src/operations/transforms';
import {intersect, subtract, union} from '@jscad/modeling/src/operations/booleans';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {hull} from '@jscad/modeling/src/operations/hulls';
import {degToRad, radToDeg} from '@jscad/modeling/src/utils';
import {commonSizeValue} from './common';
import {offset} from '@jscad/modeling/src/operations/expansions';

interface BatteryBoxHolderProps {
  readonly minXDistanceFromGripBottom: number;
}

export class BatteryBoxHolder extends Cacheable implements Viewable {
  public readonly batteryBox = new BatteryBox();

  public readonly width = 30;
  public readonly baseHeight = 11.2;
  public readonly baseLength = 66.3;
  public readonly baseThickness = 1.8;

  public readonly topRadius = 3;
  public readonly topHeight = 3.3 + this.topRadius;
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
        {label: 'fullWithBatteryBox', model: () => this.fullWithBatteryBox},
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

  public get half(): Geom3[] {
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
        Centered.cuboid([1, this.width / 2 - this.baseThickness - 0.3, this.baseLength - this.endThickness]),
      ),
      intersect(
        translateZ(
          this.endThickness,
          Centered.cuboid([1, this.width / 2 - this.baseThickness, this.baseLength - this.endThickness]),
        ),
        translateY(
          this.width / 2 - 0.3,
          rotateX(Math.PI / 2, extrudeLinear({height: this.baseThickness + 0.3}, this.baseSideFace)),
        ),
      ),
      subtract(
        translate(
          [-4, this.width / 2 - this.baseThickness - 2, this.baseLength],
          rotateY(
            -degToRad(commonSizeValue.batteryBoxRotateDegree),
            translateZ(-20, Centered.cuboid([4, 2 - 0.3, 35])),
          ),
        ),
        Centered.cuboid([10, this.width / 2, this.baseLength]),
      ),
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
        extrudeLinear(
          {height: this.baseLength - this.topLengthMin},
          subtract(this.makeTopFaceHalf(), this.makeTopFaceHalf(-this.topThickness, -this.topThickness)),
        ),
        translate(
          [0, this.width / 2 - this.baseThickness - this.topHeight, this.baseLength - this.topLengthMax],
          extrudeLinear(
            {height: this.topLengthMax - this.topLengthMin, twistAngle: -degToRad(90), twistSteps: 30},
            rectangle({size: [10, 10], center: [-10 / 2, 10 / 2]}),
          ),
        ),
      ),
    ].map((g) => translateX(this.baseHeight, g));
  }

  public get halfWithBatteryBox(): Geom3[] {
    return [...this.half, this.transformBatteryBox(this.batteryBox.full)];
  }

  public get full(): Geom3[] {
    return halfToFull(this.half);
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
