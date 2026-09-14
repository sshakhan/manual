import { renderManual } from '@evrika/manual-kit';
import '@evrika/manual-kit/styles.css';
import './theme.css';
import { exampleConfig } from './config';

// `exampleConfig()` omits `root`; this is the one caller with a real element
// to give it. `getElementById('root')` returns `null` only if `index.html`
// stops declaring `#root`, which is a markup bug worth a thrown error rather
// than a silently blank page.
const root = document.getElementById('root');
if (!root) throw new Error('example: index.html has no #root to mount into');

renderManual({ ...exampleConfig(), root });
