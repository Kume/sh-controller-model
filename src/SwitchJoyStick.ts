import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {addColor, Cacheable, legacyCash} from './utls';
import {Viewable, ViewerItem} from './types';
import {cuboid, cylinder} from '@jscad/modeling/src/primitives';
import {rotateZ, translate} from '@jscad/modeling/src/operations/transforms';
import {geometries} from '@jscad/modeling';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {union} from '@jscad/modeling/src/operations/booleans';
import {colorize} from '@jscad/modeling/src/colors';
const {path2, geom2, geom3} = geometries;

export class SwitchJoyStick extends Cacheable implements Viewable {
  public readonly baseWidth = 17.3;
  public readonly baseHeight = 19.1;
  public readonly baseThickness = 5.4;
  public readonly baseYOffset = -0.5;
  public readonly stickHeight = 9;
  public readonly stickRadius = 2;
  public readonly stickTopThickness = 3;
  public readonly stickTopRadius = 7.5;

  public readonly cableShortLength = 1.5;
  public readonly cableLength = 15;
  public readonly cableWidth = 3;
  public readonly cableRadius = this.cableWidth + 0.5;
  public readonly cableThickness = 0.1;

  public readonly screwHoleZOffset = 1.2;
  public readonly topRightScrewHole = new ScrewHole({width: 3.7, length: 4});
  public readonly bottomLeftScrewHole = new ScrewHole({width: 4.2, length: 3.2});

  public readonly connectorWidth = 7.2;
  public readonly connectorDepth = 4;
  public readonly connectorThickness = 1.2;
  /** コネクタに重なるケーブルの長さ */
  public readonly connectorCableLength = 2;

  public get displayName(): string {
    return 'SwitchJoyStick';
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'outline', model: () => this.outline},
        {label: 'looseOutline', model: () => this.looseOutline},
      ];
    });
  }

  public get stick(): Geom3 {
    const baseHeight = this.stickHeight - this.stickTopThickness;
    return union(
      this.stickTop,
      cylinder({radius: this.stickRadius, height: baseHeight, center: [0, 0, baseHeight / 2 + this.baseThickness]}),
    );
  }

  public get stickTop(): Geom3 {
    return cylinder({
      radius: this.stickTopRadius,
      height: this.stickTopThickness,
      center: [0, 0, this.stickHeight - this.stickTopThickness / 2 + this.baseThickness],
    });
  }

  public get outline(): Geom3[] {
    return [
      addColor([0.1, 0.1, 0.1], this.makeBase()),
      this.stick,
      addColor([0, 0, 0.9], this.transformCable(extrudeLinear({height: this.cableThickness}, this.cableFace))),
      addColor([0.9, 0.9, 0.9], this.transformConnector(this.connector)),
      this.transformTopRightScrewHole(this.topRightScrewHole.outline),
      this.transformBottomLeftScrewHole(this.bottomLeftScrewHole.outline),
    ];
  }

  public get looseOutline(): Geom3[] {
    // TODO ねじ受けの補強三角部分、ケーブルの余白
    return [
      addColor([0.1, 0.1, 0.1], this.makeBase(0.2)),
      cylinder({
        height: this.baseThickness + this.stickHeight,
        radius: this.stickTopRadius + 0.5,
        center: [0, 0, (this.baseThickness + this.stickHeight) / 2],
      }),
      cylinder({
        height: 8,
        radius: this.stickTopRadius + 3,
        center: [0, 0, this.baseThickness + this.stickHeight - 8 / 2],
      }),
      addColor([0, 0, 0.9], this.transformCable(extrudeLinear({height: this.cableThickness}, this.cableFace))),
      addColor([0.9, 0.9, 0.9], this.transformConnector(this.connector)),
      this.transformTopRightScrewHole(this.topRightScrewHole.looseOutline),
      this.transformBottomLeftScrewHole(this.bottomLeftScrewHole.looseOutline),
    ];
  }

  private makeBase(offset = 0): Geom3 {
    return cuboid({
      size: [this.baseHeight + offset * 2, this.baseWidth + offset * 2, this.baseThickness + offset],
      center: [0, this.baseYOffset, (this.baseThickness + offset) / 2],
    });
  }

  public get cableFace(): Geom2 {
    const innerRadius = this.cableRadius - this.cableWidth;
    const maxY = this.cableShortLength + this.cableWidth;
    let path = path2.create([
      [0, 0],
      [0, -this.cableShortLength + innerRadius],
    ]);
    path = path2.appendArc({radius: [this.cableRadius, this.cableRadius], endpoint: [this.cableRadius, -maxY]}, path);
    path = path2.appendPoints(
      [
        [this.cableLength, -maxY],
        [this.cableLength, -this.cableShortLength],
        [this.cableWidth + innerRadius, -this.cableShortLength],
      ],
      path,
    );
    path = path2.appendArc(
      {
        radius: [innerRadius, innerRadius],
        endpoint: [this.cableWidth, -this.cableShortLength + innerRadius],
        clockwise: true,
      },
      path,
    );
    path = path2.appendPoints([[this.cableWidth, 0]], path);
    return geom2.fromPoints(path2.toPoints(path));
  }

  public get connector(): Geom3 {
    return cuboid({size: [this.connectorDepth, this.connectorWidth, this.connectorThickness]});
  }

  private transformCable(g: Geom3): Geom3 {
    return translate(
      [this.baseHeight / 2 - this.cableWidth, -this.baseWidth / 2 + this.baseYOffset, -this.cableThickness],
      g,
    );
  }

  private transformTopRightScrewHole(g: Geom3): Geom3 {
    return translate(
      [
        -((this.baseHeight - this.topRightScrewHole.props.width) / 2),
        this.baseWidth / 2 + this.baseYOffset,
        this.screwHoleZOffset,
      ],
      rotateZ(Math.PI / 2, g),
    );
  }

  private transformBottomLeftScrewHole(g: Geom3): Geom3 {
    return translate(
      [
        this.baseHeight / 2,
        -(this.baseWidth - this.bottomLeftScrewHole.props.width) / 2 + this.baseYOffset,
        this.screwHoleZOffset,
      ],
      g,
    );
  }

  private transformConnector(g: Geom3): Geom3 {
    return translate(
      [
        this.cableLength - this.connectorCableLength + this.connectorDepth / 2,
        -this.cableWidth / 2 - this.cableShortLength,
        -this.connectorThickness / 2 + this.cableThickness,
      ],
      this.transformCable(g),
    );
  }
}

interface ScrewHoleProps {
  readonly width: number;
  readonly length: number;
}

class ScrewHole {
  public readonly thickness = 1.2;

  public constructor(public readonly props: ScrewHoleProps) {}

  public get outline(): Geom3 {
    return extrudeLinear({height: this.thickness}, this.makeFace(0));
  }

  public get looseOutline(): Geom3 {
    return extrudeLinear({height: this.thickness}, this.makeFace(0.2));
  }

  private makeFace(offset: number): Geom2 {
    const width = this.props.width + offset * 2;
    const length = this.props.length + offset;
    let path = path2.create([
      [0, -width / 2],
      [length - width / 2, -width / 2],
    ]);
    path = path2.appendArc({radius: [width / 2, width / 2], endpoint: [length - width / 2, width / 2]}, path);
    path = path2.appendPoints([[0, width / 2]], path);
    return geom2.fromPoints(path2.toPoints(path));
  }
}
