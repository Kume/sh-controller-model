import {Cacheable} from '../utls';
import {Viewable, ViewerItem} from '../types';
import {ButtonBoard} from '../ButtonBoard';
import {SwitchJoyStick} from '../SwitchJoyStick';

export class ButtonPad1_1 extends Cacheable implements Viewable {
  public readonly board = new ButtonBoard();
  public readonly stick = new SwitchJoyStick();

  public get viewerItems(): ViewerItem[] {
    return [];
  }

  public get displayName() {
    return 'ButtonPad1_1';
  }
}
