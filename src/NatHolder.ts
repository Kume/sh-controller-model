import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {circle, square} from '@jscad/modeling/src/primitives';
import {hexagon, octagon} from './utls';
import {union} from '@jscad/modeling/src/operations/booleans';
import {translateZ} from '@jscad/modeling/src/operations/transforms';

export interface NatHolderProps {
  readonly totalHeight: number;
  readonly topThickness: number;
  readonly screwHoleType: 'circle' | 'octagon' | 'square';
  readonly screwHoleOffset?: number;
}

export class NatHolder {
  public readonly natHallHeight = 3.4;
  public readonly natHallRadius = 3.3;
  public constructor(private readonly props: NatHolderProps) {}

  public get full(): Geom3 {
    return union(this.screwHole, this.natHall);
  }

  public get screwHole(): Geom3 {
    return extrudeLinear({height: this.props.totalHeight}, this.screwHoleFace);
  }

  private get screwHallRadius(): number {
    return 1.5 + (this.props.screwHoleOffset ?? 0.1);
  }

  public get natHall(): Geom3 {
    const geom3 = extrudeLinear({height: 3.4}, hexagon(this.natHallRadius, 'max'));
    // TODO 挿入口
    return translateZ(this.props.topThickness, geom3);
  }

  private get screwHoleFace(): Geom2 {
    switch (this.props.screwHoleType) {
      case 'circle':
        return circle({radius: this.screwHallRadius});
      case 'octagon':
        return octagon(this.screwHallRadius);
      case 'square':
        return square({size: this.screwHallRadius * 2});
    }
  }
}
