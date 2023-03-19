import {primitives, extrusions, booleans, transforms} from '@jscad/modeling';
import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';

const {rectangle, circle} = primitives;
const {translateX} = transforms;
const {union, subtract} = booleans;
const {extrudeLinear} = extrusions;

export class Grip {
  private readonly topWallThickness = 1;
  private readonly height = 20.7 + this.topWallThickness;
  private readonly width = 30;
  private readonly radius = 6;
  private readonly length = 68.5;
  private readonly thickness = 1.5;
  private readonly usbHoleWidth = 4.85 * 2;
  private readonly usbHoleHeight = 4;
  private readonly switchHoleWidth = 6;
  private readonly switchHoleHeight = 4;
  private readonly endThickness = 1.2;
  private readonly switchHoleTopFromUsbHoleBottom = 7.2;

  private get outlineBasicFaceHalf(): Geom2 {
    return this.makeBasicFace(this.height, this.width, this.radius);
  }

  private get outlineBasicInnerFaceHalf(): Geom2 {
    return translateX(
      -this.topWallThickness,
      this.makeBasicFace(
        this.height - this.thickness - this.topWallThickness,
        this.width - this.thickness * 2,
        this.radius - this.thickness,
      ),
    );
  }

  private get endWallHalf(): Geom3 {
    const usbHole = rectangle({
      size: [this.usbHoleHeight, this.usbHoleWidth / 2],
      center: [-this.usbHoleHeight / 2, this.usbHoleWidth / 4],
    });
    const switchHole = rectangle({
      size: [this.switchHoleHeight, this.switchHoleWidth / 2],
      center: [-this.switchHoleHeight / 2, this.switchHoleWidth / 4],
    });
    return extrudeLinear(
      {height: this.endThickness},
      subtract(
        this.outlineBasicFaceHalf,
        translateX(-this.topWallThickness, usbHole),
        translateX(-(this.topWallThickness + this.switchHoleTopFromUsbHoleBottom + this.usbHoleHeight), switchHole),
      ),
    );
  }

  private makeBasicFace(height: number, width: number, radius: number) {
    const widthWithoutRadius = width - radius * 2;
    const widthRect = rectangle({size: [height - radius, width / 2], center: [-(height - radius) / 2, width / 4]});
    const heightRect = rectangle({
      size: [height, widthWithoutRadius / 2],
      center: [-height / 2, widthWithoutRadius / 4],
    });
    const corner = circle({radius: radius, center: [-(height - radius), widthWithoutRadius / 2]});
    return union(widthRect, heightRect, corner);
  }

  public get outlineHalf() {
    return union(
      extrudeLinear({height: this.length}, subtract(this.outlineBasicFaceHalf, this.outlineBasicInnerFaceHalf)),
      this.endWallHalf,
    );
  }
}
