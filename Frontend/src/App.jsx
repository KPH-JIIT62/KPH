import { WorkspaceProvider } from "./context/WorkspaceContext";
import { CollaborationLayout } from "./components/CollaborationLayout";

export default function App() {
  return (
    <WorkspaceProvider>
      <CollaborationLayout />
    </WorkspaceProvider>
  );
}
