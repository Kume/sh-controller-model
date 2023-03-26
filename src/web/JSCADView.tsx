import {useEffect, useMemo, useRef, useState} from 'react';
import {prepareRender, drawCommands, cameras, entitiesFromSolids, controls} from '@jscad/regl-renderer';
import {useDrag, useWheel} from '@use-gesture/react';
import {Geom3} from '@jscad/modeling/src/geometries/types';

interface OperationDelta {
  rotate: [number, number];
  pan: [number, number];
  zoom: number;
  reset?: boolean;
}

const commonDrawCommands = {
  drawGrid: drawCommands.drawGrid,
  drawAxis: drawCommands.drawAxis,
  drawMesh: drawCommands.drawMesh,
  drawLines: drawCommands.drawLines,
} as const;

function makeEntities(es: any) {
  return [
    {visuals: {drawCmd: 'drawAxis'}},
    {
      visuals: {
        drawCmd: 'drawGrid',
        show: true,
      },
      size: [200, 200],
      ticks: [10, 5],
    },
    ...es,
  ];
}

interface Props {
  readonly title: string;
  readonly solids: Geom3 | Geom3[];
}

export const JSCADView: React.FC<Props> = ({title, solids}) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const entities = useMemo(() => entitiesFromSolids({}, solids as any), [solids]);
  const ref = useRef<HTMLDivElement | null>(null);
  const renderRef = useRef<(arg: unknown) => void>(null);
  const operationDeltaRef = useRef<OperationDelta>({rotate: [0, 0], pan: [0, 0], zoom: 0, reset: true});
  const [stateCamera, setCamera] = useState(cameras.perspective.defaults);
  const [stateControls, setControls] = useState(controls.orbit.defaults);

  useDrag(
    (e) => {
      if (e.shiftKey) {
        operationDeltaRef.current.pan[0] -= e.delta[0];
        operationDeltaRef.current.pan[1] += e.delta[1];
      } else {
        operationDeltaRef.current.rotate[0] += e.delta[0];
        operationDeltaRef.current.rotate[1] -= e.delta[1];
      }
    },
    {target: ref},
  );
  useWheel(
    (e) => {
      operationDeltaRef.current.zoom += e.delta[1];
    },
    {target: ref},
  );

  useEffect(() => {
    // eslint-disable
    // @ts-ignore
    cameras.perspective.setProjection(stateCamera, stateCamera, {width: 500, height: 500});
    cameras.perspective.update(stateCamera);
  }, []);

  useEffect(() => {
    const div = ref.current;
    if (div) {
      let forceUpdate = !!renderRef.current;
      if (!renderRef.current) {
        renderRef.current = prepareRender({glOptions: {container: div}});
        div.addEventListener(
          'wheel',
          (e) => {
            e.preventDefault();
          },
          {passive: false},
        );
      }

      const camera = stateCamera;
      let control = stateControls;
      let isFinished = false;

      // OpenJSCADの packages/web/src/ui/views/viewer.js を参照
      // eslint-disable-next-line no-inner-declarations
      function update(): void {
        const delta = operationDeltaRef.current;
        operationDeltaRef.current = {rotate: [0, 0], pan: [0, 0], zoom: 0};

        let hasUpdate = false;
        if (delta.rotate[0] || delta.rotate[1]) {
          hasUpdate = true;
          // @ts-ignore
          const rotated = controls.orbit.rotate({controls: control, camera, speed: 0.002}, delta.rotate);
          control = {...control, ...rotated.controls};
        }
        if (delta.pan[0] || delta.pan[1]) {
          hasUpdate = true;
          // @ts-ignore
          const panned = controls.orbit.pan({controls: control, camera, speed: 0.5}, delta.pan);
          camera.position = panned.camera.position;
          camera.target = panned.camera.target;
        }
        if (delta.zoom) {
          hasUpdate = true;
          // @ts-ignore
          const zoomed = controls.orbit.zoom({controls: control, camera, speed: 0.1}, delta.zoom);
          control = {...control, ...zoomed.controls};
        }
        if (delta.reset) {
          hasUpdate = true;
          camera.position = [1, 1, 1];
          control.zoomToFit.tightness = 1.5;
          // @ts-ignore
          const fitted = controls.orbit.zoomToFit({controls: control, camera, entities: entities as any});
          control = {...control, ...fitted.controls};
        }

        if (hasUpdate || forceUpdate) {
          forceUpdate = false;
          // @ts-ignore
          const updated = controls.orbit.update({controls: control, camera});
          control = {...control, ...updated.controls};
          camera.position = updated.camera.position;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          cameras.perspective.update(camera);
          renderRef.current?.({entities: makeEntities(entities), camera, drawCommands: commonDrawCommands as any});
          setCamera({...camera});
          setControls({...control});
        }

        if (!isFinished) {
          window.requestAnimationFrame(update);
        }
      }
      window.requestAnimationFrame(update);
      return () => {
        isFinished = true;
      };
    }
    return undefined;
  }, [entities]);
  return (
    <div style={{border: 'gray 2px solid'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <p>{title}</p>
        <button onClick={() => (operationDeltaRef.current.reset = true)}>視点リセット</button>
      </div>

      <div key="main" ref={ref} style={{width: 500, height: 500}} />
    </div>
  );
};
