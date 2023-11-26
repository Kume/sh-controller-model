import {Cacheable, cacheGetter} from '../utls';
import {Viewable, ViewerItem} from '../types';
import {Geom3} from '@jscad/modeling/src/geometries/types';
import {cuboid, cylinder} from '@jscad/modeling/src/primitives';
import {rotateX, rotateY, translate, translateX} from '@jscad/modeling/src/operations/transforms';

export class AngleSample extends Cacheable implements Viewable {
  private height = 10;
  private length = 20;
  private width = 10;

  public constructor(private readonly thickness = 2) {
    super();
  }

  public get displayName(): string {
    return 'AngleSample';
  }

  @cacheGetter
  public get viewerItems(): readonly ViewerItem[] {
    return [
      {label: 'test1', model: () => this.test1},
      {label: 'test2', model: () => this.test2},
      {label: 'all', model: () => this.all},
    ];
  }

  public get all(): Geom3[] {
    return [...this.test1, ...translateX(this.length + 10, this.test2)];
  }

  public get test1(): Geom3[] {
    const {length, thickness} = this;
    return [
      ...this.base(),
      translate(
        [0, thickness, thickness],
        rotateX(Math.PI / 4, cuboid({size: [length, thickness * Math.sqrt(2), thickness * Math.sqrt(2)]})),
      ),
    ];
  }

  public get test2(): Geom3[] {
    const {length, thickness} = this;
    return [
      ...this.base(),
      translate([0, thickness, thickness], rotateY(Math.PI / 2, cylinder({radius: thickness, height: length}))),
    ];
  }

  public base(): Geom3[] {
    const {height, length, width, thickness} = this;
    return [
      cuboid({size: [length, width - thickness, thickness], center: [0, (width + thickness) / 2, thickness / 2]}),
      cuboid({size: [length, thickness, height - thickness], center: [0, thickness / 2, (height + thickness) / 2]}),
    ];
  }
}
