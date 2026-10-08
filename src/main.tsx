import React from "react";
import ReactDOM from "react-dom/client";
import App from "./ui/App";
import "./styles.css";
class Boundary extends React.Component<
  React.PropsWithChildren,
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="error-screen">
        <h1>The arena needs a restart.</h1>
        <p>
          Reload to restore your saved progress. A WebGL capable browser is
          required.
        </p>
        <button onClick={() => location.reload()}>RELOAD GAME</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <Boundary>
    <App />
  </Boundary>,
);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
