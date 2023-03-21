import {Centered} from './utls';
import {booleans, expansions, extrusions, primitives, transforms} from '@jscad/modeling';

const {rectangle, circle, sphere, polygon} = primitives;
const {translateX, translate, rotate, mirrorZ, rotateY, rotateZ, rotateX} = transforms;
const {expand} = expansions;
const {union, subtract} = booleans;
const {extrudeLinear} = extrusions;
export class BatteryBoxHolder {
  public readonly width = 30;
  public readonly baseHeight = 11.2;
  public readonly baseLength = 66.3;

  public readonly topRadius = 3.5;
  public readonly topHeight = 3.3 + this.topRadius;
  public readonly topWidth = this.width - 0.7 * 2;

  public get baseOutlineHalf() {
    return Centered.cuboid([this.baseHeight, this.width / 2, this.baseLength]);
  }

  public get outlineHalf() {
    const topFace = this.makeBasicHalfFace(this.topHeight, this.topWidth, this.topRadius);
    const baseRect = Centered.rectangle([this.baseHeight, this.width / 2]);
    return extrudeLinear({height: this.baseLength}, union(translateX(this.baseHeight, topFace), baseRect));
  }

  private makeBasicHalfFace(height: number, width: number, radius: number) {
    const widthWithoutRadius = width - radius * 2;
    const widthRect = Centered.rectangle([height - radius, width / 2]);
    const heightRect = Centered.rectangle([height, widthWithoutRadius / 2]);
    const corner = circle({radius: radius, center: [height - radius, widthWithoutRadius / 2]});
    return union(widthRect, heightRect, corner);
  }
}
