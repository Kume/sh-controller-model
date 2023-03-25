import {SHController} from '../SHController';
import {JSCADView} from './JSCADView';

const main = new SHController();

export const Viewer: React.FC = () => {
  return <JSCADView solids={main.outline} />;
};
