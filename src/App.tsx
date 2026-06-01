/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppRouter } from "./AppRouter";
import { ThemeProvider } from "./components/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="respira-theme">
      <AppRouter />
    </ThemeProvider>
  );
}
