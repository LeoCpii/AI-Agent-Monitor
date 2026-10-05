import { Outlet } from 'react-router-dom';

import { ThemeProvider, createTheme } from '@iziui/react/theme';

import MonitorProvider from './context/MonitorProvider';

const theme = createTheme({
  mode: 'dark',
  palette: {
    primary: '#14b8a6',
    secondary: '#f59e0b',
  },
  shape: { radius: 12 },
});

function Content() {
  return (
    <main>
      <Outlet />
    </main>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <MonitorProvider>
        <Content />
      </MonitorProvider>
    </ThemeProvider>
  );
}
