import {Cacheable, cacheGetter, halfToFull, vec2ArrayToWritable} from '../utls';
import {Viewable, ViewerItem} from '../types';
import {ButtonBoard} from '../ButtonBoard';
import {SwitchJoyStick} from '../SwitchJoyStick';
import {Skeleton} from './Skeleton';
import {Geom3} from '@jscad/modeling/src/geometries/types';
import {polygon, sphere} from '@jscad/modeling/src/primitives';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {subtract} from '@jscad/modeling/src/operations/booleans';
import {hull} from '@jscad/modeling/src/operations/hulls';

export class ButtonPad1_1 extends Cacheable implements Viewable {
  public readonly board = new ButtonBoard();
  public readonly stick = new SwitchJoyStick();
  public readonly sk = Skeleton.ButtonPad;

  public get viewerItems(): ViewerItem[] {
    return [{label: 'outline', model: () => this.outline}];
  }

  public get displayName() {
    return this.constructor.name;
  }

  public get outline(): Geom3[] {
    return [...halfToFull(this.outlineHalf)];
  }

  public get outlineHalf(): Geom3[] {
    return [
      subtract(
        extrudeLinear({height: this.sk.z.total}, polygon({points: vec2ArrayToWritable(this.sk.point2ds.outlineHalf)})),
        this.fingerSubtractionHalf,
      ),
    ];
  }

  @cacheGetter
  public get fingerSubtractionHalf(): Geom3[] {
    return [
      hull(this.sk.points.fingerSubtractionHalf['1'].map((point) => sphere({radius: 0.01, center: [...point]}))),
      hull(this.sk.points.fingerSubtractionHalf['2'].map((point) => sphere({radius: 0.01, center: [...point]}))),
    ];
  }
}
