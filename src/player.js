import { createDevelopmentAdapter } from "./main.js?v=workbench-1";

// No debug listener or inspector is installed on the standalone player page.
if (new URL(location.href).searchParams.get("dev") === "1" && window.parent !== window) {
  const { connectDevelopment } = await import("./dev/bridge.js?v=workbench-1");
  connectDevelopment(createDevelopmentAdapter());
}
