import {Geom3} from '@jscad/modeling/src/geometries/types';
import {Cacheable, Centered, legacyCash, octagon} from './utls';
import {cuboid, cylinder} from '@jscad/modeling/src/primitives';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {translateZ} from '@jscad/modeling/src/operations/transforms';
import {intersect, union} from '@jscad/modeling/src/operations/booleans';
import {Viewable, ViewerItem} from './types';

export class Screw extends Cacheable implements Viewable {
  public readonly looseHeadOutlineHeight = 10;

  public constructor(
    public readonly length: number,
    public readonly headHeight: number,
    public readonly transform: (g: Geom3) => Geom3,
    public readonly radius = 3 / 2,
    public readonly headRadius = 5.5 / 2,
  ) {
    super();
  }

  public get displayName(): string {
    return 'Screw';
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'outline', model: () => this.outline},
        {label: 'headAndSquareBodyLooseOutline', model: () => this.headAndSquareBodyLooseOutline},
      ];
    });
  }

  public get outline(): Geom3[] {
    return [
      cylinder({radius: this.radius, height: this.length, center: [0, 0, -this.length / 2]}),
      cylinder({radius: this.headRadius, height: this.headHeight, center: [0, 0, this.headHeight / 2]}),
    ].map(this.transform);
  }

  public get looseOutline(): Geom3[] {
    return [
      cylinder({radius: this.radius + 0.1, height: this.length, center: [0, 0, -this.length / 2]}),
      cylinder({radius: this.headRadius + 0.35, height: this.headHeight, center: [0, 0, this.headHeight / 2]}),
    ].map(this.transform);
  }

  public get squareHeadLooseOutline(): Geom3 {
    const height = this.looseHeadOutlineHeight;
    return this.transform(
      cuboid({size: [this.headRadius * 2 + 0.4, this.headRadius * 2 + 0.4, height], center: [0, 0, height / 2]}),
    );
  }

  public get squareLooseOutline(): Geom3[] {
    return [this.squareBodyLooseOutline, this.squareHeadLooseOutline];
  }

  public get squareBridgeSupport(): Geom3 {
    const thickness = 0.4;
    return this.transform(
      cuboid({size: [this.radius * 2 + 0.2, this.headRadius * 2 + 0.4, thickness], center: [0, 0, -thickness / 2]}),
    );
  }

  public get squareHeadLooseOutlineYobi(): Geom3 {
    const height = this.looseHeadOutlineHeight;
    return this.transform(
      cuboid({size: [this.headRadius * 2 + 0.4 + 1.5, this.headRadius * 2 + 0.4, height], center: [0, 0, height / 2]}),
    );
  }

  public get headLooseOutline(): Geom3 {
    return this.transform(this.headLooseOutlineBase);
  }

  public get headLooseOutlineBase(): Geom3 {
    const height = this.looseHeadOutlineHeight;
    return cylinder({radius: this.headRadius + 0.2, height, center: [0, 0, height / 2]});
  }

  public get octagonBodyLooseOutline(): Geom3 {
    return this.transform(translateZ(-this.length, extrudeLinear({height: this.length}, octagon(this.radius + 0.1))));
  }

  public get octagonHeadLooseOutline(): Geom3 {
    return this.transform(extrudeLinear({height: this.looseHeadOutlineHeight}, octagon(this.headRadius + 0.2)));
  }

  public get octagonDriverHoleOutline(): Geom3 {
    return this.transform(translateZ(this.headHeight, extrudeLinear({height: 20}, octagon(this.headRadius * 1.4))));
  }

  public get octagonLooseOutline(): Geom3[] {
    return [this.octagonBodyLooseOutline, this.octagonHeadLooseOutline];
  }

  public get squareBodyLooseOutline(): Geom3 {
    const width = (this.radius + 0.1) * 2;
    const height = this.length;
    return this.transform(cuboid({size: [width, width, height], center: [0, 0, -height / 2]}));
  }

  public get headAndSquareBodyLooseOutline(): Geom3 {
    return union(
      this.headLooseOutline,
      this.squareBodyLooseOutline,
      this.transform(
        intersect(
          translateZ(-0.4, this.headLooseOutlineBase),
          cuboid({size: [(this.radius + 0.1) * 2, 10, this.length], center: [0, 0, -this.length / 2]}),
        ),
      ),
    );
  }

  public get bodyLooseOutline(): Geom3 {
    const height = this.length;
    return this.transform(cylinder({radius: this.radius + 0.2, height, center: [0, 0, -height / 2]}));
  }
}
