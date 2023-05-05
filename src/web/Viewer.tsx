import {SHController} from '../SHController';
import {JSCADView} from './JSCADView';
import {useEffect, useMemo, useState} from 'react';
import {ButtonPad} from '../ButtonPad';
import {ButtonBoard} from '../ButtonBoard';
import {Viewable, ViewerItem} from '../types';
import {SwitchJoyStick} from '../SwitchJoyStick';
import {Screw} from '../Screw';
import {translate} from '@jscad/modeling/src/operations/transforms';

const main = new SHController();
const joyStick = new SwitchJoyStick();
const screw = new Screw(7, 2.5, (g) => translate([0, 0, 0], g));
const viewableValues: readonly Viewable[] = [
  main,
  main.trigger.grip.board,
  main.trigger,
  main.buttonPad,
  main.buttonPad.board,
  main.buttonPad.natHolder,
  main.trigger.grip,
  main.trigger.grip.batteryBoxHolder,
  main.trigger.grip.batteryBoxHolder.batteryBox,
  main.trigger.board,
  main.buttonPadJoint,
  screw,
  joyStick,
];

interface ViewerItemState {
  readonly isVisible?: boolean;
}

interface ViewableState {
  readonly isOpen?: boolean;
  readonly items: Record<string, ViewerItemState | undefined>;
}

type ViewerState = Record<string, ViewableState | undefined>;

function getVisibleItems(viewables: readonly Viewable[], state: ViewerState): (ViewerItem & {fullName: string})[] {
  const items: (ViewerItem & {fullName: string})[] = [];
  for (const viewable of viewables) {
    for (const viewerItem of viewable.viewerItems) {
      if (state[viewable.displayName]?.items[viewerItem.label]?.isVisible) {
        items.push({...viewerItem, fullName: `${viewable.displayName}/${viewerItem.label}`});
      }
    }
  }
  return items;
}

export const Viewer: React.FC = () => {
  const [state, setState] = useState<ViewerState>({});

  const visibleItems = useMemo(() => getVisibleItems(viewableValues, state), [state]);

  return (
    <div style={{display: 'flex'}}>
      <div style={{width: 1030, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around'}}>
        {visibleItems.map((item, i) => (
          <JSCADView key={item.fullName} title={item.fullName} solids={item.model()} />
        ))}
      </div>
      <ul>
        {viewableValues.map((viewable) => (
          <li key={viewable.displayName}>
            <p
              onClick={() =>
                setState(
                  (prev) =>
                    ({
                      ...prev,
                      [viewable.displayName]: {
                        ...prev[viewable.displayName],
                        isOpen: !prev[viewable.displayName]?.isOpen,
                        items: {},
                      },
                    } as ViewerState),
                )
              }>
              {viewable.displayName}
            </p>
            <ul hidden={!state[viewable.displayName]?.isOpen}>
              {viewable.viewerItems.map((item) => (
                <li
                  key={item.label}
                  style={{
                    background: state[viewable.displayName]?.items[item.label]?.isVisible ? 'lightblue' : 'transparent',
                  }}
                  onClick={() =>
                    setState(
                      (prev) =>
                        ({
                          ...prev,
                          [viewable.displayName]: {
                            ...prev[viewable.displayName],
                            items: {
                              ...prev[viewable.displayName]?.items,
                              [item.label]: {isVisible: !prev[viewable.displayName]?.items[item.label]?.isVisible},
                            },
                          },
                        } as ViewerState),
                    )
                  }>
                  {item.label}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};
