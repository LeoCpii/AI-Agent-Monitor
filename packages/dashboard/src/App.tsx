import { Outlet } from "react-router-dom";

import { ThemeProvider, createTheme } from "@iziui/react/theme";

function Content() {
  return (
    <main>
      <Outlet />
    </main>
  )
}

export default function App() {
  return (
    <ThemeProvider theme={createTheme()}>
      <Content />
    </ThemeProvider>
  );
}