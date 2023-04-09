import {addColor, Cacheable, Centered, halfToFull, legacyCash} from './utls';
import {booleans, expansions, extrusions, primitives, transforms} from '@jscad/modeling';
import {Viewable} from './types';
import {Geom3} from '@jscad/modeling/src/geometries/types';
import {roundedCuboid} from '@jscad/modeling/src/primitives';
import {translateY, translateZ} from '@jscad/modeling/src/operations/transforms';

const {rectangle, circle, sphere, polygon} = primitives;
const {translateX, translate, rotate, mirrorZ, rotateY, rotateZ, rotateX} = transforms;
const {expand} = expansions;
const {union, subtract} = booleans;
const {extrudeLinear} = extrusions;
export class BatteryBoxHolder extends Cacheable implements Viewable {
  public readonly batteryBox = new BatteryBox();

  public readonly width = 30;
  public readonly baseHeight = 11.2;
  public readonly baseLength = 66.3;
  public readonly baseThickness = 1.8;

  public readonly topRadius = 3.5;
  public readonly topHeight = 3.3 + this.topRadius;
  public readonly topWidth = this.width - 0.7 * 2;

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

  public get displayName() {
    return 'BatteryBoxHolder';
  }

  public get viewerItems() {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'outlineHalf', model: () => this.outlineHalf},
        {label: 'half', model: () => this.half},
        {label: 'full', model: () => this.full},
        {label: 'fullWithBattery', model: () => this.fullWithBattery},
      ];
    });
  }

  public get baseOutlineHalf() {
    return Centered.cuboid([this.baseHeight, this.width / 2, this.baseLength]);
  }

  public get outlineHalf(): Geom3[] {
    const topFace = this.makeBasicHalfFace(this.topHeight, this.topWidth, this.topRadius);
    const baseRect = Centered.rectangle([this.baseHeight, this.width / 2]);
    return [
      addColor(
        this.color,
        extrudeLinear({height: this.baseLength}, union(translateX(this.baseHeight, topFace), baseRect)),
      ),
    ];
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
      translateY(
        this.width / 2 - this.baseThickness,
        Centered.cuboid([this.baseHeight, this.baseThickness, this.baseLength]),
      ),
      translateY(
        this.grooveDistance / 2 + this.grooveWidth,
        Centered.cuboid([
          this.basementThickness,
          this.width / 2 - (this.grooveDistance / 2 + this.grooveWidth),
          this.basementHeight,
        ]),
      ),
    ].map((g) => addColor(this.color, g));
  }

  public get full(): Geom3[] {
    return halfToFull(this.half);
  }

  public get fullWithBattery(): Geom3[] {
    return [...this.full, this.transformBatteryBox(this.batteryBox.full)];
  }

  private makeBasicHalfFace(height: number, width: number, radius: number) {
    const widthWithoutRadius = width - radius * 2;
    const widthRect = Centered.rectangle([height - radius, width / 2]);
    const heightRect = Centered.rectangle([height, widthWithoutRadius / 2]);
    const corner = circle({radius: radius, center: [height - radius, widthWithoutRadius / 2]});
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
