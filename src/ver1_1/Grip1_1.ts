import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {Viewable, ViewerItem} from '../types';
import {Cacheable, cacheGetter, Centered, halfToFull} from '../utls';
import {Skeleton} from './Skeleton';
import {subtract, union} from '@jscad/modeling/src/operations/booleans';
import {translateX} from '@jscad/modeling/src/operations/transforms';
import {circle, rectangle} from '@jscad/modeling/src/primitives';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';

export class Grip1_1 extends Cacheable implements Viewable {
  public readonly sk = Skeleton.Grip;

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'outlineHalf', model: () => this.outlineHalf},
      {label: 'innerHalf', model: () => this.innerHalf},
      {label: 'half', model: () => this.half},
    ];
  }

  public get displayName() {
    return this.constructor.name;
  }

  public get half(): Geom3[] {
    return [subtract(this.outlineHalf, this.innerHalf)];
  }

  @cacheGetter
  public get outline(): Geom3[] {
    return [...halfToFull(this.outlineHalf)];
  }

  @cacheGetter
  public get outlineHalf(): Geom3[] {
    return [
      ...this.sk.End.transformSelf.applyGeoms([extrudeLinear({height: this.sk.x.total}, [...this.endOutlineHalf])]),
    ];
  }

  @cacheGetter
  public get innerHalf(): Geom3[] {
    return [
      translateX(
        this.sk.x.endThickness,
        this.sk.End.transformSelf.applyGeom(
          extrudeLinear({height: this.sk.x.total}, [
            translateX(
              this.sk.End.x.total - this.sk.End.x.topToBottom.valueAt('boardEnd'),
              Centered.rectangle([
                this.sk.End.x.topToBottom.totalFromTo('topWallEnd', 'boardEnd') + 0.5,
                this.sk.Board.y.totalHalf + 0.5,
              ]),
            ),
            translateX(
              this.sk.End.x.total - this.sk.End.x.topToBottom.valueAt('boardLegBottom'),
              Centered.rectangle([
                this.sk.End.x.topToBottom.totalFromTo('topWallEnd', 'bottomWallStart'),
                this.sk.Board.y.totalHalf - 2,
              ]),
            ),
          ]),
        ),
      ),
    ];
  }

  @cacheGetter
  public get endOutlineHalf(): readonly Geom2[] {
    const sk = this.sk.End;
    return [
      union([
        Centered.rectangle([sk.x.total, sk.y.totalHalf - sk.other.radius]),
        translateX(sk.other.radius, Centered.rectangle([sk.x.total - sk.other.radius, sk.y.totalHalf])),
        circle({radius: sk.other.radius, center: [sk.other.radius, sk.y.totalHalf - sk.other.radius]}),
      ]),
    ];
  }
}
