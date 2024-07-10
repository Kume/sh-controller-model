import {Cacheable, cacheGetter} from '../utls';
import {Viewable, ViewerItem} from '../types';
import {Geom3} from '@jscad/modeling/src/geometries/types';
import {subtract} from '@jscad/modeling/src/operations/booleans';
import {cuboid} from '@jscad/modeling/src/primitives';
import {translate} from '@jscad/modeling/src/operations/transforms';

export class ThinJointSample extends Cacheable implements Viewable {
  private height = 10;
  private length = 15;
  private width = 5;
  private thickness = 1.8;
  private jointHeight = 5;

  public constructor() {
    super();
  }

  public get displayName(): string {
    return 'AngleSample';
  }

  public get viewerItems(): readonly ViewerItem[] {
    return [
      {label: 'male', model: () => this.male},
      {label: 'female', model: () => this.female},
      {label: 'all', model: () => this.all},
    ];
  }

  public get all(): Geom3[] {
    return [...this.male, ...translate([0, this.width + 5, 0], this.female)];
  }

  public get male(): Geom3[] {
    return [
      subtract(
        cuboid({size: [this.length, this.width, this.height]}),
        cuboid({
          size: [this.thickness + 0.5, 0.5, this.jointHeight],
          center: [0, (this.width - 0.5) / 2, (-this.height + this.jointHeight) / 2],
        }),
      ),
    ];
  }

  public get female(): Geom3[] {
    return [
      subtract(
        cuboid({size: [this.length - 1, this.thickness, this.height]}),
        cuboid({
          size: [0.5, this.thickness, this.height / 2],
          center: [(this.length - 1 - 0.5) / 2, 0, this.height / 4],
        }),
      ),

      cuboid({size: [this.thickness, 10, this.height], center: [(-this.length + this.thickness) / 2, 0, 0]}),
    ];
  }
}
