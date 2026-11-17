import { render } from 'preact';

import './styles.css';
import { App } from './ui/App.tsx';

const root = document.getElementById('app');
if (root === null) throw new Error('missing #app element');
render(<App />, root);
