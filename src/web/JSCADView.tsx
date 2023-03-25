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
  readonly solids: Geom3;
}

export const JSCADView: React.FC<Props> = ({solids}) => {
  const entities = useMemo(() => entitiesFromSolids({}, solids), [solids]);
  const ref = useRef<HTMLDivElement>(null);
  const operationDeltaRef = useRef<OperationDelta>({rotate: [0, 0], pan: [0, 0], zoom: 0, reset: true});
  const [stateCamera, setCamera] = useState(cameras.perspective.defaults);

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
      console.log('xxxx zoom', e);
      operationDeltaRef.current.zoom += e.delta[1];
    },
    {target: ref},
  );

  useEffect(() => {
    if (ref.current) {
      const render = prepareRender({glOptions: {container: ref.current}});

      let camera = stateCamera;
      // let camera = {...cameras.perspective.defaults, position: [10, 10, 10]};
      let control = controls.orbit.defaults;

      cameras.perspective.setProjection(camera, camera, {width: 500, height: 500});
      cameras.perspective.update(camera);

      // OpenJSCADの packages/web/src/ui/views/viewer.js を参照
      function update(): void {
        const delta = operationDeltaRef.current;
        operationDeltaRef.current = {rotate: [0, 0], pan: [0, 0], zoom: 0};

        let hasUpdate = false;
        if (delta.rotate[0] || delta.rotate[1]) {
          hasUpdate = true;
          const rotated = controls.orbit.rotate({controls: control, camera, speed: 0.002}, delta.rotate);
          control = {...control, ...rotated.controls};
        }
        if (delta.pan[0] || delta.pan[1]) {
          hasUpdate = true;
          const panned = controls.orbit.pan({controls: control, camera, speed: 0.5}, delta.pan);
          camera.position = panned.camera.position;
          camera.target = panned.camera.target;
        }
        if (delta.zoom) {
          hasUpdate = true;
          const zoomed = controls.orbit.zoom({controls: control, camera, speed: 0.1}, delta.zoom);
          control = {...control, ...zoomed.controls};
        }
        if (delta.reset) {
          hasUpdate = true;
          control.zoomToFit.tightness = 1.5;
          const fitted = controls.orbit.zoomToFit({controls: control, camera, entities: entities as any});
          control = {...control, ...fitted.controls};
        }

        if (hasUpdate) {
          const updated = controls.orbit.update({controls: control, camera});
          control = {...control, ...updated.controls};
          camera.position = updated.camera.position;
          cameras.perspective.update(camera);
        }
        setCamera({...camera});
        render({entities: makeEntities(entities), camera, drawCommands: commonDrawCommands as any});
      }
      const intervalHandler = setInterval(update, 1000 / 30);
      return () => {
        clearInterval(intervalHandler);
      };
    }
    return undefined;
  }, [entities]);
  return (
    <div>
      <div ref={ref} style={{width: 500, height: 500}}></div>
    </div>
  );
};
