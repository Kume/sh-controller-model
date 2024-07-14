import {Geom3} from '@jscad/modeling/src/geometries/types';
import {Viewable, ViewerItem} from '../types';
import {Cacheable, cacheGetter} from '../utls';
import {ButtonPad1_1} from './ButtonPad1_1';
import {Trigger1_1} from './Trigger1_1';

export class SHController1_1 extends Cacheable implements Viewable {
  public readonly trigger = new Trigger1_1();
  public readonly buttonPad = new ButtonPad1_1();

  public get viewerItems(): ViewerItem[] {
    return [{label: 'outline', model: () => this.outline}];
  }

  public get displayName() {
    return this.constructor.name;
  }

  @cacheGetter
  public get outline(): Geom3[] {
    return [
      ...this.buttonPad.sk.transformSelf.applyGeoms(this.buttonPad.outline),
      ...this.trigger.sk.transformSelf.applyGeoms(this.trigger.outline),
      ...this.trigger.grip.sk.transformSelf.applyGeoms(this.trigger.grip.outline),
    ];
  }
}
