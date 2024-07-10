import {SHController} from '../SHController';
import {JSCADView} from './JSCADView';
import {useEffect, useMemo, useState} from 'react';
import {Viewable, ViewerItem} from '../types';
import {SwitchJoyStick} from '../SwitchJoyStick';
import {Screw} from '../Screw';
import {translate} from '@jscad/modeling/src/operations/transforms';
import {AngleSample} from '../samples/AngleSample';
import {ThinJointSample} from '../samples/ThinJointSample';
import {
  skeletonToViewStateNode,
  SkeletonView,
  SkeletonViewMenu,
  SkeletonViewStateMapNode,
  SkeletonViewStateNode,
} from './SkeletonView';
import {Skeleton} from '../ver1_1/Skeleton';

const main = new SHController();
const joyStick = new SwitchJoyStick();
const screw = new Screw(7, 2.5, (g) => translate([0, 0, 0], g));
const sample = new AngleSample();
const sample2 = new ThinJointSample();
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
  main.triggerJoint,
  main.buttonPadJoint,
  screw,
  joyStick,
  sample,
  sample2,
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
  const [skeletonState, setSkeletonState] = useState<SkeletonViewStateNode>({
    ...skeletonToViewStateNode(Skeleton),
    isOpen: true,
    isVisible: true,
  });

  useEffect(() => {
    setSkeletonState({
      ...skeletonToViewStateNode(Skeleton),
      isOpen: true,
      isVisible: true,
    });
  }, [Skeleton]);

  const visibleItems = useMemo(() => getVisibleItems(viewableValues, state), [state]);

  return (
    <div style={{display: 'flex'}}>
      <div style={{width: 1030, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around'}}>
        <SkeletonView state={skeletonState} />
        {visibleItems.map((item, i) => (
          <JSCADView key={item.fullName} title={item.fullName} solids={item.model()} />
        ))}
      </div>
      <ul>
        <li>
          <SkeletonViewMenu state={skeletonState} setState={setSkeletonState} label="スケルトン" />
        </li>
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
