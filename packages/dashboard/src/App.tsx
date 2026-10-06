import { Outlet } from 'react-router-dom';

import { Theme, ThemeProvider, createTheme, } from '@iziui/react/theme';

export const themeObservabilityDark: Partial<Theme> = {
  mode: 'dark',

  palette: {
    info: '#60A5FA',
    error: '#F87171',
    warning: '#FBBF24',
    success: '#34D399',

    primary: '#8B5CF6',
    secondary: '#22D3EE',

    grey: '#94A3B8',

    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      disabled: '#64748B'
    },

    background: {
      default: '#0B0D12',
      paper: '#12151C',
      muted: '#181C24'
    },

    divider: '#252A34'
  },

  typography: {
    family: 'Inter',
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
  }
};

function Content() {
  return (
    <Outlet />
  );
}

export default function App() {
  return (
    <ThemeProvider theme={createTheme(themeObservabilityDark)}>
      <Content />
    </ThemeProvider>
  );
}
