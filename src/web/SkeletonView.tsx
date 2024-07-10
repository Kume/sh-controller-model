import {isReadonlyArray} from '../utls';
import React, {useMemo} from 'react';
import {JSCADView} from './JSCADView';
import {sphere} from '@jscad/modeling/src/primitives';
import {Transform3D} from '../utils/Transform';

export type RecursiveValue<T> = T | readonly T[] | {readonly [key: string]: RecursiveValue<T>};

type Vec3 = readonly [number, number, number];

export interface SkeletonViewStateMapNode {
  readonly type: 'map';
  readonly isVisible?: boolean;
  readonly isOpen?: boolean;
  readonly transformSelf?: Transform3D;
  readonly children: Readonly<Record<string, SkeletonViewStateNode>>;
}

export interface SkeletonViewStateListNode {
  readonly type: 'list';
  readonly isVisible?: boolean;
  readonly isOpen?: boolean;
  readonly children: readonly SkeletonViewStateNode[];
}

export interface SkeletonViewStatePointNode {
  readonly type: 'point';
  readonly isVisible?: boolean;
  readonly isOpen?: boolean;
  readonly point: Vec3;
}

export type SkeletonViewStateNode = SkeletonViewStateMapNode | SkeletonViewStateListNode | SkeletonViewStatePointNode;

interface SkeletonCommon {
  readonly points?: RecursiveValue<Vec3>;
  readonly transformSelf?: Transform3D;
  readonly children?: Readonly<Record<string, SkeletonCommon>>;
}

export function skeletonToViewStateNode(skeleton: SkeletonCommon): SkeletonViewStateMapNode {
  return {
    type: 'map',
    transformSelf: skeleton.transformSelf,
    children: Object.fromEntries([
      ...Object.entries(skeleton.points ?? {}).map(([k, v]) => [k, recursivePointsToSkeletonViewStateNode(v)]),
      ...Object.entries(skeleton.children ?? {}).map(([k, v]) => [k, skeletonToViewStateNode(v)]),
    ]),
  };
}

export function recursivePointsToSkeletonViewStateNode(points: RecursiveValue<Vec3>): SkeletonViewStateNode {
  if (isReadonlyArray(points)) {
    if (isVec3(points)) {
      return {
        type: 'point',
        point: points,
      };
    } else {
      return {
        type: 'list',
        children: points.map(recursivePointsToSkeletonViewStateNode),
      };
    }
  } else {
    return {
      type: 'map',
      children: Object.fromEntries(
        Object.entries(points).map(([k, v]) => [k, recursivePointsToSkeletonViewStateNode(v)]),
      ),
    };
  }
}

export function isVec3(value: Vec3 | readonly unknown[]): value is Vec3 {
  return value.length === 3 && value.every((i: number | unknown) => typeof i === 'number');
}

interface VisiblePoint {
  readonly point: Vec3;
  readonly color: Vec3;
}

function visiblePoints(node: SkeletonViewStateNode, forceVisible = false): VisiblePoint[] {
  switch (node.type) {
    case 'map': {
      const points = Object.values(node.children).flatMap((child) =>
        visiblePoints(child, forceVisible || node.isVisible),
      );
      if (forceVisible && node.transformSelf) {
        const transformSelf = node.transformSelf;
        return points.map((point) => ({...point, point: transformSelf.applyVec(point.point)}));
      }
      return points;
    }
    case 'list':
      return Object.values(node.children).flatMap((child) => visiblePoints(child, forceVisible || node.isVisible));
    case 'point':
      return forceVisible || node.isVisible ? [{point: node.point, color: [1, 0, 0]}] : [];
  }
}

interface SkeletonViewMenuProps {
  state: SkeletonViewStateNode;
  label: string;
  setState: (callback: (prev: SkeletonViewStateNode) => SkeletonViewStateNode) => void;
}

export const SkeletonViewMenu: React.FC<SkeletonViewMenuProps> = ({state, setState, label}) => {
  const children = useMemo(() => {
    switch (state.type) {
      case 'map':
        return Object.entries(state.children).map(([key, child]) => ({
          state: child,
          label: key,
          setState: (callback: (prev: SkeletonViewStateNode) => SkeletonViewStateNode) =>
            setState((prev) => {
              if (prev.type !== 'map') {
                throw new Error('state type mismatch');
              }
              return {...prev, children: {...prev.children, [key]: callback(prev.children[key])}};
            }),
        }));
      case 'list':
        return state.children.map((child, index) => ({
          state: child,
          label: `${index}`,
          setState: (callback: (prev: SkeletonViewStateNode) => SkeletonViewStateNode) =>
            setState((prev) => {
              if (prev.type !== 'list') {
                throw new Error('state type mismatch');
              }
              const childrenForUpdate = [...prev.children];
              childrenForUpdate[index] = callback(prev.children[index]);
              return {...prev, children: childrenForUpdate};
            }),
        }));
      case 'point':
        return [];
    }
  }, [state, setState]);
  return (
    <li>
      <label>
        <input
          type="checkbox"
          checked={!!state.isVisible}
          onChange={(e) => setState((prev) => ({...prev, isVisible: e.target.checked}))}
        />
      </label>
      <span onClick={() => setState((prev) => ({...prev, isOpen: !prev.isOpen}))}>{label}</span>
      {state.isOpen && (
        <ul>
          {children.map((child) => (
            <SkeletonViewMenu key={child.label} {...child} />
          ))}
        </ul>
      )}
    </li>
  );
};

interface Props {
  state: SkeletonViewStateNode;
}

export const SkeletonView: React.FC<Props> = ({state}) => {
  const points = useMemo(() => visiblePoints(state), [state]);
  return (
    <JSCADView title={'スケルトン'} solids={points.map((point) => sphere({center: [...point.point], radius: 1}))} />
  );
};
