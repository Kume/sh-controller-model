import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {circle, cuboid, square} from '@jscad/modeling/src/primitives';
import {Cacheable, Centered, hexagon, legacyCash, octagon} from './utls';
import {subtract, union} from '@jscad/modeling/src/operations/booleans';
import {rotateZ, translateZ} from '@jscad/modeling/src/operations/transforms';
import {Viewable, ViewerItem} from './types';

export interface NatHolderProps {
  readonly totalHeight: number;
  readonly topThickness: number;
  readonly screwHoleType: 'circle' | 'octagon' | 'square';
  readonly screwHoleOffset?: number;
  readonly natEntryHoleLength?: number;
}

export class NatHolder extends Cacheable implements Viewable {
  public static readonly minOuterWidth = 9;
  public readonly natHoleHeight = 3.4;
  public readonly natHoleRadius = 3.3;
  public readonly bridgeSupporterThickness = 0.4;
  public readonly minimumOutlineThickness = 1;

  public readonly minOuterWidth = NatHolder.minOuterWidth; // natHoleRadius * 2 + 1(thickness) * 2

  public constructor(public readonly props: NatHolderProps) {
    super();
  }

  public get natEntryHoleLength(): number {
    return this.props.natEntryHoleLength ?? 10;
  }

  public get displayName(): string {
    return `NatHolder(${this.props.screwHoleType})`;
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'full', model: () => this.full},
        {label: 'screwHole', model: () => this.screwHole},
        {label: 'minimumOutline', model: () => this.minimumOutline},
      ];
    });
  }

  public get minimumOutline(): Geom3[] {
    return [subtract(this.makeOutline(), this.full)];
  }

  public get minimumLooseOutline(): Geom3[] {
    return this.makeOutline(0.3);
  }

  private makeOutline(offset = 0): Geom3[] {
    return [
      union(
        rotateZ(
          Math.PI / 2,
          extrudeLinear(
            {height: this.props.totalHeight},
            hexagon(this.natHoleRadius + this.minimumOutlineThickness + offset, 'max'),
          ),
        ),
        cuboid({
          size: [this.natEntryHoleLength + offset, this.minimumOutlineWidth(offset), this.props.totalHeight],
          center: [-(this.natEntryHoleLength + offset) / 2, 0, this.props.totalHeight / 2],
        }),
      ),
    ];
  }

  public get full(): Geom3[] {
    return [this.screwHole, ...this.natHole, ...this.bridgeSupporter].map((g) => rotateZ(Math.PI / 2, g));
  }

  public get screwHole(): Geom3 {
    return extrudeLinear({height: this.props.totalHeight}, this.screwHoleFace);
  }

  public get bridgeSupporter(): Geom3[] {
    if (this.props.screwHoleType === 'square') {
      return [
        cuboid({
          size: [
            this.natHoleRadius * 2 * Math.cos(Math.PI / 6),
            this.screwHoleRadius * 2,
            this.bridgeSupporterThickness,
          ],
          center: [0, 0, this.props.topThickness - this.bridgeSupporterThickness / 2],
        }),
      ];
    } else {
      return [];
    }
  }

  public get underBridgeSupporter(): Geom3[] {
    if (this.props.screwHoleType === 'square') {
      return [
        cuboid({
          size: [
            this.natHoleRadius * 2 * Math.cos(Math.PI / 6),
            this.screwHoleRadius * 2,
            this.bridgeSupporterThickness,
          ],
          center: [0, 0, this.props.topThickness + this.natHoleHeight + this.bridgeSupporterThickness / 2],
        }),
      ];
    } else {
      return [];
    }
  }

  public get screwHoleRadius(): number {
    return 1.5 + (this.props.screwHoleOffset ?? 0.1);
  }

  public minimumOutlineWidth(offset = 0): number {
    return (this.natHoleRadius + this.minimumOutlineThickness + offset) * 2 * Math.cos(Math.PI / 6);
  }

  public get natHole(): Geom3[] {
    const natHole = extrudeLinear({height: this.natHoleHeight}, hexagon(this.natHoleRadius, 'max'));
    const entryHole = cuboid({
      size: [this.natHoleRadius * 2 * Math.cos(Math.PI / 6), this.natEntryHoleLength, this.natHoleHeight],
      center: [0, this.natEntryHoleLength / 2, this.natHoleHeight / 2 + this.props.topThickness],
    });
    return [translateZ(this.props.topThickness, natHole), entryHole];
  }

  private get screwHoleFace(): Geom2 {
    switch (this.props.screwHoleType) {
      case 'circle':
        return circle({radius: this.screwHoleRadius});
      case 'octagon':
        return octagon(this.screwHoleRadius);
      case 'square':
        return square({size: this.screwHoleRadius * 2});
    }
  }
}
